import { router } from '../app.js';
import storage from '../utils/storage-manager.js';
import appwriteManager from '../managers/appwrite-manager.js';
import { HelpClass } from '../utils/help-class.js';
export class MainActivity {
  constructor(container) {
    this.container = container;
    this.isPasswordVisible = false;
    this.isCheckingSession = true;
  }
  async render() {
    console.log('🔐 MainActivity - render()');
    HelpClass.setThemeColor('#02020E');
    const hasActiveSession = await this.checkExistingSession();
    if (hasActiveSession) {
      console.log('✅ Sesión activa encontrada - redirigiendo a Home');
      router.navigate('/home');
      return;
    }
    console.log('❌ No hay sesión activa - mostrando login');
    this.isCheckingSession = false;
    this.showLoginForm();
  }
  /**
   * @returns {Promise<boolean>}
   */
async checkExistingSession() {
  try {
    console.log('🔍 Verificando sesión existente...');
    this.showLoadingScreen();
    const sessionResult = await appwriteManager.getSessionUser();
    if (sessionResult.success && sessionResult.data) {
      const userId = sessionResult.data.$id;
      console.log('✅ Sesión activa encontrada:', userId);
      const hasCompleteData = storage.get('nombre') && 
                              storage.get('owner_id') && 
                              storage.get('Key_valor') && 
                              storage.get('tags_raw');
      
      if (hasCompleteData) {
        console.log('✅ Datos completos en storage, sesión lista');
        return true;
      }
      console.log('⚠️ Faltan datos en storage, recargando...');
      await this.fetchUserData(userId);
      return true;
    }
    console.log('❌ No hay sesión activa');
    return false;
  } catch (error) {
    console.error('❌ Error verificando sesión:', error);
    return false;
  }
}

showLoadingScreen() {
  this.container.innerHTML = `
    <div class="login-loading-screen">
        <div class="loading-content">
          <div class="spinner"></div>
          <h2>🔍 Verificando sesión...</h2>
        </div>
      </div>
      <style>
        .login-loading-screen {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #02020E 0%, #0a0a1f 100%);
          color: white;
        }
        .loading-content {
          text-align: center;
        }
        .spinner {
          width: 60px;
          height: 60px;
          border: 4px solid rgba(61, 210, 243, 0.2);
          border-top-color: #3dd2f3;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;
  }


  showLoginForm() {
    this.container.innerHTML = `
      <div class="main-activity">
        <div class="login-container">
          <div class="login-header">
            <img src="/assets/images/logo.png" alt="Logo" class="login-logo">
            <h1>Iniciar Sesión</h1>
          </div>
          <div class="login-form">
            <div class="input-group">
              <label for="emailInput">📧 Correo electrónico</label>
              <input 
                type="email" 
                id="emailInput" 
                placeholder="tu@email.com"
                autocomplete="email"
              >
            </div>
            <div class="input-group">
              <label for="passwordInput">🔒 Contraseña</label>
              <div class="password-wrapper">
                <input 
                  type="password" 
                  id="passwordInput" 
                  placeholder="Tu contraseña"
                  autocomplete="current-password"
                >
                <button type="button" id="togglePassword" class="toggle-password">
                  👁️
                </button>
              </div>
            </div>
            <button id="loginButton" class="login-button">
              <span id="buttonText">Iniciar Sesión</span>
              <div id="loadingSpinner" class="spinner hidden"></div>
            </button>
            <button id="qrScanButton" class="qr-scan-button">
              📷 Escanear QR desde TV
            </button>
            <a href="#" id="privacyLink" class="privacy-link">
              Política de Privacidad
            </a>
          </div>
        </div>
      </div>
      ${this.getLoginStyles()}
    `;
    this.setupEventListeners();
  }

  setupEventListeners() {
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('passwordInput');
    togglePassword && togglePassword.addEventListener('click', () => {
      this.isPasswordVisible = !this.isPasswordVisible;
      passwordInput.type = this.isPasswordVisible ? 'text' : 'password';
      togglePassword.textContent = this.isPasswordVisible ? '🙈' : '👁️';
    });
    const loginButton = document.getElementById('loginButton');
    loginButton && loginButton.addEventListener('click', () => this.handleLogin());
    const emailInput = document.getElementById('emailInput');
    const passwordInputField = document.getElementById('passwordInput');
    emailInput && emailInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleLogin();
    });
    passwordInputField && passwordInputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleLogin();
    });
    const privacyLink = document.getElementById('privacyLink');
    privacyLink && privacyLink.addEventListener('click', (e) => {
      e.preventDefault();
      HelpClass.openPrivacyPolicy();
    });
    const qrScanButton = document.getElementById('qrScanButton');
    qrScanButton && qrScanButton.addEventListener('click', () => this.handleQRLogin());
  }
  async handleLogin() {
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    const email = emailInput && emailInput.value.trim();
    const password = passwordInput && passwordInput.value.trim();
    if (!email || !password) {
      HelpClass.showToast('⚠️ Completa todos los campos');
      return;
    }
    if (!HelpClass.isValidEmail(email)) {
      HelpClass.showToast('⚠️ Email inválido');
      return;
    }
    this.showLoading(true);
    const result = await appwriteManager.createEmailSession(email, password);
    if (result.success && result.data) {
      const userId = result.data.userId;
      console.log('✅ Login exitoso para:', userId);
      storage.setMultiple({
        qr_email: email,
        qr_password: password
      });
      await this.fetchUserData(userId);
    } else {
      this.showLoading(false);
      const errorMsg = result.error && result.error.includes('network')
        ? 'Error de conexión. Verifica tu internet'
        : 'Error al iniciar sesión. Verifica usuario/contraseña';
      HelpClass.showToast(errorMsg);
    }
  }
async fetchUserData(userId) {
  const result = await appwriteManager.getUserData(userId);
  if (result.success && result.data) {
    const userData = result.data;
    const ownerId = userData.owner_id;
    const keyResult = await appwriteManager.getEncryptionKey(ownerId);
    if (!keyResult.success) {
      this.showLoading(false);
      HelpClass.showToast('❌ Error obteniendo key de cifrado: ' + keyResult.error);
      return;
    }
    const tagsResult = await appwriteManager.getRawTags(ownerId);
    if (!tagsResult.success) {
      this.showLoading(false);
      HelpClass.showToast('❌ Error obteniendo tags: ' + tagsResult.error);
      return;
    }
    console.log('🔑 Obteniendo folder key...');
    const folderKeyResult = await appwriteManager.getFolderKey(ownerId);
    if (!folderKeyResult.success) {
      console.warn('⚠️ No se pudo obtener folder key:', folderKeyResult.error);
    }
    
    // Guardar todo en storage
    storage.setMultiple({
      is_logged_in: true,
      user_id: userId,
      nombre: userData.nombre,
      owner_id: ownerId,
      Key_valor: keyResult.data,
      tags_raw: JSON.stringify(tagsResult.data),
      folder_key: folderKeyResult.success ? folderKeyResult.data : null // NUEVO
    });

    console.log('✅ Datos completos guardados:');
    console.log('   - Nombre:', userData.nombre);
    console.log('   - Owner ID:', ownerId);
    console.log('   - Key de cifrado tags: guardada');
    console.log('   - Tags en crudo:', tagsResult.data.length);
    console.log('   - Folder key:', folderKeyResult.success ? 'guardada' : 'no disponible');
    
    router.navigate('/home');
  } else {
    this.showLoading(false);
    HelpClass.showToast('❌ Error obteniendo datos: ' + result.error);
  }
}


  handleQRLogin() {
    HelpClass.showToast('ℹ️ Primero inicia sesión normalmente', {
      duration: 4000
    });
  }
  showLoading(show) {
    const buttonText = document.getElementById('buttonText');
    const spinner = document.getElementById('loadingSpinner');
    const loginButton = document.getElementById('loginButton');
    if (show) {
      buttonText.style.opacity = '0';
      spinner.classList.remove('hidden');
      loginButton.disabled = true;
    } else {
      buttonText.style.opacity = '1';
      spinner.classList.add('hidden');
      loginButton.disabled = false;
    }
  }

  getLoginStyles() {
    return `
      <style>
        .main-activity {
          min-height: 100vh;
          background: linear-gradient(135deg, #02020E 0%, #0a0a1f 100%);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }
        .login-container {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 40px;
          max-width: 450px;
          width: 100%;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }
        .login-header {
          text-align: center;
          margin-bottom: 40px;
        }
        .login-logo {
          width: 80px;
          height: auto;
          margin-bottom: 20px;
        }
        .login-header h1 {
          color: #3dd2f3;
          font-size: 28px;
          margin: 0;
        }
        .input-group {
          margin-bottom: 25px;
        }
        .input-group label {
          display: block;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 8px;
          font-size: 14px;
        }
        .input-group input {
          width: 100%;
          padding: 15px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(61, 210, 243, 0.3);
          border-radius: 10px;
          color: white;
          font-size: 16px;
          transition: all 0.3s;
        }
        .input-group input:focus {
          outline: none;
          border-color: #3dd2f3;
          background: rgba(255, 255, 255, 0.15);
        }
        .password-wrapper {
          position: relative;
        }
        .toggle-password {
          position: absolute;
          right: 15px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          padding: 5px;
        }
        .login-button {
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, #3dd2f3, #1f65e0);
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s;
          position: relative;
          margin-bottom: 15px;
        }
        .login-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 20px rgba(61, 210, 243, 0.4);
        }
        .login-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .spinner {
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
        }
        .hidden {
          display: none;
        }
        .qr-scan-button {
          width: 100%;
          padding: 15px;
          background: rgba(61, 210, 243, 0.1);
          border: 2px solid #3dd2f3;
          border-radius: 10px;
          color: white;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s;
          margin-bottom: 20px;
        }
        .qr-scan-button:hover {
          background: rgba(61, 210, 243, 0.2);
          transform: translateY(-2px);
        }
        .privacy-link {
          display: block;
          text-align: center;
          color: rgba(255, 255, 255, 0.6);
          text-decoration: none;
          font-size: 14px;
          transition: color 0.3s;
        }
        .privacy-link:hover {
          color: #3dd2f3;
        }
        @keyframes spin {
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
      </style>
    `;
  }

  destroy() {
    // Cleanup si es necesario
  }
}
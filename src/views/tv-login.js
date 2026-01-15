import { router } from '../app.js';
import storage from '../utils/storage-manager.js';
import appwriteManager from '../managers/appwrite-manager.js';
import { HelpClass } from '../utils/help-class.js';
import { remoteControl } from '../utils/remote-control-helper.js';
import { UIHelpers } from '../utils/ui-helpers.js';

export class TVLogin {
  constructor(container) {
    this.container = container;
    this.docId = null;
    this.pwd = null;
    this.salt = null;
    this.intervalId = null;
    this.timerInterval = null;
    this.isCheckingSession = true;
  }

  async render() {
    console.log('📺 TVLogin - render()');
    HelpClass.setThemeColor('#02020E');

    const hasActiveSession = await this.checkExistingSession();
    
    if (hasActiveSession) {
      console.log('✅ Sesión activa encontrada - redirigiendo a Home');
      router.navigate('/home');
      return;
    }

    console.log('❌ No hay sesión activa - mostrando QR login');
    this.isCheckingSession = false;
    await this.showQRLogin();
  }

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
        const userResult = await appwriteManager.getUserData(userId);
        
        if (userResult.success && userResult.data) {
          const ownerId = userResult.data.owner_id;
          
          const keyResult = await appwriteManager.getEncryptionKey(ownerId);
          if (!keyResult.success) {
            console.error('❌ Error obteniendo key:', keyResult.error);
            return false;
          }
          
          const tagsResult = await appwriteManager.getRawTags(ownerId);
          if (!tagsResult.success) {
            console.error('❌ Error obteniendo tags:', tagsResult.error);
            return false;
          }
          
          storage.setMultiple({
            is_logged_in: true,
            user_id: userId,
            nombre: userResult.data.nombre,
            owner_id: ownerId,
            Key_valor: keyResult.data,
            tags_raw: JSON.stringify(tagsResult.data)
          });

          console.log('✅ Datos completos guardados');
          return true;
        }
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
      <div class="tv-loading-screen">
        <div class="loading-content">
          <div class="spinner"></div>
          <h2>🔍 Verificando sesión...</h2>
          <p>Por favor espera</p>
        </div>
      </div>
      <style>
        .tv-loading-screen {
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
          width: 80px;
          height: 80px;
          border: 4px solid rgba(61, 210, 243, 0.2);
          border-top-color: #3dd2f3;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .loading-content h2 {
          color: #3dd2f3;
          margin: 20px 0 10px;
        }
        .loading-content p {
          color: rgba(255, 255, 255, 0.6);
        }
      </style>
    `;
  }

// 1. Modificar showQRLogin() - añadir el botón después del botón refresh
async showQRLogin() {
  try {
    await this.createTempDocument();
    const qrData = this.generateQRData();

    this.container.innerHTML = `
      <div class="tv-login-container">
        <div class="tv-login-content">
          <div class="tv-header">
            <img src="/assets/images/logo.png" alt="Logo" class="tv-logo">
            <h1>Inicio de Sesión TV</h1>
          </div>
          
          <div class="qr-section">
            <div class="qr-wrapper">
              <div id="qrcode"></div>
            </div>
            <div class="qr-instructions">
              <h2>📱 Escanea con tu móvil</h2>
              <ol>
                <li>Abre la app en tu móvil</li>
                <li>Inicia sesión normalmente</li>
                <li>Ve al menú y toca "QR Login"</li>
                <li>Escanea este código</li>
              </ol>
              <p class="qr-timer">⏱️ Expira en: <span id="timer">5:00</span></p>
              <p class="qr-debug" style="font-size: 12px; color: #888; margin-top: 10px;">
                ID: ${this.docId.substring(0, 8)}...
              </p>
            </div>
          </div>

          <button id="refreshQR" class="refresh-btn">🔄 Generar nuevo código</button>
          <button id="testLogin" class="test-login-btn">🧪 Login de Prueba</button>
        </div>
      </div>
      ${this.getTVLoginStyles()}
    `;

    const qrContainer = document.getElementById('qrcode');
    new QRCode(qrContainer, {
      text: qrData,
      width: 300,
      height: 300,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });

    console.log('📱 QR generado con datos:', JSON.parse(qrData));

    this.setupQREventListeners();
    this.setupRemoteControl();
    this.startExpirationTimer(300);
    await this.startListening();

  } catch (error) {
    console.error('❌ Error mostrando QR:', error);
    this.showErrorScreen(`Error generando código QR: ${error.message}`);
  }
}


// 2. Modificar setupQREventListeners() - añadir listener para el botón de prueba
setupQREventListeners() {
  const refreshBtn = document.getElementById('refreshQR');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      console.log('🔄 Regenerando QR...');
      
      if (this.intervalId) clearInterval(this.intervalId);
      if (this.timerInterval) clearInterval(this.timerInterval);
      
      await this.cleanTempDocument();
      
      await this.showQRLogin();
    });
  }

  // Nuevo listener para el botón de prueba
  const testLoginBtn = document.getElementById('testLogin');
  if (testLoginBtn) {
    testLoginBtn.addEventListener('click', async () => {
      console.log('🧪 Iniciando login de prueba...');
      await this.handleTestLogin();
    });
  }
}




// 3. Nuevo método handleTestLogin()
async handleTestLogin() {
  // ⚠️ CREDENCIALES DE PRUEBA - CAMBIAR SEGÚN TUS DATOS
  const TEST_EMAIL = 'mapps117@gmail.com';
  const TEST_PASSWORD = 'Nomada117#';

  this.container.innerHTML = `
    <div class="tv-auth-loading">
      <div class="auth-content">
        <div class="spinner-large"></div>
        <h2>🧪 Login de prueba...</h2>
        <p>Autenticando con credenciales hardcodeadas...</p>
      </div>
    </div>
    ${this.getAuthLoadingStyles()}
  `;

  try {
    console.log('🔑 Intentando login de prueba...');
    const result = await appwriteManager.createEmailSession(TEST_EMAIL, TEST_PASSWORD);

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Login fallido - sin datos de sesión');
    }

    const userId = result.data.userId;
    console.log('✅ Login de prueba exitoso:', userId);

    // Limpiar intervalos y documento temporal
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.timerInterval) clearInterval(this.timerInterval);
    await this.cleanTempDocument();

    console.log('📥 Obteniendo datos del usuario...');
    const userResult = await appwriteManager.getUserData(userId);

    if (!userResult.success || !userResult.data) {
      throw new Error('Error obteniendo datos de usuario');
    }

    const ownerId = userResult.data.owner_id;
    console.log('👤 Owner ID:', ownerId);
    
    console.log('🔐 Obteniendo key de cifrado...');
    const keyResult = await appwriteManager.getEncryptionKey(ownerId);
    if (!keyResult.success) {
      throw new Error('Error obteniendo key de cifrado: ' + keyResult.error);
    }
    console.log('✅ Key obtenida');
    
    console.log('🏷️ Obteniendo tags...');
    const tagsResult = await appwriteManager.getRawTags(ownerId);
    if (!tagsResult.success) {
      throw new Error('Error obteniendo tags: ' + tagsResult.error);
    }
    console.log('✅ Tags obtenidos:', tagsResult.data?.length || 0);
    
    storage.setMultiple({
      is_logged_in: true,
      user_id: userId,
      nombre: userResult.data.nombre,
      owner_id: ownerId,
      Key_valor: keyResult.data,
      tags_raw: JSON.stringify(tagsResult.data)
    });

    console.log('✅ Datos completos guardados en TV (prueba)');

    this.showSuccessScreen();
    setTimeout(() => {
      router.navigate('/home');
    }, 2000);

  } catch (error) {
    console.error('❌ Error en login de prueba:', {
      mensaje: error.message,
      stack: error.stack
    });
    this.showErrorScreen(`Error en login de prueba: ${error.message}`);
  }
}


  setupRemoteControl() {
    remoteControl.setToastFunction((msg, opts) => {
      UIHelpers.showToast(msg, opts || { type: 'info', duration: 3000 });
    });

    remoteControl.init('.tv-login-container', 'button', {
      focusIndicator: false,
      useNativeFocus: true,
      customFocusStyle: `
        .remote-focused {
          transform: scale(1.1) !important;
          box-shadow: 0 0 0 3px rgba(61, 210, 243, 0.6) !important;
          background: rgba(61, 210, 243, 0.2) !important;
          transition: all 0.2s ease !important;
        }
      `
    });

    remoteControl.onBack = () => {
      UIHelpers.showToast('Presiona de nuevo para volver', { 
        type: 'info', 
        duration: 2000 
      });
      
      setTimeout(() => {
        router.navigate('/welcome');
      }, 2000);
    };
  }

  generateSecureRandom(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => chars[byte % chars.length]).join('');
  }

  /**
   * ✅ CORREGIDO: Crea documento con campos directos (no dentro de "data")
   */
async createTempDocument() {
  // ✅ Generar ID personalizado (como en la versión que funcionaba)
  this.docId = this.generateSecureRandom(16);
  this.pwd = this.generateSecureRandom(32);
  this.salt = this.generateSecureRandom(16);

  const endpoint = appwriteManager.getEndpoint();
  const projectId = appwriteManager.getProjectId();
  const databaseId = appwriteManager.getDatabaseId();

  console.log('📝 Creando documento temporal:', this.docId);

  try {
    const response = await fetch(
      `${endpoint}/databases/${databaseId}/collections/temp/documents`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': projectId
        },
        body: JSON.stringify({
          documentId: this.docId,  // ✅ Usar ID personalizado
          data: { 
            token: '' 
          },
          permissions: [  // ✅ Permisos públicos para el documento
            'read("any")',
            'update("any")',
            'delete("any")'
          ]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error HTTP:', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const doc = await response.json();
    console.log('✅ Documento temporal creado:', {
      id: this.docId,
      realId: doc.$id,
      match: this.docId === doc.$id
    });
    
  } catch (error) {
    console.error('❌ Error detallado:', error);
    throw error;
  }
}


generateQRData() {
  return JSON.stringify({
    id: this.docId,  // Ya contiene el ID personalizado correcto
    pwd: this.pwd,
    salt: this.salt
  });
}

  async startListening() {
    console.log('👂 Iniciando listener para cambios en token...');
    
    this.intervalId = setInterval(async () => {
      const token = await this.checkTokenChange();
      if (token) {
        console.log('✅ Token detectado, deteniendo listener');
        clearInterval(this.intervalId);
        clearInterval(this.timerInterval);
        await this.handleTokenReceived(token);
      }
    }, 2000); // Check cada 2 segundos
  }

async checkTokenChange() {
  try {
    const endpoint = appwriteManager.getEndpoint();
    const projectId = appwriteManager.getProjectId();
    const databaseId = appwriteManager.getDatabaseId();

    const response = await fetch(
      `${endpoint}/databases/${databaseId}/collections/temp/documents/${this.docId}`,
      {
        headers: {
          'X-Appwrite-Project': projectId
        }
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.warn('⚠️ Documento no encontrado');
        return null;
      }
      return null;
    }

    const doc = await response.json();
    const token = doc.token || '';
    
    console.log('🔍 Verificando token:', {
      docId: this.docId,
      tieneToken: token !== '',
      longitudToken: token.length
    });

    return (token && token.trim() !== '') ? token : null;

  } catch (error) {
    console.error('❌ Error en checkTokenChange:', error);
    return null;
  }
}

  async handleTokenReceived(token) {
    console.log('✅ Token recibido:', {
      longitud: token.length,
      primeros20: token.substring(0, 20) + '...'
    });

    this.container.innerHTML = `
      <div class="tv-auth-loading">
        <div class="auth-content">
          <div class="spinner-large"></div>
          <h2>🔐 Autenticando...</h2>
          <p>Descifrando credenciales...</p>
        </div>
      </div>
      ${this.getAuthLoadingStyles()}
    `;

    try {
      console.log('🔓 Descifrando token...');
      const credentials = await this.decryptToken(token);
      console.log('✅ Token descifrado exitosamente');
      
      const { email, password } = JSON.parse(credentials);
      console.log('📧 Email extraído:', email);

      console.log('🔑 Intentando login con Appwrite...');
      const result = await appwriteManager.createEmailSession(email, password);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Login fallido - sin datos de sesión');
      }

      const userId = result.data.userId;
      console.log('✅ Login exitoso desde TV:', userId);

      await this.cleanTempDocument();

      console.log('📥 Obteniendo datos del usuario...');
      const userResult = await appwriteManager.getUserData(userId);

      if (!userResult.success || !userResult.data) {
        throw new Error('Error obteniendo datos de usuario');
      }

      const ownerId = userResult.data.owner_id;
      console.log('👤 Owner ID:', ownerId);
      
      console.log('🔐 Obteniendo key de cifrado...');
      const keyResult = await appwriteManager.getEncryptionKey(ownerId);
      if (!keyResult.success) {
        throw new Error('Error obteniendo key de cifrado: ' + keyResult.error);
      }
      console.log('✅ Key obtenida');
      
      console.log('🏷️ Obteniendo tags...');
      const tagsResult = await appwriteManager.getRawTags(ownerId);
      if (!tagsResult.success) {
        throw new Error('Error obteniendo tags: ' + tagsResult.error);
      }
      console.log('✅ Tags obtenidos:', tagsResult.data?.length || 0);
      
      storage.setMultiple({
        is_logged_in: true,
        user_id: userId,
        nombre: userResult.data.nombre,
        owner_id: ownerId,
        Key_valor: keyResult.data,
        tags_raw: JSON.stringify(tagsResult.data)
      });

      console.log('✅ Datos completos guardados en TV');

      this.showSuccessScreen();
      setTimeout(() => {
        router.navigate('/home');
      }, 2000);

    } catch (error) {
      console.error('❌ Error en login por QR:', {
        mensaje: error.message,
        stack: error.stack
      });
      this.showErrorScreen(`Error: ${error.message}`);
    }
  }

  async decryptToken(tokenBase64) {
    try {
      const combined = Uint8Array.from(atob(tokenBase64), c => c.charCodeAt(0));
      
      if (combined.length < 13) {
        throw new Error('Token demasiado corto o inválido');
      }
      
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      console.log('🔍 Token decodificado:', {
        totalBytes: combined.length,
        ivBytes: iv.length,
        encryptedBytes: encrypted.length
      });

      const encoder = new TextEncoder();
      const saltBytes = encoder.encode(this.salt);

      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(this.pwd),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );

      const cryptoKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: saltBytes,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        encrypted
      );

      const credentials = new TextDecoder().decode(decrypted);
      console.log('✅ Credenciales descifradas correctamente');
      
      return credentials;

    } catch (error) {
      console.error('❌ Error descifrando token:', error);
      throw new Error('Error descifrando credenciales. El QR puede haber expirado.');
    }
  }

  async cleanTempDocument() {
    if (!this.docId) return;

    try {
      const endpoint = appwriteManager.getEndpoint();
      const projectId = appwriteManager.getProjectId();
      const databaseId = appwriteManager.getDatabaseId();

      const response = await fetch(
        `${endpoint}/databases/${databaseId}/collections/temp/documents/${this.docId}`,
        {
          method: 'DELETE',
          headers: {
            'X-Appwrite-Project': projectId
          }
        }
      );

      if (response.ok) {
        console.log('✅ Documento temporal eliminado');
      } else {
        console.warn('⚠️ No se pudo eliminar documento (puede no existir)');
      }
    } catch (error) {
      console.error('❌ Error eliminando documento:', error);
    }
  }

  startExpirationTimer(seconds) {
    const timerElement = document.getElementById('timer');
    if (!timerElement) return;

    let remaining = seconds;

    this.timerInterval = setInterval(() => {
      remaining--;
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      timerElement.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

      if (remaining <= 0) {
        clearInterval(this.timerInterval);
        this.handleTimeout();
      }
    }, 1000);
  }

  async handleTimeout() {
    console.log('⏱️ QR expirado');
    
    if (this.intervalId) clearInterval(this.intervalId);
    await this.cleanTempDocument();
    
    this.showErrorScreen('Código QR expirado. Genera uno nuevo.');
  }

  showSuccessScreen() {
    this.container.innerHTML = `
      <div class="tv-success-screen">
        <div class="success-content">
          <div class="success-icon">✅</div>
          <h2>¡Login exitoso!</h2>
          <p>Redirigiendo a inicio...</p>
        </div>
      </div>
      ${this.getSuccessStyles()}
    `;
  }

  showErrorScreen(message) {
    this.container.innerHTML = `
      <div class="tv-error-screen">
        <div class="error-content">
          <div class="error-icon">❌</div>
          <h2>Error</h2>
          <p>${message}</p>
          <button onclick="location.reload()" class="retry-btn">
            🔄 Intentar de nuevo
          </button>
        </div>
      </div>
      ${this.getErrorStyles()}
    `;
  }


// 4. Modificar getTVLoginStyles() - añadir estilos para el nuevo botón
getTVLoginStyles() {
  return `
    <style>
      .tv-login-container {
        min-height: 100vh;
        background: linear-gradient(135deg, #02020E 0%, #0a0a1f 100%);
        color: white;
        padding: 40px;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .tv-login-content {
        max-width: 900px;
        width: 100%;
      }
      .tv-header {
        text-align: center;
        margin-bottom: 60px;
      }
      .tv-logo {
        width: 120px;
        height: auto;
        margin-bottom: 20px;
      }
      .tv-header h1 {
        font-size: 48px;
        color: #3dd2f3;
        margin: 0;
      }
      .qr-section {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 60px;
        align-items: center;
        margin-bottom: 40px;
      }
      .qr-wrapper {
        background: white;
        padding: 30px;
        border-radius: 20px;
        box-shadow: 0 10px 40px rgba(61, 210, 243, 0.3);
      }
      .qr-instructions h2 {
        color: #3dd2f3;
        margin-bottom: 20px;
        font-size: 32px;
      }
      .qr-instructions ol {
        font-size: 20px;
        line-height: 2;
        padding-left: 30px;
      }
      .qr-instructions li {
        margin-bottom: 10px;
      }
      .qr-timer {
        margin-top: 30px;
        font-size: 24px;
        color: #3dd2f3;
        font-weight: bold;
      }
      .refresh-btn, .test-login-btn {
        display: block;
        margin: 20px auto;
        padding: 20px 40px;
        font-size: 20px;
        background: rgba(61, 210, 243, 0.2);
        border: 2px solid #3dd2f3;
        color: white;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.3s;
      }
      .test-login-btn {
        background: rgba(255, 165, 0, 0.2);
        border-color: #ffa500;
        color: #ffa500;
      }
      .refresh-btn:hover, .test-login-btn:hover {
        background: rgba(61, 210, 243, 0.3);
        transform: scale(1.05);
      }
      .test-login-btn:hover {
        background: rgba(255, 165, 0, 0.3);
      }
    </style>
  `;
}

  getAuthLoadingStyles() {
    return `
      <style>
        .tv-auth-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #02020E 0%, #0a0a1f 100%);
        }
        .auth-content {
          text-align: center;
          color: white;
        }
        .spinner-large {
          width: 100px;
          height: 100px;
          border: 6px solid rgba(61, 210, 243, 0.2);
          border-top-color: #3dd2f3;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 30px;
        }
        .auth-content h2 {
          font-size: 36px;
          color: #3dd2f3;
          margin: 20px 0;
        }
        .auth-content p {
          font-size: 20px;
          color: rgba(255, 255, 255, 0.7);
        }
      </style>
    `;
  }

  getSuccessStyles() {
    return `
      <style>
        .tv-success-screen {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #02020E 0%, #0a0a1f 100%);
        }
        .success-content {
          text-align: center;
          color: white;
        }
        .success-icon {
          font-size: 120px;
          margin-bottom: 30px;
          animation: pulse 1s ease-in-out;
        }
        .success-content h2 {
          font-size: 42px;
          color: #3dd2f3;
          margin: 20px 0;
        }
        .success-content p {
          font-size: 24px;
          color: rgba(255, 255, 255, 0.7);
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      </style>
    `;
  }

  getErrorStyles() {
    return `
      <style>
        .tv-error-screen {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #02020E 0%, #0a0a1f 100%);
        }
        .error-content {
          text-align: center;
          color: white;
        }
        .error-icon {
          font-size: 120px;
          margin-bottom: 30px;
        }
        .error-content h2 {
          font-size: 42px;
          color: #ff4444;
          margin: 20px 0;
        }
        .error-content p {
          font-size: 24px;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 40px;
        }
        .retry-btn {
          padding: 20px 50px;
          font-size: 22px;
          background: rgba(61, 210, 243, 0.2);
          border: 2px solid #3dd2f3;
          color: white;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s;
        }
        .retry-btn:hover {
          background: rgba(61, 210, 243, 0.3);
          transform: scale(1.05);
        }
      </style>
    `;
  }

  destroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (remoteControl && remoteControl.destroy) {
      remoteControl.destroy();
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
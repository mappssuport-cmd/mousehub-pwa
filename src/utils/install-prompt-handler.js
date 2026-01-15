// src/utils/install-prompt-handler.js

export class InstallPromptHandler {
  static deferredPrompt = null;
  static isInstalled = false;
  static hasReceivedPrompt = false;
  static isInstallable = false;
  static isTV = false;
  static installListeners = [];

  static initialize() {
    console.log('🔧 [InstallPrompt] Iniciando inicialización...');
    console.log('📺 [InstallPrompt] ¿Es TV?:', this.isTV);
    const installedCheck = this.checkIfInstalled();
    console.log('📱 [InstallPrompt] ¿Ya instalada?:', installedCheck);
    if (installedCheck) {
      this.isInstalled = true;
      this.markAsInstalledBefore();
      console.log('✅ [InstallPrompt] App ya está instalada');
      return;
    }
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('🎉 [InstallPrompt] Evento beforeinstallprompt capturado');
      e.preventDefault();
      this.deferredPrompt = e;
      this.hasReceivedPrompt = true;
      this.isInstallable = true;
      this.notifyListeners('installable');
    });
    window.addEventListener('appinstalled', () => {
      console.log('🎊 [InstallPrompt] PWA instalada exitosamente');
      this.isInstalled = true;
      this.deferredPrompt = null;
      this.hasReceivedPrompt = false;
      this.markAsInstalledBefore();
      this.notifyListeners('installed');
    });
    console.log('✅ [InstallPrompt] Listeners configurados');
  }
/**
 * @returns {Object}
 */
static detectBrowser() {
  const ua = navigator.userAgent;
  return {
    isIOS: /iPad|iPhone|iPod/.test(ua),
    isAndroid: /Android/.test(ua),
    isChrome: /Chrome/.test(ua) && !/Edg/.test(ua),
    isEdge: /Edg/.test(ua),
    isFirefox: /Firefox/.test(ua),
    isSafari: /Safari/.test(ua) && !/Chrome/.test(ua),
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
  };
}

  /**
   * @returns {boolean}
   */
  static checkIfInstalled() {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
      return true;
    }
    if (window.navigator.standalone === true) {
      this.isInstalled = true;
      return true;
    }
    if (window.matchMedia('(display-mode: fullscreen)').matches) {
      this.isInstalled = true;
      return true;
    }
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('source') === 'pwa' || urlParams.has('shortcut')) {
      this.isInstalled = true;
      return true;
    }
    return false;
  }
  /**
   * @returns {boolean}
   */
  static isRunningAsPWA() {
    return this.checkIfInstalled();
  }
  /**
   * @returns {Promise<boolean>}
   */
  static async promptInstall() {
    console.log('🚀 [InstallPrompt] Intentando mostrar prompt...');
    if (!this.deferredPrompt) {
      console.warn('⚠️ [InstallPrompt] No hay prompt disponible');
      return false;
    }
    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      console.log(`📊 [InstallPrompt] Usuario eligió: ${outcome}`); 
      this.deferredPrompt = null;
      return outcome === 'accepted';
    } catch (error) {
      console.error('❌ [InstallPrompt] Error al mostrar prompt:', error);
      return false;
    }
  }
static showInstallInstructions() {
  const browser = this.detectBrowser();
  
  let instructions = '';
  let browserNote = '';
  const hasInstalledBefore = this.hasInstalledBefore();
  
  const reinstallWarning = hasInstalledBefore ? `
    <div style="
      background: #fff3cd;
      color: #856404;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      text-align: left;
      border-left: 4px solid #ffc107;
    ">
      <strong>Nota:</strong> Parece que ya instalaste Mouse Hub anteriormente. 
      Si deseas reinstalar, primero desinstala la versión actual desde el menú de aplicaciones 
      de tu sistema operativo o navegador.
    </div>
  ` : '';
  
  if (browser.isIOS) {
    instructions = `
      ${reinstallWarning}
      <h3>Instalar en iPhone o iPad</h3>
      <ol style="text-align: left; margin: 20px 0; line-height: 1.8;">
        <li>Abre esta página en <strong>Safari</strong> (obligatorio para iOS)</li>
        <li>Toca el botón de <strong>Compartir</strong> en la barra inferior 
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin: 0 4px;">
              <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
            </svg>
        </li>
        <li>Desplázate hacia abajo y selecciona <strong>"Agregar a pantalla de inicio"</strong></li>
        <li>Toca <strong>"Agregar"</strong> para confirmar</li>
      </ol>
      <p style="font-size: 14px; opacity: 0.8; margin-top: 15px;">
        La aplicación aparecerá en tu pantalla de inicio como cualquier otra app.
      </p>
    `;
    browserNote = 'Solo Safari permite instalar aplicaciones web en iOS';
    
  } else if (browser.isAndroid) {
    instructions = `
      ${reinstallWarning}
      <h3>Instalar en Android</h3>
      <ol style="text-align: left; margin: 20px 0; line-height: 1.8;">
        <li>Toca el menú <strong>⋮</strong> (tres puntos verticales) en la esquina superior</li>
        <li>Busca y selecciona una de estas opciones:
          <ul style="margin-top: 8px; opacity: 0.9;">
            <li><strong>"Instalar aplicación"</strong>, o</li>
            <li><strong>"Agregar a pantalla de inicio"</strong>, o</li>
            <li><strong>"Instalar Mouse Hub"</strong></li>
          </ul>
        </li>
        <li>Confirma la instalación en el diálogo que aparece</li>
      </ol>
      <p style="font-size: 14px; opacity: 0.8; margin-top: 15px;">
        La aplicación se agregará a tu cajón de aplicaciones y pantalla de inicio.
      </p>
    `;
    browserNote = 'Funciona en Chrome, Edge, Firefox y otros navegadores modernos';
    
  } else {
    // Desktop
    let specificInstructions = '';
    
    if (browser.isChrome) {
      specificInstructions = `
        <li>Haz clic en el menú <strong>⋮</strong> (tres puntos) en la esquina superior derecha</li>
        <li>Selecciona <strong>"Guardar y compartir"</strong></li>
        <li>Luego <strong>"Instalar Mouse Hub"</strong></li>
      `;
      browserNote = 'Navegador detectado: Google Chrome';
      
    } else if (browser.isEdge) {
      specificInstructions = `
        <li>Haz clic en el menú <strong>⋯</strong> (tres puntos) en la esquina superior derecha</li>
        <li>Ve a <strong>"Aplicaciones"</strong></li>
        <li>Selecciona <strong>"Instalar Mouse Hub"</strong></li>
      `;
      browserNote = 'Navegador detectado: Microsoft Edge';
      
    } else if (browser.isFirefox) {
      specificInstructions = `
        <li>Haz clic en el menú <strong>☰</strong> (tres líneas) en la esquina superior derecha</li>
        <li>Busca el ícono de instalación o la opción <strong>"Instalar"</strong></li>
        <li>Confirma la instalación</li>
      `;
      browserNote = 'Navegador detectado: Mozilla Firefox';
      
    } else {
      specificInstructions = `
        <li>Busca el menú de tu navegador (usualmente tres puntos o líneas en la esquina superior)</li>
        <li>Busca opciones como <strong>"Instalar"</strong>, <strong>"Aplicaciones"</strong> o <strong>"Agregar a..."</strong></li>
        <li>Selecciona <strong>"Instalar Mouse Hub"</strong> o similar</li>
      `;
    }
    
    instructions = `
      ${reinstallWarning}
      <h3>Instalar en tu Computadora</h3>
      <ol style="text-align: left; margin: 20px 0; line-height: 1.8;">
        ${specificInstructions}
        <li>Confirma la instalación en la ventana emergente</li>
      </ol>
      <p style="font-size: 14px; opacity: 0.8; margin-top: 15px;">
        La aplicación se abrirá en su propia ventana, independiente del navegador.
      </p>
    `;
    
    // Solo si no se asignó browserNote arriba (caso else)
    if (!browserNote) {
      if (browser.isSafari) {
        browserNote = 'Safari en Mac puede tener opciones limitadas de instalación';
      } else {
        browserNote = 'Disponible en la mayoría de navegadores modernos';
      }
    }
  }
  
  const modal = document.createElement('div');
  modal.id = 'installInstructionsModal';
  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-content">
        ${instructions}
        ${browserNote ? `<p style="font-size: 13px; opacity: 0.7; margin-top: 10px; font-style: italic;">${browserNote}</p>` : ''}
        <button onclick="document.getElementById('installInstructionsModal').remove()" 
                style="
                  margin-top: 25px;
                  padding: 12px 32px;
                  background: #3dd2f3;
                  border: none;
                  border-radius: 8px;
                  color: white;
                  font-size: 16px;
                  cursor: pointer;
                  font-weight: 600;
                  transition: background 0.2s ease;
                "
                onmouseover="this.style.background='#2ab8d9'"
                onmouseout="this.style.background='#3dd2f3'">
          Entendido
        </button>
      </div>
    </div>
  `;
  
  const style = document.createElement('style');
  style.textContent = `
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 20px;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .modal-content {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      padding: 35px;
      border-radius: 16px;
      max-width: 550px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      color: white;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
      animation: slideUp 0.3s ease;
    }
    @keyframes slideUp {
      from { 
        opacity: 0;
        transform: translateY(30px);
      }
      to { 
        opacity: 1;
        transform: translateY(0);
      }
    }
    .modal-content h3 {
      margin-top: 0;
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 20px;
    }
    .modal-content ol {
      padding-left: 20px;
    }
    .modal-content li {
      margin: 14px 0;
      font-size: 15px;
      line-height: 1.7;
    }
    .modal-content ul {
      list-style-type: disc;
      padding-left: 25px;
      margin-top: 8px;
    }
    .modal-content ul li {
      margin: 6px 0;
      font-size: 14px;
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(modal);
}
/**
 * @param {boolean} isTV
 * @returns {boolean}
 */
static shouldShowInstallDialog(isTV = false) {
  if (isTV) {
    console.log('📺 Es TV - no se requiere instalación');
    return false;
  }
  if (this.isInstalled) {
    console.log('✅ Ya está instalado');
    return false;
  }
  try {
    if (localStorage.getItem('mousehub_skip_install') === 'true') {
      console.log('⏭️ Usuario previamente saltó instalación');
      return false;
    }
  } catch (e) {
    console.log(e);
  }
  return true;
}

  static markAsInstalledBefore() {
    try {
      localStorage.setItem('mousehub_pwa_installed_before', 'true');
    } catch (e) {
      console.warn('No se pudo guardar estado de instalación');
    }
  }
  /**
   * @returns {boolean}
   */
  static hasInstalledBefore() {
    try {
      return localStorage.getItem('mousehub_pwa_installed_before') === 'true';
    } catch (e) {
      return false;
    }
  }
  /**
   * @param {Function} callback
   */
  static onInstallEvent(callback) {
    this.installListeners.push(callback);
  }
  /**
   * @param {string} event
   */
  static notifyListeners(event) {
    this.installListeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error en listener:', error);
      }
    });
  }
  /**
   * @returns {string}
   */
  static getDisplayMode() {
    if (window.matchMedia('(display-mode: standalone)').matches) return 'standalone';
    if (window.matchMedia('(display-mode: fullscreen)').matches) return 'fullscreen';
    if (window.matchMedia('(display-mode: minimal-ui)').matches) return 'minimal-ui';
    if (window.navigator.standalone === true) return 'standalone (iOS)';
    return 'browser';
  }
  /**
   * @returns {Object}
   */
  static getStatus() {
  return {
    isInstalled: this.isInstalled,
    isInstallable: this.isInstallable,
    hasReceivedPrompt: this.hasReceivedPrompt,
    shouldShowDialog: this.shouldShowInstallDialog(),
    displayMode: this.getDisplayMode(),
    browser: this.detectBrowser()
  };
}
  static logEnvironment() {
    console.group('🔍 [InstallPrompt] Información del entorno');
    console.log('🔧 Service Worker soportado:', 'serviceWorker' in navigator); 
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        console.log('📝 Service Workers registrados:', registrations.length);
        registrations.forEach((reg, i) => {
          console.log(`  ${i + 1}. Scope: ${reg.scope}, State: ${reg.active?.state || 'ninguno'}`);
        });
      });
    }
    console.log('📱 Display mode:', this.getDisplayMode());
    console.log('📺 Es TV:', this.isTV);
    console.log('✅ Instalado:', this.isInstalled);
    console.log('🎯 Instalable:', this.isInstallable);
    console.log('📥 Prompt disponible:', !!this.deferredPrompt);
    console.groupEnd();
  }
  static forceCheck() {
    console.log('🔍 [InstallPrompt] Verificación manual forzada');
    this.logEnvironment();
  }
}
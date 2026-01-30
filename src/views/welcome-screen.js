import { router } from '../app.js';
import storage from '../utils/storage-manager.js';
import { HelpClass } from '../utils/help-class.js';
import { deviceDetector } from '../config/device-config.js';
import { UIHelpers } from '../utils/ui-helpers.js';
import { remoteControl } from '../utils/remote-control-helper.js';
import { WelcomeView } from '/src/utils/frontend/WelcomeView.js';
export class WelcomeScreen {
  constructor(container) {
    this.container = container;
    this.view = new WelcomeView(container);
    this.detectionData = null;
    this.deviceType = 'unknown';
    this.confidence = 0;
    this.isTV = false;
    this.isMobile = false;
    this.resizeHandler = null;
    this.deviceProfiles = this.initDeviceProfiles();
    this.pwaInfoVisible = false;
  }
  initDeviceProfiles() {
    return {
      'TV Stick (Android TV/Fire TV/Chromecast)': {
        particles: { 
          enabled: true, 
          fps: 30, 
          connected: 25,
          background: 15,
          maxDistance: 120,
          shootingStarChance: 0.008
        },
        animations: { 
          enableLogoFloat: true,
          transitionDuration: 500
        }
      },
      'Smart TV (webOS/Tizen/Android TV)': {
        particles: { 
          enabled: true, 
          fps: 30, 
          connected: 35,
          background: 20,
          maxDistance: 140,
          shootingStarChance: 0.010
        },
        animations: { 
          enableLogoFloat: true,
          transitionDuration: 500
        }
      },
      'Smartphone Android/iOS': {
        particles: { 
          enabled: true, 
          fps: 60, 
          connected: 40,
          background: 25,
          maxDistance: 150,
          shootingStarChance: 0.012
        },
        animations: { 
          enableLogoFloat: true,
          transitionDuration: 600
        }
      },
      'Tablet Android/iOS': {
        particles: { 
          enabled: true, 
          fps: 60, 
          connected: 50,
          background: 30,
          maxDistance: 160,
          shootingStarChance: 0.015
        },
        animations: { 
          enableLogoFloat: true,
          transitionDuration: 600
        }
      },
      'PC Desktop/Laptop': {
        particles: { 
          enabled: true, 
          fps: 60, 
          connected: 60,
          background: 40,
          maxDistance: 180,
          shootingStarChance: 0.018
        },
        animations: { 
          enableLogoFloat: true,
          transitionDuration: 600
        }
      },
      'Emulador/Simulador': {
        particles: { 
          enabled: true, 
          fps: 30, 
          connected: 30,
          background: 20,
          maxDistance: 130,
          shootingStarChance: 0.010
        },
        animations: { 
          enableLogoFloat: true,
          transitionDuration: 500
        }
      },
      'unknown': {
        particles: { 
          enabled: true, 
          fps: 30, 
          connected: 30,
          background: 20,
          maxDistance: 130,
          shootingStarChance: 0.010
        },
        animations: { 
          enableLogoFloat: true,
          transitionDuration: 500
        }
      }
    };
  }
async render() {
  const isInPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  window.navigator.standalone === true;
  
  if (isInPWA) {
    console.log('📱 PWA ya instalada - saltando Welcome');
    storage.set('has_seen_welcome', true);
    setTimeout(() => {
      router.navigate('/');
    }, 100);
    return;
  }

  HelpClass.setThemeColor('#02020E');
  
  await this.detectDevice();
  
  const profile = this.getDeviceProfile();
  this.particleConfig = profile.particles;
  this.animConfig = profile.animations;
  
  const savedPref = storage.get('prefer_pwa_mode');
  const switchState = savedPref !== null ? savedPref : false;
  
  const viewData = {
    deviceType: this.deviceType,
    confidence: this.confidence,
    isTV: this.isTV,
    isMobile: this.isMobile,
    switchState: switchState
  };
  
  this.view.render(viewData);
  
  await new Promise(resolve => requestAnimationFrame(resolve));
  
  this.setupEventListeners();
  this.setupRemoteControl();
  
  if (switchState) {
    this.view.togglePWAMessage(true);
  }
  
  setTimeout(() => this.initializeVisuals(), 100);
  await this.view.waitForLogo();
}
  async detectDevice() {
    const detectionResult = await deviceDetector.detectAll();
    
    console.log('🔍 Resultado de detección:', detectionResult);
    
    this.detectionData = detectionResult;
    this.deviceType = detectionResult.detectedDevice || 'unknown';
    this.confidence = detectionResult.confidence || 0;
    
    this.isTV = this.deviceType.includes('TV') || 
                detectionResult.indicators?.isTV || 
                detectionResult.indicators?.isTVStick;
    
    this.isMobile = this.deviceType.includes('Smartphone') || 
                    detectionResult.indicators?.isMobile;
  }
  getDeviceProfile() {
    return this.deviceProfiles[this.deviceType] || this.deviceProfiles['unknown'];
  }
  setupEventListeners() {
  const elements = this.view.getElements();
  if (elements.startButton) {
    elements.startButton.addEventListener('click', () => this.handleStart());
  }
  if (elements.legalLink) {
    elements.legalLink.addEventListener('click', () => this.showTerms());
  }
  if (elements.useAsAppSwitch) {
    elements.useAsAppSwitch.addEventListener('change', (e) => {
      this.handleSwitchChange(e.target.checked);
    });
  }
  if (elements.pwaInfoButton) {
    elements.pwaInfoButton.addEventListener('click', () => this.showPWAInfo());
  } 
  this.resizeHandler = () => this.view.resizeCanvas();
  window.addEventListener('resize', this.resizeHandler);
}
  setupRemoteControl() {
    if (!this.isTV && !this.isMobile) return;
    remoteControl.setToastFunction((msg, opts) => {
      UIHelpers.showToast(msg, opts || { type: 'info', duration: 3000 });
    });
    remoteControl.init('.welcome-screen', 'button, .legal-link', {
      focusIndicator: false,
      useNativeFocus: true,
      customFocusStyle: `
        .remote-focused {
          transform: scale(1.05) !important;
          box-shadow: 0 0 0 3px rgba(61, 210, 243, 0.5), 
                      var(--glass-shadow), 
                      var(--neon-glow-md) !important;
          background: linear-gradient(135deg, 
                      rgba(61, 210, 243, 0.15), 
                      rgba(31, 101, 224, 0.15)) !important;
          transition: all 0.2s ease !important;
          z-index: 1000 !important;
        }
      `
    });
    remoteControl.onFocus = (element) => {
      document.querySelectorAll('.remote-focused').forEach(el => {
        el.classList.remove('remote-focused');
      });
      if (element) {
        element.classList.add('remote-focused');
      }
    };
    remoteControl.onBlur = (element) => {
      if (element) {
        element.classList.remove('remote-focused');
      }
    }; 
    remoteControl.onBack = () => {
      UIHelpers.showToast('No hay pantalla anterior', { 
        type: 'info', 
        duration: 2000 
      });
    };
  }
  initializeVisuals() {
    if (this.particleConfig.enabled) {
      this.view.initCanvas(this.particleConfig);
      this.view.startAnimation(this.animConfig.enableLogoFloat);
    }
  }
  showTerms() {
    UIHelpers.showToast('Términos y condiciones - Próximamente', {
      type: 'info',
      duration: 2000
    });
  }
  async handleStart() {
  console.log('🚀 handleStart() - Iniciando...');
  const isInPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  window.navigator.standalone === true;
  if (isInPWA) {
    console.log('📱 Ya estamos en la PWA instalada - ir directo a splash');
    this.proceedToSplash();
    return;
  }
  if (this.isTV) {
    console.log('📺 Dispositivo TV detectado - redirigiendo a tvLogin');
    HelpClass.vibrate(50);
    this.navigateToTVLogin();
    return;
  }
  const useAsAppSwitch = document.getElementById('useAsAppSwitch');
  const useAsApp = useAsAppSwitch ? useAsAppSwitch.checked : false;
  console.log('📱 Usar como app:', useAsApp);
  if (this.isMobile) {
    console.log('📱 Dispositivo móvil detectado');
    
  }
  HelpClass.vibrate(50);
  try {
    storage.set('prefer_pwa_mode', useAsApp);
    console.log('💾 Preferencia guardada:', useAsApp);
  } catch (e) {
    console.warn('⚠️ No se pudo guardar preferencia');
  }
  if (!useAsApp) {
    console.log('🌐 Usuario prefiere modo web - continuando a splash');
    this.proceedToSplash();
    return;
  }
  console.log('📱 Usuario quiere instalar - procesando...');
  await this.handleInstallation();
}
async handleInstallation() {
  try {
    const { InstallPromptHandler } = await import('../utils/install-prompt-handler.js');
    if (InstallPromptHandler.deferredPrompt) {
      console.log('🚀 Prompt disponible - mostrando instalación');
      const accepted = await InstallPromptHandler.promptInstall();
      
      if (accepted) {
        console.log('✅ Usuario aceptó instalación');
        
        this.view.showInstallationProgress();
        
        try {
          const audio = new Audio('/assets/audio/apwai.mp3');
          audio.volume = 0.7;
          await new Promise((resolve, reject) => {
            audio.addEventListener('ended', resolve);
            audio.addEventListener('error', reject);
            audio.play().catch(reject);
          });
          
          console.log('🎵 Audio finalizado');
        } catch (err) {
          console.warn('⚠️ Error con el audio:', err);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        window.location.reload();
        return;
      } else {
        console.log('❌ Usuario canceló instalación - continuando en modo web');
        UIHelpers.showToast('Continuando en modo web...', { 
          type: 'info', 
          duration: 2000 
        });
        setTimeout(() => {
          this.proceedToSplash();
        }, 2000);
      }
    } else {
      console.log('ℹ️ No hay prompt nativo - mostrando instrucciones manuales');
      InstallPromptHandler.showInstallInstructions();
      return;
    }
    
  } catch (error) {
    console.error('❌ Error en proceso de instalación:', error);
    UIHelpers.showToast('Error al instalar - Continuando en modo web', { 
      type: 'warning', 
      duration: 2000 
    });
    setTimeout(() => {
      this.proceedToSplash();
    }, 2000);
  }
}
  navigateToTVLogin() {
    console.log('📺 Navegando a tvLogin...');
    storage.set('has_seen_welcome', true);
    this.view.playExitAnimation(this.animConfig.transitionDuration);
    setTimeout(() => {
      console.log('🔄 Navegando a /tv-login');
      this.destroy();
      router.navigate('/tv-login');
    }, this.animConfig.transitionDuration);
  }
  proceedToSplash() {
    console.log('💾 Guardando flag welcome visto...');
    storage.set('has_seen_welcome', true); 
    console.log('🎬 Animación de salida...');
    this.view.playExitAnimation(this.animConfig.transitionDuration);
    setTimeout(() => {
      console.log('🔄 Navegando a /');
      this.destroy();
      router.navigate('/');
    }, this.animConfig.transitionDuration);
  }
  destroy() {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    if (remoteControl && remoteControl.destroy) {
      remoteControl.destroy();
    }
    if (this.view) {
      this.view.destroy();
      this.view = null;
    }
    this.detectionData = null;
  }
  handleSwitchChange(isChecked) {
  try {
    storage.set('prefer_pwa_mode', isChecked);
  } catch (e) {
    console.warn('⚠️ No se pudo guardar preferencia del switch');
  }
  this.view.togglePWAMessage(isChecked);
  HelpClass.vibrate(30);
}

showPWAInfo() {
  const modal = document.createElement('div');
  modal.className = 'pwa-info-modal';
  const styles = `
    <style>
      .pwa-info-modal {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 9999;
        display: flex; justify-content: center; align-items: center;
        opacity: 0; transition: opacity 0.3s ease;
      }
      .pwa-info-modal.visible { opacity: 1; }
      .pwa-info-overlay {
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
      }
      .pwa-info-content {
        position: relative; width: 90%; max-width: 650px;
        background: rgba(255, 255, 255, 0.95); border-radius: 20px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.3); overflow: hidden;
        display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      /* Modo oscuro soporte */
      @media (prefers-color-scheme: dark) {
        .pwa-info-content { background: #1a1a1a; color: #fff; }
      }
      
      .pwa-header {
        padding: 20px 24px; display: flex; justify-content: space-between; align-items: center;
        border-bottom: 1px solid rgba(0,0,0,0.1);
      }
      .pwa-header h2 { margin: 0; font-size: 1.2rem; font-weight: 700; }
      .close-btn { background: none; border: none; cursor: pointer; color: inherit; padding: 4px; }
      
      /* Grid Layout */
      .pwa-grid {
        display: grid; grid-template-columns: 1fr 1fr;
        gap: 0; position: relative;
      }
      /* Línea divisoria vertical */
      .pwa-grid::after {
        content: ''; position: absolute; top: 10px; bottom: 10px; left: 50%;
        width: 1px; background: rgba(0,0,0,0.1);
      }
      
      .grid-col { padding: 20px; display: flex; flex-direction: column; gap: 15px; }
      
      /* Columna PWA (Izquierda) */
      .col-pwa { background: rgba(52, 199, 89, 0.05); }
      .col-title { font-weight: 800; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 1px; margin-bottom: 5px; display: block; text-align: center;}
      .title-pwa { color: #2ecc71; }
      .title-app { color: #7f8c8d; }

      .feature-item {
        display: flex; align-items: flex-start; gap: 10px; font-size: 0.9rem; line-height: 1.4;
      }
      .icon-box { flex-shrink: 0; width: 20px; text-align: center; }
      .icon-check { color: #2ecc71; font-weight: bold; }
      .icon-warn { color: #e67e22; }
      .icon-bad { color: #e74c3c; }
      
      .highlight-text { font-weight: 600; font-size: 0.95rem; }
      .sub-text { font-size: 0.8rem; opacity: 0.8; display: block; margin-top: 2px;}

      .pwa-footer-note {
        padding: 15px 20px; background: rgba(0,0,0,0.03);
        font-size: 0.8rem; text-align: center; color: #666;
        display: flex; align-items: center; justify-content: center; gap: 8px;
      }
      .pwa-actions { padding: 15px; text-align: center; }
      .btn-understand {
        background: #2ecc71; color: white; border: none;
        padding: 12px 30px; border-radius: 50px; font-weight: 600;
        font-size: 1rem; cursor: pointer; transition: transform 0.2s;
        box-shadow: 0 4px 15px rgba(46, 204, 113, 0.3);
      }
      .btn-understand:active { transform: scale(0.96); }

      /* Ajuste móvil si la pantalla es muy pequeña */
      @media (max-width: 400px) {
        .feature-item { font-size: 0.8rem; }
        .grid-col { padding: 15px 10px; }
      }
    </style>
  `;

  modal.innerHTML = `
    ${styles}
    <div class="pwa-info-overlay"></div>
    <div class="pwa-info-content">
      <div class="pwa-header">
        <button class="close-btn pwa-info-close" aria-label="Cerrar">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
      </div>
      
      <div class="pwa-info-body">
        <div class="pwa-grid">
          
          <div class="grid-col col-pwa">
            <span class="col-title title-pwa">Esta App (PWA)</span>
            
            <div class="feature-item">
              <div class="icon-box icon-check">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              </div>
              <div>
                <span class="highlight-text">Vive en tu navegador</span>
                <span class="sub-text">No ocupa espacio extra ni ensucia tu sistema.</span>
              </div>
            </div>

            <div class="feature-item">
              <div class="icon-box icon-check">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              </div>
              <div>
                <span class="highlight-text">Tú tienes el control</span>
                <span class="sub-text">Seguridad limitada: no puede ver nada que no permitas.</span>
              </div>
            </div>

            <div class="feature-item">
              <div class="icon-box icon-check">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              </div>
              <div>
                <span class="highlight-text">Privacidad total</span>
                <span class="sub-text">Sin acceso a contactos, ni archivos ocultos.</span>
              </div>
            </div>
          </div>

          <div class="grid-col col-app">
            <span class="col-title title-app">App Tradicional</span>
            
            <div class="feature-item">
              <div class="icon-box icon-warn">
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </div>
              <div>
                <span class="highlight-text">Instalada en el teléfono</span>
                <span class="sub-text">Consume memoria y corre procesos en segundo plano.</span>
              </div>
            </div>

            <div class="feature-item">
              <div class="icon-box icon-warn">
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
              </div>
              <div>
                <span class="highlight-text">Acceso Profundo</span>
                <span class="sub-text">Puede acceder a cámara, micrófono y galería.</span>
              </div>
            </div>

            <div class="feature-item">
              <div class="icon-box icon-warn">
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
              </div>
              <div>
                <span class="highlight-text">Permisos complejos</span>
                <span class="sub-text">Suele requerir acceso a tu agenda o ubicación.</span>
              </div>
            </div>
          </div>

        </div>
        
        <div class="pwa-footer-note">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="#4285F4"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
           <span>Estándar moderno recomendado por Google, Microsoft y Apple</span>
        </div>
      </div>
      
    </div>
  `;
  document.body.appendChild(modal);
  requestAnimationFrame(() => {
    modal.classList.add('visible');
  });
  const closeModal = () => {
    modal.classList.remove('visible');
    setTimeout(() => modal.remove(), 300);
    if(typeof HelpClass !== 'undefined' && HelpClass.vibrate) {
        HelpClass.vibrate(30);
    }
  };
  modal.querySelector('.pwa-info-close').addEventListener('click', closeModal);
  modal.querySelector('.pwa-info-button').addEventListener('click', closeModal);
  modal.querySelector('.pwa-info-overlay').addEventListener('click', closeModal);
  if(typeof HelpClass !== 'undefined' && HelpClass.vibrate) {
    HelpClass.vibrate(30);
  }
}
}
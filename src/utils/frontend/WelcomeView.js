/**
 * WelcomeView.js
 * Ruta: public/frontend/WelcomeView.js
 * 
 */

export class WelcomeView {
  constructor(container, config = {}) {
    this.container = container;
    this.config = config;
    this.canvas = null;
    this.ctx = null;
    this.logoElement = null;
    this.animationId = null;
    this.time = 0;
    this.lastFrameTime = 0;
    this.particles = [];
    this.bgParticles = [];
    this.shootingStars = [];
    this.TWO_PI = Math.PI * 2;
    this.HALF_PI = Math.PI / 2;
  }

 render(data) {
  const { deviceType, confidence, isTV, isMobile, switchState } = data;
  
  this.container.innerHTML = `
    <div class="welcome-screen">
      <canvas id="particleCanvas" class="canvas-background"></canvas>
      <div class="gradient-background"></div>
      <div class="welcome-content">
        <div class="welcome-logo-container">
          <img src="/assets/images/icons/logo.webp" 
               alt="MouseHub Logo" 
               class="welcome-logo" 
               loading="eager">
        </div>      
        <h1 class="welcome-title">
         ¡Bienvenido a <span class="brand-name">MouseHub</span>!
        </h1>
        <p class="welcome-subtitle">
          ${isTV
            ? 'Optimizado para tu Smart TV'
            : 'Prepárate para vivir una experiencia única.'}
          <br>
        </p>
        <button id="startButton" class="welcome-button glass-button">
          <span>Comenzar</span>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
          </svg>
        </button>
        
        ${!isTV ? `
        <div class="welcome-switch-container">
          <label for="useAsAppSwitch" class="switch-label">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-right: 6px;">
              <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/>
            </svg>
            Instalar como aplicación
          </label>
          <label class="switch-toggle">
            <input 
              type="checkbox" 
              id="useAsAppSwitch" 
              class="welcome-switch"
              ${switchState ? 'checked' : ''}
            >
            <span class="switch-slider"></span>
          </label>
        </div>
        
        <div class="pwa-info-message" style="display: ${switchState ? 'flex' : 'none'};">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="pwa-icon">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <p>
            Instalarás una 
            <button class="pwa-link" id="pwaInfoButton">
              <span class="pwa-text">PWA</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/>
              </svg>
            </button>
            — más segura que una app tradicional.
          </p>
        </div>
        ` : ''}
      </div>
      <footer class="legal-footer">
        Al continuar aceptas nuestros 
        <button class="legal-link">Términos y condiciones del servicio</button>.
      </footer>
    </div>
  `;
  this.injectStyles();
  this.cacheReferences();
}

 cacheReferences() {
  this.logoElement = this.container.querySelector('.welcome-logo');
  this.canvas = this.container.querySelector('#particleCanvas');
  this.startButton = this.container.querySelector('#startButton');
  this.useAsAppSwitch = this.container.querySelector('#useAsAppSwitch');
  this.legalLink = this.container.querySelector('.legal-link');
  this.pwaBadge = this.container.querySelector('.pwa-badge');
  this.contentElement = this.container.querySelector('.welcome-content');
  this.footerElement = this.container.querySelector('.legal-footer');
  this.pwaMessage = this.container.querySelector('.pwa-info-message'); // NUEVO
  this.pwaInfoButton = this.container.querySelector('#pwaInfoButton'); // NUEVO
  }
  
 getElements() {
  return {
    startButton: this.startButton,
    useAsAppSwitch: this.useAsAppSwitch,
    legalLink: this.legalLink,
    pwaBadge: this.pwaBadge,
    logo: this.logoElement,
    pwaInfoButton: this.pwaInfoButton // NUEVO
  };
}
showInstallationProgress() {
  const welcomeContent = this.container.querySelector('.welcome-content');
  if (!welcomeContent) return;
  
  // Ocultar TODOS los elementos del welcome
  if (this.startButton) this.startButton.style.display = 'none';
  if (this.useAsAppSwitch) {
    const switchContainer = this.useAsAppSwitch.closest('.welcome-switch-container');
    if (switchContainer) switchContainer.style.display = 'none';
  }
  if (this.pwaMessage) this.pwaMessage.style.display = 'none';
  
  // Ocultar título y subtítulo
  const title = this.container.querySelector('.welcome-title');
  const subtitle = this.container.querySelector('.welcome-subtitle');
  if (title) title.style.display = 'none';
  if (subtitle) subtitle.style.display = 'none';
  
  // Ocultar footer legal
  if (this.footerElement) this.footerElement.style.display = 'none';
  
  // Crear animación de puntos con efecto de onda
  const progressHTML = `
    <div class="installation-progress" style="
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      margin-top: 40px;
      animation: fadeIn 0.4s ease-out;
    ">
      <div class="loading-dots" style="
        display: flex;
        gap: 12px;
        align-items: center;
        justify-content: center;
      ">
        <span class="dot" style="animation-delay: 0s"></span>
        <span class="dot" style="animation-delay: 0.2s"></span>
        <span class="dot" style="animation-delay: 0.4s"></span>
        <span class="dot" style="animation-delay: 0.6s"></span>
        <span class="dot" style="animation-delay: 0.8s"></span>
      </div>
      <p style="
        color: var(--color-text);
        font-size: 18px;
        font-weight: 600;
        margin: 0;
        text-align: center;
      ">Preparando tu aplicación...</p>
      <p style="
        color: var(--color-text-secondary);
        font-size: 14px;
        margin: 0;
        text-align: center;
      ">Esto solo tomará un momento</p>
    </div>
  `;
  
  welcomeContent.insertAdjacentHTML('beforeend', progressHTML);
  
  // Agregar estilos de animación si no existen
  if (!document.getElementById('dots-animation')) {
    const style = document.createElement('style');
    style.id = 'dots-animation';
    style.textContent = `
      .dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: linear-gradient(135deg, #3dd2f3, #1f65e0);
        box-shadow: 0 0 15px rgba(61, 210, 243, 0.6),
                    0 0 30px rgba(61, 210, 243, 0.3);
        animation: dotPulse 1.4s ease-in-out infinite;
      }
      
      @keyframes dotPulse {
        0%, 100% {
          transform: scale(0.8);
          opacity: 0.5;
          box-shadow: 0 0 5px rgba(61, 210, 243, 0.3);
        }
        50% {
          transform: scale(1.3);
          opacity: 1;
          box-shadow: 0 0 20px rgba(61, 210, 243, 0.8),
                      0 0 40px rgba(61, 210, 243, 0.4);
        }
      }
    `;
    document.head.appendChild(style);
  }
}

togglePWAMessage(show) {
  if (!this.pwaMessage) return;
  
  if (show) {
    this.pwaMessage.style.display = 'flex';
    requestAnimationFrame(() => {
      this.pwaMessage.classList.add('visible');
    });
  } else {
    this.pwaMessage.classList.remove('visible');
    setTimeout(() => {
      this.pwaMessage.style.display = 'none';
    }, 300);
  }
}
  

injectStyles() {
  if (document.getElementById('welcome-styles')) return;
  const style = document.createElement('style');
  style.id = 'welcome-styles';
  style.textContent = `
    .welcome-screen {
      width: 100%;
      height: 100vh;
      height: -webkit-fill-available;
      min-height: 500px;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      background-color: var(--color-background);
    }
    
    .welcome-content {
      position: relative;
      z-index: var(--z-content);
      text-align: center;
      padding: 32px 20px;
      max-width: min(600px, 90vw);
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      animation: fadeInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1);
      flex: 1;
      justify-content: center;
      gap: 20px;
    }
    
    .welcome-logo-container {
      margin-bottom: 10px;
      animation: scaleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both;
    }
    
    .welcome-logo {
      width: clamp(70px, 15vh, 120px);
      height: clamp(70px, 15vh, 120px);
      max-width: 120px;
      max-height: 120px;
      filter: drop-shadow(0 0 30px rgba(31, 101, 224, 0.6))
              drop-shadow(0 0 15px rgba(61, 210, 243, 0.4))
              drop-shadow(0 0 5px rgba(255, 255, 255, 0.3));
      will-change: transform;
      object-fit: contain;
    }
    
    .welcome-title {
      font-size: clamp(24px, 5vw, 36px);
      color: var(--color-text);
      margin: 0 0 0 0;
      font-weight: 700;
      animation: fadeIn 0.6s ease-out 0.4s both;
      line-height: 1.3;
    }
    
    .welcome-subtitle {
      font-size: clamp(16px, 3.5vw, 20px);
      color: var(--color-text-secondary);
      margin: 0 0 10px 0;
      line-height: 1.4;
      animation: fadeIn 0.6s ease-out 0.6s both;
    }
    
    .welcome-interactive-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      width: 100%;
      max-width: min(280px, 85vw);
      animation: fadeIn 0.6s ease-out 0.8s both;
    }
    
    .welcome-button {
      width: 100%;
      max-width: min(250px, 80vw);
      animation: fadeIn 0.6s ease-out 0.9s both, 
                 welcomePulse 2s ease-in-out 2s infinite;
    }
    
    @keyframes welcomePulse {
      0%, 100% {
        box-shadow: var(--glass-shadow), var(--neon-glow-sm);
      }
      50% {
        box-shadow: var(--glass-shadow), var(--neon-glow-md);
      }
    }

    /* ===== SWITCH CONTAINER (GLASS EFFECT) ===== */
    .welcome-switch-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      width: 100%;
      max-width: min(280px, 85vw);
      padding: 12px 16px;
      margin-top: 8px;
      
      /* Efecto glass */
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1),
                  inset 0 1px 0 rgba(255, 255, 255, 0.1);
      
      animation: fadeIn 0.6s ease-out 1s both;
      transition: background 0.3s ease, border-color 0.3s ease;
    }
    
    .welcome-switch-container:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.15);
    }
    
    /* ===== LABEL DEL SWITCH ===== */
    .switch-label {
      display: flex;
      align-items: center;
      font-size: 14px;
      color: var(--color-text);
      font-weight: 500;
      cursor: pointer;
      user-select: none;
      flex: 1;
      gap: 8px;
    }
    
    .switch-label svg {
      flex-shrink: 0;
      opacity: 0.8;
      width: 18px;
      height: 18px;
    }
    
    /* ===== TOGGLE SWITCH ===== */
    .switch-toggle {
      position: relative;
      display: inline-block;
      width: 48px;
      height: 26px;
      flex-shrink: 0;
    }
    
    .welcome-switch {
      opacity: 0;
      width: 0;
      height: 0;
      position: absolute;
    }
    
    .switch-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.2);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 26px;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    
    .switch-slider:before {
      content: "";
      position: absolute;
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }
    
    .welcome-switch:checked + .switch-slider {
      background: linear-gradient(135deg, #1f65e0 0%, #3dd2f3 100%);
      border-color: rgba(61, 210, 243, 0.5);
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2),
                  0 0 12px rgba(61, 210, 243, 0.4);
    }
    
    .welcome-switch:checked + .switch-slider:before {
      transform: translateX(22px);
      background: linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
    }
    
    .welcome-switch:focus + .switch-slider {
      outline: 2px solid rgba(61, 210, 243, 0.5);
      outline-offset: 2px;
    }
    
    .switch-slider:hover {
      background-color: rgba(255, 255, 255, 0.2);
    }
    
    .welcome-switch:checked + .switch-slider:hover {
      background: linear-gradient(135deg, #1f65e0 0%, #3dd2f3 100%);
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2),
                  0 0 16px rgba(61, 210, 243, 0.6);
    }

    /* ===== LEGAL FOOTER ===== */
    .legal-footer {
      position: relative;
      z-index: var(--z-content);
      padding: 16px;
      text-align: center;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.6);
      animation: fadeIn 0.6s ease-out 1s both;
      margin-bottom:5px;
    }
    
    .legal-link {
      background: none;
      border: none;
      color: #3dd2f3;
      text-decoration: underline;
      cursor: pointer;
      font-size: inherit;
      padding: 0;
      margin: 0;
      transition: color 0.3s ease;
    }
    
    .legal-link:hover {
      color: #1f65e0;
    }
    
    /* ===== RESPONSIVE ===== */
    @media (max-width: 480px) {
      .welcome-interactive-section {
        max-width: min(260px, 85vw);
        gap: 14px;
      }
      
      .welcome-switch-container {
        max-width: min(260px, 85vw);
        padding: 10px 14px;
      }
      
      .switch-label {
        font-size: 13px;
      }
    }

    @media (max-width: 360px) {
      .welcome-interactive-section {
        max-width: 240px;
        gap: 12px;
      }
      
      .welcome-switch-container {
        max-width: 240px;
        padding: 10px 12px;
      }
      
      .switch-label {
        font-size: 12px;
      }
      
      .switch-toggle {
        width: 44px;
        height: 24px;
      }
      
      .switch-slider:before {
        height: 16px;
        width: 16px;
      }
      
      .welcome-switch:checked + .switch-slider:before {
        transform: translateX(20px);
      }
    }

    @media (max-height: 600px) {
      .welcome-content {
        padding: 15px 16px;
        gap: 10px;
      } 
      
      .welcome-logo {
        width: clamp(60px, 12vh, 80px);
        height: clamp(60px, 12vh, 80px);
        max-width: 80px;
        max-height: 80px;
      }
      
      .welcome-subtitle {
        margin-bottom: 5px;
      }
      
      .welcome-interactive-section {
        gap: 12px;
      }
      
      .welcome-switch-container {
        padding: 8px 12px;
        margin-top: 4px;
      }
    }
    
    @media (min-width: 768px) and (max-width: 1024px) {
      .welcome-content {
        max-width: 500px;
      }
      
      .welcome-interactive-section,
      .welcome-switch-container {
        max-width: 300px;
      }
    }
    
    @media (min-width: 1025px) {
      .welcome-content {
        max-width: 700px;
      }
      
      .welcome-interactive-section,
      .welcome-switch-container {
        max-width: 320px;
      }
    }
    
    @media (orientation: landscape) and (max-height: 500px) {
      .welcome-content {
        padding: 10px 20px;
        flex-direction: row;
        gap: 30px;
        justify-content: center;
        align-items: center;
      }
      
      .welcome-logo-container {
        margin-bottom: 0;
      }
      
      .welcome-title {
        margin-bottom: 8px;
      }
      
      .welcome-subtitle {
        margin-bottom: 12px;
      }
      
      .welcome-interactive-section {
        max-width: 280px;
        gap: 10px;
      }
      
      .welcome-switch-container {
        padding: 8px 12px;
      }
    }
    
    @media (prefers-reduced-motion: reduce) {
      .welcome-content,
      .welcome-logo-container,
      .welcome-title,
      .welcome-subtitle,
      .welcome-button,
      .welcome-logo,
      .welcome-switch-container {
        animation: none !important;
        transition: none !important;
      }
    }
    
    /* ===== ANIMATIONS ===== */
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: scale(0.8);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    
    @keyframes fadeOutDown {
      from {
        opacity: 1;
        transform: translateY(0);
      }
      to {
        opacity: 0;
        transform: translateY(20px);
      }
    }
    /* ===== PWA INFO MESSAGE ===== */
.pwa-info-message {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  max-width: min(4000px, 90vw);
  padding: 5px;
  margin-top: 0px;
  background: rgba(31, 101, 224, 0.1);
  border: 1px solid rgba(61, 210, 243, 0.3);
  border-radius: 8px;
  opacity: 0;
  transform: translateY(-10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.pwa-info-message.visible {
  opacity: 1;
  transform: translateY(0);
}

.pwa-info-message .pwa-icon {
  flex-shrink: 0;
  color: #3dd2f3;
  margin-top: 2px;
}

.pwa-info-message p {
  flex: 1;
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-text);
  text-align: left;
}

.pwa-link {
  background: none;
  border: none;
  color: #3dd2f3;
  cursor: pointer;
  padding: 0;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: color 0.2s ease;
  text-decoration: underline;
}

.pwa-link:hover {
  color: #1f65e0;
}

.pwa-link svg {
  width: 14px;
  height: 14px;
}

/* ===== PWA INFO MODAL ===== */
.pwa-info-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.pwa-info-modal.visible {
  opacity: 1;
}

.pwa-info-modal.visible .pwa-info-content {
  transform: scale(1);
  opacity: 1;
}

.pwa-info-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(2, 2, 14, 0.85);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.pwa-info-content {
  position: relative;
  max-width: 600px;
  max-height: 80vh;
  width: 100%;
  padding: 24px;
  background: rgba(20, 20, 40, 0.95);
  border: 1px solid rgba(61, 210, 243, 0.3);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5),
              0 0 0 1px rgba(255, 255, 255, 0.1);
  overflow-y: auto;
  transform: scale(0.9);
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.pwa-info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.pwa-info-header h2 {
  margin: 0;
  font-size: 24px;
  color: var(--color-text);
  font-weight: 700;
}

.pwa-info-close {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pwa-info-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text);
}

.pwa-info-body {
  margin-bottom: 20px;
}

.comparison-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.comparison-item {
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.comparison-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

.comparison-item.highlight {
  background: rgba(31, 101, 224, 0.08);
  border-color: rgba(61, 210, 243, 0.2);
}

.comparison-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.comparison-item h3 {
  margin: 0 0 12px 0;
  font-size: 18px;
  color: var(--color-text);
  font-weight: 600;
}

.comparison-details {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pwa-detail,
.traditional-detail {
  font-size: 14px;
  line-height: 1.6;
  padding: 8px;
  border-radius: 6px;
}

.pwa-detail {
  background: rgba(61, 210, 243, 0.1);
  border-left: 3px solid #3dd2f3;
  color: var(--color-text);
}

.traditional-detail {
  background: rgba(255, 255, 255, 0.03);
  border-left: 3px solid rgba(255, 255, 255, 0.2);
  color: var(--color-text-secondary);
}

.pwa-detail strong,
.traditional-detail strong {
  display: block;
  margin-bottom: 4px;
  color: var(--color-text);
}

.pwa-info-footer {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.info-note {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 0;
  padding: 12px;
  background: rgba(61, 210, 243, 0.1);
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-text-secondary);
}

.info-note svg {
  flex-shrink: 0;
  color: #3dd2f3;
  margin-top: 2px;
}

.pwa-info-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.pwa-info-button {
  min-width: 120px;
}

@media (max-width: 480px) {
  .pwa-info-content {
    padding: 20px;
    max-height: 85vh;
  }
  
  .pwa-info-header h2 {
    font-size: 20px;
  }
  
  .comparison-icon {
    font-size: 28px;
  }
  
  .comparison-item h3 {
    font-size: 16px;
  }
  
  .pwa-info-message {
    max-width: min(260px, 85vw);
  }}
  `;
  document.head.appendChild(style);
}
  initCanvas(particleConfig) {
    if (!this.canvas) return; 
    this.particleConfig = particleConfig;
    this.maxDistSq = particleConfig.maxDistance * particleConfig.maxDistance;
    this.ctx = this.canvas.getContext('2d', { 
      alpha: true, 
      desynchronized: true 
    });
    if (!this.ctx) return;
    this.resizeCanvas();
    this.createParticles();
    this.lastFrameTime = performance.now();
    this.frameInterval = 1000 / particleConfig.fps;
  }
  resizeCanvas() {
    if (!this.canvas) return; 
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
    }
    this.dpr = dpr;
    this.canvasWidth = rect.width;
    this.canvasHeight = rect.height;
  }
  createShootingStar(width, height) {
    const angle = Math.random() * this.TWO_PI;
    const speed = 3 + Math.random() * 2;
    this.shootingStars.push({
      x: width * Math.random(),
      y: height * Math.random(),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: Math.random() + 1,
      life: 0,
      maxLife: 40 + Math.random() * 20,
      trail: []
    });
  }
  updateShootingStars(width, height) {
    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const s = this.shootingStars[i];
      s.x += s.vx;
      s.y += s.vy;
      s.life++;   
      s.trail.push({ x: s.x, y: s.y });
      if (s.trail.length > 10) s.trail.shift();
      if (s.life > s.maxLife || s.x < -50 || s.x > width + 50 || s.y < -50 || s.y > height + 50) {
        this.shootingStars.splice(i, 1);
        continue;
      }
      const opacity = 1 - s.life / s.maxLife;
      for (let j = 0; j < s.trail.length - 1; j++) {
        const t1 = s.trail[j];
        const t2 = s.trail[j + 1];
        this.ctx.beginPath();
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${(j / s.trail.length) * opacity * 0.4})`;
        this.ctx.lineWidth = s.size;
        this.ctx.moveTo(t1.x, t1.y);
        this.ctx.lineTo(t2.x, t2.y);
        this.ctx.stroke();
      }
      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, s.size * 2, 0, this.TWO_PI);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.3})`;
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, s.size, 0, this.TWO_PI);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      this.ctx.fill();
    }
  }
  stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  playExitAnimation(duration = 500) {
    if (this.contentElement) {
      this.contentElement.style.animation = 'fadeOutDown 0.5s ease-out forwards';
    } 
    if (this.footerElement) {
      this.footerElement.style.transition = 'opacity 0.5s ease';
      this.footerElement.style.opacity = '0';
    }
    if (this.canvas) {
      this.canvas.style.transition = 'opacity 0.5s ease';
      this.canvas.style.opacity = '0';
    }
  }
  async waitForLogo() {
    if (!this.logoElement) return; 
    if (this.logoElement.complete) return;
    return new Promise(resolve => {
      this.logoElement.onload = resolve;
      this.logoElement.onerror = resolve;
    });
  }
  destroy() {
    this.stopAnimation();
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.bgParticles = [];
    this.shootingStars = [];
    this.logoElement = null;
    const styles = document.getElementById('welcome-styles');
    if (styles) {
      styles.remove();
    }
  }
  createParticles() {
    const width = this.canvasWidth || 800;
    const height = this.canvasHeight || 600;
    const config = this.particleConfig;
    this.particles = new Array(config.connected);
    for (let i = 0; i < config.connected; i++) {
      this.particles[i] = {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 1.2 + 0.8,
        brightness: Math.random() * 0.5 + 0.5,
        phase: Math.random() * this.TWO_PI
      };
    }
    this.bgParticles = new Array(config.background);
    for (let i = 0; i < config.background; i++) {
      this.bgParticles[i] = {
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1 + 0.4,
        brightness: Math.random() * 0.3 + 0.1,
        phase: Math.random() * this.TWO_PI,
        speed: Math.random() * 0.01 + 0.005
      };
    } 
    this.shootingStars = [];
  }
  startAnimation(enableLogoFloat = true) {
    this.enableLogoFloat = enableLogoFloat;
    this.animateParticles();
  }
  animateParticles() {
    if (!this.ctx || !this.canvas) return;
    this.animationId = requestAnimationFrame(() => this.animateParticles());
    const now = performance.now();
    const elapsed = now - this.lastFrameTime;
    if (elapsed < this.frameInterval) return;
    this.lastFrameTime = now - (elapsed % this.frameInterval);
    const width = this.canvasWidth;
    const height = this.canvasHeight;
    if (!width || !height) return;
    this.ctx.clearRect(0, 0, width, height);
    this.time += 0.03;
    const timeSpeed = this.time * 0.02;
    this.renderBackgroundParticles();
    this.updateParticlePositions(width, height);
    this.renderConnections();
    this.renderMainParticles(timeSpeed);
    if (Math.random() < this.particleConfig.shootingStarChance) {
      this.createShootingStar(width, height);
    }
    this.updateShootingStars(width, height);
    if (this.enableLogoFloat && this.logoElement) {
      const floatY = Math.sin(this.time * 0.5) * 10;
      this.logoElement.style.transform = `translate3d(0, ${floatY}px, 0)`;
    }
  }
  renderBackgroundParticles() {
    for (let i = 0; i < this.bgParticles.length; i++) {
      const p = this.bgParticles[i];
      const brightness = p.brightness * (0.5 + 0.5 * Math.sin(this.time * p.speed + p.phase));   
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, this.TWO_PI);
      this.ctx.fillStyle = `rgba(150, 200, 255, ${brightness})`;
      this.ctx.fill();
    }
  }
  updateParticlePositions(width, height) {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;   
      if (p.x <= 0) { 
        p.x = 0; 
        p.vx = -p.vx; 
      } else if (p.x >= width) { 
        p.x = width; 
        p.vx = -p.vx; 
      }
      if (p.y <= 0) { 
        p.y = 0; 
        p.vy = -p.vy; 
      } else if (p.y >= height) { 
        p.y = height; 
        p.vy = -p.vy; 
      }
    }
  }
  renderConnections() {
    this.ctx.lineWidth = 0.8;
    for (let i = 0; i < this.particles.length; i++) {
      const p1 = this.particles[i];
      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < this.maxDistSq) {
          const opacity = (1 - Math.sqrt(distSq) / this.particleConfig.maxDistance) * 0.3;
          this.ctx.strokeStyle = `rgba(61, 210, 243, ${opacity})`;
          this.ctx.beginPath();
          this.ctx.moveTo(p1.x, p1.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.stroke();
        }
      }
    }
  }
  renderMainParticles(timeSpeed) {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const brightness = p.brightness * (0.7 + 0.3 * Math.sin(timeSpeed + p.phase));
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * 1.8, 0, this.TWO_PI);
      this.ctx.fillStyle = `rgba(97, 230, 255, ${brightness * 0.25})`;
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, this.TWO_PI);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
      this.ctx.fill();
    }
  }
}
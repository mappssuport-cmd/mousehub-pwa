// ============================================
// UTILIDADES DE UI (Toast, Notificaciones)
// ============================================

export class UIHelpers {
  static toastContainer = null;
  static toastQueue = [];
  static isShowingToast = false;

  static init() {
    if (!this.toastContainer) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.id = 'toast-container';
      this.toastContainer.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10000;
        pointer-events: none;
      `;
      document.body.appendChild(this.toastContainer);
    }
  }

  static showToast(message, options = {}) {
    const {
      duration = 3000,
      type = 'info', // 'info', 'success', 'warning', 'error'
      position = 'bottom' // 'top', 'bottom'
    } = options;

    this.init();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const colors = {
      info: { bg: 'rgba(61, 210, 243, 0.95)', border: '#3dd2f3' },
      success: { bg: 'rgba(46, 213, 115, 0.95)', border: '#2ed573' },
      warning: { bg: 'rgba(255, 177, 66, 0.95)', border: '#ffb142' },
      error: { bg: 'rgba(255, 71, 87, 0.95)', border: '#ff4757' },
      tv: { bg: 'rgba(138, 43, 226, 0.95)', border: '#8a2be2' }
    };

    const color = colors[type] || colors.info;

    toast.style.cssText = `
      background: ${color.bg};
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      border: 2px solid ${color.border};
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(10px);
      font-size: 16px;
      font-weight: 500;
      text-align: center;
      opacity: 0;
      transform: translateY(${position === 'top' ? '-20px' : '20px'});
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: auto;
      max-width: 90vw;
      word-wrap: break-word;
    `;

    toast.textContent = message;
    this.toastContainer.appendChild(toast);

    // Animar entrada
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    // Animar salida y remover
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = `translateY(${position === 'top' ? '-20px' : '20px'})`;
      
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, duration);
  }

  static showTVDetectedMessage() {
    this.showToast('📺 Smart TV detectada - Funcionalidad limitada', {
      type: 'tv',
      duration: 4000
    });
  }

  static showMobileDetectedMessage() {
    this.showToast('📱 Dispositivo móvil detectado', {
      type: 'success',
      duration: 2000
    });
  }

  static showLoading(message = 'Cargando...') {
    this.init();
    
    const loader = document.createElement('div');
    loader.id = 'global-loader';
    loader.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(2, 2, 14, 0.9);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      backdrop-filter: blur(10px);
    `;

    loader.innerHTML = `
      <div style="
        width: 50px;
        height: 50px;
        border: 4px solid rgba(61, 210, 243, 0.3);
        border-top-color: #3dd2f3;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      "></div>
      <p style="
        color: white;
        margin-top: 20px;
        font-size: 16px;
        font-weight: 500;
      ">${message}</p>
      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;

    document.body.appendChild(loader);
    return loader;
  }

  static hideLoading() {
    const loader = document.getElementById('global-loader');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 300);
    }
  }
}
/**
 * HelpClass - Utilidades generales
 * Compatible con Chrome 75+ (sin optional chaining ni nullish coalescing)
 */

export class HelpClass {
  // ============================================
  // POLÍTICA DE PRIVACIDAD
  // ============================================
  static openPrivacyPolicy() {
    var url = 'TU_URL_DE_POLITICA';
    window.open(url, '_blank');
  }

  // ============================================
  // CONFIGURACIÓN DE APARIENCIA (FULLSCREEN)
  // ============================================
  static setupAppearance() {
    this.setupViewport();
    this.setupThemeColor();
    this.setupStatusBar();
    this.preventZoom();
    this.setupFullscreen();
  }
  


  // ============================================
// OVERLAY
// ============================================
static setupOverlay(overlayElement, clickCallback) {
  if (!overlayElement) return;
  
  overlayElement.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (clickCallback && typeof clickCallback === 'function') {
      clickCallback();
    }
  });
}

// ============================================
// BACK HANDLER (Android back button/history)
// ============================================
static setupBackHandler(isDrawerOpenCallback, closeDrawerCallback, exitMessage) {
  if (!exitMessage) exitMessage = 'Presiona de nuevo para salir';
  
  let backButtonPressed = false;
  let backButtonTimer = null;
  
  // Handle browser back button
  window.addEventListener('popstate', function(event) {
    event.preventDefault();
    
    if (isDrawerOpenCallback && typeof isDrawerOpenCallback === 'function') {
      const isDrawerOpen = isDrawerOpenCallback();
      
      if (isDrawerOpen && closeDrawerCallback && typeof closeDrawerCallback === 'function') {
        closeDrawerCallback();
        return;
      }
    }
    
    // Handle app exit
    if (!backButtonPressed) {
      backButtonPressed = true;
      HelpClass.showToast(exitMessage);
      
      if (backButtonTimer) clearTimeout(backButtonTimer);
      backButtonTimer = setTimeout(function() {
        backButtonPressed = false;
      }, 2000);
    } else {
      // Second press - exit app
      if (typeof navigator !== 'undefined' && navigator.app) {
        navigator.app.exitApp();
      } else {
        window.close(); // Try to close window
      }
    }
  });
  
  // Handle Android back button (for Cordova/Capacitor)
  document.addEventListener('backbutton', function(e) {
    e.preventDefault();
    
    if (isDrawerOpenCallback && typeof isDrawerOpenCallback === 'function') {
      const isDrawerOpen = isDrawerOpenCallback();
      
      if (isDrawerOpen && closeDrawerCallback && typeof closeDrawerCallback === 'function') {
        closeDrawerCallback();
        return;
      }
    }
    
    // Handle app exit
    if (!backButtonPressed) {
      backButtonPressed = true;
      HelpClass.showToast(exitMessage);
      
      if (backButtonTimer) clearTimeout(backButtonTimer);
      backButtonTimer = setTimeout(function() {
        backButtonPressed = false;
      }, 2000);
    } else {
      // Second press - exit app
      if (typeof navigator !== 'undefined' && navigator.app) {
        navigator.app.exitApp();
      }
    }
  }, false);
}

// ============================================
// NOTIFICATION PERMISSION
// ============================================
static async checkNotificationPermission() {
  if (!("Notification" in window)) {
    console.log("Este navegador no soporta notificaciones");
    return false;
  }
  
  if (Notification.permission === "granted") {
    return true;
  }
  
  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }
  
  return false;
}
  /**
   * ✅ Configurar viewport responsivo
   */
  static setupViewport() {
    var viewport = document.querySelector('meta[name="viewport"]');
    
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    
    viewport.content = 
      'width=device-width, ' +
      'initial-scale=1.0, ' +
      'maximum-scale=1.0, ' +
      'user-scalable=no, ' +
      'viewport-fit=cover';
  }
  
  /**
   * ✅ Cambiar color del theme dinámicamente
   */
  static setThemeColor(color) {
    var themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) {
      themeColor.content = color;
    }
    
    var appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (appleStatusBar) {
      appleStatusBar.content = 'black';
    }
  }

  /**
   * ✅ Configurar color del theme (status bar/address bar)
   */
  static setupThemeColor(color) {
    if (!color) color = '#02020E';
    
    var themeColor = document.querySelector('meta[name="theme-color"]');
    if (!themeColor) {
      themeColor = document.createElement('meta');
      themeColor.name = 'theme-color';
      document.head.appendChild(themeColor);
    }
    themeColor.content = color;
    
    var appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!appleStatusBar) {
      appleStatusBar = document.createElement('meta');
      appleStatusBar.name = 'apple-mobile-web-app-status-bar-style';
      document.head.appendChild(appleStatusBar);
    }
    appleStatusBar.content = 'black';
    
    var msTileColor = document.querySelector('meta[name="msapplication-TileColor"]');
    if (!msTileColor) {
      msTileColor = document.createElement('meta');
      msTileColor.name = 'msapplication-TileColor';
      document.head.appendChild(msTileColor);
    }
    msTileColor.content = color;
  }
  
  /**
   * ✅ Configurar status bar para PWA
   */
  static setupStatusBar() {
    var capable = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
    if (!capable) {
      capable = document.createElement('meta');
      capable.name = 'apple-mobile-web-app-capable';
      capable.content = 'yes';
      document.head.appendChild(capable);
    }
    
    var msApp = document.querySelector('meta[name="mobile-web-app-capable"]');
    if (!msApp) {
      msApp = document.createElement('meta');
      msApp.name = 'mobile-web-app-capable';
      msApp.content = 'yes';
      document.head.appendChild(msApp);
    }
  }
  
  /**
   * ✅ Prevenir zoom accidental en inputs (iOS)
   */
  static preventZoom() {
    var style = document.createElement('style');
    style.textContent = 
      'input[type="text"],' +
      'input[type="email"],' +
      'input[type="password"],' +
      'input[type="number"],' +
      'input[type="tel"],' +
      'textarea,' +
      'select {' +
      'font-size: max(16px, 1em);' +
      '}';
    document.head.appendChild(style);
  }
  
  /**
   * ✅ Intentar modo fullscreen
   */
  static async setupFullscreen() {
    var isPWA = false;
    
    try {
      if (window.matchMedia) {
        var standaloneMedia = window.matchMedia('(display-mode: standalone)');
        if (standaloneMedia) {
          isPWA = standaloneMedia.matches;
        }
      }
    } catch (e) {
      console.warn('No se puede detectar PWA:', e);
    }
    
    if (!isPWA) return;
    
    document.documentElement.style.setProperty('height', '100vh');
    document.documentElement.style.setProperty('height', '-webkit-fill-available');
  }
  
  /**
   * ✅ Detectar si el dispositivo tiene notch
   */
  static hasNotch() {
    if (typeof window === 'undefined') return false;
    
    var iPhone = /iPhone/.test(navigator.userAgent) && !window.MSStream;
    var aspect = window.screen.width / window.screen.height;
    
    var supportsEnv = false;
    try {
      supportsEnv = CSS.supports('padding-top: env(safe-area-inset-top)');
    } catch (e) {
      supportsEnv = false;
    }
    
    return iPhone && (aspect < 0.5 || supportsEnv);
  }
  
  /**
   * ✅ Obtener información del navegador
   */
  static getBrowserInfo() {
    var ua = navigator.userAgent;
    var browserName = 'Unknown';
    var browserVersion = 'Unknown';
    
    if (ua.includes('Chrome')) {
      browserName = 'Chrome';
      var match = ua.match(/Chrome\/(\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      browserName = 'Safari';
      var match = ua.match(/Version\/(\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } else if (ua.includes('Firefox')) {
      browserName = 'Firefox';
      var match = ua.match(/Firefox\/(\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } else if (ua.includes('Edge')) {
      browserName = 'Edge';
      var match = ua.match(/Edge\/(\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    }
    
    return { browserName: browserName, browserVersion: browserVersion };
  }
  
  /**
   * ✅ Logging condicional
   */
  static log() {
    var args = Array.prototype.slice.call(arguments);
    console.log.apply(console, ['[MouseHub]'].concat(args));
  }
  
  static error() {
    var args = Array.prototype.slice.call(arguments);
    console.error.apply(console, ['[MouseHub Error]'].concat(args));
  }
  
  /**
   * ✅ Vibración
   */
  static vibrate(pattern) {
    if (!pattern) pattern = 50;
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }
  
  /**
   * ✅ Copiar al portapapeles
   */
  static async copyToClipboard(text) {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return true;
      }
    } catch (err) {
      this.error('Error al copiar:', err);
      return false;
    }
  }
  
  /**
   * ✅ Compartir (Web Share API)
   */
  static async share(data) {
    if (navigator.share) {
      try {
        await navigator.share(data);
        return true;
      } catch (err) {
        if (err.name !== 'AbortError') {
          this.error('Error al compartir:', err);
        }
        return false;
      }
    }
    return false;
  }

  // ============================================
  // DRAWER - ABRIR
  // ============================================
  static openDrawer(drawerElement, overlayElement) {
    if (!drawerElement || !overlayElement) return;

    drawerElement.style.transform = 'translateX(0)';
    drawerElement.style.transition = 'transform 0.3s ease-out';

    overlayElement.style.display = 'block';
    overlayElement.style.opacity = '0';
    
    overlayElement.offsetHeight;
    
    overlayElement.style.transition = 'opacity 0.3s ease-out';
    overlayElement.style.opacity = '1';

    document.body.style.overflow = 'hidden';
  }

  // ============================================
  // DRAWER - CERRAR
  // ============================================
  static closeDrawer(drawerElement, overlayElement, drawerWidth) {
    if (!drawerWidth) drawerWidth = 280;
    if (!drawerElement || !overlayElement) return;

    drawerElement.style.transform = 'translateX(-' + drawerWidth + 'px)';
    drawerElement.style.transition = 'transform 0.3s ease-in';

    overlayElement.style.transition = 'opacity 0.3s ease-in';
    overlayElement.style.opacity = '0';

    setTimeout(function() {
      overlayElement.style.display = 'none';
      document.body.style.overflow = '';
    }, 300);
  }

  // ============================================
  // TOAST
  // ============================================
  static showToast(message, duration) {
    if (!duration) duration = 2000;
    
    var toast = document.getElementById('app-toast');
    
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.style.cssText = 
        'position: fixed;' +
        'bottom: 80px;' +
        'left: 50%;' +
        'transform: translateX(-50%);' +
        'background: rgba(0, 0, 0, 0.8);' +
        'color: white;' +
        'padding: 12px 24px;' +
        'border-radius: 8px;' +
        'font-family: var(--font-primary);' +
        'font-size: 14px;' +
        'z-index: 10000;' +
        'pointer-events: none;' +
        'opacity: 0;' +
        'transition: opacity 0.3s ease;' +
        'white-space: pre-line;' +
        'text-align: left;' +
        'max-width: 90vw;';
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.opacity = '1';

    setTimeout(function() {
      toast.style.opacity = '0';
    }, duration);
  }

  // ============================================
  // VALIDAR EMAIL
  // ============================================
  static isValidEmail(email) {
    var regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  // ============================================
  // FORMATEAR FECHA
  // ============================================
  static formatDate(dateString) {
    try {
      var date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  }

  // ============================================
  // VALIDAR FECHA DE VENCIMIENTO
  // ============================================
  static isExpired(fechaVencimiento) {
    try {
      var vencimiento = new Date(fechaVencimiento);
      var hoy = new Date();
      return vencimiento < hoy;
    } catch (error) {
      console.error('Error validando fecha:', error);
      return false;
    }
  }

  /**
   * ✅ Verificar soporte de características
   */
  static checkSupport() {
    var browser = this.getBrowserInfo();
    
    var support = {
      browser: browser,
      features: {
        serviceWorker: 'serviceWorker' in navigator,
        notifications: 'Notification' in window,
        webShare: 'share' in navigator,
        clipboard: 'clipboard' in navigator,
        vibrate: 'vibrate' in navigator,
        geolocation: 'geolocation' in navigator,
        localStorage: this.testLocalStorage(),
        indexedDB: 'indexedDB' in window,
        webGL: this.testWebGL(),
        canvas: this.testCanvas(),
        backdrop: this.testBackdropFilter(),
        grid: this.testCSSFeature('display', 'grid'),
        flexbox: this.testCSSFeature('display', 'flex'),
        customProperties: this.testCSSFeature('--custom', 'value')
      }
    };
    
    this.log('Support Info:', support);
    return support;
  }
  
  static testLocalStorage() {
    try {
      var test = '__test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }
  
  static testWebGL() {
    try {
      var canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  }
  
  static testCanvas() {
    try {
      var canvas = document.createElement('canvas');
      return !!(canvas.getContext && canvas.getContext('2d'));
    } catch (e) {
      return false;
    }
  }
  
  static testBackdropFilter() {
    try {
      return CSS.supports('backdrop-filter', 'blur(10px)');
    } catch (e) {
      return false;
    }
  }
  
  static testCSSFeature(property, value) {
    try {
      return CSS.supports(property, value);
    } catch (e) {
      return false;
    }
  }
}
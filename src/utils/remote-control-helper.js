// utils/remote-control-helper.js

export class RemoteControlHelper {
  constructor() {
    this.focusableElements = [];
    this.currentIndex = 0;
    this.isEnabled = false;
    this.container = null;
    this.debugMode = false; // Desactivado por defecto en producción
    this.showToast = null;
    
    // Mapeo exhaustivo de teclas
    this.keyMap = {
      // Códigos numéricos (Android TV viejo - PRIORIDAD)
      38: 'up', 40: 'down', 37: 'left', 39: 'right', 
      13: 'select', 32: 'select', 8: 'back', 27: 'back',
      
      // Android DPAD
      19: 'up', 20: 'down', 21: 'left', 22: 'right', 
      23: 'select', 66: 'select', 4: 'back',
      
      // Multimedia
      403: 'up', 404: 'down', 415: 'select',
      
      // Samsung Tizen
      10009: 'back', 10182: 'back',
      
      // LG webOS
      461: 'back',
      
      // Strings (navegadores modernos)
      'ArrowUp': 'up', 'ArrowDown': 'down', 
      'ArrowLeft': 'left', 'ArrowRight': 'right',
      'Enter': 'select', ' ': 'select', 
      'Escape': 'back', 'Backspace': 'back',
      
      // Variaciones
      'Up': 'up', 'Down': 'down', 'Left': 'left', 'Right': 'right',
      'MediaPlayPause': 'select', 'GoBack': 'back',
    };
    
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.lastKeyTime = 0;
    this.keyDelay = 150; // Aumentado para mejor respuesta en TVs
    this.navigationMode = '2d'; // '1d' o '2d'
  }

  setToastFunction(toastFn) {
    this.showToast = toastFn;
  }

  debugLog(message, data = null) {
    if (!this.debugMode) return;
    console.log(`[RemoteControl] ${message}`, data || '');
    
    if (this.showToast) {
      const logMsg = data ? `${message}: ${JSON.stringify(data)}` : message;
      this.showToast(logMsg, { type: 'info', duration: 2000 });
    }
  }

  init(containerSelector, focusableSelector = 'button, a, input, [tabindex="0"]') {
    this.containerSelector = containerSelector;
    this.focusableSelector = focusableSelector;
    
    this.debugLog('🎮 RemoteControl iniciando...');
    
    const initFn = () => {
      this.container = document.querySelector(containerSelector);
      
      if (!this.container) {
        setTimeout(initFn, 100);
        return;
      }
      
      this._start();
    };
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initFn);
    } else {
      setTimeout(initFn, 50);
    }
  }

  _start() {
    this.updateFocusableElements();
    this.enable();
    
    this.debugLog(`📋 Elementos focuseables: ${this.focusableElements.length}`);
    
    // Foco inicial con múltiples intentos
    [100, 300, 500].forEach(delay => {
      setTimeout(() => {
        if (this.focusableElements.length > 0 && this.currentIndex === 0) {
          this.focusElement(0);
        }
      }, delay);
    });
  }

  updateFocusableElements() {
    if (!this.container) {
      this.container = document.querySelector(this.containerSelector);
    }
    
    if (!this.container) {
      this.focusableElements = [];
      return;
    }

    this.focusableElements = Array.from(
      this.container.querySelectorAll(this.focusableSelector)
    ).filter(el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      
      return style.display !== 'none' && 
             style.visibility !== 'hidden' && 
             !el.disabled &&
             rect.width > 0 && 
             rect.height > 0;
    });

    // Validar índice actual
    if (this.currentIndex >= this.focusableElements.length) {
      this.currentIndex = Math.max(0, this.focusableElements.length - 1);
    }
    
    if (this.currentIndex < 0 && this.focusableElements.length > 0) {
      this.currentIndex = 0;
    }
  }

  enable() {
    if (this.isEnabled) return;
    
    this.debugLog('🔌 Habilitando listeners...');
    
    // Solo keydown en window con captura
    window.addEventListener('keydown', this.handleKeyDown, true);
    
    // Prevenir comportamiento por defecto del navegador
    document.body.style.setProperty('overflow', 'hidden', 'important');
    
    this.isEnabled = true;
    this.debugLog('✅ Listeners habilitados');
  }

  disable() {
    if (!this.isEnabled) return;
    
    window.removeEventListener('keydown', this.handleKeyDown, true);
    this.isEnabled = false;
  }

  handleKeyDown(event) {
    const now = Date.now();
    
    // Debounce estricto
    if (now - this.lastKeyTime < this.keyDelay) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
    
    // Mapear tecla (prioridad a keyCode)
    let action = this.keyMap[event.keyCode] || 
                 this.keyMap[event.which] || 
                 this.keyMap[event.key] || 
                 this.keyMap[event.code];
    
    if (!action) {
      this.debugLog('❓ Tecla no mapeada', {
        key: event.key,
        keyCode: event.keyCode,
        which: event.which
      });
      return;
    }

    this.debugLog(`✨ Acción: ${action}`);
    
    // CRÍTICO: Prevenir TODO antes de ejecutar acción
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    
    this.lastKeyTime = now;
    this.executeAction(action);
    
    return false;
  }

  executeAction(action) {
    switch (action) {
      case 'up':
      case 'down':
      case 'left':
      case 'right':
        this.navigate(action);
        break;
      case 'select':
        this.selectCurrent();
        break;
      case 'back':
        this.goBack();
        break;
    }
  }

  navigate(direction) {
    this.updateFocusableElements();
    
    if (this.focusableElements.length === 0) {
      this.debugLog('⚠️ No hay elementos para navegar');
      return;
    }

    const oldIndex = this.currentIndex;
    let newIndex;

    if (this.navigationMode === '1d') {
      // Navegación lineal (mejor para listas simples)
      if (direction === 'up' || direction === 'left') {
        newIndex = oldIndex - 1;
        if (newIndex < 0) newIndex = this.focusableElements.length - 1;
      } else if (direction === 'down' || direction === 'right') {
        newIndex = oldIndex + 1;
        if (newIndex >= this.focusableElements.length) newIndex = 0;
      } else {
        return;
      }
    } else {
      // Navegación 2D espacial (mejor para grids)
      newIndex = this.findNearestElement(direction);
    }

    if (newIndex !== oldIndex) {
      this.currentIndex = newIndex;
      this.focusElement(newIndex);
      
      this.debugLog(`📍 ${direction}: ${oldIndex} → ${newIndex}`);

      if (this.onNavigate) {
        this.onNavigate(direction, this.currentIndex);
      }
    }
  }

  findNearestElement(direction) {
    const current = this.focusableElements[this.currentIndex];
    if (!current) return 0;
    
    const currentRect = current.getBoundingClientRect();
    const currentCenter = {
      x: currentRect.left + currentRect.width / 2,
      y: currentRect.top + currentRect.height / 2
    };
    
    let bestIndex = this.currentIndex;
    let bestDistance = Infinity;
    
    this.focusableElements.forEach((el, idx) => {
      if (idx === this.currentIndex) return;
      
      const rect = el.getBoundingClientRect();
      const center = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
      
      // Verificar si está en la dirección correcta
      let isInDirection = false;
      const threshold = 50; // px de tolerancia
      
      switch(direction) {
        case 'up':
          isInDirection = center.y < currentCenter.y - threshold;
          break;
        case 'down':
          isInDirection = center.y > currentCenter.y + threshold;
          break;
        case 'left':
          isInDirection = center.x < currentCenter.x - threshold;
          break;
        case 'right':
          isInDirection = center.x > currentCenter.x + threshold;
          break;
      }
      
      if (!isInDirection) return;
      
      // Calcular distancia
      const dx = center.x - currentCenter.x;
      const dy = center.y - currentCenter.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = idx;
      }
    });
    
    // Si no encontró nada en esa dirección, wrap around
    if (bestIndex === this.currentIndex) {
      if (direction === 'up' || direction === 'left') {
        return this.focusableElements.length - 1;
      } else {
        return 0;
      }
    }
    
    return bestIndex;
  }

  selectCurrent() {
    if (this.focusableElements.length === 0) {
      this.debugLog('⚠️ No hay elementos para seleccionar');
      return;
    }
    
    const element = this.focusableElements[this.currentIndex];
    if (!element) return;
    
    this.debugLog(`🎯 Seleccionando: ${element.tagName}#${element.id}`);
    
    // Efecto visual
    this.addSelectEffect(element);
    
    // Ejecutar click después del efecto visual
    setTimeout(() => {
      try {
        element.click();
        this.debugLog('✅ Click ejecutado');
      } catch(e) {
        this.debugLog('❌ Click falló', e.message);
      }
      
      if (this.onSelect) {
        this.onSelect(element, this.currentIndex);
      }
    }, 80);
  }

  goBack() {
    this.debugLog('🔙 Botón BACK presionado');
    
    // IMPORTANTE: Llamar callback personalizado SIEMPRE
    if (this.onBack) {
      try {
        this.onBack();
        this.debugLog('✅ onBack ejecutado');
      } catch(e) {
        this.debugLog('❌ onBack falló', e.message);
      }
    } else {
      this.debugLog('⚠️ onBack no definido');
    }
    
    // NO hacer history.back() automáticamente
    // Eso debe ser decisión de la app
  }

  focusElement(index) {
    if (index < 0 || index >= this.focusableElements.length) return;
    
    // Limpiar focus previo
    this.focusableElements.forEach(el => {
      el.classList.remove('remote-focused');
      el.blur();
    });
    
    const target = this.focusableElements[index];
    if (!target) return;
    
    // Aplicar clase de foco
    target.classList.add('remote-focused');
    
    // Focus real
    setTimeout(() => {
      try {
        target.focus({ preventScroll: false });
        
        // Scroll inteligente
        const rect = target.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        const isVisible = (
          rect.top >= 0 && 
          rect.bottom <= viewportHeight &&
          rect.left >= 0 && 
          rect.right <= viewportWidth
        );
        
        if (!isVisible) {
          target.scrollIntoView({ 
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
          });
        }
      } catch(e) {
        this.debugLog('⚠️ Error en focus', e.message);
      }
    }, 50);
  }

  addSelectEffect(element) {
    if (!element) return;
    
    element.classList.add('remote-selecting');
    
    setTimeout(() => {
      element.classList.remove('remote-selecting');
    }, 200);
  }

  destroy() {
    this.debugLog('🛑 Destruyendo RemoteControl');
    this.disable();
    this.focusableElements = [];
    this.container = null;
    this.currentIndex = 0;
    this.showToast = null;
  }
}

export function injectRemoteStyles() {
  if (document.getElementById('remote-control-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'remote-control-styles';
  style.textContent = `
    /* Prevenir selección de texto */
    * {
      -webkit-user-select: none !important;
      -moz-user-select: none !important;
      user-select: none !important;
      -webkit-tap-highlight-color: transparent !important;
    }
    
    /* Estilos para elemento enfocado - MUCHO MÁS VISIBLE */
    .remote-focused {
      /* Borde grande y brillante */
      outline: none !important;
      border: 4px solid #3dd2f3 !important;
      border-radius: 12px !important;
      
      /* Fondo semi-transparente */
      background: linear-gradient(
        135deg, 
        rgba(61, 210, 243, 0.25) 0%, 
        rgba(31, 101, 224, 0.25) 100%
      ) !important;
      
      /* Sombra brillante y grande */
      box-shadow: 
        0 0 0 4px rgba(61, 210, 243, 0.3),
        0 0 30px rgba(61, 210, 243, 0.8),
        0 0 60px rgba(61, 210, 243, 0.5),
        inset 0 0 20px rgba(255, 255, 255, 0.1) !important;
      
      /* Aumentar tamaño ligeramente */
      transform: scale(1.05) !important;
      
      /* Z-index alto */
      z-index: 9999 !important;
      position: relative !important;
      
      /* Transición suave */
      transition: all 0.2s ease !important;
      
      /* Animación de pulso */
      animation: remote-pulse 1.5s ease-in-out infinite !important;
    }
    
    @keyframes remote-pulse {
      0%, 100% {
        box-shadow: 
          0 0 0 4px rgba(61, 210, 243, 0.3),
          0 0 30px rgba(61, 210, 243, 0.8),
          0 0 60px rgba(61, 210, 243, 0.5),
          inset 0 0 20px rgba(255, 255, 255, 0.1);
      }
      50% {
        box-shadow: 
          0 0 0 6px rgba(61, 210, 243, 0.5),
          0 0 40px rgba(61, 210, 243, 1),
          0 0 80px rgba(61, 210, 243, 0.7),
          inset 0 0 30px rgba(255, 255, 255, 0.2);
      }
    }
    
    /* Efecto al presionar */
    .remote-selecting {
      transform: scale(0.95) !important;
      background: rgba(61, 210, 243, 0.5) !important;
      box-shadow: 
        0 0 0 6px rgba(61, 210, 243, 0.6),
        0 0 50px rgba(61, 210, 243, 1),
        inset 0 0 30px rgba(255, 255, 255, 0.3) !important;
      transition: all 0.1s ease !important;
    }
    
    /* Asegurar que botones sean clickeables */
    button, a, input, [tabindex] {
      cursor: pointer !important;
    }
    
    /* Estilos específicos para botones en TV */
    @media (pointer: coarse) {
      button, a {
        min-height: 48px !important;
        min-width: 120px !important;
        font-size: 18px !important;
      }
    }
  `;
  
  document.head.appendChild(style);
}

export const remoteControl = new RemoteControlHelper();
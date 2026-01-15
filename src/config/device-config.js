// device-config.js - VERSIÓN CORREGIDA

export class DeviceConfig {
  constructor() {
    this.data = {
      timestamp: Date.now(),
      confidence: 0,
      detectedDevice: null,
      deviceCategory: null,
      reasons: [],
      indicators: {} // ← AÑADIDO: para tracking de indicadores
    };
    
    this.CONFIDENCE = {
      LOW: 30,
      MEDIUM: 60,
      HIGH: 85,
      VERY_HIGH: 95
    };
  }

  async detectAll() {
    try {
      console.log('🔍 Iniciando detección avanzada...');
      
      // Limpiar datos anteriores
      this.data.reasons = [];
      this.data.indicators = {};
      
      await Promise.allSettled([
        this.detectScreenAndViewport(),
        this.detectOrientation(),
        this.detectInputCapabilities(),
        this.detectSensors(),
        this.detectGPU(),
        this.detectCPU(),
        this.detectBattery(),
        this.detectNetwork(),
        this.detectStorage(),
        this.detectTouchAreas(),
        this.detectPerformance(),
        this.detectUserAgent()
      ]);

      this.analyzeAndDecide();
      
      return {
        ...this.data,
        confidenceLevel: this.getConfidenceLevel(this.data.confidence)
      };
    } catch (error) {
      console.error('Error en detección:', error);
      return this.data;
    }
  }

  async detectUserAgent() {
    const ua = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();
    
    // ═══════════════════════════════════════════════════════════════
    // PATRONES MEJORADOS CON MÁS DETECCIÓN DE TV STICKS
    // ═══════════════════════════════════════════════════════════════
    
    const tvPatterns = {
      // Amazon Fire TV (todos los modelos)
      isFireTV: /aftm|aftb|afts|aftt|aftss|aftn|aftmm|aftka|aftrs|aftle|aftso|aftpr|afteu|afta|aftkmst|afteamr|aftjmst|aftbamr|silk.*fire\s*tv|fire\s*tv|amazon.*fire/i.test(ua),
      
      // Android TV genérico
      isAndroidTV: /android\s*tv|google\s*tv|googletv|atv|bravia|philips|hisense|tcl.*android|mi\s*box|mibox|xiaomi.*tv|shield.*tv/i.test(ua),
      
      // Chromecast
      isChromecast: /crkey|chromecast|ccast|google\s*cast/i.test(ua),
      
      // Smart TVs
      isWebOS: /web0s|webos|netcast|lg.*tv|lge|large\s*screen/i.test(ua),
      isTizen: /tizen|samsung.*tv|smart-tv|smarttv/i.test(ua),
      isRoku: /roku/i.test(ua),
      isVizio: /vizio|smartcast/i.test(ua),
      isPlayStation: /playstation|ps4|ps5/i.test(ua),
      isXbox: /xbox|xboxone/i.test(ua),
      
      // Genéricos de TV
      hasLargeScreen: /large\s*screen|leanback|tv\s*browser|television/i.test(ua),
      hasTVKeyword: /\btv\b|television|smart-tv|smarttv|googletv|androidtv|hbbtv/i.test(ua)
    };
    
    // Determinar si es TV/TV Stick PRIMERO
    const isAnyTV = tvPatterns.isFireTV || 
                    tvPatterns.isAndroidTV || 
                    tvPatterns.isChromecast ||
                    tvPatterns.isWebOS || 
                    tvPatterns.isTizen || 
                    tvPatterns.isRoku ||
                    tvPatterns.isVizio ||
                    tvPatterns.isPlayStation ||
                    tvPatterns.isXbox ||
                    tvPatterns.hasTVKeyword ||
                    tvPatterns.hasLargeScreen;

    // ═══════════════════════════════════════════════════════════════
    // PATRONES DE MÓVILES - SOLO si NO es TV
    // ═══════════════════════════════════════════════════════════════
    
    const mobilePatterns = {
      // Solo marcar como Android Mobile si NO es TV
      isAndroidMobile: !isAnyTV && /android/i.test(ua) && /mobile/i.test(ua),
      isAndroidTablet: !isAnyTV && /android/i.test(ua) && !/mobile/i.test(ua),
      isIPhone: /iphone/i.test(ua),
      isIPad: /ipad/i.test(ua) || (platform === 'macintel' && navigator.maxTouchPoints > 1)
    };
    
    const desktopPatterns = {
      isWindows: /windows/i.test(ua) || /win32|win64/i.test(platform),
      isMac: /macintosh|mac os x/i.test(ua) && navigator.maxTouchPoints < 2,
      isLinux: /linux/i.test(ua) && !isAnyTV && !/android/i.test(ua)
    };

    const uaData = {
      raw: navigator.userAgent,
      platform: navigator.platform,
      vendor: navigator.vendor,
      maxTouchPoints: navigator.maxTouchPoints,
      patterns: {
        ...tvPatterns,
        ...mobilePatterns,
        ...desktopPatterns,
        // Flag consolidado
        isAnyTV: isAnyTV
      }
    };

    // ═══════════════════════════════════════════════════════════════
    // GUARDAR INDICADORES PARA DEBUG
    // ═══════════════════════════════════════════════════════════════
    
    this.data.indicators = {
      ...this.data.indicators,
      isTV: isAnyTV,
      isFireTV: tvPatterns.isFireTV,
      isAndroidTV: tvPatterns.isAndroidTV,
      isChromecast: tvPatterns.isChromecast,
      isSmartTV: tvPatterns.isWebOS || tvPatterns.isTizen,
      isMobile: mobilePatterns.isAndroidMobile || mobilePatterns.isIPhone,
      isTablet: mobilePatterns.isAndroidTablet || mobilePatterns.isIPad,
      isDesktop: desktopPatterns.isWindows || desktopPatterns.isMac || desktopPatterns.isLinux
    };

    // ═══════════════════════════════════════════════════════════════
    // AGREGAR RAZONES DETALLADAS
    // ═══════════════════════════════════════════════════════════════

    if (tvPatterns.isFireTV) {
      this.data.reasons.push('🔥 User Agent contiene identificador Fire TV (AFTM/AFTB/AFTS/etc)');
    }
    if (tvPatterns.isAndroidTV) {
      this.data.reasons.push('📺 User Agent indica Android TV / Google TV');
    }
    if (tvPatterns.isChromecast) {
      this.data.reasons.push('📡 User Agent indica Chromecast');
    }
    if (tvPatterns.isWebOS) {
      this.data.reasons.push('📺 User Agent indica webOS (LG Smart TV)');
    }
    if (tvPatterns.isTizen) {
      this.data.reasons.push('📺 User Agent indica Tizen (Samsung Smart TV)');
    }
    if (tvPatterns.hasTVKeyword && !tvPatterns.isFireTV && !tvPatterns.isAndroidTV) {
      this.data.reasons.push('📺 User Agent contiene palabra clave "TV"');
    }

    if (mobilePatterns.isAndroidMobile) {
      this.data.reasons.push('📱 User Agent indica Android Mobile (con palabra "mobile")');
    }
    if (mobilePatterns.isIPhone) {
      this.data.reasons.push('📱 User Agent indica iPhone');
    }
    if (mobilePatterns.isAndroidTablet) {
      this.data.reasons.push('📱 User Agent indica Android Tablet (sin palabra "mobile")');
    }
    if (mobilePatterns.isIPad) {
      this.data.reasons.push('📱 User Agent indica iPad');
    }

    if (desktopPatterns.isWindows) {
      this.data.reasons.push('💻 User Agent indica Windows');
    }
    if (desktopPatterns.isMac) {
      this.data.reasons.push('💻 User Agent indica macOS');
    }
    if (desktopPatterns.isLinux) {
      this.data.reasons.push('💻 User Agent indica Linux Desktop');
    }

    this.data.userAgent = uaData;
    return uaData;
  }

  async detectScreenAndViewport() {
    const screen = window.screen;
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1
    };

    const screenData = {
      screen: {
        width: screen.width,
        height: screen.height,
        availWidth: screen.availWidth,
        availHeight: screen.availHeight,
        colorDepth: screen.colorDepth,
        pixelDepth: screen.pixelDepth
      },
      viewport,
      differences: {
        widthDiff: Math.abs(screen.width - viewport.width),
        heightDiff: Math.abs(screen.height - viewport.height)
      },
      aspectRatios: {
        screen: screen.width / screen.height,
        viewport: viewport.width / viewport.height,
        isLandscape: viewport.width > viewport.height
      },
      dprAnalysis: {
        dpr: viewport.devicePixelRatio,
        isRetina: viewport.devicePixelRatio >= 2,
        isHighDPI: viewport.devicePixelRatio > 1.5
      }
    };

    this.data.screen = screenData;
    
    const totalPixels = screen.width * screen.height;
    const dpr = viewport.devicePixelRatio;
    
    // ═══════════════════════════════════════════════════════════════
    // INDICADORES DE PANTALLA MEJORADOS
    // ═══════════════════════════════════════════════════════════════
    
    const isTypicalTVResolution = 
      (screen.width === 1920 && screen.height === 1080) || // Full HD
      (screen.width === 1280 && screen.height === 720) ||  // HD
      (screen.width === 3840 && screen.height === 2160);   // 4K
    
    const hasLowDPR = dpr <= 1.5;
    const hasLargeScreen = screen.width >= 1280;
    
    this.data.indicators = {
      ...this.data.indicators,
      isTypicalTVResolution,
      hasLowDPR,
      hasLargeScreen,
      screenWidth: screen.width,
      screenHeight: screen.height,
      dpr: dpr
    };
    
    if (isTypicalTVResolution && hasLowDPR) {
      this.data.reasons.push(`🖥️ Resolución típica de TV: ${screen.width}x${screen.height} con DPR ${dpr}`);
    }
    
    if (screen.width < 500 && dpr >= 2) {
      this.data.reasons.push(`📱 Pantalla pequeña (${screen.width}px) con DPR alto (${dpr}) → Smartphone`);
    }
    
    if (screen.width >= 500 && screen.width < 1200 && dpr >= 1.5) {
      this.data.reasons.push(`📱 Pantalla media (${screen.width}px) con DPR ${dpr} → Tablet`);
    }
    
    if (screen.width >= 1200 && dpr <= 2 && screenData.differences.heightDiff < 100) {
      this.data.reasons.push(`💻 Pantalla grande (${screen.width}px) con viewport similar → Desktop/TV`);
    }
    
    return screenData;
  }

  async detectOrientation() {
    return new Promise((resolve) => {
      const orientationData = {
        current: {
          type: screen.orientation?.type || 'unknown',
          angle: screen.orientation?.angle || 0,
          supported: 'orientation' in screen
        },
        capabilities: {
          canChange: false,
          isLocked: false
        }
      };

      if (!screen.orientation) {
        this.data.reasons.push('⚠️ API de orientación no disponible');
        this.data.orientation = orientationData;
        resolve(orientationData);
        return;
      }

      const checkOrientationLock = async () => {
        try {
          const currentType = screen.orientation.type;
          orientationData.capabilities.canChange = true;
          
          setTimeout(() => {
            if (screen.orientation.type === currentType) {
              if (window.innerWidth > 1200) {
                orientationData.capabilities.isLocked = false;
              }
            }
            resolve(orientationData);
          }, 500);
        } catch (e) {
          resolve(orientationData);
        }
      };

      checkOrientationLock();
      this.data.orientation = orientationData;
    });
  }

  async detectInputCapabilities() {
    const inputData = {
      touch: {
        available: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        maxTouchPoints: navigator.maxTouchPoints || 0,
        touchEventTest: false,
        naturalTouch: false,
        hasRealTouch: false
      },
      pointer: {
        fine: window.matchMedia('(pointer: fine)').matches,
        coarse: window.matchMedia('(pointer: coarse)').matches
      },
      hover: {
        available: window.matchMedia('(hover: hover)').matches,
        none: window.matchMedia('(hover: none)').matches
      },
      mouse: {
        available: 'onmousemove' in window
      }
    };

    const hasTouchAPI = inputData.touch.available;
    const hasMultiTouch = inputData.touch.maxTouchPoints >= 5;
    const hasCoarsePointer = inputData.pointer.coarse;
    const hasNoHover = inputData.hover.none;
    
    inputData.touch.hasRealTouch = hasTouchAPI && hasCoarsePointer && hasNoHover;
    
    // ═══════════════════════════════════════════════════════════════
    // INDICADORES DE INPUT
    // ═══════════════════════════════════════════════════════════════
    
    this.data.indicators = {
      ...this.data.indicators,
      touchScreen: hasTouchAPI,
      maxTouchPoints: inputData.touch.maxTouchPoints,
      hasMultiTouch,
      hasRealTouch: inputData.touch.hasRealTouch,
      hasFinePointer: inputData.pointer.fine,
      hasCoarsePointer,
      hasHover: inputData.hover.available
    };
    
    if (inputData.touch.hasRealTouch && hasMultiTouch) {
      this.data.reasons.push(`👆 Touch real con ${inputData.touch.maxTouchPoints} puntos → Dispositivo táctil genuino`);
    } else if (hasTouchAPI && !hasCoarsePointer && inputData.hover.available) {
      this.data.reasons.push('🖱️ Touch API pero con puntero fino y hover → Emulación/laptop táctil/TV con control remoto');
    } else if (!hasTouchAPI && inputData.pointer.fine && inputData.hover.available) {
      this.data.reasons.push('🖱️ Solo mouse/trackpad → PC sin pantalla táctil');
    } else if (hasTouchAPI && inputData.touch.maxTouchPoints <= 1) {
      this.data.reasons.push('👆 Touch API con 0-1 puntos → Posible TV Stick con control remoto');
    }

    this.data.input = inputData;
    return inputData;
  }

  async detectSensors() {
    const sensorsData = {
      accelerometer: { available: false },
      gyroscope: { available: false },
      orientation: { available: false },
      motion: { available: false }
    };

    await Promise.race([
      new Promise(async (resolve) => {
        if ('Accelerometer' in window) {
          try {
            const acc = new Accelerometer({ frequency: 1 });
            acc.addEventListener('reading', () => {
              sensorsData.accelerometer.available = true;
              acc.stop();
            });
            acc.addEventListener('error', () => acc.stop());
            acc.start();
            setTimeout(() => acc.stop(), 500);
          } catch (e) {}
        }

        if ('DeviceOrientationEvent' in window) {
          const handler = (e) => {
            if (e.alpha !== null || e.beta !== null || e.gamma !== null) {
              sensorsData.orientation.available = true;
            }
            window.removeEventListener('deviceorientation', handler);
          };
          window.addEventListener('deviceorientation', handler);
          setTimeout(() => window.removeEventListener('deviceorientation', handler), 500);
        }

        if ('DeviceMotionEvent' in window) {
          const handler = (e) => {
            if (e.acceleration || e.accelerationIncludingGravity) {
              sensorsData.motion.available = true;
            }
            window.removeEventListener('devicemotion', handler);
          };
          window.addEventListener('devicemotion', handler);
          setTimeout(() => window.removeEventListener('devicemotion', handler), 500);
        }

        setTimeout(() => resolve(), 1000);
      }),
      new Promise(resolve => setTimeout(resolve, 1000))
    ]);

    const hasSensors = sensorsData.accelerometer.available || 
                      sensorsData.gyroscope.available || 
                      sensorsData.orientation.available ||
                      sensorsData.motion.available;
    
    this.data.indicators = {
      ...this.data.indicators,
      hasSensors,
      hasAccelerometer: sensorsData.accelerometer.available,
      hasGyroscope: sensorsData.gyroscope.available,
      hasMotion: sensorsData.motion.available
    };
    
    if (hasSensors) {
      this.data.reasons.push('📡 Sensores de movimiento detectados → Probable dispositivo móvil');
    } else {
      this.data.reasons.push('📡 Sin sensores de movimiento → PC/TV/TV Stick');
    }
    
    this.data.sensors = sensorsData;
    return sensorsData;
  }

  async detectGPU() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    const gpuData = {
      webgl: !!gl,
      vendor: 'unknown',
      renderer: 'unknown',
      architecture: 'unknown',
      maxTextureSize: 0
    };

    if (gl) {
      try {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          gpuData.vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'unknown';
          gpuData.renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown';
        }
        
        gpuData.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        
        const vendorLower = gpuData.vendor.toLowerCase();
        const rendererLower = gpuData.renderer.toLowerCase();
        
        // ═══════════════════════════════════════════════════════════════
        // DETECCIÓN DE GPU MEJORADA
        // ═══════════════════════════════════════════════════════════════
        
        // GPUs típicas de TV Sticks
        const tvStickGPUs = ['mali-400', 'mali-450', 'mali-g31', 'powervr sgx', 'powervr ge8100', 'powervr ge8300'];
        const isTVStickGPU = tvStickGPUs.some(gpu => rendererLower.includes(gpu));
        
        if (vendorLower.includes('qualcomm') || rendererLower.includes('adreno')) {
          gpuData.architecture = 'Qualcomm Adreno';
          this.data.reasons.push('🎮 GPU Qualcomm Adreno → Smartphone/Tablet Android o TV Box premium');
        } else if (vendorLower.includes('arm') || rendererLower.includes('mali')) {
          gpuData.architecture = 'ARM Mali';
          if (isTVStickGPU) {
            this.data.reasons.push(`🎮 GPU ${gpuData.renderer} → GPU típica de TV Stick económico`);
          } else {
            this.data.reasons.push('🎮 GPU ARM Mali → Dispositivo ARM (Móvil/TV/Tablet)');
          }
        } else if (rendererLower.includes('apple')) {
          gpuData.architecture = 'Apple GPU';
          this.data.reasons.push('🎮 GPU Apple → iPhone/iPad/Mac');
        } else if (vendorLower.includes('nvidia')) {
          gpuData.architecture = 'NVIDIA';
          if (rendererLower.includes('tegra')) {
            this.data.reasons.push('🎮 GPU NVIDIA Tegra → Shield TV / Tablet Android');
          } else {
            this.data.reasons.push('🎮 GPU NVIDIA → PC Gaming/Workstation');
          }
        } else if (vendorLower.includes('amd') || vendorLower.includes('ati')) {
          gpuData.architecture = 'AMD';
          this.data.reasons.push('🎮 GPU AMD → PC Desktop/Laptop');
        } else if (vendorLower.includes('intel')) {
          gpuData.architecture = 'Intel';
          this.data.reasons.push('🎮 GPU Intel → PC/Laptop con gráficos integrados');
        } else if (rendererLower.includes('powervr')) {
          gpuData.architecture = 'PowerVR';
          this.data.reasons.push('🎮 GPU PowerVR → TV Stick/Set-top box');
        }
        
        this.data.indicators = {
          ...this.data.indicators,
          gpuVendor: gpuData.vendor,
          gpuRenderer: gpuData.renderer,
          gpuArchitecture: gpuData.architecture,
          maxTextureSize: gpuData.maxTextureSize,
          isTVStickGPU
        };
        
        if (gpuData.maxTextureSize <= 4096) {
          this.data.reasons.push(`🎮 Max Texture Size: ${gpuData.maxTextureSize} → Dispositivo con GPU limitada`);
        }
        
      } catch (e) {
        console.warn('Error detectando GPU:', e);
      }
    }
    
    this.data.gpu = gpuData;
    return gpuData;
  }

  async detectCPU() {
    const cpuData = {
      cores: navigator.hardwareConcurrency || 1,
      performance: {
        level: 'unknown',
        benchmarkTime: 0
      }
    };

    const start = performance.now();
    let sum = 0;
    for (let i = 0; i < 500000; i++) {
      sum += Math.sqrt(i);
    }
    const time = performance.now() - start;
    cpuData.performance.benchmarkTime = time;
    
    this.data.indicators = {
      ...this.data.indicators,
      cpuCores: cpuData.cores,
      cpuBenchmark: Math.round(time)
    };
    
    if (time < 30 && cpuData.cores >= 4) {
      cpuData.performance.level = 'very_high';
      this.data.reasons.push(`⚡ CPU muy potente: ${cpuData.cores} cores, ${Math.round(time)}ms benchmark`);
    } else if (time < 60 && cpuData.cores >= 4) {
      cpuData.performance.level = 'high';
      this.data.reasons.push(`⚡ CPU potente: ${cpuData.cores} cores, ${Math.round(time)}ms benchmark`);
    } else if (time < 120) {
      cpuData.performance.level = 'medium';
      this.data.reasons.push(`⚡ CPU moderada: ${cpuData.cores} cores, ${Math.round(time)}ms benchmark`);
    } else {
      cpuData.performance.level = 'low';
      this.data.reasons.push(`⚡ CPU limitada: ${cpuData.cores} cores, ${Math.round(time)}ms benchmark → TV Stick/gama baja`);
    }

    this.data.cpu = cpuData;
    return cpuData;
  }

  async detectBattery() {
    const batteryData = {
      supported: 'getBattery' in navigator,
      exists: null,
      charging: null,
      level: null,
      isPlugged: false,
      hasRealBattery: false
    };

    if (batteryData.supported) {
      try {
        const battery = await navigator.getBattery();
        
        batteryData.exists = true;
        batteryData.charging = battery.charging;
        batteryData.level = battery.level;
        batteryData.isPlugged = battery.charging;
        
        batteryData.hasRealBattery = !(battery.charging && battery.level === 1);
        
        this.data.indicators = {
          ...this.data.indicators,
          hasBattery: batteryData.hasRealBattery,
          batteryLevel: Math.round(battery.level * 100),
          isCharging: battery.charging,
          alwaysPlugged: battery.charging && battery.level === 1
        };
        
        if (batteryData.hasRealBattery && !battery.charging) {
          this.data.reasons.push(`🔋 Batería al ${Math.round(battery.level * 100)}% descargándose → Dispositivo móvil`);
        } else if (battery.charging && battery.level === 1) {
          this.data.reasons.push('🔌 Siempre conectado al 100% → TV/TV Stick/PC Desktop');
        } else if (batteryData.hasRealBattery && battery.charging) {
          this.data.reasons.push(`🔋 Batería al ${Math.round(battery.level * 100)}% cargando → Móvil/Laptop`);
        }
        
      } catch (e) {
        batteryData.exists = false;
      }
    } else {
      this.data.indicators = {
        ...this.data.indicators,
        hasBattery: null,
        batteryAPISupported: false
      };
      this.data.reasons.push('🔋 API Battery no disponible → Posible iOS/Safari/TV');
    }
    
    this.data.battery = batteryData;
    return batteryData;
  }

  async detectNetwork() {
    const networkData = {
      type: 'unknown',
      effectiveType: 'unknown',
      hasCellular: false,
      hasWifi: false,
      hasEthernet: false,
      saveData: false
    };

    if ('connection' in navigator || 'mozConnection' in navigator || 'webkitConnection' in navigator) {
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      if (conn) {
        networkData.type = conn.type || 'unknown';
        networkData.effectiveType = conn.effectiveType || 'unknown';
        networkData.saveData = conn.saveData || false;
        
        this.data.indicators = {
          ...this.data.indicators,
          connectionType: conn.type,
          effectiveType: conn.effectiveType
        };
        
        if (conn.type === 'cellular' || conn.type === 'wimax') {
          networkData.hasCellular = true;
          this.data.reasons.push('📶 Conexión celular detectada → Smartphone con datos móviles');
        } else if (conn.type === 'wifi') {
          networkData.hasWifi = true;
          this.data.reasons.push('📶 Conexión WiFi → Cualquier dispositivo');
        } else if (conn.type === 'ethernet') {
          networkData.hasEthernet = true;
          this.data.reasons.push('📶 Conexión Ethernet → PC/Smart TV/Consola');
        }
      }
    }

    this.data.network = networkData;
    return networkData;
  }

  async detectStorage() {
    const storageData = {
      quota: null,
      usage: null,
      isLimited: false
    };

    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        storageData.quota = estimate.quota;
        storageData.usage = estimate.usage;
        
        const quotaGB = (estimate.quota / 1e9).toFixed(2);
        
        this.data.indicators = {
          ...this.data.indicators,
          storageQuota: quotaGB + ' GB',
          storageLimited: estimate.quota < 8e9
        };
        
        if (estimate.quota && estimate.quota < 8e9) {
          storageData.isLimited = true;
          this.data.reasons.push(`💾 Almacenamiento muy limitado: ${quotaGB}GB → TV Stick/Dispositivo económico`);
        } else if (estimate.quota) {
          this.data.reasons.push(`💾 Almacenamiento disponible: ${quotaGB}GB`);
        }
      } catch (e) {}
    }
    
    this.data.storage = storageData;
    return storageData;
  }

  async detectTouchAreas() {
    const touchAreaData = {
      hasNavigationBar: false,
      hasNotch: false,
      viewportDiff: 0
    };

    const viewportHeight = window.innerHeight;
    const screenHeight = window.screen.height;
    const diff = screenHeight - viewportHeight;
    
    touchAreaData.viewportDiff = diff;
    
    this.data.indicators = {
      ...this.data.indicators,
      viewportDiff: diff
    };
    
    if (diff > 40 && diff < 150) {
      touchAreaData.hasNavigationBar = true;
      this.data.reasons.push(`📱 Barra de navegación detectada (${diff}px diff) → Android moderno`);
    }
    
    if (CSS.supports('padding-top', 'env(safe-area-inset-top)')) {
      touchAreaData.hasNotch = true;
      this.data.indicators.hasNotch = true;
      this.data.reasons.push('📱 Área segura (safe-area) detectada → iPhone con notch/Dynamic Island');
    }
    
    this.data.touchAreas = touchAreaData;
    return touchAreaData;
  }

  async detectPerformance() {
    const perfData = {
      memory: null,
      isLowEnd: false
    };

    if ('memory' in performance) {
      perfData.memory = {
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      };
      
      const memoryMB = Math.round(performance.memory.jsHeapSizeLimit / 1e6);
      
      this.data.indicators = {
        ...this.data.indicators,
        jsMemoryLimit: memoryMB + ' MB'
      };
      
      if (performance.memory.jsHeapSizeLimit < 1e9) {
        perfData.isLowEnd = true;
        this.data.reasons.push(`💻 Memoria JS limitada: ${memoryMB}MB → Dispositivo gama baja/TV Stick`);
      }
    }

    this.data.performance = perfData;
    return perfData;
  }

  analyzeAndDecide() {
    const weights = {
      userAgent: 0,
      screen: 0,
      input: 0,
      sensors: 0,
      gpu: 0,
      battery: 0,
      network: 0,
      performance: 0,
      tvStickSignature: 0
    };

    let totalWeight = 0;
    let category = null;
    let subcategory = null;
    let tvStickScore = 0;

    // ═══════════════════════════════════════════════════════════════
    // CALCULAR TV STICK SCORE PRIMERO
    // ═══════════════════════════════════════════════════════════════

    if (this.data.gpu?.architecture?.includes('Mali') || 
        this.data.gpu?.architecture?.includes('ARM') ||
        this.data.gpu?.architecture?.includes('PowerVR')) {
      tvStickScore += 1;
    }
    if (this.data.indicators?.isTVStickGPU) {
      tvStickScore += 2; // Peso extra si es GPU típica de TV Stick
    }
    if (this.data.performance?.isLowEnd) {
      tvStickScore += 1;
    }
    if (this.data.storage?.isLimited) {
      tvStickScore += 1;
    }
    if (this.data.battery?.exists && !this.data.battery?.hasRealBattery) {
      tvStickScore += 2; // Sin batería real = fuerte indicador
    }
    if (this.data.screen?.screen?.width >= 1920 && this.data.screen?.dprAnalysis?.dpr <= 1.5) {
      tvStickScore += 1;
    }
    if (this.data.indicators?.isTypicalTVResolution) {
      tvStickScore += 1;
    }
    if (!this.data.sensors?.accelerometer?.available && 
        !this.data.sensors?.motion?.available) {
      tvStickScore += 1; // Sin sensores
    }
    if (this.data.input?.touch?.maxTouchPoints <= 1) {
      tvStickScore += 1; // Sin multitouch real
    }

    // ═══════════════════════════════════════════════════════════════
    // VERIFICAR USER AGENT PRIMERO
    // ═══════════════════════════════════════════════════════════════

    if (this.data.userAgent?.patterns) {
      const ua = this.data.userAgent.patterns;
      
      // TV tiene máxima prioridad
      if (ua.isAnyTV) {
        weights.userAgent = 35; // Peso alto para TV
        category = 'TV';
        
        if (ua.isFireTV) {
          subcategory = 'Fire TV Stick';
        } else if (ua.isChromecast) {
          subcategory = 'Chromecast';
        } else if (ua.isWebOS) {
          subcategory = 'LG Smart TV (webOS)';
        } else if (ua.isTizen) {
          subcategory = 'Samsung Smart TV (Tizen)';
        } else if (ua.isAndroidTV) {
          subcategory = 'Android TV / Google TV';
        } else if (ua.isRoku) {
          subcategory = 'Roku';
        } else if (ua.isPlayStation) {
          subcategory = 'PlayStation';
        } else if (ua.isXbox) {
          subcategory = 'Xbox';
        } else {
          subcategory = 'Smart TV / TV Stick';
        }
        
        console.log(`📺 User Agent indica TV: ${subcategory}`);
      }
      // Luego móviles
      else if (ua.isIPhone) {
        weights.userAgent = 30;
        category = 'Mobile';
        subcategory = 'iPhone';
      } else if (ua.isIPad) {
        weights.userAgent = 30;
        category = 'Tablet';
        subcategory = 'iPad';
      } else if (ua.isAndroidMobile) {
        // Solo si NO es TV
        weights.userAgent = 25;
        category = 'Mobile';
        subcategory = 'Android Phone';
      } else if (ua.isAndroidTablet) {
        weights.userAgent = 25;
        category = 'Tablet';
        subcategory = 'Android Tablet';
      }
      // Finalmente desktop
      else if (ua.isWindows) {
        weights.userAgent = 20;
        category = 'Desktop';
        subcategory = 'Windows PC';
      } else if (ua.isMac) {
        weights.userAgent = 20;
        category = 'Desktop';
        subcategory = 'Mac';
      } else if (ua.isLinux) {
        weights.userAgent = 15;
        category = 'Desktop';
        subcategory = 'Linux PC';
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // FIRMA DE TV STICK (puede sobreescribir)
    // ═══════════════════════════════════════════════════════════════

    if (tvStickScore >= 4) {
      weights.tvStickSignature = 35;
      
      // Sobreescribir si la firma es muy fuerte
      if (category !== 'TV' && tvStickScore >= 5) {
        console.log(`⚠️ Reclasificando: Score TV Stick ${tvStickScore}/9 muy alto`);
        category = 'TV';
        subcategory = 'TV Stick (Android TV)';
      } else if (category === 'TV' && !subcategory?.includes('Stick')) {
        subcategory = 'TV Stick (Android TV)';
      }
      
      this.data.reasons.push(`🎯 Firma de TV Stick: ${tvStickScore}/9 señales positivas`);
    } else if (tvStickScore >= 3 && category === 'Mobile') {
      // Si tiene 3+ señales de TV Stick pero se clasificó como móvil, advertir
      console.log(`⚠️ Posible falso positivo móvil: Score TV Stick ${tvStickScore}/9`);
      this.data.reasons.push(`⚠️ Posible TV Stick clasificado erróneamente (score: ${tvStickScore}/9)`);
    }

    // Guardar el score para debug
    this.data.tvStickScore = tvStickScore;

    // ═══════════════════════════════════════════════════════════════
    // RESTO DE ANÁLISIS
    // ═══════════════════════════════════════════════════════════════

    if (this.data.screen) {
      const { screen, dprAnalysis } = this.data.screen;
      const dpr = dprAnalysis.dpr;
      
      if (this.data.indicators?.isTypicalTVResolution && dpr <= 1.5) {
        weights.screen = 20;
        if (!category) category = 'TV';
      } else if (screen.width < 500 && dpr >= 2) {
        weights.screen = 20;
        if (!category) category = 'Mobile';
      } else if (screen.width >= 500 && screen.width < 1400 && dpr >= 1.5) {
        weights.screen = 18;
        if (!category) category = 'Tablet';
      } else if (screen.width >= 1200 && dpr <= 2) {
        weights.screen = 15;
        if (!category) category = 'Desktop';
      }
    }

    if (this.data.input) {
      const { touch, pointer, hover } = this.data.input;
      
      if (touch.hasRealTouch && touch.maxTouchPoints >= 5) {
        weights.input = 20;
        // NO cambiar categoría TV a otra cosa por tener touch
        if (category !== 'TV') {
          // El multitouch real sugiere móvil/tablet
        }
      } else if (!touch.available && pointer.fine && hover.available) {
        weights.input = 18;
        if (!category) category = 'Desktop';
      } else if (touch.maxTouchPoints <= 1) {
        // Poco o ningún touch = probablemente TV o desktop
        if (category === 'Mobile' && tvStickScore >= 3) {
          console.log('⚠️ Reclasificando Mobile → TV por falta de multitouch');
          category = 'TV';
          subcategory = 'TV Stick (Android TV)';
          weights.input = 15;
        }
      }
    }

    if (this.data.sensors) {
      const hasSensors = this.data.sensors.accelerometer.available || 
                        this.data.sensors.orientation.available ||
                        this.data.sensors.motion.available;
      
      if (hasSensors && category !== 'TV') {
        weights.sensors = 18;
      } else if (!hasSensors) {
        weights.sensors = 12;
        // Sin sensores favorece TV/Desktop
      }
    }

    if (this.data.gpu) {
      if (this.data.indicators?.isTVStickGPU) {
        weights.gpu = 20;
        if (!category) category = 'TV';
      } else if (this.data.gpu.architecture === 'NVIDIA' || 
                 this.data.gpu.architecture === 'AMD' || 
                 this.data.gpu.architecture === 'Intel') {
        weights.gpu = 15;
        if (!category) category = 'Desktop';
      } else {
        weights.gpu = 10;
      }
    }

    if (this.data.battery) {
      if (this.data.battery.hasRealBattery) {
        weights.battery = 20;
        if (category === 'TV') {
          // Batería real = NO es TV
          console.log('⚠️ Batería detectada, NO puede ser TV');
          if (tvStickScore < 4) {
            category = 'Mobile';
            subcategory = this.data.userAgent?.patterns?.isAndroidMobile ? 'Android Phone' : 'Smartphone';
          }
        }
      } else if (this.data.battery.exists && !this.data.battery.hasRealBattery) {
        weights.battery = 15;
        // Favorece TV/Desktop
      }
    }

    if (this.data.network) {
      if (this.data.network.hasCellular) {
        weights.network = 20;
        if (category === 'TV') {
          console.log('⚠️ Red celular detectada, NO puede ser TV');
          category = 'Mobile';
        }
      } else if (this.data.network.hasEthernet) {
        weights.network = 12;
      }
    }

    if (this.data.performance?.isLowEnd) {
      weights.performance = 10;
    }

    // ═══════════════════════════════════════════════════════════════
    // CÁLCULO FINAL
    // ═══════════════════════════════════════════════════════════════

    totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    const confidence = Math.min(100, Math.round(totalWeight));

    let detectedDevice = 'Unknown';
    
    if (category === 'Mobile') {
      detectedDevice = subcategory || 'Smartphone';
    } else if (category === 'Tablet') {
      detectedDevice = subcategory || 'Tablet';
    } else if (category === 'TV') {
      detectedDevice = subcategory || 'Smart TV / TV Stick';
    } else if (category === 'Desktop') {
      detectedDevice = subcategory || 'Desktop PC';
    }

    if (confidence < 40) {
      detectedDevice = 'Unknown (baja confianza)';
    }

    this.data.detectedDevice = detectedDevice;
    this.data.deviceCategory = category;
    this.data.confidence = confidence;
    this.data.weights = weights;
    this.data.totalWeight = totalWeight;
    
    console.log('═══════════════════════════════════════════════════');
    console.log(`🎯 Dispositivo: ${detectedDevice}`);
    console.log(`📂 Categoría: ${category}`);
    console.log(`📊 Confianza: ${confidence}%`);
    console.log(`📺 TV Stick Score: ${tvStickScore}/9`);
    console.log('Pesos:', weights);
    console.log('═══════════════════════════════════════════════════');
  }

  getConfidenceLevel(confidence) {
    if (confidence >= this.CONFIDENCE.VERY_HIGH) return 'MUY ALTA';
    if (confidence >= this.CONFIDENCE.HIGH) return 'ALTA';
    if (confidence >= this.CONFIDENCE.MEDIUM) return 'MEDIA';
    if (confidence >= this.CONFIDENCE.LOW) return 'BAJA';
    return 'MUY BAJA';
  }
}

export const deviceDetector = new DeviceConfig();
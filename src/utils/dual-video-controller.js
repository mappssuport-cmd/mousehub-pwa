import { SeekCalculator } from './seek-calculator.js';

export class DualVideoController {
  constructor(containerElement, options = {}) {
  this.container = containerElement;
  this.isTV = options.isTV || false;
  this.state = 'PAUSE';
  this.manifest = null;
  this.currentChunkIndex = 0;
  this.activePlayer = null;
  this.standbyPlayer = null;
  this.playerA = null;
  this.playerB = null;
  this.progressBar = null;
  this.scrubber = null;
  this.timeDisplay = null;
  this.loadingOverlay = null;
  this.videoWrapper = null;
  this.onChunkNeeded = null;
  this.onPrepareNextChunk = null;
  this.onSeek = null;
  this.onStateChange = null;
  this.onSaveTime = null;
  this.isSeeking = false;
  this.seekTargetTime = 0;
  this.updateInterval = null;
  this.saveTimeInterval = null;
  this.controlsTimeout = null;
  this.activeBlobUrl = null;
  this.standbyBlobUrl = null;
  this.activeEndedListener = null;
  this.activeErrorListener = null;
  this.activeTimeUpdateListener = null;
  this.preBufferThreshold = this.isTV ? 20 : 8;
  this.minReadyStateForSwap = HTMLMediaElement.HAVE_FUTURE_DATA;
  this.standbyPreloadInProgress = false;
  this.standbyPreloadedChunkIndex = -1;
}
 init(manifest) {
  this.manifest = manifest;
  this._render();
  this._setupEventListeners();
  this._addIOSFullscreenPrevention(); // ← NUEVO
  this._startUpdateLoop();
  console.log('🎬 DualVideoController inicializado');
}
_render() {
  const totalTimeFormatted = SeekCalculator.secondsToTime(this.manifest.total_duration);
  this.container.innerHTML = `
    <div class="video-player-wrapper" id="videoWrapper">
      <!-- DUAL PLAYERS -->
      <div class="dual-player-container">
        <video 
          id="videoPlayerA" 
          class="video-element"
          style="z-index: 2"
          playsinline
          webkit-playsinline
          x-webkit-airplay="deny"
          disablePictureInPicture
          disableRemotePlayback
        ></video>
        <video 
          id="videoPlayerB" 
          class="video-element"
          style="z-index: 1"
          playsinline
          webkit-playsinline
          x-webkit-airplay="deny"
          disablePictureInPicture
          disableRemotePlayback
        ></video>
      </div>
      <!-- CONTROLES -->
      <div class="video-controls" id="videoControls">
        <button id="playPauseBtn" class="control-btn" aria-label="Play/Pause">
          <span class="icon-play">▶</span>
          <span class="icon-pause" style="display:none">⏸</span>
        </button>
        <div class="timeline-wrapper">
          <div class="timeline-track" id="timelineTrack">
            <div class="timeline-buffer" id="timelineBuffer"></div>
            <div class="timeline-progress" id="timelineProgress"></div>
            <div class="timeline-scrubber" id="timelineScrubber"></div>
          </div>
        </div>
        <div class="time-display">
          <span id="currentTimeDisplay">0:00</span>
          <span>/</span>
          <span id="totalTimeDisplay">${totalTimeFormatted}</span>
        </div>
        <button id="fullscreenBtn" class="control-btn" aria-label="Fullscreen">⛶</button>
      </div>
      <div class="loading-overlay" id="loadingOverlay" style="display:none">
        <div class="loading-spinner"></div>
        <span id="loadingText">Cargando...</span>
      </div>  
      <div class="video-click-area" id="videoClickArea"></div>
    </div>
  `;
  this.playerA = document.getElementById('videoPlayerA');
  this.playerB = document.getElementById('videoPlayerB');
  this.activePlayer = this.playerA;
  this.standbyPlayer = this.playerB;
  this.progressBar = document.getElementById('timelineProgress');
  this.scrubber = document.getElementById('timelineScrubber');
  this.timeDisplay = document.getElementById('currentTimeDisplay');
  this.loadingOverlay = document.getElementById('loadingOverlay');
  this.videoWrapper = document.getElementById('videoWrapper'); 
  this._injectStyles();
}

_addIOSFullscreenPrevention() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (!isIOS) return;
  
  console.log('🍎 Configurando prevención fullscreen iOS');
  
  const preventNativeFullscreen = (video) => {
    // Prevenir entrada a fullscreen nativo de iOS
    video.addEventListener('webkitbeginfullscreen', (e) => {
      console.warn('⚠️ iOS intentó fullscreen nativo, saliendo...');
      // Salir inmediatamente del fullscreen nativo
      setTimeout(() => {
        if (video.webkitDisplayingFullscreen) {
          video.webkitExitFullscreen();
        }
      }, 0);
    });
    
    // Cuando iOS sale de fullscreen nativo, restaurar reproducción
    video.addEventListener('webkitendfullscreen', () => {
      console.log('📴 iOS salió de fullscreen nativo');
      // Si estábamos reproduciendo, continuar
      if (this.state === 'PLAY' && video === this.activePlayer) {
        setTimeout(() => {
          video.play().catch(e => console.log('Restaurando play:', e));
        }, 100);
      }
    });
    
    // Deshabilitar controles nativos por si acaso
    video.controls = false;
  };
  
  preventNativeFullscreen(this.playerA);
  preventNativeFullscreen(this.playerB);
}
/**
 * Carga un chunk en el player activo
 * @param {Blob} chunkBlob 
 * @param {number} chunkIndex
 * @param {number} startTime 
 */
async loadChunkToActive(chunkBlob, chunkIndex, startTime = 0) {
  console.log(`📼 Cargando chunk ${chunkIndex} (tiempo lógico: ${startTime}s)`);
  this.currentChunkIndex = chunkIndex;
  
  this._removeActiveListeners();
  if (this.activeBlobUrl) {
    URL.revokeObjectURL(this.activeBlobUrl);
    this.activeBlobUrl = null;
  }
  
  this.activeBlobUrl = URL.createObjectURL(chunkBlob);
  this.activePlayer.src = this.activeBlobUrl;
  this.activePlayer.preload = 'auto';
  
  // ✅ CORRECCIÓN: Pasar el array de chunks como tercer parámetro
  const physicalTime = SeekCalculator.logicalToPhysicalTime(
    chunkIndex, 
    startTime,
    this.manifest.chunks  // ← FALTABA ESTE PARÁMETRO
  );
  console.log(`🎯 Seek físico: ${physicalTime}s (preroll: ${chunkIndex > 0 ? SeekCalculator.PREROLL_MARGIN : 0}s)`);
  
  const loadPromise = new Promise((resolve, reject) => {
    let resolved = false;
    
    const onLoadedData = () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      
      // ✅ Aplicar seek físico
      this.activePlayer.currentTime = physicalTime;
      this.hideLoading();
      console.log(`✅ Player listo en chunk ${chunkIndex}, tiempo físico: ${physicalTime}s`);
      resolve();
    };
    
    const onError = (e) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      console.error('❌ Error cargando chunk:', e);
      reject(new Error('Error al cargar video'));
    };
    
    const timeout = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      cleanup();
      console.warn('⏱️ Timeout cargando chunk');
      resolve();
    }, 8000);
    
    const cleanup = () => {
      clearTimeout(timeout);
      this.activePlayer.removeEventListener('loadeddata', onLoadedData);
      this.activePlayer.removeEventListener('error', onError);
    };
    
    this.activePlayer.addEventListener('loadeddata', onLoadedData, { once: true });
    this.activePlayer.addEventListener('error', onError, { once: true });
  });
  
  this.activePlayer.load();
  
  try {
    await loadPromise;
  } catch (error) {
    this.showLoading('❌ Error: ' + error.message);
    await new Promise(r => setTimeout(r, 2000));
    this.hideLoading();
    throw error;
  }
  
  this._addActiveListeners();
  
  if (this.state === 'PLAY') {
    try {
      await this.activePlayer.play();
    } catch (e) {
      console.error('Error auto-play:', e);
    }
  }
  
  const nextIndex = chunkIndex + 1;
  if (nextIndex < this.manifest.total_chunks) {
    this.standbyPreloadInProgress = false;
    this.standbyPreloadedChunkIndex = -1;
    
    if (this.standbyBlobUrl) {
      URL.revokeObjectURL(this.standbyBlobUrl);
      this.standbyBlobUrl = null;
    }
    this.standbyPlayer.src = '';
    
    setTimeout(() => {
      if (this.onPrepareNextChunk && !this.standbyPreloadInProgress) {
        console.log(`📤 Solicitando chunk ${nextIndex}`);
        this.onPrepareNextChunk(nextIndex);
      }
    }, 800);
  }
}

/**
 * Precarga un chunk en el player standby
 * @param {Blob} chunkBlob 
 * @param {number} chunkIndex
 */
preloadChunkToStandby(chunkBlob, chunkIndex) {
  console.log(`📦 Precargando chunk ${chunkIndex} en standby`);
  
  if (this.standbyPreloadedChunkIndex === chunkIndex) {
    console.log(`✓ Chunk ${chunkIndex} ya precargado`);
    return;
  }
  
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  
  // Limpiar listeners previos
  if (this.standbyPlayer._standbyMetadataHandler) {
    this.standbyPlayer.removeEventListener('canplay', this.standbyPlayer._standbyMetadataHandler);
  }
  if (this.standbyPlayer._standbyErrorHandler) {
    this.standbyPlayer.removeEventListener('error', this.standbyPlayer._standbyErrorHandler);
  }
  
  if (this.standbyBlobUrl) {
    URL.revokeObjectURL(this.standbyBlobUrl);
  }
  
  this.standbyBlobUrl = URL.createObjectURL(chunkBlob);
  this.standbyPlayer.src = this.standbyBlobUrl;
  this.standbyPlayer.preload = 'auto';
  
  // ✅ iOS: NO mutar el video, solo bajar volumen
  // Esto preserva la capacidad de tener audio después
  if (isIOS) {
    this.standbyPlayer.muted = false;  // ← CRÍTICO: mantener unmuted
    this.standbyPlayer.volume = 0;      // ← Solo bajar volumen
  } else {
    this.standbyPlayer.muted = true;
    this.standbyPlayer.volume = 0;
  }
  
  const onCanPlay = async () => {
    const initialPhysicalTime = SeekCalculator.logicalToPhysicalTime(
      chunkIndex, 
      0,
      this.manifest.chunks 
    );
    
    console.log(`🎯 Pre-posicionando standby en ${initialPhysicalTime}s`);
    this.standbyPlayer.currentTime = initialPhysicalTime;
    
    // ✅ iOS: NO hacer micro play-pause - esto rompe el audio
    if (!isIOS) {
      // Solo para navegadores no-iOS: estabilizar decoder
      try {
        this.standbyPlayer.muted = true;
        await this.standbyPlayer.play();
        await new Promise(resolve => setTimeout(resolve, 100));
        this.standbyPlayer.pause();
        console.log('⏸️ Standby pausado y listo');
      } catch (e) {
        console.warn('⚠️ Play-pause falló:', e);
      }
    } else {
      console.log('🍎 iOS: Omitiendo micro play-pause para preservar capacidad de audio');
    }
    
    this.standbyPreloadedChunkIndex = chunkIndex;
    this.standbyPreloadInProgress = false;
    console.log(`✅ Standby listo chunk ${chunkIndex}`);
  };
  
  const onError = (e) => {
    console.error('❌ Error precargando standby:', e);
    this.standbyPreloadInProgress = false;
  };
  
  const timeout = setTimeout(() => {
    console.warn('⏱️ Timeout precarga standby');
    this.standbyPreloadInProgress = false;
  }, 8000);
  
  this.standbyPlayer._standbyMetadataHandler = () => {
    clearTimeout(timeout);
    onCanPlay();
  };
  
  this.standbyPlayer._standbyErrorHandler = (e) => {
    clearTimeout(timeout);
    onError(e);
  };
  
  this.standbyPlayer.addEventListener('canplay', this.standbyPlayer._standbyMetadataHandler, { once: true });
  this.standbyPlayer.addEventListener('error', this.standbyPlayer._standbyErrorHandler, { once: true });
  
  this.standbyPlayer.load();
  this.standbyPreloadInProgress = true;
}
_swapPlayers() {
  console.log('🔄 Iniciando swap de players');
  if (!this.standbyPlayer.src || this.standbyPlayer.src === '') {
    console.warn('⚠️ Standby vacío, solicitando chunk inmediato');
    const nextIndex = this.currentChunkIndex + 1;
    if (this.onChunkNeeded && nextIndex < this.manifest.total_chunks) {
      this.showLoading('Cargando siguiente parte...');
      this.onChunkNeeded(nextIndex);
    }
    return;
  }
  const standbyReady = this.standbyPlayer.readyState;
  console.log(`🔍 Standby readyState: ${standbyReady} (mínimo: ${this.minReadyStateForSwap})`);
  if (standbyReady < this.minReadyStateForSwap) {
    console.warn(`⏳ Standby no tiene buffer suficiente, esperando...`);
    this.showLoading('Buffering...');
    let attempts = 0;
    const maxAttempts = 30;
    const waitForBuffer = () => {
      attempts++;
      if (this.standbyPlayer.readyState >= this.minReadyStateForSwap) {
        console.log(`✅ Standby listo después de ${attempts * 100}ms`);
        this.hideLoading();
        this._performSwap();
      } else if (attempts >= maxAttempts) {
        console.error(`❌ Timeout esperando standby después de 3s`);
        this.hideLoading();
        // ✅ Intentar swap de todas formas o cargar urgente
        const nextIndex = this.currentChunkIndex + 1;
        if (this.onChunkNeeded && nextIndex < this.manifest.total_chunks) {
          this.onChunkNeeded(nextIndex);
        }
      } else {
        setTimeout(waitForBuffer, 100);
      }
    };
    
    // ✅ NUEVO: Forzar carga del standby si solo tiene metadata
    if (standbyReady === HTMLMediaElement.HAVE_METADATA) {
      console.log('🔧 Forzando carga de buffer en standby...');
      this.standbyPlayer.preload = 'auto';
      this.standbyPlayer.load();
    }
    
    waitForBuffer();
    return;
  }
  
  // ✅ ReadyState OK, proceder con swap
  this._performSwap();
}

/**
 * Realiza el swap entre players activo y standby
 */
_performSwap() {
  console.log('✨ Ejecutando swap seamless');
  this._removeActiveListeners();
  
  const shouldPlay = (this.state === 'PLAY');
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  
  // ✅ iOS: Configurar audio del standby ANTES de pausar el activo
  // Esto mantiene la "sesión de audio" activa
  if (isIOS) {
    this.standbyPlayer.muted = false;
    this.standbyPlayer.volume = 1.0;
  }
  
  this.activePlayer.pause();
  this.currentChunkIndex++;
  
  // Intercambiar z-index
  const tempZ = this.activePlayer.style.zIndex;
  this.activePlayer.style.zIndex = this.standbyPlayer.style.zIndex;
  this.standbyPlayer.style.zIndex = tempZ;
  
  // Intercambiar URLs
  const tempUrl = this.activeBlobUrl;
  this.activeBlobUrl = this.standbyBlobUrl;
  this.standbyBlobUrl = tempUrl;
  
  // Intercambiar referencias
  const temp = this.activePlayer;
  this.activePlayer = this.standbyPlayer;
  this.standbyPlayer = temp;
  
  // Configurar audio del nuevo activo
  this.activePlayer.muted = false;
  this.activePlayer.volume = 1.0;
  
  // Silenciar el nuevo standby
  if (isIOS) {
    this.standbyPlayer.muted = false;  // ← iOS: mantener unmuted
    this.standbyPlayer.volume = 0;      // ← Solo bajar volumen
  } else {
    this.standbyPlayer.muted = true;
    this.standbyPlayer.volume = 0;
  }
  
  console.log(`📍 Nuevo chunk activo: ${this.currentChunkIndex}`);
  
  // Limpiar listeners del nuevo standby
  const newStandby = this.standbyPlayer;
  if (newStandby._standbyMetadataHandler) {
    newStandby.removeEventListener('loadedmetadata', newStandby._standbyMetadataHandler);
  }
  if (newStandby._standbyErrorHandler) {
    newStandby.removeEventListener('error', newStandby._standbyErrorHandler);
  }
  
  // Limpiar standby
  this.standbyPlayer.src = '';
  if (this.standbyBlobUrl) {
    URL.revokeObjectURL(this.standbyBlobUrl);
    this.standbyBlobUrl = null;
  }
  
  this._addActiveListeners();
  
  if (shouldPlay) {
    const playWithAudio = async () => {
      try {
        // ✅ iOS: Audio ya configurado, play directo
        // El audio se configuró ANTES de pausar el video anterior
        await this.activePlayer.play();
        console.log('✅ Play con audio exitoso');
        
        // Verificación de seguridad
        setTimeout(() => {
          if (this.activePlayer.volume === 0) {
            console.warn('⚠️ Volumen en 0, restaurando...');
            this.activePlayer.volume = 1.0;
          }
          if (this.activePlayer.muted) {
            console.warn('⚠️ Video muteado, restaurando...');
            this.activePlayer.muted = false;
          }
        }, 100);
        
      } catch (err) {
        console.error('❌ Play bloqueado:', err);
        this.showLoading('Toca para continuar');
        
        const resumeOnClick = () => {
          this.hideLoading();
          this.activePlayer.muted = false;
          this.activePlayer.volume = 1.0;
          this.activePlayer.play();
          this.videoWrapper.removeEventListener('click', resumeOnClick);
          this.videoWrapper.removeEventListener('touchend', resumeOnClick);
        };
        
        this.videoWrapper.addEventListener('click', resumeOnClick, { once: true });
        this.videoWrapper.addEventListener('touchend', resumeOnClick, { once: true });
      }
    };
    
    // Esperar buffer si es necesario
    if (this.activePlayer.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
      console.log(`⏳ Esperando buffer (readyState: ${this.activePlayer.readyState})`);
      
      const waitForReady = () => {
        if (this.activePlayer.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
          console.log('✅ Buffer listo');
          playWithAudio();
        } else {
          setTimeout(waitForReady, 50);
        }
      };
      waitForReady();
    } else {
      playWithAudio();
    }
  }
  
  // Solicitar siguiente chunk
  const nextIndex = this.currentChunkIndex + 1;
  if (nextIndex < this.manifest.total_chunks && this.onPrepareNextChunk) {
    this.standbyPreloadInProgress = false;
    this.standbyPreloadedChunkIndex = -1;
    
    setTimeout(() => {
      if (!this.standbyPreloadInProgress) {
        console.log(`📤 Solicitando chunk ${nextIndex}`);
        this.onPrepareNextChunk(nextIndex);
      }
    }, 800);
  }
}

  _addActiveListeners() {
    this.activeEndedListener = () => this._handleChunkEnded();
    this.activePlayer.addEventListener('ended', this.activeEndedListener);
    this.activeErrorListener = (e) => {
      console.error('❌ Error de video:', e);
      this.showLoading('Error de reproducción');
    };
    this.activePlayer.addEventListener('error', this.activeErrorListener);
    this.activeTimeUpdateListener = () => this._checkPreBufferTrigger();
    this.activePlayer.addEventListener('timeupdate', this.activeTimeUpdateListener);
  }
  _removeActiveListeners() {
    if (this.activeEndedListener) {
      this.activePlayer.removeEventListener('ended', this.activeEndedListener);
      this.activeEndedListener = null;
    }
    if (this.activeErrorListener) {
      this.activePlayer.removeEventListener('error', this.activeErrorListener);
      this.activeErrorListener = null;
    }
    if (this.activeTimeUpdateListener) {
      this.activePlayer.removeEventListener('timeupdate', this.activeTimeUpdateListener);
      this.activeTimeUpdateListener = null;
    }
  }

_checkPreBufferTrigger() {
  if (!this.activePlayer.duration) return;
  const currentChunk = this.manifest.chunks[this.currentChunkIndex];
  const physicalDuration = currentChunk.physical_duration || currentChunk.duration;
  const timeRemaining = physicalDuration - this.activePlayer.currentTime;
  const triggerThreshold = this.isTV ? 20 : 8;
  if (Math.abs(timeRemaining - triggerThreshold) < 0.5 && !this.standbyPreloadInProgress) {
    console.log(`⏰ Quedan ${timeRemaining.toFixed(1)}s (físicos) del chunk - triggering preload`);
  }
  
  if (timeRemaining <= triggerThreshold) {
    this._requestNextChunkPreload();
  }
}


_checkPlayersState() {
  console.log('🔍 Estado players:', {
    activo: {
      src: this.activePlayer.src ? 'Sí' : 'No',
      readyState: this.activePlayer.readyState,
      currentTime: this.activePlayer.currentTime
    },
    standby: {
      src: this.standbyPlayer.src ? 'Sí' : 'No',
      readyState: this.standbyPlayer.readyState
    },
    currentChunk: this.currentChunkIndex
  });
}

_requestNextChunkPreload() {
  const nextIndex = this.currentChunkIndex + 1;
  if (nextIndex >= this.manifest.total_chunks) {
    return;
  }
  if (this.standbyPreloadInProgress) {
    console.log(`⏳ Descarga de chunk ${nextIndex} ya en progreso`);
    return;
  }
  if (this.standbyPreloadedChunkIndex === nextIndex) {
    console.log(`✓ Chunk ${nextIndex} ya precargado en standby`);
    return;
  }
  const standbyHasContent = this.standbyPlayer.src && this.standbyPlayer.src !== '';
  if (!standbyHasContent && this.onPrepareNextChunk) {
    console.log(`📤 Trigger automático: solicitando chunk ${nextIndex}`);
    this.standbyPreloadInProgress = true;
    this.onPrepareNextChunk(nextIndex);
  }
}

_handleChunkEnded() {
  const nextChunkIndex = this.currentChunkIndex + 1;
  console.log(`📼 Chunk ${this.currentChunkIndex} terminado`);
  if (nextChunkIndex >= this.manifest.total_chunks) {
    console.log('🏁 Video completo');
    this.state = 'ENDED';
    this._updatePlayPauseUI();
    
    if (this.onSaveTime) {
      this.onSaveTime(this.manifest.total_duration);
    }
    return;
  }
  if (this.standbyPlayer.src && this.standbyPlayer.src !== '') {
    console.log('✨ Transición seamless');
    this._swapPlayers();
  } else {
    console.log('⚠️ Standby no listo, solicitando chunk', nextChunkIndex);
    this.showLoading('Cargando siguiente parte...');   
    if (this.onChunkNeeded) {
      this.onChunkNeeded(nextChunkIndex);
    }
  }
}
_executeSeek() {
  const result = SeekCalculator.findChunkForTime(
    this.seekTargetTime,
    this.manifest.chunks
  );
  console.log(`🎯 Seek a ${SeekCalculator.secondsToTime(this.seekTargetTime)} -> Chunk ${result.chunkIndex}`);
  this.pause();
  this._removeActiveListeners();
  if (this.activeBlobUrl) {
    URL.revokeObjectURL(this.activeBlobUrl);
    this.activeBlobUrl = null;
  }
  if (this.standbyBlobUrl) {
    URL.revokeObjectURL(this.standbyBlobUrl);
    this.standbyBlobUrl = null;
  }
  this.activePlayer.src = '';
  this.standbyPlayer.src = ''; 
  if (this.onSeek) {
    this.showLoading('Cargando...');
    this.onSeek(result.chunkIndex, result.internalSecond);
  }
}
  togglePlayPause() {
    if (this.state === 'PLAY') {
      this.pause();
    } else {
      this.play();
    }
  }
  play() {
    this.state = 'PLAY';
    this.activePlayer.play().catch(e => {
      console.error('Error en play:', e);
    });
    this._updatePlayPauseUI(); 
    if (this.onStateChange) {
      this.onStateChange('PLAY');
    }
  }
  pause() {
    this.state = 'PAUSE';
    this.activePlayer.pause();
    this._updatePlayPauseUI();
    
    if (this.onStateChange) {
      this.onStateChange('PAUSE');
    }
  }
 _startUpdateLoop() {
  this.updateInterval = setInterval(() => {
    if (this.state === 'PLAY' && !this.isSeeking) {
      const absoluteTime = SeekCalculator.calculateAbsoluteTime(
        this.currentChunkIndex,
        this.activePlayer.currentTime,
        this.manifest.chunks
      );
      if (absoluteTime < 0) {
        console.warn('⚠️ Tiempo absoluto negativo, ajustando a 0');
        return;
      }
      
      this._updateProgressUI(absoluteTime);
      this.timeDisplay.textContent = SeekCalculator.secondsToTime(absoluteTime);
    }
  }, 500);
  
  this.saveTimeInterval = setInterval(() => {
    if (this.state === 'PLAY' && this.onSaveTime) {
      const absoluteTime = this.getCurrentAbsoluteTime();
      if (absoluteTime >= 0) {
        this.onSaveTime(absoluteTime);
      }
    }
  }, 10000);
}
  getCurrentAbsoluteTime() {
    return SeekCalculator.calculateAbsoluteTime(
      this.currentChunkIndex,
      this.activePlayer.currentTime,
      this.manifest.chunks
    );
  }
  _setupEventListeners() {
    document.getElementById('playPauseBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePlayPause();
    });
    document.getElementById('videoClickArea').addEventListener('click', () => {
      this.togglePlayPause();
      this._showControlsTemporarily();
    });
    this._setupTimelineEvents();
    document.getElementById('fullscreenBtn').addEventListener('click', () => {
      this._toggleFullscreen();
    });
    this.videoWrapper.addEventListener('mousemove', () => {
      this._showControlsTemporarily();
    });
    this.videoWrapper.addEventListener('touchstart', () => {
      this._showControlsTemporarily();
    });
  }
_setupTimelineEvents() {
  const timelineWrapper = document.querySelector('.timeline-wrapper'); // ← CAMBIO: usar wrapper
  const timelineTrack = document.getElementById('timelineTrack');       // ← Para cálculos de posición
  let isDragging = false;
  let dragStartX = 0;
  let hasDragged = false;
  const DRAG_THRESHOLD = 5;
  
  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation(); // ← AÑADIR: evitar propagación
    isDragging = true;
    hasDragged = false;
    dragStartX = e.clientX;
    
    this.isSeeking = true;
    this._updateSeekPosition(e.clientX);
  };
  
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const distance = Math.abs(e.clientX - dragStartX);
    if (distance > DRAG_THRESHOLD) {
      hasDragged = true;
    }
    
    this._updateSeekPosition(e.clientX);
  };
  
  const handleMouseUp = (e) => {
    if (!isDragging) return;
    
    isDragging = false;
    
    if (!hasDragged) {
      this._updateSeekPosition(e.clientX);
    }
    
    this._executeSeek();
    this.isSeeking = false;
  };
  
  const handleTouchStart = (e) => {
    e.preventDefault();
    e.stopPropagation(); // ← AÑADIR
    isDragging = true;
    hasDragged = false;
    dragStartX = e.touches[0].clientX;
    
    this.isSeeking = true;
    this._updateSeekPosition(e.touches[0].clientX);
  };
  
  const handleTouchMove = (e) => {
    if (!isDragging) return;
    
    const distance = Math.abs(e.touches[0].clientX - dragStartX);
    if (distance > DRAG_THRESHOLD) {
      hasDragged = true;
    }
    
    this._updateSeekPosition(e.touches[0].clientX);
  };
  
  const handleTouchEnd = (e) => {
    if (!isDragging) return;
    
    isDragging = false;
    
    if (!hasDragged && e.changedTouches.length > 0) {
      this._updateSeekPosition(e.changedTouches[0].clientX);
    }
    
    this._executeSeek();
    this.isSeeking = false;
  };
  
  // ← CAMBIO: Registrar en timelineWrapper, no en timelineTrack
  timelineWrapper.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  
  timelineWrapper.addEventListener('touchstart', handleTouchStart, { passive: false });
  document.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.addEventListener('touchend', handleTouchEnd);
}
  _updateSeekPosition(clientX) {
    const timeline = document.getElementById('timelineTrack');
    const rect = timeline.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    this.seekTargetTime = percent * this.manifest.total_duration; 
    this._updateProgressUI(this.seekTargetTime);
    this.timeDisplay.textContent = SeekCalculator.secondsToTime(this.seekTargetTime);
  }
  _updatePlayPauseUI() {
    const playIcon = document.querySelector('.icon-play');
    const pauseIcon = document.querySelector('.icon-pause'); 
    if (this.state === 'PLAY') {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'inline';
    } else {
      playIcon.style.display = 'inline';
      pauseIcon.style.display = 'none';
    }
  }
  _updateProgressUI(absoluteTime) {
    const percent = SeekCalculator.calculateProgress(
      absoluteTime,
      this.manifest.total_duration
    ); 
    this.progressBar.style.width = `${percent}%`;
    this.scrubber.style.left = `${percent}%`;
  }
 showLoading(message, progress = null) {
  if (!this.loadingOverlay) {
    this.loadingOverlay = document.createElement('div');
    this.loadingOverlay.className = 'video-loading-overlay';
    this.container.appendChild(this.loadingOverlay);
  }
  
  let html = `
    <div class="loading-spinner"></div>
    <div class="loading-message">${message}</div>
  `;
  
  if (progress !== null) {
    html += `
      <div class="loading-progress-bar">
        <div class="loading-progress-fill" style="width: ${progress}%"></div>
      </div>
      <div class="loading-percentage">${Math.round(progress)}%</div>
    `;
  }
  
  this.loadingOverlay.innerHTML = html;
  this.loadingOverlay.style.display = 'flex';
}

showError(errorConfig) {
  const overlay = document.createElement('div');
  overlay.className = 'video-error-overlay';
  
  let actionsHTML = '';
  if (errorConfig.actions) {
    actionsHTML = errorConfig.actions.map(action => 
      `<button class="error-action-btn">${action.label}</button>`
    ).join('');
  }
  
  overlay.innerHTML = `
    <div class="error-panel">
      <div class="error-icon">⚠️</div>
      <h3 class="error-title">${errorConfig.title}</h3>
      <p class="error-message">${errorConfig.message}</p>
      ${errorConfig.details ? `<p class="error-details">${errorConfig.details}</p>` : ''}
      <div class="error-actions">${actionsHTML}</div>
    </div>
  `;
  
  // Vincular callbacks
  if (errorConfig.actions) {
    const buttons = overlay.querySelectorAll('.error-action-btn');
    buttons.forEach((btn, idx) => {
      btn.onclick = () => {
        overlay.remove();
        errorConfig.actions[idx].callback();
      };
    });
  }
  
  this.container.appendChild(overlay);
}
  hideLoading() {
    if (this.loadingOverlay) {
      this.loadingOverlay.style.display = 'none';
    }
  }
  _showControlsTemporarily() {
    const controls = document.getElementById('videoControls');
    controls.style.opacity = '1'; 
    clearTimeout(this.controlsTimeout);
    if (this.state === 'PLAY') {
      this.controlsTimeout = setTimeout(() => {
        controls.style.opacity = '0';
      }, 3000);
    }
  }
_toggleFullscreen() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  // ✅ iOS: Usar CSS fullscreen para mantener controles personalizados
  if (isIOS) {
    this._toggleCSSFullscreen();
    return;
  }
  
  // ✅ Safari macOS: También usar CSS fullscreen para consistencia
  if (isSafari) {
    this._toggleCSSFullscreen();
    return;
  }
  
  // Otros navegadores: Fullscreen API estándar
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    this.videoWrapper.requestFullscreen().catch(e => {
      console.error('Error fullscreen:', e);
      // Fallback a CSS fullscreen si falla
      this._toggleCSSFullscreen();
    });
  }
}
_toggleCSSFullscreen() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isFullscreen = this.videoWrapper.classList.contains('css-fullscreen');
  
  if (isFullscreen) {
    // === SALIR DE FULLSCREEN ===
    this.videoWrapper.classList.remove('css-fullscreen');
    document.body.classList.remove('body-fullscreen-lock');
    document.documentElement.classList.remove('html-fullscreen-lock');
    
    // Restaurar scroll
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    
    // iOS: Restaurar viewport
    if (isIOS) {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport && this._originalViewport) {
        viewport.content = this._originalViewport;
      }
    }
    
    const btn = document.getElementById('fullscreenBtn');
    if (btn) btn.textContent = '⛶';
    
    console.log('📴 CSS Fullscreen desactivado');
    
  } else {
    // === ENTRAR EN FULLSCREEN ===
    this.videoWrapper.classList.add('css-fullscreen');
    document.body.classList.add('body-fullscreen-lock');
    document.documentElement.classList.add('html-fullscreen-lock');
    
    // Bloquear scroll
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    // iOS: Optimizar viewport para fullscreen
    if (isIOS) {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        // Guardar viewport original
        this._originalViewport = viewport.content;
        // Viewport optimizado para fullscreen
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
      }
      
      // Scroll para minimizar barra de Safari (solo funciona parcialmente)
      window.scrollTo(0, 0);
      setTimeout(() => {
        window.scrollTo(0, 1);
      }, 100);
    }
    
    const btn = document.getElementById('fullscreenBtn');
    if (btn) btn.textContent = '✕';
    
    console.log('📺 CSS Fullscreen activado');
  }
}
  updateBufferUI(downloadedChunks) {
    const bufferEl = document.getElementById('timelineBuffer');
    if (!bufferEl) return;
    let bufferedDuration = 0;
    downloadedChunks.forEach(index => {
      if (index < this.manifest.chunks.length) {
        bufferedDuration += this.manifest.chunks[index].duration;
      }
    }); 
    const bufferPercent = (bufferedDuration / this.manifest.total_duration) * 100;
    bufferEl.style.width = `${Math.min(100, bufferPercent)}%`;
  }
 destroy() {
  if (this.updateInterval) clearInterval(this.updateInterval);
  if (this.saveTimeInterval) clearInterval(this.saveTimeInterval);
  if (this.controlsTimeout) clearTimeout(this.controlsTimeout);
  
  // ✅ Limpiar CSS fullscreen si está activo
  if (this.videoWrapper?.classList.contains('css-fullscreen')) {
    document.body.classList.remove('body-fullscreen-lock');
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  }
  
  this._removeActiveListeners();
  if (this.activeBlobUrl) {
    URL.revokeObjectURL(this.activeBlobUrl);
  }
  if (this.standbyBlobUrl) {
    URL.revokeObjectURL(this.standbyBlobUrl);
  }
  this.playerA.pause();
  this.playerB.pause();
  this.playerA.src = '';
  this.playerB.src = '';    
  this.container.innerHTML = '';
  console.log('🧹 DualVideoController destruido');
}
_injectStyles() {
  if (document.getElementById('dual-video-styles')) return;
  const styleEl = document.createElement('style');
  styleEl.id = 'dual-video-styles';
  styleEl.textContent = `
    /* === ESTILOS BASE === */
    .video-player-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
      background: #000;
    }
    
    .dual-player-container {
      position: relative;
      width: 100%;
      height: 100%;
    }
    
    .dual-player-container .video-element {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    
    .video-controls {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(transparent, rgba(0,0,0,0.9));
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 15px;
      opacity: 1;
      transition: opacity 0.3s ease;
      z-index: 10;
    }
    
    .control-btn {
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    
    .control-btn:hover,
    .control-btn:active {
      background: rgba(61, 210, 243, 0.4);
      transform: scale(1.1);
    }
    
    /* ✅ ÁREA CLICKABLE EXPANDIDA */
    .timeline-wrapper {
      flex: 1;
      padding: 10px 0;
      cursor: pointer;
      min-width: 0;
      position: relative;
    }
    
    /* Pseudo-elemento que expande el área clickable */
    .timeline-wrapper::before {
      content: '';
      position: absolute;
      top: -20px;
      bottom: -20px;
      left: 0;
      right: 0;
      cursor: pointer;
    }
    
    .timeline-track {
      position: relative;
      height: 6px;
      background: rgba(255,255,255,0.3);
      border-radius: 3px;
      pointer-events: none;
    }
    
    .timeline-buffer {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      background: rgba(255,255,255,0.5);
      border-radius: 3px;
      pointer-events: none;
    }
    
    .timeline-progress {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      background: var(--color-primary, #3DD2F3);
      border-radius: 3px;
      pointer-events: none;
    }
    
    .timeline-scrubber {
      position: absolute;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 16px;
      height: 16px;
      background: white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      cursor: grab;
      pointer-events: auto;
    }
    
    .time-display {
      color: white;
      font-size: 14px;
      font-family: monospace;
      min-width: 100px;
      text-align: center;
      flex-shrink: 0;
    }
    
    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 15px;
      z-index: 100;
    }
    
    .loading-spinner {
      width: 50px;
      height: 50px;
      border: 4px solid rgba(61, 210, 243, 0.3);
      border-top-color: var(--color-primary, #3DD2F3);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .loading-overlay span {
      color: white;
      font-size: 16px;
    }
    
    .video-click-area {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 80px;
      cursor: pointer;
      z-index: 5;
    }

    /* ============================================
       CSS FULLSCREEN - iOS COMPATIBLE
       ============================================ */
    
    /* Contenedor principal en fullscreen */
    .video-player-wrapper.css-fullscreen {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      height: 100dvh !important; /* Dynamic viewport height para iOS 15+ */
      z-index: 2147483647 !important;
      background: #000 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      /* Forzar composición en GPU */
      transform: translateZ(0);
      -webkit-transform: translateZ(0);
      will-change: transform;
    }
    
    /* Contenedor de videos en fullscreen */
    .video-player-wrapper.css-fullscreen .dual-player-container {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100% !important;
      height: 100% !important;
    }
    
    /* Videos individuales */
    .video-player-wrapper.css-fullscreen .video-element {
      width: 100% !important;
      height: 100% !important;
      object-fit: contain !important;
    }
    
    /* ✅ CONTROLES - SIEMPRE VISIBLES EN FULLSCREEN */
    .video-player-wrapper.css-fullscreen .video-controls {
      position: fixed !important;
      bottom: 0 !important;
      left: 0 !important;
      right: 0 !important;
      top: auto !important;
      z-index: 2147483647 !important;
      display: flex !important;
      visibility: visible !important;
      opacity: 1 !important;
      background: linear-gradient(
        to top,
        rgba(0,0,0,0.95) 0%,
        rgba(0,0,0,0.8) 50%,
        transparent 100%
      ) !important;
      padding: 30px 20px 20px 20px !important;
      /* Forzar encima de todo */
      transform: translateZ(9999px);
      -webkit-transform: translateZ(9999px);
    }
    
    /* Área de click en fullscreen */
    .video-player-wrapper.css-fullscreen .video-click-area {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 100px !important;
      z-index: 2147483645 !important;
    }
    
    /* Loading en fullscreen */
    .video-player-wrapper.css-fullscreen .loading-overlay {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      z-index: 2147483646 !important;
    }
    
    /* === BLOQUEO DE BODY/HTML === */
    html.html-fullscreen-lock,
    body.body-fullscreen-lock {
      overflow: hidden !important;
      position: fixed !important;
      width: 100% !important;
      height: 100% !important;
      top: 0 !important;
      left: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    
    /* === iOS SAFE AREAS === */
    @supports (padding-bottom: env(safe-area-inset-bottom)) {
      .video-player-wrapper.css-fullscreen .video-controls {
        padding-bottom: calc(20px + env(safe-area-inset-bottom)) !important;
        padding-left: calc(20px + env(safe-area-inset-left)) !important;
        padding-right: calc(20px + env(safe-area-inset-right)) !important;
      }
      
      /* Ajustar área de click para safe areas */
      .video-player-wrapper.css-fullscreen .video-click-area {
        top: env(safe-area-inset-top) !important;
        bottom: calc(100px + env(safe-area-inset-bottom)) !important;
      }
    }
    
    /* === LANDSCAPE ESPECÍFICO PARA iOS === */
    @media screen and (orientation: landscape) {
      .video-player-wrapper.css-fullscreen .video-controls {
        padding: 20px 30px !important;
        gap: 20px !important;
      }
      
      @supports (padding-left: env(safe-area-inset-left)) {
        .video-player-wrapper.css-fullscreen .video-controls {
          padding-left: calc(30px + env(safe-area-inset-left)) !important;
          padding-right: calc(30px + env(safe-area-inset-right)) !important;
          padding-bottom: calc(15px + env(safe-area-inset-bottom)) !important;
        }
      }
    }
    
    /* === RESPONSIVE === */
    @media (max-width: 600px) {
      .video-controls {
        padding: 15px 10px;
        gap: 10px;
      }
      
      .control-btn {
        width: 40px;
        height: 40px;
        font-size: 16px;
      }
      
      .time-display {
        font-size: 12px;
        min-width: 70px;
      }
      
      .video-player-wrapper.css-fullscreen .video-controls {
        padding: 20px 15px !important;
        gap: 12px !important;
      }
    }
  `;
  document.head.appendChild(styleEl);
}
}
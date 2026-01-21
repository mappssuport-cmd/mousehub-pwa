import { ManifestProcessor } from './manifest-processor.js';
import { SeekCalculator } from './seek-calculator.js';
import { memoryCache } from './memory-cache.js';
import { DownloadScheduler } from './download-scheduler.js';
import appwriteManager from '../managers/appwrite-manager.js';
import storage from './storage-manager.js';
import { HelpClass } from './help-class.js';
import { DualVideoController } from './dual-video-controller.js';

export class PlaybackOrchestrator {
  constructor(containerElement, folderData, rawDoc, isTV = false) {
    this.container = containerElement;
    this.folderData = folderData;
    this.rawDoc = rawDoc;
    this.isTV = isTV;
    this.videoController = null;
    this.scheduler = new DownloadScheduler();
    this.manifest = null;
    this.folderHandle = null;
    this.signedUrls = [];
    this.passwords = [];
    this.isInitialized = false;
    this.isDestroyed = false;
    this.diskCache = null;
  }

  async startFromBeginning() {
    try {
      await this._initialize();
      this._initVideoController();
      await this._loadChunkToActive(0, 0);
    } catch (error) {
      console.error('❌ Error iniciando reproducción:', error);
      HelpClass.showToast('❌ Error: ' + error.message);
      throw error;
    }
  }
  async resumePlayback() {
  try {
    await this._initialize(); 
    this._initVideoController();     
    let savedTime = 0;
    if (this.isTV) {
      savedTime = memoryCache.getPlaybackTime();
    } else {
      const playbackData = await this.diskCache.loadPlaybackTime(this.folderHandle);
      savedTime = playbackData?.time || 0;
    }
    if (savedTime > 0) {
      const result = SeekCalculator.findChunkForTime(savedTime, this.manifest.chunks);
      console.log(`▶️ Reanudando desde ${SeekCalculator.secondsToTime(savedTime)}`);
      await this._loadChunkToActive(result.chunkIndex, result.internalSecond);
    } else {
      await this._loadChunkToActive(0, 0);
    }
  } catch (error) {
    console.error('❌ Error reanudando:', error);
    HelpClass.showToast('❌ Error: ' + error.message);
    throw error;
  }}
  async _initialize() {
    if (this.isInitialized) return;
    if (this.isDestroyed) throw new Error('Orquestador destruido');
    HelpClass.showToast('⏳ Preparando reproducción...');
    try {
      const ownerId = storage.get('owner_id');
      const folderKey = storage.get('folder_key');
      let manifestKey = storage.get('manifest_key');
      if (!manifestKey) {
        manifestKey = await ManifestProcessor.loadManifestKey(ownerId);
        if (!manifestKey) throw new Error('No se pudo obtener la clave del manifest');
      }
      if (await this._tryLoadFromCache(ownerId)) {
        this.isInitialized = true;
        return;
      }
      console.log('📥 Descargando manifest...');
      this.manifest = await ManifestProcessor.downloadAndDecrypt(
        this.folderData.master_manifest,
        folderKey,
        manifestKey
      );
      await this._saveManifest();
      await this._fetchSignedUrls(ownerId);
      await this._saveSignedUrls();
      this.scheduler.init(this.signedUrls, this.passwords, this.manifest);
      this.isInitialized = true;
      console.log('✅ Orquestador inicializado');
    } catch (error) {
      console.error('❌ Error inicializando:', error);
      throw error;
    }
  }
async _tryLoadFromCache(ownerId) {
  // ========== MODO TV: Solo memoria RAM ==========
  if (this.isTV) {
    console.log('📺 Modo TV: usando solo memoria RAM');
    
    const cached = memoryCache.getManifest();
    const urls = memoryCache.getSignedUrls();
    
    if (cached && urls) {
      console.log('📦 Manifest y URLs encontrados en caché de memoria');
      this.manifest = cached;
      this.signedUrls = urls.signedUrls;
      this.passwords = urls.passwords;
      this.scheduler.init(this.signedUrls, this.passwords, this.manifest);
      this.scheduler.markExisting(memoryCache.getExistingChunks());
      return true;
    }
    
    console.log('⚠️ No hay datos en caché de memoria');
    return false;
  }
  
  // ========== MODO NO-TV: Almacenamiento persistente ==========
  console.log('💾 Modo dispositivo: usando almacenamiento en disco');
  
  // Importación dinámica - solo se carga en dispositivos no-TV
  const { diskCache } = await import('./disk-cache.js');
  this.diskCache = diskCache;
  
  // Inicializar y obtener carpeta
  await diskCache.init();
  this.folderHandle = await diskCache.getOrCreateFolder(this.folderData.folder_name);
  
  // Intentar cargar manifest local
  const localManifest = await diskCache.loadManifest(this.folderHandle);
  if (!localManifest) {
    console.log('⚠️ No hay manifest en disco');
    return false;
  }
  
  console.log('✅ Manifest encontrado en disco');
  this.manifest = localManifest;
  
  // Verificar URLs firmadas
  const localUrls = await diskCache.loadSignedUrls(this.folderHandle);
  
  if (localUrls) {
    console.log('🔗 URLs firmadas válidas en disco');
    this.signedUrls = localUrls.signedUrls;
    this.passwords = localUrls.passwords;
  } else {
    console.log('🔗 URLs expiradas, obteniendo nuevas...');
    await this._fetchSignedUrls(ownerId);
    await diskCache.saveSignedUrls(this.folderHandle, this.signedUrls, this.passwords);
  }
  
  // Inicializar scheduler con datos cargados
  this.scheduler.init(this.signedUrls, this.passwords, this.manifest);
  
  const existing = await diskCache.getExistingChunks(this.folderHandle);
  this.scheduler.markExisting(existing);
  
  console.log('✅ Caché de disco cargado correctamente');
  return true;
}

  async _fetchSignedUrls(ownerId) {
    HelpClass.showToast('🔐 Obteniendo acceso...'); 
    const simplified = ManifestProcessor.simplifyForRequest(this.manifest);
    const userId = storage.get('user_id');
    const result = await appwriteManager.callSignedUrlFunction(
      userId,
      ownerId,
      simplified
    );
    if (!result.success) {
      if (result.error === 'Sin créditos disponibles') {
        throw new Error('No tienes créditos suficientes');
      }
      throw new Error(result.error || 'Error obteniendo acceso');
    }
    this.signedUrls = result.signedUrls;
    this.passwords = result.passwords;
    console.log('✅ URLs firmadas:', this.signedUrls.length);
  }
  _initVideoController() {
  this.videoController = new DualVideoController(this.container, {
    isTV: this.isTV
  });
  this.videoController.init(this.manifest);
  this.videoController.onChunkNeeded = async (chunkIndex) => {
    console.log(`🚨 Fallback: chunk ${chunkIndex} solicitado urgentemente`);
    await this._loadChunkToActive(chunkIndex, 0);
  };
  this.videoController.onPrepareNextChunk = async (chunkIndex) => {
    console.log(`📦 Precarga solicitada: chunk ${chunkIndex}`);
    await this._preloadChunkToStandby(chunkIndex);
  };
  this.videoController.onSeek = async (chunkIndex, internalSecond) => {
    console.log(`🎯 Seek a chunk ${chunkIndex}`);
    this.scheduler.pause();
    const blob = await this._getChunkFromCache(chunkIndex);
    if (blob) {
      this.videoController.loadChunkToActive(blob, chunkIndex, internalSecond);
      this.videoController.play();
    } else {
      await this._loadChunkToActive(chunkIndex, internalSecond);
    }
    
    this._startPreloading(chunkIndex);
  };
  this.videoController.onSaveTime = async (absoluteTime) => {
    if (this.isTV) {
      memoryCache.savePlaybackTime(absoluteTime);
    } else if (this.folderHandle && this.diskCache) {
      await this.diskCache.savePlaybackTime(this.folderHandle, absoluteTime);
    }
  };
  this.videoController.onStateChange = (state) => {
    if (state === 'PAUSE') {
      this.scheduler.pause();
    } else if (state === 'PLAY') {
      const idx = this.videoController.currentChunkIndex;
      this._startPreloading(idx);
    }
  };
}
 async _loadChunkToActive(chunkIndex, internalSecond, isRetry = false) {
  if (this.isDestroyed) return;
  
  const maxRetries = 3;
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      this.videoController.showLoading(
        attempt === 1 ? 'Cargando...' : `Reintentando (${attempt}/${maxRetries})...`
      );
      
      let blob = await this._getChunkFromCache(chunkIndex);
      
      if (!blob) {
        console.log(`📥 Descargando chunk ${chunkIndex} (intento ${attempt})...`);
        this.videoController.showLoading(`Descargando... ${attempt}/${maxRetries}`);
        
        blob = await this.scheduler.downloadChunk(chunkIndex);
        await this._saveChunkToCache(chunkIndex, blob);
      }
      
      this.videoController.loadChunkToActive(blob, chunkIndex, internalSecond);
      this.videoController.play();
      this.scheduler.updateCurrentIndex(chunkIndex);
      this._startPreloading(chunkIndex);
      
      return;
      
    } catch (error) {
      lastError = error;
      
      const isCancelled = error.name === 'AbortError' || 
                         error.message.includes('cancelada') ||
                         error.message.includes('cancel');
      
      if (isCancelled) {
        console.log('⏹️ Carga cancelada por el usuario');
        return;
      }
      
      console.error(`❌ Intento ${attempt} falló en _loadChunkToActive:`, error);
      
      if (attempt < maxRetries) {
        this.videoController.showLoading(
          `Error: ${error.message}. Reintentando en 2s...`
        );
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }
  
  // Todos los intentos fallaron
  console.error(`❌ Chunk ${chunkIndex} falló después de ${maxRetries} intentos`);
  console.error(`❌ Error final:`, lastError);
  
  const errorInfo = `Método: _loadChunkToActive
Chunk: ${chunkIndex + 1}/${this.manifest.total_chunks}
Error: ${lastError.message}
${this.isTV ? 'Dispositivo: TV' : 'Dispositivo: Web/Mobile'}`;

  this.videoController.showError({
    title: 'Error de reproducción',
    message: errorInfo,
    actions: [
      {
        label: 'Reintentar',
        callback: () => this._loadChunkToActive(chunkIndex, internalSecond, true)
      },
      {
        label: chunkIndex + 1 < this.manifest.total_chunks ? 'Saltar adelante' : 'Cerrar reproductor',
        callback: () => {
          if (chunkIndex + 1 < this.manifest.total_chunks) {
            this._loadChunkToActive(chunkIndex + 1, 0);
          } else {
            this.destroy();
            window.history.back(); // o tu método para cerrar
          }
        }
      },
      {
        label: chunkIndex > 0 ? 'Saltar atrás' : 'Volver al inicio',
        callback: () => {
          if (chunkIndex > 0) {
            this._loadChunkToActive(chunkIndex - 1, 0);
          } else {
            this.destroy();
            window.history.back();
          }
        }
      }
    ]
  });
}
  async _preloadChunkToStandby(chunkIndex) {
    if (this.isDestroyed) return;
    if (chunkIndex >= this.manifest.total_chunks) {
      console.log('📍 No hay más chunks');
      return;
    }
    let blob = await this._getChunkFromCache(chunkIndex);
    if (!blob) {
      console.log(`📥 Descargando para standby: chunk ${chunkIndex}`);
      try {
        blob = await this.scheduler.downloadChunk(chunkIndex);
        await this._saveChunkToCache(chunkIndex, blob);
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error(`❌ Error precargando chunk ${chunkIndex}:`, error);
        return;
      }
    }
    this.videoController.preloadChunkToStandby(blob, chunkIndex);
  }
 _startPreloading(currentChunkIndex) {
  if (this.isTV) {
    const nextChunk = currentChunkIndex + 1;
    if (nextChunk >= this.manifest.total_chunks) {
      console.log('📍 No hay siguiente chunk');
      return;
    }
    if (memoryCache.hasChunk(nextChunk)) {
      console.log(`✅ Chunk ${nextChunk} ya en RAM`);
      return;
    }
    this.scheduler.onChunkDownloaded = async (index, blob) => {
      if (index === nextChunk) {
        console.log(`📦 Chunk ${index} descargado, precargando a standby`);
        await this._preloadChunkToStandby(index);
      }
    };
    this.scheduler.pause();
    const saveCallback = async (index, blob) => {
      await this._saveChunkToCache(index, blob);
    };
    this.scheduler.downloadChunk(nextChunk)
      .then(blob => saveCallback(nextChunk, blob))
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error(`❌ Error descargando chunk ${nextChunk}:`, err);
        }
      });
  } else {
    const saveCallback = this._getSaveCallback();
    this.scheduler.onChunkDownloaded = async (index, blob) => {
      console.log(`📦 Chunk ${index} descargado por scheduler`);
      const nextNeeded = currentChunkIndex + 1;
      if (index === nextNeeded) {
        await this._preloadChunkToStandby(index);
      }
    };
    this.scheduler.startPreloading(currentChunkIndex, saveCallback);
  }
}
 async _getChunkFromCache(chunkIndex) {
     if (this.isTV) {
       const blob = memoryCache.getChunk(chunkIndex);
       if (blob) {
         console.log(`✅ Chunk ${chunkIndex} encontrado en RAM`);
       }
       return blob;
     }
     
     if (this.folderHandle) {
       return await this.diskCache.loadChunk(this.folderHandle, chunkIndex);
     }
     
     return null;
   }
async _saveChunkToCache(chunkIndex, blob) {
  if (this.isTV) {
    memoryCache.saveChunk(chunkIndex, blob);
    memoryCache.updateWindow(chunkIndex, this.manifest.total_chunks);   
  } else if (this.folderHandle && this.diskCache) {
    await this.diskCache.saveChunk(this.folderHandle, chunkIndex, blob);
  }
}
 _getSaveCallback() {
  if (this.isTV) {
    return (index, blob) => {
      memoryCache.saveChunk(index, blob);
      const current = this.videoController?.currentChunkIndex ?? index;
      memoryCache.updateWindow(current, this.manifest.total_chunks);
    };
  } else {
    return async (index, blob) => {
      await this.diskCache.saveChunk(this.folderHandle, index, blob);
    };
  }
}
  async _saveManifest() {
  if (this.isTV) {
    memoryCache.saveManifest(this.manifest);
  } else if (this.folderHandle && this.diskCache) {
    await this.diskCache.saveManifest(this.folderHandle, this.manifest);
  }
}
  async _saveSignedUrls() {
  if (this.isTV) {
    memoryCache.saveSignedUrls(this.signedUrls, this.passwords);
  } else if (this.folderHandle && this.diskCache) {
    await this.diskCache.saveSignedUrls(this.folderHandle, this.signedUrls, this.passwords);
  }
}
  destroy() {
    this.isDestroyed = true;
    this.scheduler.stop();
    this.videoController?.destroy();
    if (this.isTV) {
      memoryCache.clear();
    }   
    console.log('🧹 Orquestador destruido');
  }
}
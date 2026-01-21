import { CryptoManager } from '../utils/crypto-manager.js';
export class DownloadScheduler {
  constructor(options = {}) {
    this.signedUrls = [];
    this.passwords = [];
    this.manifest = null;
    this.objectType = 'mp4';
    this.isActive = false;
    this.isPaused = false;
    this.currentDownloadController = null;
    this.maxAhead = options.maxAhead || 5;
    this.minPause = options.minPause || 12000;
    this.maxPause = options.maxPause || 15000; 
    this.downloadedIndices = new Set();
    this.onChunkDownloaded = null;
    this.currentIndex = 0;
  }
  init(signedUrls, passwords, manifest) {
    this.signedUrls = signedUrls;
    this.passwords = passwords;
    this.manifest = manifest;
    this.objectType = manifest.object_type;
    this.downloadedIndices.clear();
    console.log('✅ Scheduler inicializado con', signedUrls.length, 'URLs');
  }
  markExisting(existingIndices) {
    existingIndices.forEach(i => this.downloadedIndices.add(i));
    console.log('📦 Chunks existentes marcados:', existingIndices.size);
  }
  async downloadChunk(chunkIndex, maxRetries = 3) {
  if (chunkIndex < 0 || chunkIndex >= this.manifest.total_chunks) {
    throw new Error(`Índice de chunk inválido: ${chunkIndex}`);
  }

  const url = this.signedUrls[chunkIndex];
  const password = this.passwords[chunkIndex];
  const filename = this.manifest.chunks[chunkIndex].filename;
  
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`📥 Intento ${attempt}/${maxRetries} - Chunk ${chunkIndex}`);
    
    // Verificar si AbortController está disponible
    let controller = null;
    let useAbort = false;
    
    if (typeof AbortController !== 'undefined') {
      controller = new AbortController();
      this.currentDownloadController = controller;
      useAbort = true;
    } else {
      console.warn('⚠️ AbortController no disponible en este dispositivo');
    }
    
    let inactivityChecker = null;
    let fetchPromise = null;

    try {
      let lastProgressTime = Date.now();
      const inactivityTimeout = 15000;
      let shouldAbort = false;
      
      inactivityChecker = setInterval(() => {
        const timeSinceProgress = Date.now() - lastProgressTime;
        if (timeSinceProgress > inactivityTimeout) {
          console.warn(`⏱️ Sin progreso por ${timeSinceProgress/1000}s, cancelando...`);
          shouldAbort = true;
          if (useAbort && controller) {
            controller.abort();
          }
        }
      }, 2000);
      
      const fetchOptions = { cache: 'no-cache' };
      if (useAbort && controller) {
        fetchOptions.signal = controller.signal;
      }
      
      const response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength) : 0;
      
      const reader = response.body.getReader();
      const chunks = [];
      let receivedBytes = 0;
      let lastReportedProgress = 0;

      while (true) {
        if (shouldAbort || this.isPaused || !this.isActive) {
          reader.cancel();
          throw new Error('Descarga cancelada');
        }
        
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        receivedBytes += value.length;
        lastProgressTime = Date.now();
        
        if (totalBytes > 0) {
          const progress = (receivedBytes / totalBytes) * 100;
          if (progress - lastReportedProgress >= 5 || progress === 100) {
            lastReportedProgress = progress;
            if (this.onDownloadProgress) {
              this.onDownloadProgress(chunkIndex, progress, attempt, receivedBytes, totalBytes);
            }
          }
        }
      }

      clearInterval(inactivityChecker);
      inactivityChecker = null;

      const encryptedBlob = new Blob(chunks);
      
      if (encryptedBlob.size === 0) {
        throw new Error('Blob vacío recibido del servidor');
      }

      console.log(`🔓 Descifrando chunk ${chunkIndex} (${(encryptedBlob.size / 1024 / 1024).toFixed(2)} MB)...`);

      const decryptedBlob = await CryptoManager.decryptBlob(
        encryptedBlob,
        password,
        filename,
        this.objectType
      );

      this.downloadedIndices.add(chunkIndex);
      this.currentDownloadController = null;
      
      console.log(`✅ Chunk ${chunkIndex} completado en intento ${attempt}`);
      
      if (this.onDownloadSuccess) {
        this.onDownloadSuccess(chunkIndex);
      }
      
      return decryptedBlob;

    } catch (error) {
      if (inactivityChecker) {
        clearInterval(inactivityChecker);
        inactivityChecker = null;
      }
      
      this.currentDownloadController = null;
      lastError = error;
      
      const isCancelled = error.name === 'AbortError' || 
                         error.message.includes('cancelada') ||
                         error.message.includes('cancel');
      
      if (isCancelled) {
        if (this.isPaused || !this.isActive) {
          console.log(`⏹️ Descarga cancelada manualmente`);
          throw error;
        }
        console.log(`⏱️ Timeout por inactividad en intento ${attempt}`);
      }
      
      console.error(`❌ Intento ${attempt} falló:`, error.message);
      
      if (this.onDownloadRetry) {
        this.onDownloadRetry(chunkIndex, attempt, maxRetries, error.message);
      }
      
      if (attempt < maxRetries) {
        const backoffTime = Math.min(2000 * Math.pow(2, attempt - 1), 8000);
        console.log(`⏳ Esperando ${backoffTime/1000}s antes de reintentar...`);
        await this._sleep(backoffTime);
      }
    }
  }
  
  console.error(`❌ Chunk ${chunkIndex} falló después de ${maxRetries} intentos`);
  
  if (this.onDownloadFailed) {
    this.onDownloadFailed(chunkIndex, lastError.message);
  }
  
  throw lastError;
  }

  _selectChunksToDownload(currentIndex) {
    const toDownload = [];
    for (let i = 1; i <= this.maxAhead; i++) {
      const nextIndex = currentIndex + i;
      if (nextIndex < this.manifest.total_chunks && 
          !this.downloadedIndices.has(nextIndex)) {
        toDownload.push(nextIndex);
      }
    }
    return toDownload;
  }
  async startPreloading(currentChunkIndex, saveCallback) {
  if (this.isActive) {
    console.log('⚠️ Precarga ya activa, actualizando índice');
    this.currentIndex = currentChunkIndex;
    return;
  }
  
  this.isActive = true;
  this.isPaused = false;
  this.currentIndex = currentChunkIndex;
  this.failedChunks = new Map();
  
  console.log('🚀 Iniciando precarga desde chunk', currentChunkIndex);
  
  while (this.isActive && !this.isPaused) {
    const chunksToDownload = this._selectChunksToDownload(this.currentIndex);
    
    if (chunksToDownload.length === 0) {
      console.log('📦 Todos los chunks cercanos descargados');
      await this._sleep(5000);
      continue;
    }
    
    const normalChunks = [];
    const retryChunks = [];
    
    for (const idx of chunksToDownload) {
      if (this.failedChunks.has(idx)) {
        const attempts = this.failedChunks.get(idx);
        if (attempts < 5) {
          retryChunks.push(idx);
        }
      } else {
        normalChunks.push(idx);
      }
    }
    
    const batch = [...normalChunks, ...retryChunks].slice(0, 2);
    
    for (const index of batch) {
      if (!this.isActive || this.isPaused) break;
      
      try {
        const blob = await this.downloadChunk(index);
        
        if (saveCallback) {
          await saveCallback(index, blob);
        }
        
        if (this.onChunkDownloaded) {
          this.onChunkDownloaded(index, blob);
        }
        
        this.failedChunks.delete(index);
        
      } catch (error) {
        if (error.name === 'AbortError') break;
        
        const currentAttempts = this.failedChunks.get(index) || 0;
        this.failedChunks.set(index, currentAttempts + 1);
        
        console.error(`❌ Chunk ${index} falló (intento ${currentAttempts + 1})`);
        
        continue;
      }
    }
    
    if (!this.isPaused && this.isActive) {
      const pauseTime = this.minPause + Math.random() * (this.maxPause - this.minPause);
      await this._sleep(pauseTime);
    }
  }
  
  console.log('⏹️ Precarga detenida');
}
  pause() {
    this.isPaused = true;
    if (this.currentDownloadController) {
      this.currentDownloadController.abort();
    }
    console.log('⏸️ Precarga pausada');
  }
  resume(currentChunkIndex, saveCallback) {
    if (!this.isPaused) return; 
    this.isPaused = false;
    this.currentIndex = currentChunkIndex;
    console.log('▶️ Precarga reanudada desde chunk', currentChunkIndex);
    this.isActive = false;
    setTimeout(() => {
      this.startPreloading(currentChunkIndex, saveCallback);
    }, 100);
  }
  stop() {
    this.isActive = false;
    this.isPaused = true;
    if (this.currentDownloadController) {
      this.currentDownloadController.abort();
    }
    console.log('⏹️ Scheduler detenido');
  }
  updateCurrentIndex(newCurrentIndex) {
    this.currentIndex = newCurrentIndex;
    console.log(`🔄 Índice actualizado a ${newCurrentIndex}`);
  }
  isChunkDownloaded(chunkIndex) {
    return this.downloadedIndices.has(chunkIndex);
  }
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
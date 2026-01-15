export class DiskCache {
  constructor() {
    this.rootHandle = null;
    this.isSupported = 'storage' in navigator && 'getDirectory' in navigator.storage;
    this.isInitialized = false;
  }
  /**
   * @returns {Promise<boolean>}
   */
 async init() {
  if (this.isInitialized) return true; 
  if (!this.isSupported) {
    this.isInitialized = false;
    return false;
  }
  try {
    this.rootHandle = await navigator.storage.getDirectory();
    this.isInitialized = true;
    return true;
  } catch (error) {
    this.isInitialized = false;
    return false;
  }}
  /**
   * @returns {boolean}
   */
  isAvailable() {
    return this.isSupported;
  }
  /**
   * @param {string} folderName
   * @returns {Promise<FileSystemDirectoryHandle>}
   */
async getOrCreateFolder(folderName) {
  if (!this.isSupported) {
    return null; // Sin soporte, retornar null
  }

  if (!this.isInitialized) {
    const initialized = await this.init();
    if (!initialized) {
      return null;
    }
  }

  try {
    const safeName = this._sanitizeFolderName(folderName);
    const folderHandle = await this.rootHandle.getDirectoryHandle(
      safeName, 
      { create: true }
    );
    return folderHandle;
  } catch (error) {
    return null; // Error = null, no throw
  }
}
  /**
   * @param {string} name 
   * @returns {string}
   */
  _sanitizeFolderName(name) {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 100);
  }
  /**
   * @param {FileSystemDirectoryHandle} folderHandle 
   * @param {Object} manifest 
   */
 async saveManifest(folderHandle, manifest) {
  if (!this.isSupported || !this.isInitialized) return false;
  try {
    const fileHandle = await folderHandle.getFileHandle('manifest.json', { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(manifest));
    await writable.close();
    return true;
  } catch (error) {
    return false;
  }
}
  /**
   * @param {FileSystemDirectoryHandle} folderHandle 
   * @returns {Promise<Object|null>}
   */
  async loadManifest(folderHandle) {
    try {
      const fileHandle = await folderHandle.getFileHandle('manifest.json');
      const file = await fileHandle.getFile();
      const text = await file.text();
      return JSON.parse(text);
    } catch (error) {
      return null;
    }
  }
  /**
   * @param {FileSystemDirectoryHandle} folderHandle 
   * @param {number} chunkIndex 
   * @param {Blob} blob
   */
async saveChunk(folderHandle, chunkIndex, blob) {
  if (!this.isSupported || !this.isInitialized) return false;
  try {
    const fileName = `chunk_${String(chunkIndex).padStart(4, '0')}.bin`;
    const fileHandle = await folderHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  } catch (error) {
    return false;
  }
}
  /**
   * @param {FileSystemDirectoryHandle} folderHandle 
   * @param {number} chunkIndex 
   * @returns {Promise<File|null>}
   */
  async loadChunk(folderHandle, chunkIndex) {
    try {
      const fileName = `chunk_${String(chunkIndex).padStart(4, '0')}.bin`;
      const fileHandle = await folderHandle.getFileHandle(fileName);
      return await fileHandle.getFile();
    } catch (error) {
      return null;
    }
  }
  /**
   * @param {FileSystemDirectoryHandle} folderHandle 
   * @returns {Promise<Set<number>>}
   */
  async getExistingChunks(folderHandle) {
    const existing = new Set();
    try {
      for await (const entry of folderHandle.values()) {
        if (entry.name.startsWith('chunk_') && entry.name.endsWith('.bin')) {
          const indexStr = entry.name.replace('chunk_', '').replace('.bin', '');
          existing.add(parseInt(indexStr, 10));
        }
      }
    } catch (error) {
      console.error('❌ Error listando chunks:', error);
    }
    return existing;
  }
  /**
   * @param {FileSystemDirectoryHandle} folderHandle 
   * @param {number} absoluteTime 
   */
async savePlaybackTime(folderHandle, absoluteTime) {
  if (!this.isSupported || !this.isInitialized) return false;
  try {
    const data = {
      time: absoluteTime,
      timestamp: Date.now()
    };
    const fileHandle = await folderHandle.getFileHandle('playback.json', { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data));
    await writable.close();
    return true;
  } catch (error) {
    return false;
  }
}
  /**
   * @param {FileSystemDirectoryHandle} folderHandle 
   * @returns {Promise<{time: number, timestamp: number}|null>}
   */
  async loadPlaybackTime(folderHandle) {
    try {
      const fileHandle = await folderHandle.getFileHandle('playback.json');
      const file = await fileHandle.getFile();
      const text = await file.text();
      return JSON.parse(text);
    } catch (error) {
      return null;
    }
  }
  /**
   * @param {string} folderName 
   * @returns {Promise<{exists: boolean, hasManifest: boolean, hasPlayback: boolean, chunkCount: number, playbackTime: number}>}
   */
async checkFolderStatus(folderName) {
  // Estado por defecto: sin datos locales
  const defaultStatus = {
    exists: false,
    hasManifest: false,
    hasPlayback: false,
    chunkCount: 0,
    playbackTime: 0
  };

  // Si no hay soporte, retornar inmediatamente
  if (!this.isSupported) {
    return defaultStatus;
  }

  // Intentar inicializar sin bloquear
  if (!this.isInitialized) {
    const initialized = await this.init();
    if (!initialized) {
      return defaultStatus;
    }
  }

  try {
    const safeName = this._sanitizeFolderName(folderName);
    
    let folderHandle;
    try {
      folderHandle = await this.rootHandle.getDirectoryHandle(safeName, { create: false });
    } catch (e) {
      // No existe, retornar estado por defecto (NO ES ERROR)
      return defaultStatus;
    }

    // Carpeta existe, intentar leer datos
    const manifest = await this.loadManifest(folderHandle);
    const playback = await this.loadPlaybackTime(folderHandle);
    const chunks = await this.getExistingChunks(folderHandle);

    return {
      exists: true,
      hasManifest: manifest !== null,
      hasPlayback: playback !== null,
      chunkCount: chunks.size,
      playbackTime: playback?.time || 0
    };
  } catch (error) {
    // Cualquier error: retornar estado por defecto
    return defaultStatus;
  }
}
  /**
   * @param {FileSystemDirectoryHandle} folderHandle 
   * @param {Array} signedUrls 
   * @param {Array} passwords 
   */
 async saveSignedUrls(folderHandle, signedUrls, passwords) {
  if (!this.isSupported || !this.isInitialized) return false;
  try {
    const data = {
      signedUrls,
      passwords,
      createdAt: Date.now(),
      expiresAt: Date.now() + (3 * 60 * 60 * 1000)
    };
    const fileHandle = await folderHandle.getFileHandle('urls.json', { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data));
    await writable.close();
    return true;
  } catch (error) {
    return false;
  }
}

  /**
   * @param {FileSystemDirectoryHandle} folderHandle 
   * @returns {Promise<{signedUrls: Array, passwords: Array}|null>}
   */
  async loadSignedUrls(folderHandle) {
    try {
      const fileHandle = await folderHandle.getFileHandle('urls.json');
      const file = await fileHandle.getFile();
      const text = await file.text();
      const data = JSON.parse(text);
      if (Date.now() > (data.expiresAt - 600000)) {
        console.log('⚠️ URLs expiradas');
        return null;
      }
      return {
        signedUrls: data.signedUrls,
        passwords: data.passwords
      };
    } catch (error) {
      return null;
    }
  }
  /**
   * @param {string} folderName 
   */
  async deleteFolder(folderName) {
    if (!this.isInitialized) return; 
    try {
      const safeName = this._sanitizeFolderName(folderName);
      await this.rootHandle.removeEntry(safeName, { recursive: true });
      console.log(`🗑️ Carpeta eliminada: ${folderName}`);
    } catch (error) {
     
    }
  }
  /**
   * @param {number} maxAgeDays 
   */
  async cleanOldFolders(maxAgeDays = 2) {
    if (!this.isInitialized) {
      await this.init();
    }
    if (!this.rootHandle) return;

    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const now = Date.now();

    try {
      for await (const entry of this.rootHandle.values()) {
        if (entry.kind === 'directory') {
          try {
            const folderHandle = await this.rootHandle.getDirectoryHandle(entry.name);
            const playback = await this.loadPlaybackTime(folderHandle);
            
            if (playback && (now - playback.timestamp) > maxAgeMs) {
              await this.rootHandle.removeEntry(entry.name, { recursive: true });
              console.log(`🗑️ Carpeta eliminada por antigüedad: ${entry.name}`);
            }
          } catch (e) {
            // Ignorar errores individuales
          }
        }
      }
    } catch (error) {
      console.error('❌ Error limpiando carpetas:', error);
    }
  }
  /**
   * @returns {Promise<{used: number, available: number}>}
   */
  async getStorageEstimate() {
    try {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        available: estimate.quota || 0
      };
    } catch (error) {
      return { used: 0, available: 0 };
    }
  }
}
export const diskCache = new DiskCache();
export class MemoryCache {
  constructor() {
    this.chunks = new Map();
    this.maxChunks = 3;
    this.manifest = null;
    this.playbackTime = 0;
    this.signedUrls = [];
    this.passwords = [];
    this.urlsExpireAt = 0;
  }
  /**
   * @param {number} chunkIndex 
   * @param {Blob} blob 
   */
  saveChunk(chunkIndex, blob) {
    this.chunks.set(chunkIndex, blob);
    this._enforceLimit();
    console.log(`📦 Chunk ${chunkIndex} en memoria (${this.chunks.size}/${this.maxChunks})`);
  }
  /**
   * @param {number} chunkIndex 
   * @returns {Blob|null}
   */
  getChunk(chunkIndex) {
    return this.chunks.get(chunkIndex) || null;
  }
  /**
   * @param {number} chunkIndex 
   * @returns {boolean}
   */
  hasChunk(chunkIndex) {
    return this.chunks.has(chunkIndex);
  }

/**
 * Mantiene solo chunks en ventana válida
 * @param {number} currentChunkIndex 
 * @param {number} totalChunks
 */
updateWindow(currentChunkIndex, totalChunks) {
  const validIndices = new Set();
  if (currentChunkIndex > 0) {
    validIndices.add(currentChunkIndex - 1);
  }
  validIndices.add(currentChunkIndex);
  if (currentChunkIndex < totalChunks - 1) {
    validIndices.add(currentChunkIndex + 1);
  }

  for (const [index, blob] of this.chunks) {
    if (!validIndices.has(index)) {
      // Revocar URL si se creó
      if (blob._blobUrl) {
        URL.revokeObjectURL(blob._blobUrl);
      }
      this.chunks.delete(index);
      console.log(`🗑️ Chunk ${index} eliminado de memoria (fuera de ventana)`);
    }
  }
}

_enforceLimit() {
  while (this.chunks.size > this.maxChunks) {
    const oldestKey = this.chunks.keys().next().value;
    this.chunks.delete(oldestKey);
    console.log(`🗑️ Chunk ${oldestKey} eliminado (límite)`);
  }}

  /**
   * @param {Object} manifest 
   */
  saveManifest(manifest) {
    this.manifest = manifest;
  }
  /**
   * @returns {Object|null}
   */
  getManifest() {
    return this.manifest;
  }
  /**
   * @param {number} time 
   */
  savePlaybackTime(time) {
    this.playbackTime = time;
  }
  /**
   * @returns {number}
   */
  getPlaybackTime() {
    return this.playbackTime;
  }
  /**
   * @param {Array} signedUrls 
   * @param {Array} passwords 
   */
  saveSignedUrls(signedUrls, passwords) {
    this.signedUrls = signedUrls;
    this.passwords = passwords;
    this.urlsExpireAt = Date.now() + (3 * 60 * 60 * 1000);
  }
  /**
   * @returns {{signedUrls: Array, passwords: Array}|null}
   */
  getSignedUrls() {
    if (Date.now() > (this.urlsExpireAt - 600000)) {
      return null;
    }
    return {
      signedUrls: this.signedUrls,
      passwords: this.passwords
    };
  }
  /**
   * @returns {Set<number>}
   */
  getExistingChunks() {
    return new Set(this.chunks.keys());
  }
  clear() {
    this.chunks.clear();
    this.manifest = null;
    this.playbackTime = 0;
    this.signedUrls = [];
    this.passwords = [];
    this.urlsExpireAt = 0;
    console.log('🧹 Memoria limpiada');
  }
}
export const memoryCache = new MemoryCache();
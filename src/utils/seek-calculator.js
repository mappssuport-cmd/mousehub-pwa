export class SeekCalculator {
  static PREROLL_MARGIN = 5;
  /**
   * @param {Object} manifest 
   */
  static initFromManifest(manifest) {
    if (manifest && manifest.preroll_margin !== undefined) {
      this.PREROLL_MARGIN = manifest.preroll_margin;
      console.log(`📐 Preroll margin configurado: ${this.PREROLL_MARGIN}s`);
    }
  }
  /**
   * @param {string} timeString 
   * @returns {number} 
   */
  static timeToSeconds(timeString) {
    const parts = timeString.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return parts[0] || 0;
  }
  /**
   * @param {number} totalSeconds 
   * @returns {string} "H:MM:SS" o "MM:SS"
   */
  static secondsToTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }
  /**
   * @param {number} chunkIndex 
   * @param {Array} chunks 
   * @returns {boolean}
   */
  static chunkHasPreroll(chunkIndex, chunks) {
    if (chunkIndex <= 0) return false;
    const chunk = chunks[chunkIndex];
    if (chunk && chunk.has_preroll !== undefined) {
      return chunk.has_preroll;
    }
    return chunkIndex > 0;
  }
  /**
   * @param {number} chunkIndex 
   * @param {Array} chunks 
   * @returns {number}
   */
  static getPrerollForChunk(chunkIndex, chunks) {
    return this.chunkHasPreroll(chunkIndex, chunks) ? this.PREROLL_MARGIN : 0;
  }
  /**
   * @param {number} absoluteSeconds
   * @param {Array} chunks
   * @returns {Object}
   */
  static findChunkForTime(absoluteSeconds, chunks) {
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];   
      if (absoluteSeconds >= chunk.start_position && 
          absoluteSeconds < chunk.end_position) {
        
        const internalSecond = absoluteSeconds - chunk.start_position;
        return {
          chunkIndex: i,
          internalSecond: internalSecond,
          chunk: chunk
        };
      }
    }

    // Si está más allá del último chunk
    const lastChunk = chunks[chunks.length - 1];
    if (absoluteSeconds >= lastChunk.end_position) {
      return {
        chunkIndex: chunks.length - 1,
        internalSecond: lastChunk.duration,
        chunk: lastChunk
      };
    }
    return {
      chunkIndex: 0,
      internalSecond: 0,
      chunk: chunks[0]
    };
  }

  /**
   * @param {number} chunkIndex 
   * @param {number} physicalTime
   * @param {Array} chunks 
   * @returns {number}
   */
  static calculateAbsoluteTime(chunkIndex, physicalTime, chunks) {
    if (chunkIndex < 0 || chunkIndex >= chunks.length) {
      return 0;
    }
    const chunk = chunks[chunkIndex];
    const preroll = this.getPrerollForChunk(chunkIndex, chunks);
    let logicalTime = Math.max(0, physicalTime - preroll);
    logicalTime = Math.min(logicalTime, chunk.duration);
    
    return chunk.start_position + logicalTime;
  }
  /**
   * @param {number} chunkIndex 
   * @param {number} logicalTime 
   * @param {Array} chunks
   * @returns {number} 
   */
  static logicalToPhysicalTime(chunkIndex, logicalTime, chunks) {
    const preroll = this.getPrerollForChunk(chunkIndex, chunks);
    return logicalTime + preroll;
  }

  /**
   * @param {number} chunkIndex 
   * @param {Array} chunks 
   * @returns {number}
   */
  static getLogicalEndPhysicalTime(chunkIndex, chunks) {
    if (chunkIndex < 0 || chunkIndex >= chunks.length) {
      return 0;
    }
    const chunk = chunks[chunkIndex];
    const preroll = this.getPrerollForChunk(chunkIndex, chunks);
    return preroll + chunk.duration;
  }
  /**
   * @param {number} currentAbsoluteTime 
   * @param {number} totalDuration 
   * @returns {number}
   */
  static calculateProgress(currentAbsoluteTime, totalDuration) {
    if (totalDuration <= 0) return 0;
    return Math.min(100, (currentAbsoluteTime / totalDuration) * 100);
  }
}
export class SeekCalculator {
  static PREROLL_MARGIN = 2;
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
   * @returns {string}
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
   * @param {number} absoluteSeconds
   * @param {Array} chunks
   * @returns {Object}
   */
  static findChunkForTime(absoluteSeconds, chunks) {
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];   
      if (absoluteSeconds >= chunk.start_position && 
          absoluteSeconds < chunk.end_position) {
        
        const internalSecond = absoluteSeconds - chunk.start_position
        return {
          chunkIndex: i,
          internalSecond: internalSecond,
          chunk: chunk
        };
      }
    }
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
   * @param {number} internalSecond 
   * @param {Array} chunks 
   * @returns {number}
   */
  static calculateAbsoluteTime(chunkIndex, internalSecond, chunks) {
    if (chunkIndex < 0 || chunkIndex >= chunks.length) {
      return 0;
    }
    return chunks[chunkIndex].start_position + internalSecond;
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
/**
 * Convierte tiempo lógico (chunk + segundo interno) a tiempo físico del video
 * @param {number} chunkIndex - Índice del chunk
 * @param {number} logicalSecond - Segundo lógico dentro del chunk (0-based)
 * @param {Array} chunks - Array de chunks del manifest
 * @returns {number} - Tiempo físico en segundos dentro del archivo de video
 */
static logicalToPhysicalTime(chunkIndex, logicalSecond, chunks) {
  if (chunkIndex < 0 || chunkIndex >= chunks.length) {
    console.warn(`⚠️ Chunk index ${chunkIndex} fuera de rango`);
    return 0;
  }
  
  // Para chunk 0, no hay preroll
  if (chunkIndex === 0) {
    return logicalSecond;
  }
  
  // Para chunks > 0, agregar preroll al tiempo físico
  return logicalSecond + SeekCalculator.PREROLL_MARGIN;
}
}
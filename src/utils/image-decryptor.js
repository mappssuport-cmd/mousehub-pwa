export class ImageDecryptor {
  /**
   * SHA-256 implementación JavaScript pura (fallback para TVs)
   */
  static sha256Pure(message) {
    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];
    const H = [
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];
    const rotr = (n, x) => (x >>> n) | (x << (32 - n));
    const sigma0 = x => rotr(7, x) ^ rotr(18, x) ^ (x >>> 3);
    const sigma1 = x => rotr(17, x) ^ rotr(19, x) ^ (x >>> 10);
    const Sigma0 = x => rotr(2, x) ^ rotr(13, x) ^ rotr(22, x);
    const Sigma1 = x => rotr(6, x) ^ rotr(11, x) ^ rotr(25, x);
    const Ch = (x, y, z) => (x & y) ^ (~x & z);
    const Maj = (x, y, z) => (x & y) ^ (x & z) ^ (y & z);
    let bytes;
    if (typeof message === 'string') {
      bytes = new TextEncoder().encode(message);
    } else {
      bytes = new Uint8Array(message);
    }
    const bitLen = bytes.length * 8;
    const paddingLen = ((bytes.length + 9) % 64 === 0) ? 0 : 64 - ((bytes.length + 9) % 64);
    const padded = new Uint8Array(bytes.length + 1 + paddingLen + 8);
    padded.set(bytes);
    padded[bytes.length] = 0x80;
    const view = new DataView(padded.buffer);
    view.setUint32(padded.length - 4, bitLen, false);
    for (let i = 0; i < padded.length; i += 64) {
      const W = new Uint32Array(64);
      for (let t = 0; t < 16; t++) {
        W[t] = view.getUint32(i + t * 4, false);
      }
      for (let t = 16; t < 64; t++) {
        W[t] = (sigma1(W[t-2]) + W[t-7] + sigma0(W[t-15]) + W[t-16]) >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let t = 0; t < 64; t++) {
        const T1 = (h + Sigma1(e) + Ch(e, f, g) + K[t] + W[t]) >>> 0;
        const T2 = (Sigma0(a) + Maj(a, b, c)) >>> 0;
        h = g;
        g = f;
        f = e;
        e = (d + T1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (T1 + T2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0;
      H[1] = (H[1] + b) >>> 0;
      H[2] = (H[2] + c) >>> 0;
      H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0;
      H[5] = (H[5] + f) >>> 0;
      H[6] = (H[6] + g) >>> 0;
      H[7] = (H[7] + h) >>> 0;
    }
    const result = new Uint8Array(32);
    for (let i = 0; i < 8; i++) {
      result[i * 4] = (H[i] >>> 24) & 0xff;
      result[i * 4 + 1] = (H[i] >>> 16) & 0xff;
      result[i * 4 + 2] = (H[i] >>> 8) & 0xff;
      result[i * 4 + 3] = H[i] & 0xff;
    }
    return result;
  }

/**
 * Genera key SHA-256 con fallback para TVs
 */
static async generateKey(password) {
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);
  let canUseNativeCrypto = false;
  try {
    if (typeof crypto === 'undefined' || crypto === null) {
      console.log('🔐 crypto no existe');
    }
    else if (typeof crypto.subtle === 'undefined' || crypto.subtle === null) {
      console.log('🔐 crypto.subtle no existe');
    }
    else if (typeof crypto.subtle.digest !== 'function') {
      console.log('🔐 crypto.subtle.digest no es función');
    }
    else {
      canUseNativeCrypto = true;
    }
  } catch (checkError) {
    console.warn('⚠️ Error verificando crypto:', checkError.message);
    canUseNativeCrypto = false;
  }
  if (canUseNativeCrypto) {
    try {
      console.log('🔐 Usando crypto.subtle (nativo)');
      const keyBuffer = await crypto.subtle.digest('SHA-256', passwordBytes);
      return new Uint8Array(keyBuffer);
    } catch (cryptoError) {
      console.warn('⚠️ crypto.subtle.digest falló:', cryptoError.message);
    }
  }
  console.log('🔐 Usando SHA-256 JavaScript puro (fallback TV)');
  return this.sha256Pure(passwordBytes);}

  static async decryptByteRange(encryptedFileArrayBuffer, password, startByte, endByte) {
    try {
      const fileData = new Uint8Array(encryptedFileArrayBuffer);
      console.log('📦 Archivo completo:', fileData.byteLength, 'bytes');
      console.log('🎯 Rango solicitado:', startByte, '-', endByte);
      const encryptedData = fileData.slice(startByte, endByte + 1);
      console.log('🔐 Datos cifrados:', encryptedData.byteLength, 'bytes');
      const key = await this.generateKey(password);
      const decrypted = new Uint8Array(encryptedData.length);
      for (let i = 0; i < encryptedData.length; i++) {
        decrypted[i] = encryptedData[i] ^ key[i % key.length];
      }
      console.log('✅ Descifrado XOR correcto:', decrypted.length, 'bytes');
      return decrypted;
    } catch (error) {
      console.error('❌ Error descifrando rango XOR:', error);
      throw error;
    }
  }
 static async downloadAndDecryptImage(cloudflareUrl, password, startByte, endByte) {
  try {
    console.log('📥 Descargando:', cloudflareUrl);
    console.log('📦 Rango:', startByte, '-', endByte);
    
    // ✅ CRÍTICO: Usar Range header para descargar SOLO el fragmento necesario
    const response = await fetch(cloudflareUrl, {
      headers: {
        'Range': `bytes=${startByte}-${endByte}`
      }
    });
    
    // ✅ Verificar que el servidor soportó el Range request
    if (response.status === 206) {
      console.log('✅ Descarga parcial (206) exitosa');
    } else if (response.status === 200) {
      console.warn('⚠️ Servidor ignoró Range, descargando archivo completo');
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const fileArrayBuffer = await response.arrayBuffer();
    console.log('✅ Datos descargados:', fileArrayBuffer.byteLength, 'bytes');
    
    // ✅ Si fue 206, los datos YA están en el rango correcto
    let imageBytes;
    if (response.status === 206) {
      // Los datos ya vienen en el rango solicitado
      const fileData = new Uint8Array(fileArrayBuffer);
      const key = await this.generateKey(password);
      imageBytes = new Uint8Array(fileData.length);
      for (let i = 0; i < fileData.length; i++) {
        imageBytes[i] = fileData[i] ^ key[i % key.length];
      }
    } else {
      // Fallback: si descargó todo, extraer el rango
      imageBytes = await this.decryptByteRange(
        fileArrayBuffer,
        password,
        Number(startByte),
        Number(endByte)
      );
    }
    
    const blob = new Blob([imageBytes], { type: 'image/webp' });
    const imageUrl = URL.createObjectURL(blob);
    console.log('🖼️ Imagen lista para mostrar');
    return imageUrl;
  } catch (error) {
    console.error('❌ Error descargando/descifrando:', error);
    throw error;
  }}
  static revokeBlobUrl(blobUrl) {
    if (blobUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrl);
      console.log('🗑️ Blob URL liberada');
    }
  }
}
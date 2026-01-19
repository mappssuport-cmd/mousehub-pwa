
export class FolderDecryptor {
  
  /**
 * SHA-256 implementación JavaScript pura (fallback para TVs sin crypto.subtle)
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
      h = g; g = f; f = e;
      e = (d + T1) >>> 0;
      d = c; c = b; b = a;
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
 * Descifra string Base64 con XOR + SHA-256 (CON FALLBACK para TVs)
 * @param {string} encryptedBase64
 * @param {string} password
 * @returns {Promise<string>}
 */
static async decryptXOR(encryptedBase64, password) {
  try {
    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);
    
    let key;
    
    // ✅ VERIFICAR SOPORTE DE CRYPTO.SUBTLE
    let canUseNativeCrypto = false;
    try {
      if (typeof crypto !== 'undefined' && 
          crypto !== null && 
          typeof crypto.subtle !== 'undefined' && 
          crypto.subtle !== null &&
          typeof crypto.subtle.digest === 'function') {
        canUseNativeCrypto = true;
      }
    } catch (checkError) {
      console.warn('⚠️ FolderDecryptor: Error verificando crypto:', checkError.message);
      canUseNativeCrypto = false;
    }
    
    // ✅ USAR NATIVO O FALLBACK
    if (canUseNativeCrypto) {
      try {
        console.log('🔐 FolderDecryptor: Usando crypto.subtle (nativo)');
        const keyBuffer = await crypto.subtle.digest('SHA-256', passwordBytes);
        key = new Uint8Array(keyBuffer);
      } catch (cryptoError) {
        console.warn('⚠️ FolderDecryptor: crypto.subtle.digest falló:', cryptoError.message);
        console.log('🔐 FolderDecryptor: Fallback a SHA-256 puro');
        key = this.sha256Pure(passwordBytes);
      }
    } else {
      console.log('🔐 FolderDecryptor: crypto.subtle NO disponible, usando SHA-256 puro');
      key = this.sha256Pure(passwordBytes);
    }
    
    // Decodificar Base64
    const encryptedData = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    
    // XOR para descifrar
    const decrypted = new Uint8Array(encryptedData.length);
    for (let i = 0; i < encryptedData.length; i++) {
      decrypted[i] = encryptedData[i] ^ key[i % key.length];
    }
    
    const result = new TextDecoder().decode(decrypted);
    
    if (!result) {
      throw new Error('Descifrado vacío o inválido');
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ FolderDecryptor.decryptXOR error:', error);
    throw error;
  }
}
 /**
 * @param {object} folderDoc
 * @param {string} folderKey 
 * @returns {Promise<object>} 
 */
static async decryptFolderData(folderDoc, folderKey) {
  try {
    const decryptedName = await this.decryptXOR(folderDoc.folder_name, folderKey);
    const decryptedIcon = await this.decryptXOR(folderDoc.icon_folder, folderKey);
    
    // Promise.all para descifrar array en paralelo (más eficiente)
    const decryptedMiniaturaData = await Promise.all(
      folderDoc.miniatura_data.map(encrypted => this.decryptXOR(encrypted, folderKey))
    );
    
    const decryptedDescription = await this.decryptXOR(folderDoc.folder_descript, folderKey);
    const decryptedMiniaturaId = await this.decryptXOR(folderDoc.miniatura_id, folderKey);
    
    console.log('✅ Carpeta descifrada:', {
      nombre: decryptedName,
      descripcion: decryptedDescription,
      icono: decryptedIcon,
      miniatura_id: decryptedMiniaturaId,
      miniatura_data: decryptedMiniaturaData
    });
    
    return {
      folder_name: decryptedName,
      folder_descript: decryptedDescription,
      icon_folder: decryptedIcon,
      miniatura_id: decryptedMiniaturaId,
      miniatura_data: decryptedMiniaturaData,
      master_manifest: folderDoc.master_manifest,
      idown_support: folderDoc.idown_support || folderDoc.Idown_suport,
      unifiq_support: folderDoc.unifiq_support || folderDoc.Unifiq_suport
    };   
  } catch (error) {
    console.error('❌ Error descifrando carpeta:', error);
    throw error;
  }
}

}
export class TagDecryptor {
  /**
   * @param {string} encryptedTag
   * @param {string} password
   * @returns {Promise<string>}
   */
static async decrypt(encryptedTag, password, debugCallback = null) {
  const log = (msg, type = 'info') => {
    console.log(msg);
    if (debugCallback) debugCallback(msg, type);
  };
  try {
    if (!encryptedTag || !password) {
      log('⚠️ Tag o contraseña vacíos', 'warning');
      return null;
    }
    log('🔍 Iniciando descifrado de tag...', 'info');
    log(`📏 Longitud del tag: ${encryptedTag.length} caracteres`, 'info');
    const encryptedBytes = this.base64ToBytes(encryptedTag);
    if (!encryptedBytes) {
      log('❌ FALLO: No se pudo decodificar Base64 inicial', 'error');
      log(`Tag problemático: ${encryptedTag.substring(0, 100)}...`, 'error');
      return null;
    }
    log(`✅ Paso 1: Base64 inicial OK (${encryptedBytes.length} bytes)`, 'success');
    const decryptedBytes = await this.decryptXOR(password, encryptedBytes, debugCallback);
    if (!decryptedBytes) {
      log('❌ FALLO: Error en descifrado XOR', 'error');
      return null;
    }
    log(`✅ Paso 2: XOR decrypt OK (${decryptedBytes.length} bytes)`, 'success');
    const base64AfterXOR = this.bytesToString(decryptedBytes);
    log(`📦 Paso 3: Conversión a string OK (${base64AfterXOR.length} chars)`, 'step');
    const decodedBytes = this.base64ToBytes(base64AfterXOR);
    if (!decodedBytes) {
      log('❌ FALLO: No se pudo decodificar Base64 intermedio', 'error');
      log(`Datos: ${base64AfterXOR.substring(0, 100)}...`, 'error');
      return null;
    }
    
    log(`✅ Paso 4: Base64 intermedio OK (${decodedBytes.length} bytes)`, 'success');
    
    // PASO 5: bytes → string
    const textBeforeReverse = this.bytesToString(decodedBytes);
    log(`📝 Paso 5: Conversión pre-reversa OK (${textBeforeReverse.length} chars)`, 'step');
    
    // PASO 6: Reversa (invertir cadena)
    const reversed = textBeforeReverse.split('').reverse().join('');
    log(`🔄 Paso 6: Reversa OK (${reversed.length} chars)`, 'success');
    
    // PASO 7: ROT47
    const afterROT47 = this.applyROT47(reversed);
    log(`🔢 Paso 7: ROT47 OK (${afterROT47.length} chars)`, 'success');
    
    // PASO 8: Unreorder blocks
    const unreordered = this.unreorderBlocks(afterROT47, 4);
    log(`📋 Paso 8: Unreorder blocks OK (${unreordered.length} chars)`, 'success');
    
    // PASO 9: Base64 decode final → bytes
    const finalBytes = this.base64ToBytes(unreordered);
    if (!finalBytes) {
      log('❌ FALLO: No se pudo decodificar Base64 final', 'error');
      log(`Datos: ${unreordered.substring(0, 100)}...`, 'error');
      return null;
    }
    
    log(`✅ Paso 9: Base64 final OK (${finalBytes.length} bytes)`, 'success');
    
    // PASO 10: bytes → texto plano
    const plainText = this.bytesToString(finalBytes);
    
    log(`✅ ¡ÉXITO! Tag descifrado: "${plainText}"`, 'success');
    return plainText.trim();
    
  } catch (error) {
    log(`❌ ERROR CRÍTICO: ${error.message}`, 'error');
    log(`Stack: ${error.stack}`, 'error');
    return null;
  }
}

  /**
   * @param {string} password
   * @param {Uint8Array} encryptedBytes
   * @returns {Promise<Uint8Array>}
   */
static async decryptXOR(password, encryptedBytes, debugCallback = null) {
  const log = (msg, type = 'info') => {
    console.log(msg);
    if (debugCallback) debugCallback(msg, type);
  };

  try {
    log(`🔐 Iniciando XOR decrypt...`, 'step');
    log(`📊 Password length: ${password.length}`, 'step');
    log(`📊 Encrypted bytes: ${encryptedBytes.length}`, 'step');

    let key;

    // Intentar usar crypto.subtle si está disponible
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      try {
        log(`✓ crypto.subtle disponible, usando SHA-256 nativo`, 'step');
        const encoder = new TextEncoder();
        const passwordBytes = encoder.encode(password);
        const keyBuffer = await crypto.subtle.digest('SHA-256', passwordBytes);
        key = new Uint8Array(keyBuffer);
        log(`✓ SHA-256 nativo generado: ${key.length} bytes`, 'success');
      } catch (subtleError) {
        log(`⚠️ crypto.subtle falló: ${subtleError.message}`, 'warning');
        log(`⚠️ Usando fallback manual SHA-256`, 'warning');
        key = await this.sha256Fallback(password);
      }
    } else {
      log(`⚠️ crypto.subtle NO disponible`, 'warning');
      log(`⚠️ Usando fallback manual SHA-256`, 'warning');
      key = await this.sha256Fallback(password);
    }

    if (!key || key.length === 0) {
      log(`❌ No se pudo generar la key`, 'error');
      return null;
    }

    log(`🔑 Key final: ${key.length} bytes`, 'success');
    log(`🔑 Key preview: [${Array.from(key.slice(0, 8)).join(', ')}...]`, 'step');

    // XOR byte a byte
    const decrypted = new Uint8Array(encryptedBytes.length);
    for (let i = 0; i < encryptedBytes.length; i++) {
      decrypted[i] = encryptedBytes[i] ^ key[i % key.length];
    }

    log(`✓ XOR aplicado a ${encryptedBytes.length} bytes`, 'success');
    return decrypted;
  } catch (error) {
    log(`❌ Error en decryptXOR: ${error.message}`, 'error');
    log(`❌ Stack: ${error.stack}`, 'error');
    return null;
  }
}

/**
 * Implementación fallback de SHA-256 para dispositivos sin crypto.subtle
 * @param {string} message - Mensaje a hashear
 * @returns {Promise<Uint8Array>} - Hash SHA-256 como bytes
 */
static async sha256Fallback(message) {
  // Implementación simplificada de SHA-256
  // Basada en el estándar FIPS 180-4
  
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(message);

  // Constantes SHA-256
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

  // Valores hash iniciales
  let H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  // Pre-procesamiento
  const ml = data.length * 8;
  const paddedLength = Math.ceil((ml + 65) / 512) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(data);
  padded[data.length] = 0x80;

  // Agregar longitud del mensaje
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 4, ml & 0xffffffff, false);
  view.setUint32(paddedLength - 8, Math.floor(ml / 0x100000000), false);

  // Procesar en bloques de 512 bits
  for (let offset = 0; offset < paddedLength; offset += 64) {
    const W = new Array(64);

    // Preparar schedule de mensajes
    for (let i = 0; i < 16; i++) {
      W[i] = view.getUint32(offset + i * 4, false);
    }

    for (let i = 16; i < 64; i++) {
      const s0 = rightRotate(W[i - 15], 7) ^ rightRotate(W[i - 15], 18) ^ (W[i - 15] >>> 3);
      const s1 = rightRotate(W[i - 2], 17) ^ rightRotate(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }

    // Variables de trabajo
    let [a, b, c, d, e, f, g, h] = H;

    // Compresión principal
    for (let i = 0; i < 64; i++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    // Actualizar valores hash
    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  // Convertir a bytes
  const result = new Uint8Array(32);
  const resultView = new DataView(result.buffer);
  for (let i = 0; i < 8; i++) {
    resultView.setUint32(i * 4, H[i], false);
  }

  return result;
}

  /**
   * Reordenado inverso: último carácter pasa al inicio de cada bloque
   * (Invierte el proceso de Python: block[1:] + block[0] → block[-1] + block[:-1])
   * 
   * SIN CAMBIOS - Método se mantiene igual
   */
  static unreorderBlocks(input, blockSize) {
    if (!input) return '';
    let result = '';
    
    for (let i = 0; i < input.length; i += blockSize) {
      const end = Math.min(i + blockSize, input.length);
      let block = input.substring(i, end);
      
      // Último carácter → primero
      if (block.length > 1) {
        block = block.charAt(block.length - 1) + block.substring(0, block.length - 1);
      }
      
      result += block;
    }
    
    return result;
  }

  /**
   * Aplica ROT47 (simétrico - reversible)
   * 
   * SIN CAMBIOS - Método se mantiene igual
   */
  static applyROT47(input) {
    if (!input) return '';
    let result = '';
    
    for (let i = 0; i < input.length; i++) {
      const c = input.charCodeAt(i);
      if (c >= 33 && c <= 126) {
        const rotated = ((c - 33 + 47) % 94) + 33;
        result += String.fromCharCode(rotated);
      } else {
        result += input.charAt(i);
      }
    }
    
    return result;
  }

  /**
   * Base64 → bytes (con limpieza de input)
   */
  static base64ToBytes(base64) {
    try {
      const cleaned = base64
        .replace(/\s/g, '')           // Quitar espacios/tabs/newlines
        .replace(/['"]/g, '')         // Quitar comillas
        .trim();                      // Trim final
      
      // Validar que sea Base64 válido
      if (!/^[A-Za-z0-9+/]+=*$/.test(cleaned)) {
        console.warn('⚠️ String no es Base64 válido:', base64.substring(0, 50) + '...');
        return null;
      }
      
      const binaryString = atob(cleaned);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } catch (error) {
      console.error('❌ Error decodificando Base64:', error.message);
      console.log('Input problemático:', base64.substring(0, 100) + '...');
      return null;
    }
  }

  static bytesToString(bytes) {
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes);
  }
}
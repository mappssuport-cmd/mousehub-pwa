
export class CryptoManager {
  
 /**
   * @param {string} encryptedBase64
   * @param {string} password
   * @returns {Promise<string>}
   */
/**
 * Descifra strings cifrados con XOR desde Java
 * @param {string} encryptedBase64
 * @param {string} password
 * @returns {Promise<string>}
 */
static async decryptJavaAES(encryptedBase64, password) {
  try {
    console.log('🔓 Descifrando con XOR...');
    
    const cleanedBase64 = encryptedBase64
      .replace(/\s/g, '')
      .replace(/\n/g, '')
      .replace(/\r/g, '');
    
    // Decodificar Base64 a bytes
    const encryptedData = Uint8Array.from(atob(cleanedBase64), c => c.charCodeAt(0));
    
    // Derivar key SHA-256
    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);
    const keyBuffer = await crypto.subtle.digest('SHA-256', passwordBytes);
    const key = new Uint8Array(keyBuffer);
    
    // XOR para descifrar
    const decrypted = new Uint8Array(encryptedData.length);
    for (let i = 0; i < encryptedData.length; i++) {
      decrypted[i] = encryptedData[i] ^ key[i % key.length];
    }
    
    const result = new TextDecoder().decode(decrypted);
    
    if (!result) {
      throw new Error('Descifrado vacío - posible contraseña incorrecta');
    }
    
    console.log('✅ Descifrado XOR exitoso');
    return result;
    
  } catch (error) {
    console.error('❌ Error descifrando XOR:', error);
    throw error;
  }
}
 /**
 * @param {string} encryptedBase64
 * @param {string} password 
 * @returns {Promise<string>}
 */
static async decryptPythonAES(encryptedBase64, password) {
  try {
    console.log('🔓 Descifrando con Python XOR...');
    console.log('   - Encrypted length:', encryptedBase64.length);
    
    const cleanedBase64 = encryptedBase64
      .replace(/\\/g, '')
      .replace(/\s/g, '')
      .replace(/\n/g, '')
      .replace(/\r/g, '');
    
    const encryptedData = Uint8Array.from(atob(cleanedBase64), c => c.charCodeAt(0));
    console.log('   - Total bytes:', encryptedData.length);
    
    // Derivar key con SHA-256
    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);
    const keyBuffer = await crypto.subtle.digest('SHA-256', passwordBytes);
    const key = new Uint8Array(keyBuffer);
    
    console.log('   - Key derivada con SHA-256');
    
    // XOR: expandir key para cubrir todos los datos
    const keyExpanded = new Uint8Array(encryptedData.length);
    for (let i = 0; i < encryptedData.length; i++) {
      keyExpanded[i] = key[i % key.length];
    }
    
    // Aplicar XOR
    const decrypted = new Uint8Array(encryptedData.length);
    for (let i = 0; i < encryptedData.length; i++) {
      decrypted[i] = encryptedData[i] ^ keyExpanded[i];
    }
    
    const result = new TextDecoder().decode(decrypted);
    console.log('✅ Descifrado exitoso:', result.substring(0, 50));
    return result;
    
  } catch (error) {
    console.error('❌ Error descifrando (Python XOR):', error);
    throw error;
  }
}
/**
 * @param {Blob} encryptedBlob
 * @param {string} passwordHex
 * @param {string} filename
 * @param {string} objectType
 * @returns {Promise<Blob>}
 */
static async decryptBlob(encryptedBlob, passwordHex, filename, objectType = 'mp4') {
  try {
    console.log(`🔓 Descifrando blob con XOR: ${filename}`);
    
    const encryptedBuffer = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(`FileReader falló: ${reader.error?.message || 'Error desconocido'}`));
      reader.readAsArrayBuffer(encryptedBlob);
    });
    
    const encryptedData = new Uint8Array(encryptedBuffer);
    console.log(`📦 Encrypted data: ${encryptedData.length} bytes`);
    
    if (!passwordHex || passwordHex.length !== 64) {
      throw new Error(`Clave hex inválida: longitud ${passwordHex?.length || 0} (esperado: 64)`);
    }
    
    // Convertir hex a bytes
    const keyBytes = new Uint8Array(
      passwordHex.match(/.{2}/g).map(byte => parseInt(byte, 16))
    );
    console.log(`🔑 Clave: ${keyBytes.length} bytes`);
    
    // XOR: expandir key
    const keyExpanded = new Uint8Array(encryptedData.length);
    for (let i = 0; i < encryptedData.length; i++) {
      keyExpanded[i] = keyBytes[i % keyBytes.length];
    }
    
    // Aplicar XOR
    const decrypted = new Uint8Array(encryptedData.length);
    for (let i = 0; i < encryptedData.length; i++) {
      decrypted[i] = encryptedData[i] ^ keyExpanded[i];
    }
    
    const mimeTypes = {
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mkv': 'video/x-matroska',
      'mov': 'video/quicktime'
    };
    const mimeType = mimeTypes[objectType.toLowerCase()] || 'video/mp4';
    
    const resultBlob = new Blob([decrypted], { type: mimeType });
    console.log(`✅ Blob descifrado: ${(resultBlob.size / 1024 / 1024).toFixed(2)} MB`);
    
    return resultBlob;
    
  } catch (error) {
    console.error('❌ Error descifrando blob:', {
      filename,
      errorName: error.name,
      errorMessage: error.message,
      blobSize: encryptedBlob?.size,
      passwordValid: passwordHex?.length === 64
    });
    throw new Error(`Descifrado falló: ${error.message}`);
  }
}
  /**
   * @param {string} hexString
   * @returns {Uint8Array}
   */
  static hexToBytes(hexString) {
    const bytes = [];
    for (let i = 0; i < hexString.length; i += 2) {
      bytes.push(parseInt(hexString.substr(i, 2), 16));
    }
    return new Uint8Array(bytes);
  }
}
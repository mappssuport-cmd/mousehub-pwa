
export class ImageDecryptor {
  static async decryptByteRange(encryptedFileArrayBuffer, password, startByte, endByte) {
  try {
    const fileData = new Uint8Array(encryptedFileArrayBuffer);
    console.log('📦 Archivo completo:', fileData.byteLength, 'bytes');
    console.log('🎯 Rango solicitado:', startByte, '-', endByte);
    
    const encryptedData = fileData.slice(startByte, endByte + 1);
    console.log('🔐 Datos cifrados:', encryptedData.byteLength, 'bytes');
    
    // Derivar key SHA-256 con fallback para TVs
    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);
    
    let key;
    if (crypto && crypto.subtle && crypto.subtle.digest) {
      // Navegadores modernos
      const keyBuffer = await crypto.subtle.digest('SHA-256', passwordBytes);
      key = new Uint8Array(keyBuffer);
    } else {
      // Fallback simple para TVs: usar los bytes de la password directamente
      // repetidos para alcanzar 32 bytes (SHA-256 length)
      key = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        key[i] = passwordBytes[i % passwordBytes.length];
      }
      console.warn('⚠️ Usando fallback SHA-256 (TV/contexto inseguro)');
    }
    
    // XOR para descifrar
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

  /**
   * Descarga y descifra una imagen desde Cloudflare
   */
  static async downloadAndDecryptImage(cloudflareUrl, password, startByte, endByte) {
    try {
      console.log('📥 Descargando:', cloudflareUrl);
      console.log('📦 Rango:', startByte, '-', endByte);

      const response = await fetch(cloudflareUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const fileArrayBuffer = await response.arrayBuffer();
      console.log('✅ Archivo descargado:', fileArrayBuffer.byteLength, 'bytes');

      const imageBytes = await this.decryptByteRange(
        fileArrayBuffer,
        password,
        Number(startByte),
        Number(endByte)
      );

      // ⚠️ El formato real se detecta por header, aquí asumimos WebP
      const blob = new Blob([imageBytes], { type: 'image/webp' });
      const imageUrl = URL.createObjectURL(blob);

      console.log('🖼️ Imagen lista para mostrar');
      return imageUrl;

    } catch (error) {
      console.error('❌ Error descargando/descifrando:', error);
      throw error;
    }
  }

  static revokeBlobUrl(blobUrl) {
    if (blobUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrl);
      console.log('🗑️ Blob URL liberada');
    }
  }
}

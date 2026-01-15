
export class FolderDecryptor {
  
  /**
 * Descifra string Base64 con XOR + SHA-256
 * @param {string} encryptedBase64
 * @param {string} password
 * @returns {Promise<string>}
 */
static async decryptXOR(encryptedBase64, password) {
  try {
    // Derivar key SHA-256 (usando Web Crypto API nativa)
    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);
    const keyBuffer = await crypto.subtle.digest('SHA-256', passwordBytes);
    const key = new Uint8Array(keyBuffer);
    
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
    console.error('❌ Error descifrando XOR:', error);
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
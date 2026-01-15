import appwriteManager from '../managers/appwrite-manager.js';
import storage from './storage-manager.js';
import { CryptoManager } from './crypto-manager.js';

export class ManifestProcessor {
  /**
   * @param {string} ownerId 
   * @returns {Promise<string|null>}
   */
  static async loadManifestKey(ownerId) {
    try {
      const result = await appwriteManager.getManifestKey(ownerId);
      if (result.success) {
        storage.set('manifest_key', result.data);
        console.log('✅ Manifest key cargada y guardada');
        return result.data;
      }
      console.error('❌ Error cargando manifest key:', result.error);
      return null;
    } catch (error) {
      console.error('❌ Error en loadManifestKey:', error);
      return null;
    }
  }

  /**
   * @param {string} encryptedManifestUrl
   * @param {string} folderKey
   * @param {string} manifestKey
   * @returns {Promise<Object>}
   */
  static async downloadAndDecrypt(encryptedManifestUrl, folderKey, manifestKey) {
    console.log('🔍 DEBUG - Parámetros recibidos en downloadAndDecrypt:');
    console.log('   Parámetro 1 (encryptedManifestUrl):', encryptedManifestUrl?.substring(0, 50));
    console.log('   Parámetro 2 (folderKey):', folderKey);
    console.log('   Parámetro 3 (manifestKey):', manifestKey);
    
    try {
      console.log('🔓 PASO 1: Descifrando URL con folderKey (cifrado Java)...');
      const manifestUrl = await CryptoManager.decryptJavaAES(encryptedManifestUrl, folderKey);
      console.log('🔗 URL manifest descifrada:', manifestUrl);
      
      console.log('📥 PASO 2: Descargando manifest desde URL...');
      const response = await fetch(manifestUrl);
      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status} descargando manifest`);
      }
      
      const rawManifest = await response.json();
      console.log('📄 Manifest descargado, estructura:', {
        total_chunks: rawManifest.total_chunks,
        total_duration: rawManifest.total_duration
      });
      
      console.log('🔓 PASO 3: Descifrando object_type con manifestKey (cifrado Python)...');
      const decryptedObjectType = await CryptoManager.decryptPythonAES(
        rawManifest.object_type, 
        manifestKey
      );
      console.log('✅ Object type descifrado:', decryptedObjectType);
      
      console.log('🔓 PASO 4: Descifrando', rawManifest.chunks.length, 'chunks con manifestKey (cifrado Python)...');
      const decryptedChunks = await Promise.all(
        rawManifest.chunks.map(async (chunk, index) => {
          try {
            const decryptedFilename = await CryptoManager.decryptPythonAES(
              chunk.filename, 
              manifestKey
            );
            
            if (index === 0) {
              console.log('✅ Primer chunk descifrado:', decryptedFilename.substring(0, 50));
            }
            
            return {
              ...chunk,
              filename: decryptedFilename
            };
          } catch (error) {
            console.error(`❌ Error descifrando chunk ${index}:`, error);
            throw error;
          }
        })
      );
      
      decryptedChunks.sort((a, b) => a.order - b.order);
      
      const cleanManifest = {
        total_duration: rawManifest.total_duration,
        total_chunks: rawManifest.total_chunks,
        object_type: decryptedObjectType,
        chunks: decryptedChunks
      };
      
      console.log('✅ Manifest descifrado completamente:', {
        type: cleanManifest.object_type,
        duration: cleanManifest.total_duration,
        chunks: cleanManifest.total_chunks
      });
      
      return cleanManifest;
      
    } catch (error) {
      console.error('❌ Error procesando manifest:', error);
      throw error;
    }
  }

  /**
   * Simplifica el manifest para enviar SOLO lo necesario a la función
   * @param {Object} decryptedManifest 
   * @returns {Object}
   */
  static simplifyForRequest(decryptedManifest) {
    const firstPath = decryptedManifest.chunks[0].filename;
    const lastSlash = firstPath.lastIndexOf('/');
    let abso_path = firstPath.substring(0, lastSlash + 1);
    
    // Quitar barra inicial si existe
    if (abso_path.startsWith('/')) {
      abso_path = abso_path.substring(1);
    }
    
    const IDs = decryptedManifest.chunks
      .map(chunk => {
        const filename = chunk.filename.replace(abso_path, '').replace('/' + abso_path, '');
        const cleanFilename = filename.startsWith('/') ? filename.substring(1) : filename;
        return `[${cleanFilename}]`;
      })
      .join('');

    // ✅ SOLO enviar lo que la función AppWrite necesita
    return {
      abso_path,
      IDs
    };
  }
}
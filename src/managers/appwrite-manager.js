import { Client, Account, Databases, Functions } from 'appwrite';

const ENDPOINT = 'https://nyc.cloud.appwrite.io/v1';
const PROJECT_ID = '69289df1002301b833ce';
const DATABASE_ID = '6928a4240039d9f0cb2d';
class AppwriteManager {
  constructor() {
    this.client = new Client()
      .setEndpoint(ENDPOINT)
      .setProject(PROJECT_ID);
    this.account = new Account(this.client);
    this.databases = new Databases(this.client);
    this.functions = new Functions(this.client); 
  }
  async createEmailSession(email, password) {
    try {
      const session = await this.account.createEmailPasswordSession(email, password);
      console.log('✅ Sesión creada:', session);
      return { success: true, data: session };
    } catch (error) {
      console.error('❌ Error en login:', error);
      if (error.message && error.message.includes('session is already active') || error.code === 401) {
        console.warn('⚠️ Sesión fantasma detectada. Limpiando y reintentando...'); 
        try {
          await this.account.deleteSession('current');
          const retrySession = await this.account.createEmailPasswordSession(email, password);
          return { success: true, data: retrySession };
        } catch (retryError) {
          console.error('❌ Reintento fallido:', retryError);
          return { success: false, error: 'Error de credenciales' };
        }
      }
      return { 
        success: false, 
        error: error.message || 'Error desconocido' 
      };
    }
  }
  async getSessionUser() {
    try {
      const user = await this.account.get();
      console.log('✅ Usuario obtenido:', user.name);
      return { success: true, data: user };
    } catch (error) {
      console.error('❌ Error obteniendo usuario:', error);
      return { 
        success: false, 
        error: error.message || 'Sesión inválida o expirada' 
      };
    }
  }
async getUserData(userId) {
  try {
    const user = await this.account.get();
    const nombre = user.name;
    const userLabels = user.labels || [];
    const ownerLabel = userLabels.find(label => label.startsWith('owner'));
    const ownerId = ownerLabel ? ownerLabel.replace('owner', '') : null;
    if (!ownerId) {
      throw new Error('Usuario sin owner asignado');
    }
    const userData = {
      nombre: nombre,
      owner_id: ownerId
    };
    console.log('✅ Datos obtenidos:');
    console.log('   - Nombre (Auth):', nombre);
    console.log('   - Owner ID:', ownerId);
    return { success: true, data: userData };
  } catch (error) {
    console.error('❌ Error obteniendo datos:', error);
    return { 
      success: false, 
      error: `Error obteniendo datos: ${error.message}` 
    };
  }
}
async getManifestKey(ownerId) {
  try {
    const collectionId = `Owner_${ownerId}_Keys`;
    const targetKeyName = 'HX2daL0c14c2Dr=b'; // Key para manifest
    const response = await this.databases.listDocuments(
      DATABASE_ID,
      collectionId
    );
    
    const keyDoc = response.documents.find(doc => doc.Key_name === targetKeyName);
    
    if (!keyDoc) {
      throw new Error(`Manifest Key no encontrada`);
    }
    
    console.log('✅ Manifest Key obtenida');
    return { success: true, data: keyDoc.Key_valor };
  } catch (error) {
    console.error('❌ Error obteniendo manifest key:', error);
    return { success: false, error: error.message };
  }
}
async getEncryptionKey(ownerId) {
  try {
    const collectionId = `Owner_${ownerId}_Keys`;
    const targetKeyName = 'GFjV250bXZhYG8=b';   
    console.log(`🔑 Buscando Key en: ${collectionId}`);
    const response = await this.databases.listDocuments(
      DATABASE_ID,
      collectionId
    );
    const keyDoc = response.documents.find(doc => doc.Key_name === targetKeyName);
    if (!keyDoc) {
      throw new Error(`Key "${targetKeyName}" no encontrada`);
    }
    const keyValue = keyDoc.Key_valor;
    console.log('✅ Key de cifrado obtenida');
    return { success: true, data: keyValue };
  } catch (error) {
    console.error('❌ Error obteniendo encryption key:', error);
    return { 
      success: false, 
      error: `Error obteniendo key: ${error.message}` 
    };
  }
}
async getRawTags(ownerId) {
  try {
    const collectionId = `Owner_${ownerId}_Tags`;   
    console.log(`🏷️ Obteniendo tags de: ${collectionId}`);
    const response = await this.databases.listDocuments(
      DATABASE_ID,
      collectionId
    );
    const rawTags = response.documents.map(doc => doc.tag_name);
    console.log(`✅ ${rawTags.length} tags obtenidos (en crudo)`);
    return { success: true, data: rawTags };
  } catch (error) {
    console.error('❌ Error obteniendo tags:', error);
    return { 
      success: false, 
      error: `Error obteniendo tags: ${error.message}` 
    };
  }
}

async logout() {
  try {
    await this.account.deleteSession('current');
    console.log('✅ Sesión cerrada');
    return { success: true };
    } catch (error) {
      console.error('❌ Error en logout:', error);
      if (error.code === 401) {
        console.warn('⚠️ La sesión ya estaba cerrada');
        return { success: true };
      }
      return { 
        success: false, 
        error: error.message || 'Error al cerrar sesión' 
      };
    }
  }
getDatabases() {
return this.databases;
}
getEndpoint() {
return ENDPOINT;
}
getProjectId() {
return PROJECT_ID;
}
getDatabaseId() {
  return DATABASE_ID;
}
async getFolderKey(ownerId) {
  try {
    const collectionId = `Owner_${ownerId}_Keys`;
    const targetKeyName = 'AWTcA60YXZhYG8=b';
    console.log(`🔑 Buscando Folder Key en: ${collectionId}`);    
    const response = await this.databases.listDocuments(
      DATABASE_ID,
      collectionId
    );   
    const keyDoc = response.documents.find(doc => doc.Key_name === targetKeyName);
    if (!keyDoc) {
      throw new Error(`Folder Key "${targetKeyName}" no encontrada`);
    }
    const keyValue = keyDoc.Key_valor;
    console.log('✅ Folder Key obtenida');
    return { success: true, data: keyValue };
  } catch (error) {
    console.error('❌ Error obteniendo folder key:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}
async getFoldersByTag(ownerId, rawTag) {
  try {
    const collectionId = `Owner_${ownerId}_Database`;    
    console.log(`🔍 Buscando carpetas en: ${collectionId} con tag: ${rawTag}`);
    const response = await this.databases.listDocuments(
      DATABASE_ID,
      collectionId
    );
    const foldersWithTag = response.documents.filter(doc => 
      doc.folder_tag && doc.folder_tag.includes(rawTag)
    );
    console.log(`✅ Encontradas ${foldersWithTag.length} carpetas con ese tag`);
    return { success: true, data: foldersWithTag };
  } catch (error) {
    console.error('❌ Error obteniendo carpetas:', error);
    return { success: false, error: error.message };
  }
}
/**
 * Llama a la función de AppWrite para obtener URLs firmadas
 * @param {string} userId
 * @param {string} ownerId
 * @param {Object} simplifiedManifest
 * @returns {Promise<{success: boolean, signedUrls?: Array, passwords?: Array, error?: string}>}
 */
async callSignedUrlFunction(userId, ownerId, simplifiedManifest) {
  try {
    const functionId = '6948d79b003b7ed9202a';
    
    const payload = JSON.stringify({
      userId,
      ownerId,
      simplifiedManifest
    });

    console.log('📤 Ejecutando función de AppWrite...');
    console.log('📦 Payload:', payload);
    
    // CORRECCIÓN: La API de Functions puede variar
    const execution = await this.functions.createExecution(
      functionId,
      payload,        // body
      false,          // async
      '/',            // path
      'POST',         // method
      {}              // headers (objeto vacío)
    );

    console.log('📥 Ejecución completa:', JSON.stringify(execution, null, 2));
    console.log('📥 Status:', execution.status);
    console.log('📥 Response Body:', execution.responseBody);
    console.log('📥 Stderr:', execution.stderr);
    console.log('📥 Stdout:', execution.stdout);

    if (execution.status === 'completed') {
      try {
        const response = JSON.parse(execution.responseBody);
        
        if (response.success) {
          console.log('✅ URLs firmadas recibidas:', response.signedUrls?.length);
          return {
            success: true,
            signedUrls: response.signedUrls,
            passwords: response.passwords
          };
        } else {
          if (response.errorCode === 101) {
            return { success: false, error: 'Sin créditos disponibles' };
          }
          return { success: false, error: response.error || 'Error desconocido' };
        }
      } catch (parseError) {
        console.error('❌ Error parseando respuesta:', parseError);
        console.error('📄 Response body raw:', execution.responseBody);
        return { success: false, error: 'Error parseando respuesta del servidor' };
      }
    } else if (execution.status === 'failed') {
      console.error('❌ Función falló');
      console.error('📄 Stderr:', execution.stderr);
      console.error('📄 Stdout:', execution.stdout);
      console.error('📄 Response:', execution.responseBody);
      return { success: false, error: execution.stderr || execution.responseBody || 'Error en el servidor' };
    } else {
      return { success: false, error: `Estado inesperado: ${execution.status}` };
    }
  } catch (error) {
    console.error('❌ Error llamando función:', error);
    return { success: false, error: error.message };
  }
}

async getThumbnailByIconFolder(ownerId, iconFolder) {
  try {
    const collectionId = `Owner_${ownerId}_Thumbnails`;   
    console.log(`🖼️ Buscando miniatura en: ${collectionId} con id: ${iconFolder}`);
    const response = await this.databases.listDocuments(
      DATABASE_ID,
      collectionId
    );
    const thumbnail = response.documents.find(doc => doc.miniatura_id === iconFolder);
    if (!thumbnail) {
      throw new Error(`Miniatura no encontrada: ${iconFolder}`);
    }
    console.log('✅ Miniatura encontrada:', thumbnail.key);
    return { success: true, data: thumbnail };
  } catch (error) {
    console.error('❌ Error obteniendo miniatura:', error);
    return { success: false, error: error.message };
  }
}
}
export default new AppwriteManager();
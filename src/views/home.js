
import { router } from '../app.js';

import storage from '../utils/storage-manager.js';
import appwriteManager from '../managers/appwrite-manager.js';
import { HelpClass } from '../utils/help-class.js';
import { GreetingMessageManager } from '../utils/greeting-message-manager.js';
import { CategorySelector } from '../components/category-selector/category-selector.js';
import { remoteControl } from '../utils/remote-control-helper.js';
import { UIHelpers } from '../utils/ui-helpers.js';
import { deviceDetector } from '../config/device-config.js';
import { TagDecryptor } from '../utils/tag-decryptor.js';
import { FolderDecryptor } from '../utils/folder-decryptor.js';
import { ImageDecryptor } from '../utils/image-decryptor.js';
import { FolderCard } from '../components/folder-card/folder-card.js';
import { PlaybackOrchestrator } from '../utils/playback-orchestrator.js';
import { SeekCalculator } from '../utils/seek-calculator.js';
import { memoryCache } from '../utils/memory-cache.js';
export class Home {
  constructor(container) {
    this.container = container;
    this.isDrawerOpen = false;
    this.drawerElement = null;
    this.overlayElement = null;
    this.categorySelector = null;
    this.qrModal = null;
    this.html5QrCode = null;
    this.isTV = false;
    this.folderKey = null;
    this.currentRawTag = null;
    this.loadedFolders = [];
    this.foldersContainer = null;
    this.playbackOrchestrator = null;
  }
  async render() {
    HelpClass.setThemeColor('#02020E');
    await this.detectDevice();
    this.container.innerHTML = this.getHomeHTML();
    this.setupElements();
    this.setupEventListeners();
    this.setupBackHandler();
    this.initializeCategorySelector();
    if (this.isTV) {
      this.setupRemoteControl();
    }
    this.loadUserInfo();
    await this.loadFolderKey();
    await this.loadManifestKey(); 
  }
async loadFolderKey() {
    try {
      const ownerId = storage.get('owner_id');
      if (!ownerId) {
        console.error('❌ No se encontró owner_id');
        return;
      }
      const result = await appwriteManager.getFolderKey(ownerId);
      if (result.success) {
        this.folderKey = result.data;
        storage.set('folder_key', this.folderKey);
        console.log('✅ Folder key cargada y guardada');
      } else {
        console.error('❌ Error cargando folder key:', result.error);
      }
    } catch (error) {
      console.error('❌ Error en loadFolderKey:', error);
    }
}
async detectDevice() {
    const detectionResult = await deviceDetector.detectAll();
    this.isTV = detectionResult.detectedDevice?.includes('TV') || 
                detectionResult.indicators?.isTV || 
                detectionResult.indicators?.isTVStick; 
    console.log('📺 Es TV:', this.isTV);
}
setupElements() {
    this.drawerElement = document.getElementById('drawer');
    this.overlayElement = document.getElementById('drawerOverlay');
    HelpClass.setupOverlay(this.overlayElement, () => this.closeDrawer());
}
async loadManifestKey() {
  try {
    const ownerId = storage.get('owner_id');
    if (!ownerId) return; 
    const result = await appwriteManager.getManifestKey(ownerId);
    if (result.success) {
      this.manifestKey = result.data;
      storage.set('manifest_key', this.manifestKey);
      console.log('✅ Manifest key cargada');
    }
  } catch (error) {
    console.error('❌ Error cargando manifest key:', error);
  }
}
// Agregar este método a la clase Home o como utilidad separada
async fetchWithDiagnostics(url, startByte, endByte) {
  // 1. Verificar URL
  console.log('🔗 URL a descargar:', url);
  
  // Verificar protocolo
  if (url.startsWith('http://') && window.location.protocol === 'https:') {
    throw new Error('Mixed Content: La URL es HTTP pero la app es HTTPS');
  }

  // 2. Primero probar sin Range header (diagnóstico)
  try {
    const testResponse = await fetch(url, { 
      method: 'HEAD',
      mode: 'cors'
    });
    console.log('✅ HEAD request exitoso, status:', testResponse.status);
    console.log('📋 Headers:', Object.fromEntries(testResponse.headers.entries()));
  } catch (headError) {
    console.error('❌ HEAD request falló:', headError.message);
    console.error('⚠️ Probable problema de CORS');
    // Continuamos de todas formas para ver el error real
  }

  // 3. Hacer el fetch real con Range
  const headers = {};
  if (startByte !== undefined && endByte !== undefined) {
    headers['Range'] = `bytes=${startByte}-${endByte}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    mode: 'cors',
    headers
  });

  if (!response.ok && response.status !== 206) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response;
}
setupEventListeners() {
  const menuButton = document.getElementById('menuButton');
  menuButton && menuButton.addEventListener('click', () => this.toggleDrawer()); 
  const logoutButton = document.getElementById('logoutButton');
  logoutButton && logoutButton.addEventListener('click', () => this.handleLogout());
  if (!this.isTV) {
    const qrLoginButton = document.getElementById('qrLoginButton');
    qrLoginButton && qrLoginButton.addEventListener('click', () => this.handleQRLogin());
  }
  const closeDetailButton = document.getElementById('closeDetailButton');
  closeDetailButton && closeDetailButton.addEventListener('click', () => this.closeDetailModal());
  const detailCloseButton = document.getElementById('detailCloseButton');
  detailCloseButton && detailCloseButton.addEventListener('click', () => this.closeDetailModal());
  const detailContinueButton = document.getElementById('detailContinueButton');
  detailContinueButton?.addEventListener('click', async () => {
    await this.startVideoPlayback(true); // true = desde el inicio
  });
  const closeVideoBtn = document.getElementById('closeVideoBtn');
  closeVideoBtn?.addEventListener('click', () => {
    this.hideVideoPlayerContainer();
  });
  // Botón Reanudar
  const resumeBtn = document.getElementById('detailResumeButton');
  resumeBtn?.addEventListener('click', async () => {
    await this.startVideoPlayback(false); // false = reanudar
  }); 
}

//Fragmento con falla

async startVideoPlayback(fromBeginning = true) {
  try {
    this.closeDetailModal();
    // Buscar la carpeta seleccionada en los datos cargados
    const currentFolder = this.loadedFolders.find(
      f => f.folderData.folder_name === this.currentSelectedFolder?.folder_name
    );
    if (!currentFolder) {
      HelpClass.showToast('❌ No se encontró la carpeta');
      return;
    }

    // Mostrar el contenedor del reproductor
    this.showVideoPlayerContainer();
    // Obtener el contenedor donde se renderizará el reproductor
    const playerContainer = document.getElementById('videoPlayerContainer');
    // Crear el orquestador de reproducción
    this.playbackOrchestrator = new PlaybackOrchestrator(
      playerContainer,
      currentFolder.folderData,
      currentFolder.rawDoc,
      this.isTV
    );
    // Iniciar reproducción según el modo
    if (fromBeginning) {
      await this.playbackOrchestrator.startFromBeginning();
    } else {
      await this.playbackOrchestrator.resumePlayback();
    }
    
  } catch (error) {
    console.error('❌ Error iniciando reproducción:', error);
    HelpClass.showToast('❌ Error: ' + error.message);
    this.hideVideoPlayerContainer();
  }
}

showVideoPlayerContainer() {
  const container = document.getElementById('videoPlayerContainer');
  if (container) {
    container.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}
hideVideoPlayerContainer() {
  const container = document.getElementById('videoPlayerContainer');
  if (container) {
    container.style.display = 'none';
    document.body.style.overflow = '';
  }
  
  if (this.playbackOrchestrator) {
    this.playbackOrchestrator.destroy();
    this.playbackOrchestrator = null;
  }
}
setupBackHandler() {
    HelpClass.setupBackHandler(
      () => this.isDrawerOpen,
      () => this.closeDrawer(),
      'Presiona de nuevo para salir'
    );
}
setupRemoteControl() {
    remoteControl.setToastFunction((msg, opts) => {
      UIHelpers.showToast(msg, opts || { type: 'info', duration: 3000 });
    });
   remoteControl.init('.home-screen', 'button, .category-item, .folder-card', {
    focusIndicator: false,
    useNativeFocus: true,
    customFocusStyle: `
    .remote-focused {
      transform: scale(1.08) !important;
      box-shadow: 0 0 0 3px rgba(61, 210, 243, 0.6),
                  0 5px 20px rgba(61, 210, 243, 0.3) !important;
      background: linear-gradient(135deg, 
                  rgba(61, 210, 243, 0.2), 
                  rgba(31, 101, 224, 0.2)) !important;
      transition: all 0.2s ease !important;
      z-index: 100 !important;
    }
  `});
  remoteControl.onFocus = (element) => {
      document.querySelectorAll('.remote-focused').forEach(el => {
        el.classList.remove('remote-focused');
      });
      if (element) {
        element.classList.add('remote-focused');
      }
    };
    remoteControl.onBlur = (element) => {
      if (element) {
        element.classList.remove('remote-focused');
      }
    };
    remoteControl.onBack = () => {
      if (this.isDrawerOpen) {
        this.closeDrawer();
      } else {
        UIHelpers.showToast('Presiona de nuevo para salir', { 
          type: 'info', 
          duration: 2000 
        });
      }
    };
}
async initializeCategorySelector() {
  const categorySelectorContainer = document.getElementById('categorySelector');
  const placeholderCategories = [
    'Documentos',
    'Imagenes',
    'Audios',
    'Carpeta Personal',
    'Tareas'
  ];
  let categories = placeholderCategories;
  let rawTags = [];
  
  try {
    const tagsRawJSON = storage.get('tags_raw');
    const keyValor = storage.get('Key_valor');
    
    if (tagsRawJSON && keyValor) {
      // Crear panel de depuración
      const debugContent = this.createDebugPanel();
      
      this.addDebugLog('═══════════════════════════════════════', 'info');
      this.addDebugLog('🚀 INICIANDO DESCIFRADO DE TAGS', 'info');
      this.addDebugLog('═══════════════════════════════════════', 'info');
      
      const tagsRaw = JSON.parse(tagsRawJSON);
      rawTags = tagsRaw;
      
      this.addDebugLog(`📋 Total de tags a descifrar: ${tagsRaw.length}`, 'info');
      this.addDebugLog(`🔑 Key_valor presente: ${keyValor ? 'SÍ' : 'NO'}`, 'info');
      this.addDebugLog('───────────────────────────────────────', 'info');
      
      const decryptedTags = [];
      
      for (let index = 0; index < tagsRaw.length; index++) {
        const tag = tagsRaw[index];
        
        this.addDebugLog(`\n🏷️ TAG #${index + 1}/${tagsRaw.length}`, 'info');
        this.addDebugLog(`Longitud: ${tag.length} caracteres`, 'info');
        this.addDebugLog(`Preview: ${tag.substring(0, 50)}...`, 'info');
        
        try {
          const result = await TagDecryptor.decrypt(
            tag, 
            keyValor,
            (msg, type) => this.addDebugLog(msg, type)
          );
          
          if (result === null) {
            this.addDebugLog(`⚠️ Tag #${index + 1} retornó NULL`, 'warning');
            decryptedTags.push(null);
          } else {
            this.addDebugLog(`✅ Tag #${index + 1} descifrado exitosamente`, 'success');
            decryptedTags.push(result);
          }
          
          this.addDebugLog('───────────────────────────────────────', 'info');
          
        } catch (error) {
          this.addDebugLog(`❌ Excepción en tag #${index + 1}: ${error.message}`, 'error');
          this.addDebugLog(`Stack: ${error.stack}`, 'error');
          decryptedTags.push(null);
          this.addDebugLog('───────────────────────────────────────', 'info');
        }
      }
      
      const validTags = decryptedTags.filter(tag => tag !== null);
      
      this.addDebugLog('\n═══════════════════════════════════════', 'info');
      this.addDebugLog('📊 RESUMEN FINAL', 'info');
      this.addDebugLog('═══════════════════════════════════════', 'info');
      this.addDebugLog(`✅ Tags exitosos: ${validTags.length}`, 'success');
      this.addDebugLog(`❌ Tags fallidos: ${tagsRaw.length - validTags.length}`, 'error');
      this.addDebugLog(`📈 Tasa de éxito: ${((validTags.length / tagsRaw.length) * 100).toFixed(1)}%`, 'info');
      
      if (validTags.length > 0) {
        categories = validTags;
        this.addDebugLog('\n✅ Usando tags descifrados', 'success');
        validTags.forEach((tag, i) => {
          this.addDebugLog(`  ${i + 1}. ${tag}`, 'success');
        });
      } else {
        this.addDebugLog('\n⚠️ Usando categorías placeholder', 'warning');
        console.warn('⚠️ No se pudo descifrar ningún tag, usando placeholder');
      }
      
    } else {
      HelpClass.showToast('⚠️ No hay tags o key en storage', { duration: 3000 });
      console.warn('⚠️ No hay tags o key en storage, usando placeholder');
    }
  } catch (error) {
    HelpClass.showToast(`❌ Error: ${error.message}`, { duration: 5000 });
    console.error('❌ Error descifrando tags:', error);
  }
  
  this.categorySelector = new CategorySelector(
    categorySelectorContainer,
    categories,
    (category, index) => {
      console.log('Categoría seleccionada:', category, 'Index:', index);
      this.currentRawTag = rawTags[index] || null;
      console.log('🏷️ Tag en bruto:', this.currentRawTag);
      this.loadCategoryContent(category);
    }
  ); 
  
  this.categorySelector.render();
}
loadUserInfo() {
  const userName = storage.get('nombre', 'Usuario');
  const userNameElement = document.getElementById('userName');
  if (userNameElement) {
    userNameElement.textContent = userName;
  }
  const userNameDisplay = document.getElementById('userNameDisplay');
  if (userNameDisplay) {
    userNameDisplay.textContent = userName;
  }
  const greeting = GreetingMessageManager.getGreetingMessage();
  const greetingElement = document.getElementById('greetingText');
  if (greetingElement) {
    greetingElement.textContent = `${greeting} ${userName}`;
  }
  const contextInfo = GreetingMessageManager.getContextInfo();
  const contextElement = document.getElementById('contextInfo');
  if (contextElement) {
    contextElement.textContent = `Hoy es ${contextInfo.dayOfWeek}, ${contextInfo.dayOfMonth} de ${contextInfo.month}`;
  }
}
async loadCategoryContent(category) {
  try {
    console.log('📂 Cargando contenido de:', category);
    if (!this.folderKey) {
      HelpClass.showToast('⚠️Cargando key de carpetas...');
      await this.loadFolderKey();
      if (!this.folderKey) {
        HelpClass.showToast('❌ No se pudo cargar la key de carpetas');
        return;
      }
    }
    if (!this.currentRawTag) {
      HelpClass.showToast('⚠️No se pudo obtener el tag de la categoría');
      return;
    }
    const ownerId = storage.get('owner_id');
    if (!ownerId) {
      HelpClass.showToast('❌No se encontró owner_id');
      return;
    }
    this.showFoldersContainer();
    this.showLoadingCards(3);
    console.log(`🔍 Buscando carpetas en Owner_${ownerId}_Database con tag:`, this.currentRawTag);
    const foldersResult = await appwriteManager.getFoldersByTag(ownerId, this.currentRawTag);
    if (!foldersResult.success) {
      this.clearFoldersContainer();
      HelpClass.showToast('❌Error buscando carpetas:'+foldersResult.error);
      return;
    }
    const folders = foldersResult.data;
    if (folders.length === 0) {
      this.clearFoldersContainer();
      this.foldersContainer.innerHTML = `
        <div style="text-align: center; padding: var(--spacing-xl); color: var(--color-text-secondary);">
          📁 No hay carpetas en esta categoría
        </div>
      `;
      return;
    }
    this.clearFoldersContainer();
    
    for (const folderDoc of folders) {
      await this.processFolderAndDisplay(folderDoc, ownerId);
      if (this.isTV) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  } catch (error) {
    console.error('❌ Error en loadCategoryContent:', error);
    HelpClass.showToast('❌ Error: ' + error.message);
  }
}
//PARTEEE2----

toggleDrawer() {
    if (this.isDrawerOpen) {
      this.closeDrawer();
    } else {
      this.openDrawer();
    }
}
openDrawer() {
    HelpClass.openDrawer(this.drawerElement, this.overlayElement);
    this.isDrawerOpen = true;
}
closeDrawer() {
    HelpClass.closeDrawer(this.drawerElement, this.overlayElement, 280);
    this.isDrawerOpen = false;
}
async handleLogout() {
  this.closeDrawer();
  HelpClass.showToast('Cerrando sesión...');
  const result = await appwriteManager.logout();
  storage.clear();
  if (result.success) {
    HelpClass.showToast('✅ Sesión cerrada exitosamente');
  } else {
    HelpClass.showToast('ℹ️ Sesión cerrada localmente');
  } 
  console.log('🔄 Redirigiendo a Welcome...');
  setTimeout(() => {
    router.navigate('/welcome');
  }, 1500);
}
async processFolderAndDisplay(folderDoc, ownerId) {
  const MAX_RETRIES = 3;
  const BASE_RETRY_DELAY = 1000; // 1 segundo base

  try {
    console.log('🔓 Descifrando carpeta...');
    const decryptedFolder = await FolderDecryptor.decryptFolderData(folderDoc, this.folderKey);
    
    if (!decryptedFolder) {
      console.error('❌ No se pudo descifrar carpeta');
      this.addFolderCard(FolderCard.createErrorCard('Error descifrando'));
      return;
    }
    
    const { folder_name, icon_folder, miniatura_data } = decryptedFolder;
    console.log(`🖼️ Buscando miniatura: ${icon_folder}`);
    
    const thumbnailResult = await appwriteManager.getThumbnailByIconFolder(ownerId, icon_folder);
    
    if (!thumbnailResult.success) {
      console.error('❌ No se encontró miniatura:', thumbnailResult.error);
      this.addFolderCard(FolderCard.createErrorCard('Sin miniatura'));
      return;
    }
    
    const cloudflareUrl = thumbnailResult.data.key;
    const startByte = parseInt(miniatura_data[0]);
    const endByte = parseInt(miniatura_data[1]);
    
    console.log(`📥 URL completa: ${cloudflareUrl}`);
    console.log(`📦 Range: bytes=${startByte}-${endByte}`);
    
    if (!cloudflareUrl || !cloudflareUrl.startsWith('http')) {
      throw new Error(`URL inválida: ${cloudflareUrl}`);
    }

    let imageUrl = null;
    let lastError = null;

    // ✅ Sistema de reintentos con backoff exponencial
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`🔄 Intento ${attempt}/${MAX_RETRIES} para ${folder_name}`);
        
        imageUrl = await ImageDecryptor.downloadAndDecryptImage(
          cloudflareUrl,
          this.folderKey,
          startByte,
          endByte
        );
        
        console.log(`✅ Imagen descargada exitosamente en intento ${attempt}`);
        break;
        
      } catch (imgError) {
        lastError = imgError;
        console.error(`❌ Intento ${attempt} falló:`, imgError.message);
        
        // No reintentar en el último intento
        if (attempt < MAX_RETRIES) {
          // ✅ Backoff exponencial: 1s, 2s, 4s
          const delay = BASE_RETRY_DELAY * Math.pow(2, attempt - 1);
          console.log(`⏳ Esperando ${delay}ms antes de reintentar...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    if (!imageUrl && lastError) {
      console.error(`❌ Falló después de ${MAX_RETRIES} intentos:`, lastError.message);
      this.addFolderCard(FolderCard.createErrorCard('Error de red'));
      return;
    }
    
    // Resto del código igual...
    const folderData = {
      imageUrl,
      folderData: decryptedFolder,
      rawDoc: folderDoc
    };
    
    this.loadedFolders.push(folderData);
    const folderIndex = this.loadedFolders.length - 1;
    
    const cardHtml = FolderCard.createCard(
      imageUrl,
      folder_name,
      folderIndex
    );
    
    this.addFolderCard(cardHtml);
    
    setTimeout(() => {
      const cardId = `folder-${folderIndex}`;
      const card = document.getElementById(cardId);
      if (card) {
        card.addEventListener('click', () => {
          this.handleFolderClick(decryptedFolder, folderDoc);
        });
      }
    }, 0);
    
  } catch (error) {
    console.error('❌ Error procesando carpeta:', error);
    this.addFolderCard(FolderCard.createErrorCard('Error'));
  }
}

// ✅ NUEVO: Método de diagnóstico
async diagnosticFetch(url) {
  console.log('🔍 Ejecutando fetch de diagnóstico...');
  
  // Probar sin headers especiales
  try {
    const simpleResponse = await fetch(url, { mode: 'no-cors' });
    console.log('📋 Fetch no-cors: opaque response (esperado)');
  } catch (e) {
    console.error('❌ Incluso no-cors falló:', e.message);
  }
  
  // Verificar si es problema de red vs CORS
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = url;
      setTimeout(() => reject(new Error('Timeout')), 5000);
    });
    
    console.log('✅ Imagen cargable como <img> - URL accesible');
  } catch (e) {
    console.error('❌ No cargable como imagen:', e.message);
  }
}
async handleFolderClick(decryptedFolder, rawDoc) {
  console.log('🖱️ Click en carpeta:', decryptedFolder.folder_name);
  this.currentSelectedFolder = decryptedFolder;
  this.currentSelectedRawDoc = rawDoc;
  
  try {
    this.openDetailModal();
    this.showDetailLoading();
    
    const { 
      folder_name, 
      folder_descript, 
      miniatura_id 
    } = decryptedFolder;
    
    const idownSuport = rawDoc.Idown_suport || false;
    const unifiqSuport = rawDoc.Unifiq_suport || false;
    
    const loadedFolder = this.loadedFolders.find(
      f => f.folderData.folder_name === folder_name
    );
    
    if (!loadedFolder) {
      throw new Error('No se encontró la imagen de la carpeta');
    }
    await this.populateDetailModal({
      imageUrl: loadedFolder.imageUrl,
      title: folder_name,
      description: folder_descript,
      youtubeUrl: miniatura_id,
      idownSuport,
      unifiqSuport
    });
  
  } catch (error) {
    console.error('❌ Error mostrando detalle:', error);
    HelpClass.showToast('❌ Error cargando detalles');
    this.closeDetailModal();
  }
}
openDetailModal() {
  const modal = document.getElementById('folderDetailModal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}
closeDetailModal() {
  const modal = document.getElementById('folderDetailModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    const videoContainer = document.getElementById('detailVideoContainer');
    if (videoContainer) {
      videoContainer.innerHTML = '';
    }
  }
}
showDetailLoading() {
  document.getElementById('detailImage').src = '';
  document.getElementById('detailTitle').textContent = 'Cargando...';
  document.getElementById('detailDescription').textContent = '';
  document.getElementById('detailVideoContainer').innerHTML = '';
  document.getElementById('detailIdownSuport').textContent = '';
  document.getElementById('detailUnifiqSuport').textContent = '';
} 

async populateDetailModal({ imageUrl, title, description, youtubeUrl, idownSuport, unifiqSuport }) {
  document.getElementById('detailImage').src = imageUrl;
  document.getElementById('detailTitle').textContent = title;
  document.getElementById('detailDescription').textContent = description;
  const videoContainer = document.getElementById('detailVideoContainer');
  if (youtubeUrl && youtubeUrl.trim()) {
    const videoId = this.extractYouTubeId(youtubeUrl);
    if (videoId) {
      videoContainer.innerHTML = `
        <iframe 
          width="100%" 
          height="200" 
          src="https://www.youtube-nocookie.com/embed/${videoId}" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen
        ></iframe>
      `;
    }
  } else {
    videoContainer.innerHTML = '';
  }

  //Fragmento Falla (Ya reparado)
  // Flags
   document.getElementById('detailIdownSuport').textContent = 
    idownSuport ? '✓ Descarga soportada' : '✗ Sin descarga';
  document.getElementById('detailUnifiqSuport').textContent = 
    unifiqSuport ? '✓ Único' : '✗ Múltiple';
  let hasLocalData = false;
  let savedTime = 0;

  if (this.isTV) {
    const cachedManifest = memoryCache.getManifest();
    savedTime = memoryCache.getPlaybackTime();
    hasLocalData = cachedManifest !== null && savedTime > 0;
  } else {
    // Importación dinámica - solo carga el módulo si realmente se necesita(Arreglado el fallo de diskCache)
    const { diskCache } = await import('../utils/disk-cache.js');
    const status = await diskCache.checkFolderStatus(title);
    hasLocalData = status.exists && status.chunkCount > 0;
    savedTime = status.playbackTime;
  }

  

  const continueBtn = document.getElementById('detailContinueButton');
  const resumeBtn = document.getElementById('detailResumeButton');
  if (hasLocalData && savedTime > 0) {
    continueBtn.textContent = '▶️ Empezar de nuevo';
    resumeBtn.style.display = 'block';
    resumeBtn.textContent = `⏯️ Continuar desde ${SeekCalculator.secondsToTime(savedTime)}`;
  } else {
    continueBtn.textContent = '▶️ Reproducir';
    resumeBtn.style.display = 'none';
  }
} 

extractYouTubeId(url) {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}
showFoldersContainer() {
    if (!this.foldersContainer) {
      this.foldersContainer = document.getElementById('foldersContainer');
      if (!this.foldersContainer) {
        const mainContent = document.querySelector('.home-content');
        this.foldersContainer = document.createElement('div');
        this.foldersContainer.id = 'foldersContainer';
        this.foldersContainer.className = 'folders-grid';
        mainContent.appendChild(this.foldersContainer);
        if (!document.getElementById('folder-card-styles')) {
          const stylesDiv = document.createElement('div');
          stylesDiv.id = 'folder-card-styles';
          stylesDiv.innerHTML = FolderCard.getStyles();
          document.head.appendChild(stylesDiv);
        }
      }
    }
    this.foldersContainer.style.display = 'grid';
  }
showLoadingCards(count = 3) {
    if (this.foldersContainer) {
      this.foldersContainer.innerHTML = '';
      for (let i = 0; i < count; i++) {
        this.foldersContainer.innerHTML += FolderCard.createLoadingCard();
      }
    }
  }
clearFoldersContainer() {
  if (this.foldersContainer) {
    const cards = this.foldersContainer.querySelectorAll('.folder-card');
    cards.forEach(card => {
      const cardId = card.id;
      if (cardId) {
        const clone = card.cloneNode(true);
        card.parentNode.replaceChild(clone, card);
      }
    });
    this.loadedFolders.forEach(folder => {
      if (folder.imageUrl) {
        ImageDecryptor.revokeBlobUrl(folder.imageUrl);
      }
    });
    this.loadedFolders = [];
    this.foldersContainer.innerHTML = '';
  }
}
addFolderCard(cardHtml) {
  if (this.foldersContainer) {
    this.foldersContainer.insertAdjacentHTML('beforeend', cardHtml);
  }
}
destroy() {
  this.categorySelector = null;
  this.clearFoldersContainer();
  this.closeDetailModal();
  if (this.html5QrCode) {
    this.html5QrCode.stop().catch(() => {});
    this.html5QrCode = null;
  }
  if (this.qrModal) {
    this.qrModal.remove();
    this.qrModal = null;
  }
  if (remoteControl && remoteControl.destroy) {
    remoteControl.destroy();
  }
  if (this.playbackOrchestrator) {
    this.playbackOrchestrator.destroy();
    this.playbackOrchestrator = null;
  }
}

  async handleQRLogin() {
    try {
      const email = storage.get('qr_email');
      const password = storage.get('qr_password');
      if (!email || !password) {
        HelpClass.showToast('⚠️ Credenciales no disponibles. Vuelve a iniciar sesión.', {
          duration: 4000
        });
        return;
      }
      HelpClass.showToast('📷 Abriendo escáner QR...');
      if (typeof Html5Qrcode === 'undefined') {
        await this.loadQRLibrary();
      }
      const scannerModal = this.createScannerModal();
      document.body.appendChild(scannerModal);
      this.qrModal = scannerModal;
      this.html5QrCode = new Html5Qrcode("qr-reader");
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };
      this.html5QrCode.start(
        { facingMode: "environment" },
        config,
        async (decodedText) => {
          console.log('✅ QR escaneado:', decodedText);
          await this.html5QrCode.stop();
          this.html5QrCode = null;
          document.body.removeChild(scannerModal);
          this.qrModal = null;
          await this.processQRData(decodedText, email, password);
        },
        (errorMessage) => {
        }
      ).catch(err => {
        console.error('❌ Error iniciando cámara:', err);
        HelpClass.showToast('❌ No se pudo acceder a la cámara');
        document.body.removeChild(scannerModal);
        this.qrModal = null;
        this.html5QrCode = null;
      });
      scannerModal.querySelector('.close-scanner').addEventListener('click', async () => {
        if (this.html5QrCode) {
          await this.html5QrCode.stop();
          this.html5QrCode = null;
        }
        document.body.removeChild(scannerModal);
        this.qrModal = null;
      });

    } catch (error) {
      console.error('❌ Error en QR login:', error);
      HelpClass.showToast('❌ Error: ' + error.message);
    }
  }
  loadQRLibrary() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/html5-qrcode';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  createScannerModal() {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.95);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    `;
    modal.innerHTML = `
      <button class="close-scanner" style="
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(255,255,255,0.2);
        border: 1px solid #3dd2f3;
        color: white;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
      ">✕ Cerrar</button>
      <h2 style="color: white; margin-bottom: 20px;">Escanea el código QR</h2>
      <div id="qr-reader" style="width: 90%; max-width: 500px;"></div>
      <p style="color: #3dd2f3; margin-top: 20px; text-align: center;">
        Apunta la cámara al código QR en la TV
      </p>
    `;
    return modal;
  }
async processQRData(qrData, email, password) {
  try {
    console.log('📥 Datos del QR recibidos:', qrData);
    let qrObject;
    try {
      qrObject = JSON.parse(qrData);
    } catch (parseError) {
      console.error('❌ Error parseando QR:', parseError);
      throw new Error('QR inválido: formato JSON incorrecto');
    }
    const { id, pwd, salt } = qrObject;
    if (!id || !pwd || !salt) {
      console.error('❌ Datos faltantes en QR:', { 
        hasId: !!id, 
        hasPwd: !!pwd, 
        hasSalt: !!salt 
      });
      throw new Error('QR incompleto');
    }
    console.log('✅ QR válido:', {
      documentId: id,
      pwdLength: pwd.length,
      saltLength: salt.length
    });
    const token = await this.encryptCredentials(email, password, pwd, salt);
    console.log('✅ Token cifrado:', {
      length: token.length,
      preview: token.substring(0, 30) + '...'
    });
    await this.updateTempDocument(id, token);
    HelpClass.showToast('✅ Login enviado a la TV', { 
      duration: 3000 
    });
  } catch (error) {
    console.error('❌ Error procesando QR:', {
      mensaje: error.message,
      stack: error.stack
    });
    HelpClass.showToast(`❌ ${error.message}`, {
      duration: 4000
    });
  }}
async encryptCredentials(email, password, key, salt) {
  const credentials = JSON.stringify({ email, password });
  const encoder = new TextEncoder();
  const data = encoder.encode(credentials);
  const saltBytes = encoder.encode(salt);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
    );
    const cryptoKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      data
    );
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    return btoa(String.fromCharCode(...combined));
  }
async updateTempDocument(docId, token) {
  const endpoint = appwriteManager.getEndpoint();
  const projectId = appwriteManager.getProjectId();
  const databaseId = appwriteManager.getDatabaseId();
  const response = await fetch(
    `${endpoint}/databases/${databaseId}/collections/temp/documents/${docId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': projectId
      },
      body: JSON.stringify({
        data: {
          token: token
        }
      })
    }
  );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error actualizando documento: ${errorText}`);
  }
console.log('✅ Token enviado al documento:', docId);
}


createDebugPanel() {
  const existingPanel = document.getElementById('debugPanel');
  if (existingPanel) {
    existingPanel.remove();
  }

  const panel = document.createElement('div');
  panel.id = 'debugPanel';
  panel.innerHTML = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(2, 2, 14, 0.98);
      border: 2px solid #3DD2F3;
      border-radius: 12px;
      padding: 20px;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      z-index: 10000;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    ">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        border-bottom: 1px solid #3DD2F3;
        padding-bottom: 10px;
      ">
        <h3 style="margin: 0; color: #3DD2F3; font-size: 18px;">
          🔍 Depuración de Tags
        </h3>
        <button id="closeDebugPanel" style="
          background: #ff4444;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 5px 15px;
          cursor: pointer;
          font-size: 14px;
        ">✕ Cerrar</button>
      </div>
      <div id="debugContent" style="
        color: #ffffff;
        font-family: monospace;
        font-size: 13px;
        line-height: 1.6;
      "></div>
    </div>
  `;

  document.body.appendChild(panel);

  const closeBtn = document.getElementById('closeDebugPanel');
  closeBtn.addEventListener('click', () => {
    panel.remove();
  });

  return document.getElementById('debugContent');
}

addDebugLog(message, type = 'info') {
  const debugContent = document.getElementById('debugContent');
  if (!debugContent) return;

  const colors = {
    info: '#3DD2F3',
    success: '#4CAF50',
    warning: '#FFA726',
    error: '#ff4444',
    step: '#9C27B0'
  };

  const color = colors[type] || colors.info;

  const logEntry = document.createElement('div');
  logEntry.style.cssText = `
    margin-bottom: 8px;
    padding: 8px;
    background: rgba(255, 255, 255, 0.05);
    border-left: 3px solid ${color};
    border-radius: 4px;
  `;
  logEntry.innerHTML = `<span style="color: ${color};">${message}</span>`;

  debugContent.appendChild(logEntry);
  debugContent.scrollTop = debugContent.scrollHeight;
}



getHomeHTML() {
  return `
    <div class="home-screen">
      <!-- Header -->
      <header class="home-header">
        <button id="menuButton" class="menu-button" aria-label="Abrir menú">☰</button>     
        <!-- Mensaje de bienvenida integrado - CORREGIDO: solo greetingText -->
        <div class="header-greeting">
          <p id="greetingText">Cargando...</p>
        </div>
        <!-- Botón QR con solo icono - CORREGIDO: ruta absoluta -->
        ${!this.isTV ? `
          <button id="qrLoginButton" class="qr-tv-button-icon" aria-label="Conectar con TV">
            <img src="/assets/images/drawable/tvsmart.webp" alt="TV" class="tv-icon">
          </button>
        ` : '<div class="header-spacer"></div>'}
      </header>

      
      <!-- Contenido principal -->
      <main class="home-content">
        <!-- Selector de categorías -->
        <div id="categorySelector" class="category-section"></div>
      </main>

      <div id="videoPlayerContainer" 
      class="video-player-fullscreen" 
      style="display: none;">
      <!-- El VideoController renderizará aquí -->
      <button id="closeVideoBtn" class="close-video-btn">✕</button>
      </div>
      <!-- Drawer lateral -->
      <div id="drawer" class="drawer">
        <div class="drawer-header">
          <h2>Menú</h2>
        </div>
        <div class="drawer-content">
          <button id="logoutButton" class="drawer-item logout">
            🚪 Cerrar Sesión
          </button>
        </div>
      </div>

      <!-- Overlay del drawer -->
      <div id="drawerOverlay" class="drawer-overlay"></div>
      <!-- Modal de detalle de carpeta -->
      <div id="folderDetailModal" class="folder-detail-modal">
        <div class="folder-detail-content">
          <button id="closeDetailButton" class="close-detail-btn">✕</button>
          <div class="detail-scroll-container">
            <img id="detailImage" class="detail-image" alt="">
            <h2 id="detailTitle" class="detail-title"></h2>
            <div class="detail-description-container">
              <p id="detailDescription" class="detail-description"></p>
            </div>
            <div id="detailVideoContainer" class="detail-video-container"></div>
            <div class="detail-flags">
              <span id="detailIdownSuport" class="detail-flag"></span>
              <span id="detailUnifiqSuport" class="detail-flag"></span>
            </div>
            <div class="detail-actions">
            <button id="detailContinueButton" class="detail-btn detail-btn-primary">
            ▶️ Reproducir</button>
            <button id="detailResumeButton" class="detail-btn detail-btn-resume" style="display: none;">
            ⏯️ Continuar</button>
            <button id="detailCloseButton" class="detail-btn detail-btn-secondary">Cerrar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    ${this.getHomeStyles()}
  `;
}

getHomeStyles() {
  return `
    <style>
      /* Scrollbar personalizada */
      * {
        scrollbar-width: thin;
        scrollbar-color: var(--color-primary) rgba(0, 0, 0, 0.3);
      }
      
      *::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      
      *::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 10px;
      }
      
      *::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, var(--color-primary), var(--color-primary-light));
        border-radius: 10px;
        box-shadow: 0 0 6px rgba(61, 210, 243, 0.5);
      }
      
      *::-webkit-scrollbar-thumb:hover {
        background: var(--color-primary-light);
        box-shadow: 0 0 10px rgba(61, 210, 243, 0.8);
      }

      .home-screen {
        min-height: 100vh;
        background: var(--color-background-gradient);
        color: var(--color-text);
      }

      /* Header rediseñado - REDUCIDO */
      .home-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--spacing-sm) var(--spacing-md);
        background: var(--glass-background);
        backdrop-filter: var(--glass-blur);
        border-bottom: 1px solid rgba(61, 210, 243, 0.2);
        gap: var(--spacing-sm);
        min-height: 60px;
      }

      .menu-button {
        background: var(--glass-background);
        border: 1px solid var(--color-primary);
        color: var(--color-text);
        font-size: var(--font-xl);
        width: 42px;
        height: 42px;
        border-radius: 8px;
        cursor: pointer;
        transition: all var(--transition-base);
        flex-shrink: 0;
      }

      .menu-button:hover,
      .menu-button:focus {
        background: rgba(61, 210, 243, 0.2);
        transform: scale(1.05);
        box-shadow: var(--neon-glow-sm);
      }

      .header-greeting {
        flex: 1;
        text-align: center;
        min-width: 0;
      }

      .header-greeting p {
        margin: 0;
        font-size: var(--font-base);
        color: var(--color-primary);
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .qr-tv-button-icon {
        background: var(--glass-background);
        border: 1px solid var(--color-primary);
        border-radius: 8px;
        width: 42px;
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all var(--transition-base);
        flex-shrink: 0;
      }

      .qr-tv-button-icon:hover,
      .qr-tv-button-icon:focus {
        background: rgba(61, 210, 243, 0.2);
        transform: scale(1.05);
        box-shadow: var(--neon-glow-sm);
      }

      .tv-icon {
        width: 24px;
        height: 24px;
        object-fit: contain;
        filter: drop-shadow(0 0 4px rgba(61, 210, 243, 0.5));
      }

      .header-spacer {
        width: 42px;
        flex-shrink: 0;
      }

      .home-content {
        padding: var(--spacing-sm) var(--spacing-md);
      }

      /* Selector de categorías - REDUCIDO */
      .category-section {
        margin-bottom: var(--spacing-sm);
      }

      /* Modal de detalle - IMAGEN REDUCIDA */
      .folder-detail-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        backdrop-filter: blur(10px);
        z-index: var(--z-modal);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: opacity var(--transition-base), visibility var(--transition-base);
        padding: var(--spacing-md);
      }

      .folder-detail-modal.active {
        opacity: 1;
        visibility: visible;
      }

      .folder-detail-content {
        position: relative;
        background: var(--glass-background);
        border: var(--glass-border);
        border-radius: 16px;
        width: 100%;
        max-width: 600px;
        max-height: 90vh;
        box-shadow: var(--glass-shadow);
      }

      .detail-btn-resume {
      background: linear-gradient(135deg, #4CAF50, #45a049);
      color: white;}
      .detail-btn-resume:hover {
      background: linear-gradient(135deg, #45a049, #3d8b40);
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);}

      .close-detail-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(255, 68, 68, 0.8);
        border: none;
        color: white;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 20px;
        z-index: 10;
        transition: all var(--transition-fast);
      }

      .close-detail-btn:hover {
        background: rgba(255, 68, 68, 1);
        transform: scale(1.1);
      }

      .detail-scroll-container {
        max-height: 90vh;
        overflow-y: auto;
        padding: var(--spacing-lg);
      }

      .detail-image {
        width: 100%;
        height: auto;
        max-height: 150px;
        object-fit: cover;
        border-radius: 8px;
        margin-bottom: var(--spacing-sm);
      }

      .detail-title {
        color: var(--color-primary);
        font-size: var(--font-xl);
        margin: 0 0 var(--spacing-sm) 0;
        word-wrap: break-word;
      }

      .detail-description-container {
        max-height: 120px;
        overflow-y: auto;
        margin-bottom: var(--spacing-sm);
        padding: var(--spacing-sm);
        background: rgba(0, 0, 0, 0.2);
        border-radius: 8px;
      }

      .detail-description {
        color: var(--color-text-secondary);
        font-size: var(--font-sm);
        line-height: 1.5;
        margin: 0;
        white-space: pre-wrap;
      }

      .detail-video-container {
        margin-bottom: var(--spacing-sm);
        border-radius: 8px;
        overflow: hidden;
      }

      .detail-video-container iframe {
        border-radius: 8px;
      }

      .detail-flags {
        display: flex;
        gap: var(--spacing-xs);
        margin-bottom: var(--spacing-md);
        flex-wrap: wrap;
      }

      .detail-flag {
        padding: var(--spacing-xs) var(--spacing-sm);
        background: rgba(61, 210, 243, 0.1);
        border: 1px solid rgba(61, 210, 243, 0.3);
        border-radius: 6px;
        font-size: var(--font-xs);
        color: var(--color-text-secondary);
      }

      .detail-actions {
        display: flex;
        gap: var(--spacing-sm);
        margin-top: var(--spacing-md);
      }

      .detail-btn {
        flex: 1;
        padding: var(--spacing-sm) var(--spacing-md);
        border: none;
        border-radius: 8px;
        font-size: var(--font-sm);
        font-weight: 600;
        cursor: pointer;
        transition: all var(--transition-base);
      }

      .detail-btn-primary {
        background: var(--color-primary);
        color: var(--color-background);
      }

      .detail-btn-primary:hover {
        background: var(--color-primary-light);
        transform: translateY(-2px);
        box-shadow: var(--neon-glow-md);
      }

      .detail-btn-secondary {
        background: rgba(255, 255, 255, 0.1);
        color: var(--color-text);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .detail-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: translateY(-2px);
      }

      /* Drawer */
      .drawer {
        position: fixed;
        top: 0;
        right: -280px;
        width: 280px;
        height: 100%;
        background: rgba(10, 10, 31, 0.98);
        backdrop-filter: blur(20px);
        box-shadow: -5px 0 20px rgba(0, 0, 0, 0.5);
        transition: right var(--transition-base);
        z-index: var(--z-modal);
      }

      .drawer.open {
        right: 0;
      }

      .drawer-header {
        padding: var(--spacing-lg) var(--spacing-md);
        border-bottom: 1px solid rgba(61, 210, 243, 0.2);
      }

      .drawer-header h2 {
        color: var(--color-primary);
        margin: 0;
        font-size: var(--font-lg);
      }

      .drawer-content {
        padding: var(--spacing-sm) 0;
      }

      .drawer-item {
        width: 100%;
        padding: var(--spacing-md);
        background: transparent;
        border: none;
        color: var(--color-text);
        font-size: var(--font-base);
        text-align: left;
        cursor: pointer;
        transition: all var(--transition-fast);
        border-left: 3px solid transparent;
      }

      .drawer-item:hover,
      .drawer-item:focus {
        background: rgba(61, 210, 243, 0.1);
        border-left-color: var(--color-primary);
      }

      .drawer-item.logout {
        color: #ff4444;
      }

      .drawer-item.logout:hover,
      .drawer-item.logout:focus {
        background: rgba(255, 68, 68, 0.1);
        border-left-color: #ff4444;
      }

      .drawer-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        opacity: 0;
        visibility: hidden;
        transition: opacity var(--transition-base), visibility var(--transition-base);
        z-index: calc(var(--z-modal) - 1);
      }

      .drawer-overlay.active {
        opacity: 1;
        visibility: visible;
      }

      @media (max-width: 480px) {
        .header-greeting p {
          font-size: var(--font-sm);
        }
        
        .detail-scroll-container {
          padding: var(--spacing-md);
        }
        
        .detail-title {
          font-size: var(--font-lg);
        }

        .detail-image {
          max-height: 120px;
        }
      }

      @media (min-width: 768px) {
        .home-header {
          padding: var(--spacing-md) var(--spacing-lg);
        }

        /* AÑADIR en getHomeStyles() */
.video-player-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #000;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-video-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 44px;
  height: 44px;
  background: rgba(255, 68, 68, 0.8);
  border: none;
  border-radius: 50%;
  color: white;
  font-size: 24px;
  cursor: pointer;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-video-btn:hover {
  background: #ff4444;
  transform: scale(1.1);
}
        
        .home-content {
          max-width: 1400px;
          margin: 0 auto;
        }
      }
    </style>
  `;
}
}
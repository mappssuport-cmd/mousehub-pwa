
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
  const resumeBtn = document.getElementById('detailResumeButton');
  resumeBtn?.addEventListener('click', async () => {
    await this.startVideoPlayback(false);
  }); 
}
async startVideoPlayback(fromBeginning = true) {
  try {
    this.closeDetailModal();
    const currentFolder = this.loadedFolders.find(
      f => f.folderData.folder_name === this.currentSelectedFolder?.folder_name
    );
    if (!currentFolder) {
      HelpClass.showToast('❌ No se encontró la carpeta');
      return;
    }
    this.showVideoPlayerContainer();
    const playerContainer = document.getElementById('videoPlayerContainer');
    this.playbackOrchestrator = new PlaybackOrchestrator(
      playerContainer,
      currentFolder.folderData,
      currentFolder.rawDoc,
      this.isTV
    );
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
      const tagsRaw = JSON.parse(tagsRawJSON);
      rawTags = tagsRaw;
      const decryptedTags = [];
      for (let index = 0; index < tagsRaw.length; index++) {
        const tag = tagsRaw[index];
        try {
          const result = await TagDecryptor.decrypt(tag, keyValor);
          decryptedTags.push(result === null ? null : result);
        } catch (error) {
          console.error(`❌ Error descifrando tag #${index + 1}:`, error);
          decryptedTags.push(null);
        }
      }
      const validTags = decryptedTags.filter(tag => tag !== null);
      if (validTags.length > 0) {
        categories = validTags;
        console.log('✅ Tags descifrados exitosamente:', validTags.length);
      } else {
        console.warn('⚠️ No se pudo descifrar ningún tag, usando placeholder');
      }
    } else {
      console.warn('⚠️ No hay tags o key en storage, usando placeholder');
    }
  } catch (error) {
    console.error('❌ Error descifrando tags:', error);
    HelpClass.showToast(`❌ Error: ${error.message}`, { duration: 5000 });
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
  if (categories.length > 0 && rawTags.length > 0) {
    this.currentRawTag = rawTags[0];
    await this.loadCategoryContent(categories[0]);
  }
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
    greetingElement.textContent = greeting;
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
  const RETRY_DELAY = 1000;
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
        if (attempt < MAX_RETRIES) {
          console.log(`⏳ Esperando ${RETRY_DELAY}ms antes de reintentar...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
        }
      }
    }
    if (!imageUrl && lastError) {
      console.error('❌ Error descargando imagen después de todos los reintentos:', lastError);
      HelpClass.showToast('❌ Error cargando imagen', { duration: 3000 });
      this.addFolderCard(FolderCard.createErrorCard('Error de red'));
      return;
    }
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
    HelpClass.showToast(`❌ Error: ${error.message}`, { duration: 5000 });
    this.addFolderCard(FolderCard.createErrorCard('Error'));
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
  const detailImage = document.getElementById('detailImage');
  const detailTitle = document.getElementById('detailTitle');
  const detailDescription = document.getElementById('detailDescription');
  const videoContainer = document.getElementById('detailVideoContainer');
  const descriptionContainer = document.getElementById('detailDescriptionContainer');
  
  if (detailImage) detailImage.src = '';
  if (detailTitle) detailTitle.textContent = 'Cargando...';
  if (detailDescription) detailDescription.textContent = '';
  if (videoContainer) videoContainer.innerHTML = '';
  if (descriptionContainer) {
    const existingFlags = descriptionContainer.querySelector('.detail-flags');
    if (existingFlags) {
      existingFlags.remove();
    }
  }
} 
async populateDetailModal({ imageUrl, title, description, youtubeUrl, idownSuport, unifiqSuport }) {
  const detailImage = document.getElementById('detailImage');
  const detailTitle = document.getElementById('detailTitle');
  const detailDescription = document.getElementById('detailDescription');
  const videoContainer = document.getElementById('detailVideoContainer');
  const descriptionContainer = document.getElementById('detailDescriptionContainer');
  
  // Validar que los elementos existan antes de modificarlos
  if (!detailImage || !detailTitle || !detailDescription || !videoContainer || !descriptionContainer) {
    console.error('❌ Elementos del modal no encontrados');
    return;
  }
  
  detailImage.src = imageUrl;
  detailTitle.textContent = title;
  detailDescription.textContent = description;
  
  // Video - Solo crear iframe si hay URL válida
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
      videoContainer.style.display = 'block';
    } else {
      videoContainer.innerHTML = '';
      videoContainer.style.display = 'none';
    }
  } else {
    videoContainer.innerHTML = '';
    videoContainer.style.display = 'none';
  }
  
  // Flags dentro del contenedor de descripción
  const existingFlags = descriptionContainer.querySelector('.detail-flags');
  if (existingFlags) {
    existingFlags.remove();
  }
  
  const flagsHTML = `
    <div class="detail-flags">
      <span class="detail-flag ${idownSuport ? 'flag-active' : 'flag-inactive'}">
        ${idownSuport ? '⬇️ DL' : '🚫 DL'}
      </span>
      <span class="detail-flag ${unifiqSuport ? 'flag-active' : 'flag-inactive'}">
        ${unifiqSuport ? '📌 UNQ' : '📁 MLT'}
      </span>
    </div>
  `;
  
  descriptionContainer.insertAdjacentHTML('beforeend', flagsHTML);
  
  // Gestión de botones Continue/Resume
  let hasLocalData = false;
  let savedTime = 0;
  
  if (this.isTV) {
    const cachedManifest = memoryCache.getManifest();
    savedTime = memoryCache.getPlaybackTime();
    hasLocalData = cachedManifest !== null && savedTime > 0;
  } else {
    const { diskCache } = await import('../utils/disk-cache.js');
    const status = await diskCache.checkFolderStatus(title);
    hasLocalData = status.exists && status.chunkCount > 0;
    savedTime = status.playbackTime;
  }
  
  const continueBtn = document.getElementById('detailContinueButton');
  const resumeBtn = document.getElementById('detailResumeButton');
  
  if (continueBtn && resumeBtn) {
    if (hasLocalData && savedTime > 0) {
      continueBtn.textContent = '▶️ Inicio';
      resumeBtn.style.display = 'block';
      resumeBtn.textContent = `⏯️ ${SeekCalculator.secondsToTime(savedTime)}`;
    } else {
      continueBtn.textContent = '▶️ Play';
      resumeBtn.style.display = 'none';
    }
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
      <!-- Modal de detalle de carpeta -->
<div id="folderDetailModal" class="folder-detail-modal">
  <div class="folder-detail-content">
    <button id="closeDetailButton" class="close-detail-btn">✕</button>
    <div class="detail-scroll-container">
      <img id="detailImage" class="detail-image" alt="">
      <h2 id="detailTitle" class="detail-title"></h2>
      <div id="detailDescriptionContainer" class="detail-description-container">
        <p id="detailDescription" class="detail-description"></p>
        <!-- Los flags se insertarán aquí dinámicamente -->
      </div>
      <div id="detailVideoContainer" class="detail-video-container" style="display: none;"></div>
      <div class="detail-actions">
        <button id="detailContinueButton" class="detail-btn detail-btn-primary">
          ▶️ Reproducir
        </button>
        <button id="detailResumeButton" class="detail-btn detail-btn-resume" style="display: none;">
          ⏯️ Continuar
        </button>
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
        padding: 8px 16px;
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(15px);
        -webkit-backdrop-filter: blur(15px);
        border-bottom: 1px solid rgba(61, 210, 243, 0.15);
        gap: 12px;
        min-height: 50px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .menu-button {
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(61, 210, 243, 0.3);
        color: var(--color-text);
        font-size: 20px;
        width: 40px;
        height: 40px;
        border-radius: 8px;
        cursor: pointer;
        transition: all var(--transition-base);
        flex-shrink: 0;
      }

      .menu-button:hover,
      .menu-button:focus {
        background: rgba(61, 210, 243, 0.15);
        transform: scale(1.05);
        box-shadow: var(--neon-glow-sm);
      }

      .header-greeting {
        flex: 1;
        text-align: center;
        min-width: 0;
        padding: 4px 8px;
      }

      .header-greeting p {
        margin: 0;
        font-size: 14px;
        color: var(--color-primary);
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .qr-tv-button-icon {
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(61, 210, 243, 0.3);
        border-radius: 8px;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all var(--transition-base);
        flex-shrink: 0;
      }

      .qr-tv-button-icon:hover,
      .qr-tv-button-icon:focus {
        background: rgba(61, 210, 243, 0.15);
        transform: scale(1.05);
        box-shadow: var(--neon-glow-sm);
      }

      .tv-icon {
        width: 22px; 
        height: 22px;
        object-fit: contain;
        filter: drop-shadow(0 0 4px rgba(61, 210, 243, 0.5));
      }

      .header-spacer {
        width: 40px;
        flex-shrink: 0;
      }

      .home-content {
        padding: 12px 16px;
      }

      .category-section {
        margin-bottom: 12px; 
      }

      /* ========================================
         MODAL DE DETALLE - ESTILO NETFLIX/PLEX
         ======================================== */

      .folder-detail-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        backdrop-filter: blur(10px);
        z-index: var(--z-modal);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: opacity var(--transition-base), visibility var(--transition-base);
        padding: 20px;
      }

      .folder-detail-modal.active {
        opacity: 1;
        visibility: visible;
      }

      .folder-detail-content {
        position: relative;
        background: linear-gradient(to bottom, rgba(10, 10, 31, 0.95), rgba(2, 2, 14, 0.98));
        border-radius: 12px;
        width: 90%;
        max-width: 900px;
        max-height: 90vh;
        overflow: hidden;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
      }

      .close-detail-btn {
        position: absolute;
        top: 12px;
        right: 12px;
        background: rgba(20, 20, 40, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: white;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 20px;
        z-index: 10;
        transition: all var(--transition-fast);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .close-detail-btn:hover {
        background: rgba(255, 68, 68, 0.9);
        transform: scale(1.1);
      }

      /* LAYOUT PRINCIPAL - Desktop */
      .detail-scroll-container {
        max-height: 90vh;
        overflow-y: auto;
        padding: 24px;
        display: grid;
        grid-template-columns: 240px 1fr;
        grid-template-rows: auto auto 1fr auto;
        gap: 20px;
        grid-template-areas:
          "image title"
          "image description"
          "video video"
          "actions actions";
      }

      /* Imagen como póster vertical */
      .detail-image {
        grid-area: image;
        width: 100%;
        height: auto;
        max-height: 360px;
        object-fit: contain;
        object-position: center top;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
      }

      /* Título */
      .detail-title {
        grid-area: title;
        color: var(--color-primary);
        font-size: 28px;
        font-weight: 700;
        margin: 0;
        line-height: 1.2;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
        align-self: start;
      }

      /* Contenedor de descripción + flags */
      .detail-description-container {
        grid-area: description;
        max-height: 280px;
        overflow-y: auto;
        padding: 16px;
        background: rgba(0, 0, 0, 0.4);
        border-radius: 8px;
        border-left: 3px solid var(--color-primary);
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .detail-description {
        color: rgba(255, 255, 255, 0.9);
        font-size: 14px;
        line-height: 1.6;
        margin: 0;
        flex: 1;
      }

      /* Flags dentro del contenedor de descripción */
      .detail-flags {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        margin-top: auto;
      }

      .detail-flag {
        padding: 6px 12px;
        background: rgba(61, 210, 243, 0.15);
        border: 1px solid rgba(61, 210, 243, 0.4);
        border-radius: 6px;
        font-size: 11px;
        font-weight: 700;
        color: var(--color-primary);
        text-transform: uppercase;
        letter-spacing: 0.8px;
        transition: all 0.2s;
      }

      .detail-flag.flag-active {
        background: rgba(61, 210, 243, 0.25);
        border-color: var(--color-primary);
        box-shadow: 0 0 8px rgba(61, 210, 243, 0.3);
      }

      .detail-flag.flag-inactive {
        background: rgba(255, 68, 68, 0.15);
        border-color: rgba(255, 68, 68, 0.4);
        color: rgba(255, 255, 255, 0.6);
      }

      /* Video - Condicional */
      .detail-video-container {
        grid-area: video;
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
        background: rgba(0, 0, 0, 0.5);
      }

      .detail-video-container iframe {
        width: 100%;
        height: 300px;
        border: none;
      }

      /* Botones */
      .detail-actions {
        grid-area: actions;
        display: flex;
        gap: 12px;
        flex-wrap: nowrap;
      }

      .detail-btn {
        flex: 1;
        min-width: 120px;
        padding: 14px 20px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        transition: all var(--transition-base);
        text-transform: uppercase;
        letter-spacing: 0.8px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        white-space: nowrap;
      }

      .detail-btn-primary {
        background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
        color: var(--color-background);
        box-shadow: 0 4px 16px rgba(61, 210, 243, 0.4);
      }

      .detail-btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 24px rgba(61, 210, 243, 0.6);
      }

      .detail-btn-resume {
        background: linear-gradient(135deg, #4CAF50, #45a049);
        color: white;
        box-shadow: 0 4px 16px rgba(76, 175, 80, 0.4);
      }

      .detail-btn-resume:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 24px rgba(76, 175, 80, 0.6);
      }

      .detail-btn-secondary {
        background: rgba(255, 255, 255, 0.1);
        color: var(--color-text);
        border: 1px solid rgba(255, 255, 255, 0.3);
      }

      .detail-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: translateY(-2px);
      }

      /* ========================================
         DRAWER
         ======================================== */
      
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

      /* ========================================
         VIDEO PLAYER
         ======================================== */
      
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

      /* ========================================
         RESPONSIVE - TABLET
         ======================================== */

      @media (max-width: 1024px) {
        .detail-scroll-container {
          grid-template-columns: 200px 1fr;
          padding: 20px;
          gap: 16px;
        }
        
        .detail-image {
          max-height: 300px;
        }
        
        .detail-title {
          font-size: 24px;
        }
        
        .detail-video-container iframe {
          height: 250px;
        }
      }

      /* ========================================
         RESPONSIVE - MOBILE
         ======================================== */

      @media (max-width: 768px) {
        .folder-detail-content {
          width: 95%;
          max-width: none;
        }
        
        /* Layout en columna para móvil */
        .detail-scroll-container {
          grid-template-columns: 1fr;
          grid-template-rows: auto auto auto auto auto;
          grid-template-areas:
            "image"
            "title"
            "description"
            "video"
            "actions";
          padding: 16px;
          gap: 16px;
        }
        
        /* Imagen centrada, tamaño reducido */
        .detail-image {
          max-width: 200px;
          max-height: 300px;
          margin: 0 auto;
          display: block;
        }
        
        /* Título centrado */
        .detail-title {
          font-size: 22px;
          text-align: center;
        }
        
        .detail-description-container {
          max-height: 200px;
        }
        
        .detail-description {
          font-size: 13px;
        }
        
        .detail-video-container iframe {
          height: 200px;
        }
        
        .detail-btn {
          font-size: 13px;
          padding: 12px 16px;
        }
      }

      /* ========================================
         RESPONSIVE - SMALL MOBILE
         ======================================== */

      @media (max-width: 480px) {
        .detail-scroll-container {
          padding: 12px;
          gap: 12px;
        }
        
        .detail-image {
          max-width: 160px;
          max-height: 240px;
        }
        
        .detail-title {
          font-size: 18px;
        }
        
        .detail-description-container {
          max-height: 150px;
          padding: 12px;
        }
        
        .detail-description {
          font-size: 12px;
        }
        
        .detail-actions {
          gap: 8px;
        }
        
        .detail-btn {
          font-size: 11px;
          padding: 10px 12px;
          min-width: 90px;
        }
        
        .detail-video-container iframe {
          height: 180px;
        }
      }

      /* Tablet/Desktop - Header adjustments */
      @media (min-width: 768px) {
        .home-header {
          padding: 10px 24px;
          min-height: 56px;
        }
        
        .header-greeting p {
          font-size: 15px;
        }
        
        .home-content {
          max-width: 1400px;
          margin: 0 auto;
        }
      }
    </style>
  `;
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
}
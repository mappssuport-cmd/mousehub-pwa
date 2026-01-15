
export class FolderCard {
  /**
   * @param {string} imageUrl - URL del Blob de la imagen
   * @param {string} folderName - Nombre de la carpeta
   * @param {Function} onClick - Callback al hacer click
   * @returns {string} HTML de la tarjeta
   */
  static createCard(imageUrl, folderName, folderIndex) {
  const cardId = `folder-${folderIndex}`;
  
  return `
    <div class="folder-card" id="${cardId}">
      <div class="folder-image-container">
        <img 
          src="${imageUrl}" 
          alt="${folderName}" 
          class="folder-image"
          loading="lazy"
        >
        <div class="folder-overlay"></div>
      </div>
      <div class="folder-name">
        <span>${folderName}</span>
      </div>
    </div>
  `;
}
  static createLoadingCard() {
    return `
      <div class="folder-card loading">
        <div class="folder-image-container">
          <div class="loading-skeleton"></div>
        </div>
        <div class="folder-name">
          <div class="loading-skeleton-text"></div>
        </div>
      </div>
    `;
  }
  static createErrorCard(errorMsg) {
    return `
      <div class="folder-card error">
        <div class="folder-image-container">
          <div class="error-icon">⚠️</div>
        </div>
        <div class="folder-name">
          <span>${errorMsg}</span>
        </div>
      </div>
    `;
  }

static getStyles() {
  return `
    <style>
      .folders-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: var(--spacing-sm);
        padding: var(--spacing-sm);
        margin-top: var(--spacing-sm);
        overflow-y: auto;
        max-height: calc(100vh - 180px);
      }

      .folder-card {
        background: var(--glass-background);
        border: var(--glass-border);
        border-radius: 10px;
        overflow: hidden;
        cursor: pointer;
        transition: all var(--transition-base);
        box-shadow: var(--glass-shadow);
      }

      .folder-card:hover,
      .folder-card:focus {
        transform: translateY(-3px);
        box-shadow: var(--glass-shadow), var(--neon-glow-md);
        border-color: var(--color-primary-light);
      }

      .folder-image-container {
        position: relative;
        width: 100%;
        padding-top: 105%;
        overflow: hidden;
        background: rgba(0, 0, 0, 0.3);
      }

      .folder-image {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform var(--transition-base);
      }

      .folder-card:hover .folder-image {
        transform: scale(1.05);
      }

      .folder-overlay {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 50%;
        background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
        pointer-events: none;
      }

      .folder-name {
        padding: var(--spacing-xs);
        text-align: center;
        color: var(--color-text);
        font-size: var(--font-xs);
        font-weight: 600;
        min-height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .folder-name span {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .folder-card.loading {
        pointer-events: none;
      }

      .loading-skeleton {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(
          90deg,
          rgba(61, 210, 243, 0.1) 25%,
          rgba(61, 210, 243, 0.2) 50%,
          rgba(61, 210, 243, 0.1) 75%
        );
        background-size: 200% 100%;
        animation: loading 1.5s infinite;
      }

      .loading-skeleton-text {
        height: 14px;
        width: 80%;
        margin: 0 auto;
        background: linear-gradient(
          90deg,
          rgba(61, 210, 243, 0.1) 25%,
          rgba(61, 210, 243, 0.2) 50%,
          rgba(61, 210, 243, 0.1) 75%
        );
        background-size: 200% 100%;
        animation: loading 1.5s infinite;
        border-radius: 4px;
      }

      @keyframes loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      .folder-card.error {
        border-color: rgba(255, 68, 68, 0.5);
        pointer-events: none;
      }

      .error-icon {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 28px;
      }

      /* Tablet */
      @media (max-width: 1024px) {
        .folders-grid {
          grid-template-columns: repeat(3, 1fr);
        }
      }

      /* Mobile */
      @media (max-width: 768px) {
        .folders-grid {
          grid-template-columns: repeat(2, 1fr);
          gap: var(--spacing-xs);
        }
        
        .folder-name {
          font-size: 11px;
          min-height: 32px;
        }

        .folder-image-container {
          padding-top: 100%;
        }
      }

      /* Small mobile */
      @media (max-width: 480px) {
        .folders-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
    </style>
  `;
}
}
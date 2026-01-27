export class CategorySelector {
  constructor(container, categories = [], onCategoryChange = null) {
    this.container = container;
    this.categories = categories;
    this.currentIndex = 0;
    this.onCategoryChange = onCategoryChange;
    this.isAnimating = false;
  }

  render() {
    this.container.innerHTML = `
      <div class="category-selector glass-background-category">
        <!-- Flecha izquierda -->
        <button class="arrow-button" id="arrowLeft">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
          </svg>
        </button>

        <!-- Contenedor de categorías -->
        <div class="category-container">
          <div class="category-text-current" id="categoryTextCurrent">
            ${this.categories[this.currentIndex] || 'Categoría'}
          </div>
          <div class="category-text-next" id="categoryTextNext"></div>
        </div>

        <!-- Flecha derecha -->
        <button class="arrow-button" id="arrowRight">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
            <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
          </svg>
        </button>
      </div>
    `;

    this.applyStyles();
    this.setupEventListeners();
  }

 applyStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .category-selector {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 12px; /* REDUCIDO de 12px 16px */
      margin: 0 16px; /* REDUCIDO de 0 24px */
      min-height: 44px; /* REDUCIDO de 56px */
      border-radius: 12px;
      /* Ya tiene .glass-background-category del HTML, pero reforzamos: */
      background: rgba(255, 255, 255, 0.04) !important; /* GLASS REAL */
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(61, 210, 243, 0.15); /* AÑADIDO borde sutil */
    }

    .arrow-button {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px; /* REDUCIDO de 6px */
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease;
      width: 32px; /* AÑADIDO tamaño fijo */
      height: 32px;
      flex-shrink: 0; /* AÑADIDO para evitar que se comprima */
    }

    .arrow-button svg {
      width: 24px; /* REDUCIDO de 32px */
      height: 24px;
    }

    .arrow-button:hover {
      transform: scale(1.1);
    }

    .arrow-button:active {
      transform: scale(0.95);
    }

    .category-container {
      flex: 1;
      position: relative;
      min-height: 32px; /* REDUCIDO de 40px */
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 12px; /* REDUCIDO de 0 16px */
      overflow: hidden;
    }

    .category-text-current,
    .category-text-next {
      position: absolute;
      width: 100%;
      text-align: center;
      color: #3dd2f3;
      font-size: 15px; /* REDUCIDO de 18px */
      font-family: var(--font-primary);
      font-weight: 600; /* REDUCIDO de bold */
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      padding: 0 4px; /* AÑADIDO padding horizontal mínimo */
    }

    .category-text-next {
      opacity: 0;
      visibility: hidden;
    }

    /* Animaciones - SIN CAMBIOS */
    @keyframes slideOutLeft {
      from {
        opacity: 1;
        transform: translateX(0);
      }
      to {
        opacity: 0;
        transform: translateX(-100%);
      }
    }

    @keyframes slideOutRight {
      from {
        opacity: 1;
        transform: translateX(0);
      }
      to {
        opacity: 0;
        transform: translateX(100%);
      }
    }

    @keyframes slideInLeft {
      from {
        opacity: 0;
        transform: translateX(-100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes slideInRight {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .slide-out-left {
      animation: slideOutLeft 0.3s ease-out forwards;
    }

    .slide-out-right {
      animation: slideOutRight 0.3s ease-out forwards;
    }

    .slide-in-left {
      animation: slideInLeft 0.3s ease-out forwards;
    }

    .slide-in-right {
      animation: slideInRight 0.3s ease-out forwards;
    }

    /* AÑADIDO: Responsive para móviles pequeños */
    @media (max-width: 480px) {
      .category-selector {
        padding: 5px 10px;
        margin: 0 12px;
        min-height: 40px;
      }

      .category-text-current,
      .category-text-next {
        font-size: 14px;
      }

      .arrow-button {
        width: 28px;
        height: 28px;
        padding: 3px;
      }

      .arrow-button svg {
        width: 20px;
        height: 20px;
      }
    }

    /* AÑADIDO: Responsive para tablets/desktop */
    @media (min-width: 768px) {
      .category-selector {
        max-width: 600px; /* Limitar ancho en pantallas grandes */
        margin: 0 auto; /* Centrar */
      }
    }
  `;
  document.head.appendChild(style);
}

  setupEventListeners() {
    const arrowLeft = document.getElementById('arrowLeft');
    const arrowRight = document.getElementById('arrowRight');

    arrowLeft && arrowLeft.addEventListener('click', () => this.previousCategory());
    arrowRight && arrowRight.addEventListener('click', () => this.nextCategory());

  }

  previousCategory() {
    if (this.isAnimating || this.categories.length <= 1) return;

    const nextIndex = (this.currentIndex - 1 + this.categories.length) % this.categories.length;
    this.animateTransition(nextIndex, 'right');
  }

  nextCategory() {
    if (this.isAnimating || this.categories.length <= 1) return;

    const nextIndex = (this.currentIndex + 1) % this.categories.length;
    this.animateTransition(nextIndex, 'left');
  }

  animateTransition(nextIndex, direction) {
    this.isAnimating = true;

    const currentText = document.getElementById('categoryTextCurrent');
    const nextText = document.getElementById('categoryTextNext');

    // Configurar texto siguiente
    nextText.textContent = this.categories[nextIndex];
    nextText.style.visibility = 'visible';

    // Aplicar animaciones
    if (direction === 'left') {
      currentText.classList.add('slide-out-left');
      nextText.classList.add('slide-in-right');
    } else {
      currentText.classList.add('slide-out-right');
      nextText.classList.add('slide-in-left');
    }

    // Después de la animación
    setTimeout(() => {
      // Intercambiar elementos
      currentText.textContent = this.categories[nextIndex];
      currentText.classList.remove('slide-out-left', 'slide-out-right');
      
      nextText.style.visibility = 'hidden';
      nextText.classList.remove('slide-in-left', 'slide-in-right');

      // Actualizar índice
      this.currentIndex = nextIndex;
      this.isAnimating = false;

      // Callback
      if (this.onCategoryChange) {
        this.onCategoryChange(this.categories[this.currentIndex], this.currentIndex);
      }
    }, 300);
  }

  setCategories(categories) {
    this.categories = categories;
    this.currentIndex = 0;
    const currentText = document.getElementById('categoryTextCurrent');
    if (currentText) {
      currentText.textContent = this.categories[this.currentIndex] || 'Categoría';
    }
  }

  getCurrentCategory() {
    return this.categories[this.currentIndex];
  }

  getCurrentIndex() {
    return this.currentIndex;
  }
}
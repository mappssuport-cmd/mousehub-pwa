import { router } from '../app.js';
import storage from '../utils/storage-manager.js';
import appwriteManager from '../managers/appwrite-manager.js';
import { HelpClass } from '../utils/help-class.js';
import * as THREE from 'three';
import { SplashView } from '/src/utils/frontend/SplashView.js';

export class SplashScreen {
  constructor(container) {
    this.container = container;
    this.splashView = null;
    this.sessionCheckCompleted = false;
    this.nextRoute = null;
    this.animationFinished = false;
  }

  async render() {
    HelpClass.setThemeColor('#02020E');
    const hasSeenWelcome = storage.get('has_seen_welcome', false);
    if (!hasSeenWelcome) {
      console.log('⚠️ Usuario no ha visto Welcome - redirigiendo...');
      router.navigate('/welcome');
      return;
    }
    this.container.innerHTML = `
      <div class="splash-screen">
        <div id="threeContainer"></div>
        <div class="logo-container" id="logoContainer">
          <img src="/assets/videos/animacion.webp" id="winkAnimation" class="wink-animation">
        </div>
      </div>
    `;
    this.applyStyles();
    this.splashView = new SplashView();
    this.splashView.onAnimationComplete = () => {
      this.completeAnimation();
    };
    this.splashView.initThreeJS();
    this.splashView.startAnimation();
    this.checkSession();
  }
  applyStyles() {
    if (document.getElementById('splash-styles')) return;
    const style = document.createElement('style');
    style.id = 'splash-styles';
    style.textContent = `
      .splash-screen {
        position: fixed; 
        top: 0; 
        left: 0; 
        width: 100%; 
        height: 100%;
        background: #02020E; 
        overflow: hidden; 
        z-index: 9999;
      }
      #threeContainer { 
        width: 100%; 
        height: 100%; 
        transition: opacity 0.3s; 
      }
      .logo-container { 
        position: absolute; 
        top: 0; 
        left: 0; 
        width: 100%; 
        height: 100%;
        display: none; 
        justify-content: center; 
        align-items: center;
        pointer-events: none; 
        z-index: 10;
      }
      .wink-animation { 
        width: clamp(150px, 25vh, 250px); 
        height: auto; 
        opacity: 0; 
        transition: opacity 0.2s; 
      }
    `;
    document.head.appendChild(style);
  }
  freezeWinkAnimation() {
    const wink = document.getElementById('winkAnimation');
    if (wink) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = wink.naturalWidth || wink.width;
      canvas.height = wink.naturalHeight || wink.height;
      ctx.drawImage(wink, 0, 0);
      try {
        const staticImage = canvas.toDataURL('image/png');
        wink.src = staticImage;
      } catch (e) {
        console.log('No se pudo congelar el frame');
      }
    }
  }
  completeAnimation() {
    this.animationFinished = true;
    this.freezeWinkAnimation();
    this.proceedIfReady();
  }
  async checkSession() {
    try {
      console.log('🔍 Verificando sesión en Splash...');
      const result = await appwriteManager.getSessionUser();
      if (result.success && result.data) {
        const userId = result.data.$id;
        console.log('✅ Sesión activa encontrada:', userId);
        const userRes = await appwriteManager.getUserData(userId);
        if (userRes.success && userRes.data) {
          const userData = userRes.data;
          if (HelpClass.isExpired(userData.fecha_vencimiento)) {
            console.warn('⚠️ Cuenta expirada');
            await appwriteManager.logout();
            storage.clear();
            this.nextRoute = '/login';
          } else {
            storage.setMultiple({
              is_logged_in: true,
              user_id: userId,
              nombre: userData.nombre,
              tipo_usuario: userData.tipo_usuario,
              fecha_vencimiento: userData.fecha_vencimiento,
              owner_id: userData.owner_id || ''
            });

            this.nextRoute = '/home';
          }
        } else {
          console.log('❌ Error obteniendo datos del usuario');
          this.nextRoute = '/login';
        }
      } else {
        console.log('❌ No hay sesión activa');
        this.nextRoute = '/login';
      }
    } catch (error) {
      console.error('❌ Error verificando sesión:', error);
      this.nextRoute = '/login';
    }

    this.sessionCheckCompleted = true;
    this.proceedIfReady();
  }
  proceedIfReady() {
    if (this.sessionCheckCompleted && this.animationFinished) {
      console.log('✅ Listo para navegar a:', this.nextRoute);
      setTimeout(() => {
        this.destroy();
        router.navigate(this.nextRoute);
      }, 100);
    }
  }
  destroy() {
    if (this.splashView) {
      this.splashView.destroy();
      this.splashView = null;
    }
    const styles = document.getElementById('splash-styles');
    if (styles) styles.remove();
  }
startInvisibleObjectsFadeOut() {
    const fadeOutDuration = 1.0;
    const startTime = this.animationTime;
    const fadeOutAnimation = () => {
        if (!this.invisibleObjectsVisible || this.isStaticMode) return;
        const elapsed = this.animationTime - startTime;
        const progress = Math.min(elapsed / fadeOutDuration, 1);
        this.invisibleObjects.forEach(obj => {
            const userData = obj.userData;
            if (userData.type === 'invisible') {
                const opacity = userData.maxOpacity * (1 - progress);
                userData.opacity = opacity;
                obj.traverse((child) => {
                    if (child.material) {
                        child.material.opacity = opacity;
                        if (child.material.emissiveIntensity !== undefined) {
                            child.material.emissiveIntensity = opacity * 0.5;
                        }
                    }
                });
            }
        });
        if (progress >= 1) {
            const threeContainer = document.getElementById('threeContainer');
            if (threeContainer) {
                threeContainer.style.opacity = '0';
            }
        } else {
            requestAnimationFrame(fadeOutAnimation);
        }
    };
    fadeOutAnimation();
}
}
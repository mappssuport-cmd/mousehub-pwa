import './styles/global.css';
import './styles/glass-effects.css';
import { HelpClass } from './utils/help-class.js';
import { InstallPromptHandler } from './utils/install-prompt-handler.js';
import { TVLogin } from './views/tv-login.js';

class Router {
  constructor() {
    this.routes = {};
    this.currentView = null;
  }
  register(path, viewClass) {
    this.routes[path] = viewClass;
  }

async navigate(path, data = {}, replaceState = false) {
  console.log('🔄 Navegando a:', path);

  let normalizedPath = path;
  if (normalizedPath.endsWith('/') && normalizedPath !== '/') {
    normalizedPath = normalizedPath.slice(0, -1);
  }
  
  const ViewClass = this.routes[normalizedPath];
  
  if (!ViewClass) {
    console.error('❌ Ruta no encontrada:', normalizedPath);
    // ✅ CAMBIADO: No llamar navigate recursivamente, redirigir directo
    window.history.replaceState({ path: '/' }, '', '/');
    location.reload(); // Fuerza recarga limpia desde root
    return;
  }

  if (this.currentView?.destroy) {
    this.currentView.destroy();
  }

  const appContainer = document.getElementById('app');
  if (!appContainer) {
    console.error('❌ No se encontró #app');
    return;
  }

  appContainer.innerHTML = '';

  try {
    this.currentView = new ViewClass(appContainer, data);
    await this.currentView.render();
  } catch (error) {
    console.error('❌ Error al renderizar:', error);
    throw error;
  }

  await new Promise(resolve => requestAnimationFrame(resolve));

  // ✅ MEJORADO: Usar normalizedPath
  if (window.history) {
    try {
      if (replaceState) {
        window.history.replaceState({ path: normalizedPath }, '', normalizedPath);
      } else {
        window.history.pushState({ path: normalizedPath }, '', normalizedPath);
      }
    } catch (error) {
      console.warn('⚠️ Error al actualizar history:', error);
    }
  }

  console.log('✅ Navegación completada:', normalizedPath);
}


async start(initialPath = '/') {
  console.log('🎬 Iniciando router...');

  let isRunningAsPWA = false;
  
  try {
    // Método 1: display-mode standalone
    if (window.matchMedia('(display-mode: standalone)').matches) {
      isRunningAsPWA = true;
    }
    
    // Método 2: iOS standalone
    if (window.navigator.standalone === true) {
      isRunningAsPWA = true;
    }
    
    // Método 3: parametros PWA en URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('source') === 'pwa' || urlParams.has('shortcut')) {
      isRunningAsPWA = true;
    }
  } catch (e) {
    console.warn('⚠️ Error detectando modo PWA:', e);
  }
  
  console.log('🚀 Corriendo como PWA:', isRunningAsPWA);
  
  let currentPath = window.location.pathname;
  
  // Limpiar ruta
  if (currentPath.endsWith('index.html')) {
    currentPath = currentPath.replace('index.html', '');
  }
  
  if (currentPath.endsWith('/') && currentPath !== '/') {
    currentPath = currentPath.slice(0, -1);
  }
  
  if (currentPath === '' || currentPath === '/index' || currentPath === '/index.html') {
    currentPath = '/';
  }
  
  console.log('🎯 Ruta actual normalizada:', currentPath);
  
  // Verificar hash routing
  if (window.location.hash && window.location.hash.startsWith('#/')) {
    const hashPath = window.location.hash.substring(1);
    if (this.routes[hashPath]) {
      currentPath = hashPath;
    }
  }
  
  // Determinar ruta inicial
  const isInitialLoad = !this._hasNavigated;
  this._hasNavigated = true;
  
  let pathToLoad;
  
  if (isInitialLoad) {
    // CAMBIO CRÍTICO: Si es PWA, NUNCA ir a /welcome
    if (isRunningAsPWA) {
      console.log('🚀 PWA detectada - forzando inicio en /');
      pathToLoad = '/';
    } else {
      // Navegador normal, usar initialPath
      console.log('🌐 Navegador web - usando initialPath:', initialPath);
      pathToLoad = initialPath;
    }
  } else {
    pathToLoad = currentPath;
  }
  
  // Validar ruta
  if (!this.routes[pathToLoad]) {
    console.warn(`⚠️ Ruta "${pathToLoad}" no encontrada, usando "/" como fallback`);
    pathToLoad = '/';
  }
  
  console.log('✅ Ruta final a cargar:', pathToLoad);
  
  // Manejar back/forward
window.addEventListener('popstate', (e) => {
  let path = (e.state && e.state.path) || window.location.pathname;
  
  // ✅ NUEVO: Normalizar path
  if (path.endsWith('/') && path !== '/') {
    path = path.slice(0, -1);
  }
  
  console.log('⬅️ Navegación histórica a:', path);
  
  if (this.routes[path]) {
    this.navigate(path, {}, true);
  } else {
    // ✅ MEJORADO: Forzar recarga si la ruta no existe
    console.warn('⚠️ Ruta no encontrada en popstate, recargando');
    window.location.href = '/';
  }
});

  await this.navigate(pathToLoad, {}, true);
}


}
export const router = new Router();

if (!Promise.allSettled) {
  Promise.allSettled = function(promises) {
    return Promise.all(
      promises.map(p => 
        Promise.resolve(p)
          .then(value => ({ status: 'fulfilled', value }))
          .catch(reason => ({ status: 'rejected', reason }))
      )
    );
  };
}
if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = function(callback) {
    return setTimeout(callback, 1000 / 60);
  };
  window.cancelAnimationFrame = function(id) {
    clearTimeout(id);
  };
}
async function init() {
  console.log('🚀 Iniciando MouseHub PWA...');
  let initTimeout;
  let hasLoaded = false;
  initTimeout = setTimeout(() => {
    if (!hasLoaded) {
      console.warn('⚠️ Timeout de inicialización - forzando carga');
      document.body.classList.add('app-loaded');
      hasLoaded = true;
    }
  }, 10000);
  try {
    try {
      HelpClass.setupAppearance();
      console.log('✅ Apariencia configurada');
    } catch (e) {
      console.warn('⚠️ Error en setupAppearance:', e);
    }
    try {
      InstallPromptHandler.initialize();
      console.log('✅ InstallPrompt inicializado');
    } catch (e) {
      console.warn('⚠️ InstallPrompt no disponible:', e);
    }
    console.log('📦 Cargando vistas...');
    const views = await Promise.allSettled([
      import('./views/welcome-screen.js').then(module => {
        console.log('✅ WelcomeScreen importada:', !!module?.WelcomeScreen);
        console.log('📊 Keys del módulo WelcomeScreen:', Object.keys(module || {}));
        return module;
      }).catch(e => {
        console.error('❌ Error importando welcome-screen:', e);
        throw e;
      }),
      import('./views/splash-screen.js').then(module => {
        console.log('✅ SplashScreen importada:', !!module?.SplashScreen);
        return module;
      }),
      import('./views/main-activity.js').then(module => {
        console.log('✅ MainActivity importada:', !!module?.MainActivity);
        return module;
      }),
      import('./views/home.js').then(module => {
        console.log('✅ Home importada:', !!module?.Home);
        return module;
      }),
      import('./views/tv-login.js').then(module => {
       console.log('✅ TVLogin importada:', !!module?.TVLogin);
       return module;
      })
    ]);
    

    console.log('📊 Resultado de carga de vistas:');
    views.forEach((view, index) => {
      const names = ['WelcomeScreen', 'SplashScreen', 'MainActivity', 'Home'];
      console.log(`  ${names[index]}: ${view.status}`);
      if (view.status === 'rejected') {
        console.error(`    Error: ${view.reason}`);
      }
    });
    console.log('🔍 DEPURACIÓN DETALLADA WelcomeScreen:');
    console.log('- Estado:', views[0]?.status);
    if (views[0]?.status === 'fulfilled') {
      console.log('- Módulo cargado:', !!views[0].value);
      console.log('- Keys del módulo:', Object.keys(views[0].value || {}));
      console.log('- WelcomeScreen en módulo:', !!views[0].value?.WelcomeScreen);
      console.log('- Tipo de WelcomeScreen:', typeof views[0].value?.WelcomeScreen);
      console.log('- Es clase?:', views[0].value?.WelcomeScreen?.prototype?.constructor?.name || 'No');
      if (views[0].value?.WelcomeScreen) {
        const cls = views[0].value.WelcomeScreen;
        console.log('- Nombre de clase:', cls.name || 'Sin nombre');
        console.log('- Tiene método render?:', typeof cls.prototype?.render === 'function');
        console.log('- Tiene método destroy?:', typeof cls.prototype?.destroy === 'function');
      }
    }
    console.log('📝 Registrando rutas...');
    let welcomeRegistered = false;
    let splashRegistered = false;
    let mainActivityRegistered = false;
    let homeRegistered = false;
    if (views[0].status === 'fulfilled' && views[0].value?.WelcomeScreen) {
      router.register('/welcome', views[0].value.WelcomeScreen);
      welcomeRegistered = true;
      console.log('✅ /welcome registrada con WelcomeScreen');
    } else {
      console.error('❌ NO se pudo registrar /welcome');
      console.error('  - Estado vista 0:', views[0]?.status);
      console.error('  - Tiene WelcomeScreen?:', !!views[0]?.value?.WelcomeScreen);
    }
    if (views[1].status === 'fulfilled' && views[1].value?.SplashScreen) {
      router.register('/', views[1].value.SplashScreen);
      splashRegistered = true;
      console.log('✅ / registrada con SplashScreen');
    }
    if (views[2].status === 'fulfilled' && views[2].value?.MainActivity) {
      router.register('/login', views[2].value.MainActivity);
      mainActivityRegistered = true;
      console.log('✅ /login registrada con MainActivity');
    }
    if (views[3].status === 'fulfilled' && views[3].value?.Home) {
      router.register('/home', views[3].value.Home);
      homeRegistered = true;
      console.log('✅ /home registrada con Home');
    }
    if (views[4].status === 'fulfilled' && views[4].value?.TVLogin) {
      router.register('/tv-login', views[4].value.TVLogin);
      console.log('✅ /tv-login registrada con TVLogin');
    }
    console.log('📊 Resumen de rutas registradas:');
    console.log('- Rutas disponibles:', Object.keys(router.routes));
    console.log('- Total rutas:', Object.keys(router.routes).length);
    let isPWAInstalled = false;
    try {
      if (window.matchMedia) {
        isPWAInstalled = window.matchMedia('(display-mode: standalone)').matches;
      }
      
      if (window.navigator && window.navigator.standalone !== undefined) {
        isPWAInstalled = isPWAInstalled || window.navigator.standalone === true;
      }
    } catch (e) {
      console.warn('⚠️ No se puede detectar modo standalone:', e);
      isPWAInstalled = false;
    }
    console.log('📱 PWA instalada:', isPWAInstalled);
    const urlParams = new URLSearchParams(window.location.search);
    const isFromPWA = urlParams.has('source') || urlParams.has('shortcut');
    const initialRoute = (isPWAInstalled || isFromPWA) ? '/' : '/welcome';
    console.log('🎯 Ruta inicial seleccionada:', initialRoute);
    console.log('🎯 ¿Es welcome?:', initialRoute === '/welcome');
    console.log('🎯 ¿Está /welcome registrada?:', welcomeRegistered);
    console.log('🎯 ¿Está / registrada?:', splashRegistered);
    await new Promise(resolve => setTimeout(resolve, 50));
    if (initialRoute === '/welcome' && !welcomeRegistered) {
      console.error('❌ ERROR CRÍTICO: /welcome solicitada pero no está registrada!');
      console.error('   Usando / como fallback');
      await router.start('/');
    } else {
      console.log('🎯 Antes de router.start():');
      console.log('   - initialRoute:', initialRoute);
      console.log('   - router.routes[initialRoute]:', router.routes[initialRoute]);
      console.log('   - window.location.pathname:', window.location.pathname);
      console.log('   - window.location.href:', window.location.href);
      await router.start(initialRoute);
    }
    clearTimeout(initTimeout);
    setTimeout(() => {
      if (!hasLoaded) {
        document.body.classList.add('app-loaded');
        hasLoaded = true;
        console.log('✅ App completamente cargada');
      }
    }, 500);
    
  } catch (error) {
    console.error('❌ Error crítico al inicializar:', error);
    console.error('Stack:', error.stack);
    clearTimeout(initTimeout);
    if (!hasLoaded) {
      document.body.classList.add('app-loaded');
      hasLoaded = true;
      const appContainer = document.getElementById('app');
      if (appContainer) {
        appContainer.innerHTML = `
          <div style="
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: #02020E;
            color: white;
            padding: 20px;
            text-align: center;
            font-family: system-ui, -apple-system, sans-serif;
          ">
            <h1 style="font-size: 24px; margin-bottom: 16px;">⚠️ Error de Inicialización</h1>
            <p style="font-size: 16px; margin-bottom: 24px; opacity: 0.8;">
              No se pudo cargar la aplicación correctamente.
            </p>
            <pre style="
              background: rgba(0,0,0,0.3);
              padding: 10px;
              border-radius: 5px;
              font-size: 12px;
              text-align: left;
              max-width: 100%;
              overflow: auto;
            ">${error.message}</pre>
            <button 
              onclick="window.location.reload()" 
              style="
                margin-top: 20px;
                padding: 12px 24px;
                background: #3dd2f3;
                border: none;
                border-radius: 8px;
                color: white;
                font-size: 16px;
                cursor: pointer;
                font-weight: bold;
              "
            >
              Reintentar
            </button>
          </div>
        `;
      }
    }
  }
}
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(registration => {
      console.log('✅ Service Worker registrado tempranamente:', registration.scope);
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('🔄 Nueva versión del Service Worker detectada');
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('✨ Nueva versión disponible - considera recargar');
          }
        });
      });
    })
    .catch(error => {
      console.error('❌ Error registrando Service Worker:', error);
    });
} else {
  console.warn('⚠️ Service Worker no soportado en este navegador');
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
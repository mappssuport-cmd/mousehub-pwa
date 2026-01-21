const CACHE_NAME = 'mousehub-v1.4.1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/images/output/192px/icon_192px.png',
  '/assets/images/output/512px/icon_512px.png',
  '/assets/images/icons/logo.webp',
  '/src/app.js'
];

self.addEventListener('install', event => {
  console.log('🔧 [SW] Instalando Service Worker v1.2.4...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 [SW] Cacheando recursos críticos...');
        
        // Cachear recursos uno por uno para mejor control de errores
        const cachePromises = urlsToCache.map(url => {
          return fetch(url, { 
            credentials: 'same-origin',
            cache: 'reload' // ⬅️ Forzar descarga fresca en instalación
          })
            .then(response => {
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
              }
              console.log('✅ [SW] Cacheado:', url);
              return cache.put(url, response);
            })
            .catch(err => {
              console.warn('⚠️ [SW] No se pudo cachear:', url, err.message);
              return null;
            });
        });
        
        return Promise.allSettled(cachePromises);
      })
      .then(() => {
        console.log('✅ [SW] Instalación completada - activando inmediatamente');
        return self.skipWaiting(); // ⬅️ Activar inmediatamente
      })
      .catch(error => {
        console.error('❌ [SW] Error en instalación:', error);
      })
  );
});
self.addEventListener('activate', event => {
  console.log('✅ [SW] Activando Service Worker...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ [SW] Eliminando caché antigua:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ [SW] Service Worker activado y listo');
        return self.clients.claim();
      })
  );
});
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // Ignorar requests no-HTTP
  if (!request.url.startsWith('http')) {
    return;
  }

  // Estrategia CACHE FIRST para navegación y assets
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        // Si está en caché, devolverlo inmediatamente
        if (cachedResponse) {
          console.log('[SW] ✅ Servido desde caché:', request.url);
          
          // Actualizar caché en segundo plano (stale-while-revalidate)
          fetch(request)
            .then(response => {
              if (response && response.status === 200 && response.type === 'basic') {
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(request, response);
                });
              }
            })
            .catch(() => {}); // Ignorar errores de actualización
          
          return cachedResponse;
        }
        
        // Si no está en caché, intentar red
        console.log('[SW] 🌐 Obteniendo de red:', request.url);
        return fetch(request)
          .then(response => {
            // Cachear respuestas exitosas
            if (response && response.status === 200 && response.type === 'basic') {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, responseToCache);
              });
            }
            return response;
          })
          .catch(error => {
            // Si falla la red y es navegación, mostrar página offline
            if (request.mode === 'navigate') {
              return caches.match('/').then(indexResponse => {
                return indexResponse || new Response(
                  `<!DOCTYPE html>
                  <html lang="es">
                  <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Sin conexión - MouseHub</title>
                    <style>
                      body {
                        margin: 0;
                        padding: 0;
                        font-family: system-ui, -apple-system, sans-serif;
                        background: #02020E;
                        color: white;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        text-align: center;
                      }
                      h1 { font-size: 2em; margin-bottom: 1rem; }
                      p { font-size: 1.1em; opacity: 0.8; margin-bottom: 2rem; }
                      button {
                        background: #3dd2f3;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-size: 1em;
                        cursor: pointer;
                        font-weight: bold;
                      }
                    </style>
                  </head>
                  <body>
                    <h1>📡 Sin conexión</h1>
                    <p>No hay conexión a internet.<br>Verifica tu conexión e intenta nuevamente.</p>
                    <button onclick="window.location.reload()">Reintentar</button>
                  </body>
                  </html>`,
                  {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: new Headers({ 'Content-Type': 'text/html' })
                  }
                );
              });
            }
            
            // Para otros recursos, fallar silenciosamente
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});
import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';
export default defineConfig({
  root: './',
  publicDir: 'public',
  
  esbuild: {
    target: 'es2015',
    supported: {
      'top-level-await': false,
      'optional-chaining': false,
      'nullish-coalescing': false
    }
  },
  
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2015',
    
    minify: 'terser',
    terserOptions: {
      ecma: 5,
      safari10: true
    },
    
    rollupOptions: {
      output: {
    format: 'es',
    manualChunks: {
      'vendor': ['appwrite']
    },
    assetFileNames: (assetInfo) => {
      if (assetInfo.name === 'manifest.json') {
        return 'manifest.json';
      }
      if (assetInfo.name === '_redirects') {
        return '_redirects';
      }
      return 'assets/[name]-[hash][extname]';
    }
  }
    },
    
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1000,
  },
  
  server: {
    port: 3000,
    open: false,
    host: true,
    hmr: false,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    proxy: {},
  },
  
  preview: {
    port: 3000,
    host: true,
    strictPort: false,
    proxy: {},
  },
  
  optimizeDeps: {
    include: ['appwrite'],
    esbuildOptions: {
      target: 'es2015',
      supported: {
        'top-level-await': false
      }
    }
  },
  
  plugins: [
    legacy({
      targets: [
        'Chrome >= 75',
        'Safari >= 12',
        'Firefox >= 65',
        'not dead',
        'not IE 11'
      ],
      modernPolyfills: true,
      renderLegacyChunks: true,
      polyfills: [
        'es.promise.all-settled',
        'es.promise.finally',
        'es.object.from-entries',
        'es.array.flat',
        'es.array.flat-map',
        'es.string.match-all',
        'es.string.replace-all'
      ],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
      renderModernChunks: false
    }),
    {
      name: 'critical-polyfills',
      transformIndexHtml(html) {
        return html.replace(
          '<head>',
          `<head>
          <script>
            // POLYFILLS CRÍTICOS PARA TVS 2019
            if (!Promise.allSettled) {
              Promise.allSettled = function(promises) {
                return Promise.all(
                  promises.map(function(p) {
                    return Promise.resolve(p)
                      .then(function(value) {
                        return { status: 'fulfilled', value: value };
                      })
                      .catch(function(reason) {
                        return { status: 'rejected', reason: reason };
                      });
                  })
                );
              };
            }
            
            if (!Promise.prototype.finally) {
              Promise.prototype.finally = function(callback) {
                return this.then(
                  function(value) {
                    return Promise.resolve(callback()).then(function() {
                      return value;
                    });
                  },
                  function(reason) {
                    return Promise.resolve(callback()).then(function() {
                      throw reason;
                    });
                  }
                );
              };
            }
            
            if (!Array.prototype.flat) {
              Array.prototype.flat = function(depth) {
                var flattened = [];
                (function flat(arr, d) {
                  for (var i = 0; i < arr.length; i++) {
                    if (Array.isArray(arr[i]) && d > 0) {
                      flat(arr[i], d - 1);
                    } else {
                      flattened.push(arr[i]);
                    }
                  }
                })(this, Math.floor(depth) || 1);
                return flattened;
              };
            }
            
            if (!Object.fromEntries) {
              Object.fromEntries = function(entries) {
                var obj = {};
                for (var i = 0; i < entries.length; i++) {
                  obj[entries[i][0]] = entries[i][1];
                }
                return obj;
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
            
            if (!window.matchMedia) {
              window.matchMedia = function() {
                return {
                  matches: false,
                  media: '',
                  addListener: function() {},
                  removeListener: function() {},
                  addEventListener: function() {},
                  removeEventListener: function() {},
                  dispatchEvent: function() { return false; }
                };
              };
            }
            
            if (!window.IntersectionObserver) {
              window.IntersectionObserver = function() {
                return {
                  observe: function() {},
                  unobserve: function() {},
                  disconnect: function() {},
                  takeRecords: function() { return []; }
                };
              };
            }
            
            if (!window.fetch) {
              window.fetch = function(url, options) {
                return new Promise(function(resolve, reject) {
                  var xhr = new XMLHttpRequest();
                  xhr.open(options && options.method || 'GET', url);
                  
                  if (options && options.headers) {
                    for (var key in options.headers) {
                      xhr.setRequestHeader(key, options.headers[key]);
                    }
                  }
                  
                  xhr.onload = function() {
                    resolve({
                      ok: xhr.status >= 200 && xhr.status < 300,
                      status: xhr.status,
                      statusText: xhr.statusText,
                      text: function() { return Promise.resolve(xhr.responseText); },
                      json: function() { return Promise.resolve(JSON.parse(xhr.responseText)); }
                    });
                  };
                  
                  xhr.onerror = function() {
                    reject(new Error('Network error'));
                  };
                  
                  xhr.send(options && options.body || null);
                });
              };
            }
            
            console.log('✅ Polyfills críticos cargados');
          </script>`
        );
      }
    },
    {
      name: 'spa-fallback-improved',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url || '';
          if (
            url.startsWith('/src') ||
            url.startsWith('/node_modules') ||
            url.startsWith('/@') ||
            url.startsWith('/assets') ||
            url === '/manifest.json' ||
            url === '/_redirects' ||
            url.includes('.') && !url.includes('?')
          ) {
            return next();
          }
          console.log('🔄 SPA Fallback (dev):', url, '-> /index.html');
          req.url = '/index.html';
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url || '';
          if (
            url.startsWith('/assets') ||
            url === '/manifest.json' ||
            url === '/_redirects' ||
            url.includes('.') && !url.includes('?')
          ) {
            return next();
          }
          console.log('🔄 SPA Fallback (preview):', url, '-> /index.html');
          req.url = '/index.html';
          next();
        });
      }
    }
  ],
  css: {
    postcss: './postcss.config.js'
  }
});
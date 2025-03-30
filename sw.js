const CACHE_NAME = 'mimusica-cache-v1'; // Nueva versión
const API_HOST = 'spotify23.p.rapidapi.com';
const URLS_TO_CACHE = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/manifest.json',
    '/img/default-song.png',
    '/img/fondo.jpg' 
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(URLS_TO_CACHE)
                    .then(() => console.log('[SW] Todos los recursos cacheados'))
                    .catch(err => console.error('[SW] Error al cachear:', err));
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Estrategia para la API de Spotify
    if (url.host === API_HOST) {
        event.respondWith(
            caches.match(request).then(cachedResponse => {
                return cachedResponse || fetch(request).then(networkResponse => {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        console.log('[SW] Guardando búsqueda:', request.url);
                        cache.put(request, responseToCache);
                    });
                    return networkResponse;
                });
            })
        );
    }
    // Estrategia para recursos locales
    else {
        event.respondWith(
            caches.match(request).then(response => {
                return response || fetch(request).then(networkResponse => {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, responseToCache);
                    });
                    return networkResponse;
                });
            })
        );
    }
});
const CACHE_NAME = 'hp12c-platinum-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/index.tsx',
  '/manifest.json'
];

// Install Event - Cache Files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate Event - Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// Fetch Event - Serve from Cache, fall back to Network
self.addEventListener('fetch', (event) => {
  // Ignora requisições que não sejam GET ou que sejam para a API do Gemini (precisa de internet)
  if (event.request.method !== 'GET' || event.request.url.includes('google')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Retorna cache se existir, senão busca na rede
      return cachedResponse || fetch(event.request).then((networkResponse) => {
         // Opcional: Cachear novas requisições dinamicamente aqui se desejar
         return networkResponse;
      });
    })
  );
});
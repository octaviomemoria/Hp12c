const CACHE_NAME = 'rpn-calc-offline-v7';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install: Cache the app shell immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activate: Clean up old caches to ensure user gets updates
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
  self.clients.claim();
});

// Fetch: Aggressive Caching Strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Ignore API calls (GenAI needs internet)
  if (url.pathname.includes('generateContent') || url.hostname.includes('googleapis.com/v1beta')) {
    return;
  }

  // 2. Handle Navigation (HTML) - Network First, then Cache
  // This ensures the user gets the latest version if online, but works if offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // 3. Handle Assets (JS, CSS, Fonts, Images, TSX) - Cache First, then Network
  // This includes local files (.tsx, .ts) and external CDNs (React, Tailwind, Fonts)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        // Valid response check
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // IMPORTANT: Cache opaque responses (CDN) and basic responses
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(err => {
         console.log('Fetch failed (offline): ', event.request.url);
      });
    })
  );
});
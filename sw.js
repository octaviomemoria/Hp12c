const CACHE_NAME = 'hp12c-platinum-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install: Cache core local files immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate: Clean up old caches
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

// Fetch: Strategy "Stale-While-Revalidate" for external resources
// and "Cache First" for local resources.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Ignore API calls (GenAI) - they require internet
  if (url.pathname.includes('generateContent') || event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // If found in cache, return it immediately
      if (cachedResponse) {
        // Optional: Update cache in background for next time (Stale-While-Revalidate)
        // This is useful for CDN scripts that might update versions
        if (url.origin !== self.location.origin) {
            fetch(event.request).then(response => {
                if(response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
            }).catch(() => {});
        }
        return cachedResponse;
      }

      // If not in cache, fetch from network
      return fetch(event.request).then((response) => {
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== 'basic' && response.type !== 'cors') {
          return response;
        }

        // Cache the external resource (CDN scripts, fonts, etc.)
        // This is crucial for Tailwind and React to work offline
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});
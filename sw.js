const CACHE_NAME = 'monetto-cache-v7'; // Bump version - fixed POST caching bug
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo-pjfinance.png'
  // Removed fragile external URLs and source files. They will be cached at runtime.
];

self.addEventListener('install', (event) => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache for pre-caching');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Skip caching for:
  // 1. Non-GET requests (POST, PUT, DELETE etc) - Cache API only supports GET
  // 2. Supabase API calls - these should always be fresh from network
  const url = new URL(event.request.url);
  const isNonGetRequest = event.request.method !== 'GET';
  const isSupabaseRequest = url.hostname.includes('supabase');

  if (isNonGetRequest || isSupabaseRequest) {
    // Just fetch from network, don't cache
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Not in cache, fetch from network
        return fetch(event.request).then(
          (networkResponse) => {
            // Check if we received a valid response to cache.
            // This is a simplified check that allows caching of basic and CORS responses.
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          }
        ); // IMPORTANT: Removed the empty .catch() block. Let errors propagate.
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
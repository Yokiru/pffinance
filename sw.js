const CACHE_NAME = 'monetto-online-only-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force activation immediately
});

self.addEventListener('activate', (event) => {
  // Clear all old caches to ensure fresh start
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('Clients claimed');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Always fetch from network, do NOT cache anything
  // This ensures the Online-Only architecture is respected
  event.respondWith(fetch(event.request));
});
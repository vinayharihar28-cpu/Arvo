/* public/service-worker.js */
self.addEventListener('install', (event) => {
  // pre‑cache the core assets (you can add more files later)
  event.waitUntil(
    caches.open('billingsoftware-v1').then((cache) => {
      return cache.addAll([
        '/',                     // the HTML document
        '/manifest.json',        // manifest
        '/icons/logo.png',   // at least one icon
        // Add any static CSS/JS you want offline
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Try the network first, fall back to cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

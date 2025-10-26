const CACHE = 'lumen-sanctum-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Only cache same-origin GET requests
  const isSameOrigin = new URL(req.url).origin === self.location.origin;
  const isGetRequest = req.method === 'GET';
  
  if (!isSameOrigin || !isGetRequest) {
    event.respondWith(fetch(req));
    return;
  }
  
  event.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req).then(networkRes => {
        const copy = networkRes.clone();
        caches.open(CACHE).then(cache => cache.put(req, copy)).catch(()=>{});
        return networkRes;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

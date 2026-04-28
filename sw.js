const CACHE = 'cn133-v1';
const SHELL = [
  './',
  './css/style.css',
  './js/api.js',
  './js/ui.js',
  './js/modal.js',
  './js/logic.js',
  './icon/big.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  // Supabase & CDN: network first, fallback cache
  if (url.includes('supabase.co') || url.includes('cdn.jsdelivr') || url.includes('fonts.googleapis') || url.includes('fonts.gstatic')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }
  // App shell: cache first, fallback network + cache
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      });
    })
  );
});

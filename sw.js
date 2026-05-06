const CACHE = 'cn133-v2';
const STATIC = [
  './css/style.css',
  './js/api.js',
  './js/ui.js',
  './js/modal.js',
  './js/logic.js',
  './icon/big.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
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

  // HTML: luôn lấy từ network, fallback cache khi offline
  if (e.request.mode === 'navigate' || url.endsWith('.html') || url.endsWith('/')) {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Supabase & CDN: network first
  if (url.includes('supabase.co') || url.includes('cdn.jsdelivr') || url.includes('fonts.googleapis') || url.includes('fonts.gstatic')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  // CSS/JS/assets: cache first, update in background
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      });
      return cached || network;
    })
  );
});

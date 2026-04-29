/* ─── StockPro Service Worker ─── */
const CACHE = 'stockpro-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

/* ─── Nhận push từ server ─── */
self.addEventListener('push', e => {
  if (!e.data) return;
  let d;
  try { d = e.data.json(); } catch { d = { title: 'StockPro', body: e.data.text() }; }
  e.waitUntil(
    self.registration.showNotification(d.title || 'StockPro', {
      body:    d.body  || '',
      icon:    '/icon/logo.png',
      badge:   '/icon/logo.png',
      vibrate: [200, 100, 200],
      tag:     d.tag   || 'stockpro',
      data:    { url: d.url || '/' }
    })
  );
});

/* ─── Bấm vào thông báo → mở app ─── */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});

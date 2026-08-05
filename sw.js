/* Foodies Service Worker — network-first für die App (online immer frisch → kein Strg+F5),
   Cache-Fallback wenn offline. Assets (Icon/Manifest) cache-first. */
const CACHE = 'foodies-v1';
const APP = './index.html';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        const c = await caches.open(CACHE);
        c.put(APP, fresh.clone());
        return fresh;
      } catch (_) {
        return (await caches.match(APP)) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }

  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.ok) { const c = await caches.open(CACHE); c.put(req, fresh.clone()); }
      return fresh;
    } catch (_) {
      return cached || Response.error();
    }
  })());
});

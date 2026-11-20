// UnderGrid service worker: app shell + runtime caching so the app loads with no network.
const CACHE = 'undergrid-__BUILD__';

self.addEventListener('install', (event) => {
  // Cache every built file (list written at build time) so the whole app, fonts included, works offline.
  event.waitUntil(
    caches.open(CACHE).then(async (c) => {
      let urls = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg'];
      try { urls = await (await fetch('/precache.json', { cache: 'no-store' })).json(); } catch { /* dev server */ }
      await Promise.all(urls.map((u) => c.add(u).catch(() => {})));
    }),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (req.mode === 'navigate') {
    // Network first, fall back to the cached shell when the network is cut.
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put('/index.html', copy));
        return res;
      }).catch(() => caches.match('/index.html').then((r) => r || caches.match('/'))),
    );
    return;
  }

  // Assets: cache first, then fill the cache from the network.
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    })),
  );
});

// The page tells us which files it loaded so they are available offline from the very first visit.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(caches.open(CACHE).then((c) => Promise.all(event.data.urls.map((u) => c.add(u).catch(() => {})))));
  }
});

const CACHE_NAME = 'mortal-training-v4';
const BASE = '/fanrenxunlianzhuan';

const PRECACHE_URLS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/manifest.json',
  BASE + '/icon-192.png',
  BASE + '/icon-512.png',
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS).catch(() => {});
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.includes(BASE)) return;

  const url = new URL(event.request.url);
  const isHTML = url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  const isStatic = url.pathname.includes('icon-') || url.pathname.includes('manifest.json');
  
  if (isStatic) {
    // Cache First for static assets (rarely change)
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
  } else if (isHTML) {
    // Network First for HTML — always get latest, fall back to cache
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
  } else {
    // Stale-while-revalidate for everything else (SW itself, etc.)
    event.respondWith(
      caches.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});

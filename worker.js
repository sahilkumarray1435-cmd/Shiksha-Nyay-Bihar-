// Shiksha Nyay – Bihar
// Service worker: app-shell ko cache karta hai taaki app offline/slow-network
// (low-resource Android devices) par bhi khul sake.
// worker.js ko index.html/manifest.json ke SAME folder mein rakhein.

const CACHE_NAME = 'shiksha-nyay-shell-v1';

// App shell files jo pehli load par cache ho jaayenge.
// index.html ka naam apke deployment ke hisaab se badal sakta hai — agar
// aapki file ka naam kuch aur hai (jaise "app.html"), use yahan update karein.
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch((err) => {
        // Agar koi ek file na mile to poora install fail na ho —
        // har file ko alag try karte hain.
        console.warn('Shiksha Nyay: pre-cache warning', err);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Strategy: navigation requests → network first, cache fallback (taaki
// naye updates jaldi mile, offline hone par purana shell chal jaaye).
// Baaki (static) requests → cache first, network fallback.
self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((res) => res || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});

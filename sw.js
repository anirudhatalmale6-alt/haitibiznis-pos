/* Sant HaitiBiznis POS — service worker (offline app shell) */
var CACHE = 'hb-pos-v42';
var SHELL = [
  './',
  './index.html',
  './qrcode.js',
  './manifest.json',
  './assets/haitibiznis-logo.png',
  './assets/brasil-pos-logo.png',
  './assets/hbtech-badge.png',
  './assets/pos-logo-ht.jpg',
  './assets/pos-logo-fr.jpg',
  './assets/pos-logo-en.jpg',
  './assets/pos-logo-es.jpg',
  './assets/msouwout-logo.png',
  './assets/myplopplop-logo.png',
  './assets/48hoursready-logo.jpg',
  './assets/favicon-32.png',
  './assets/favicon-16.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-180.png'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(SHELL.map(function (u) {
      return c.add(u).catch(function () { /* ignore a single missing asset */ });
    }));
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

/* Cache-first for GET; update cache in background when online. */
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      var net = fetch(e.request).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});

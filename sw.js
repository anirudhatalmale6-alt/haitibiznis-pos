/* LajanMaker Center — service worker (offline app shell) */
var CACHE = 'hb-pos-v60';
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
  './assets/icon-180.png',
  './assets/icon-maskable-192.png',
  './assets/icon-maskable-512.png'
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
  }).then(function () { return self.clients.claim(); })
   .then(function () {
     /* Tell any open tab a new build took over, so it can refresh itself once.
        Without this an already-open app keeps running the old code all day. */
     return self.clients.matchAll({ type: 'window' }).then(function (cs) {
       cs.forEach(function (c) { c.postMessage({ type: 'SW_UPDATED', cache: CACHE }); });
     });
   }));
});

function isDocRequest(req) {
  return req.mode === 'navigate' ||
         (req.headers.get('accept') || '').indexOf('text/html') !== -1;
}

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;

  /* The page itself is NETWORK-FIRST.
     This used to be cache-first like everything else, and that is why a seller
     could be looking at a build from days ago: the cached copy always won, and
     the fresh one only landed in the cache for "next time" - which, with the
     service worker itself also cached, could be never. A button that has
     already shipped is invisible to the person who needs it. Offline still
     works: on a failed fetch we fall back to the cached shell. */
  if (isDocRequest(e.request)) {
    e.respondWith(
      fetch(e.request).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) {
            c.put(e.request, copy.clone());
            c.put('./index.html', copy);   /* '/pos/' and '/pos/index.html' are the same page */
          });
        }
        return res;
      }).catch(function () {
        return caches.match(e.request).then(function (hit) {
          return hit || caches.match('./index.html');
        });
      })
    );
    return;
  }

  /* Everything else - icons, qrcode.js, logos - stays cache-first and is
     refreshed in the background. Those never carry a feature the seller needs. */
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

/* The page can ask for a hard refresh (the "Update the app" button). */
self.addEventListener('message', function (e) {
  if (!e.data || e.data.type !== 'WIPE') return;
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { return caches.delete(k); }));
  }));
});

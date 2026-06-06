const CACHE_NAME = 'math-arcade-static-v1';

const STATIC_ASSETS = [
  './',
  './index.html',
  './report.html',
  './LICENSE',
  './README.md',
  './audio.js',
  './game-shell.js',
  './games-registry.js',
  './hub-progress.js',
  './i18n.js',
  './pwa.js',
  './report.js',
  './save-data.js',
  './storage.js',
  './manifest.webmanifest',
  './balancescale-html5/index.html',
  './balancescale-html5/game.js',
  './beebuzzsays-html5/index.html',
  './beebuzzsays-html5/core.js',
  './beebuzzsays-html5/game.js',
  './letterwhack-html5/index.html',
  './letterwhack-html5/game.js',
  './mathasteroids-html5/index.html',
  './mathasteroids-html5/game.js',
  './mathbert-html5/index.html',
  './mathbert-html5/game.js',
  './mathfrogger-html5/index.html',
  './mathfrogger-html5/game.js',
  './mathinvaders-html5/index.html',
  './mathinvaders-html5/game.js',
  './mathmatch3-html5/index.html',
  './mathmatch3-html5/game.js',
  './mathris-html5/index.html',
  './mathris-html5/game.js',
  './mathsnake-html5/index.html',
  './mathsnake-html5/game.js',
  './mathtd-html5/index.html',
  './mathtd-html5/game.js',
  './mathwhackamole-html5/index.html',
  './mathwhackamole-html5/game.js',
  './missilecommand-html5/index.html',
  './missilecommand-html5/game.js',
  './numberfall-html5/index.html',
  './numberfall-html5/game.js',
  './paratroopers-html5/index.html',
  './paratroopers-html5/game.js',
  './recallcrates-html5/index.html',
  './recallcrates-html5/game.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    })
  );
});

// Service worker : l'app s'ouvre même sans réseau.
// À chaque mise à jour publiée, augmente le numéro de VERSION pour forcer le rafraîchissement.
const VERSION = 'v1.0.0';
const CACHE = `platepace-${VERSION}`;
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/app.js',
  './js/ui.js',
  './js/views/today.js',
  './js/views/add.js',
  './js/views/train.js',
  './js/views/settings.js',
  './js/lib/ai.js',
  './js/lib/dates.js',
  './js/lib/foods.js',
  './js/lib/nutrition.js',
  './js/lib/program.js',
  './js/lib/scanner.js',
  './js/lib/sound.js',
  './js/lib/store.js',
  './vendor/preact-htm.js',
  './icons/icon-192.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.svg',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))) // efface aussi le cache de l'ancienne app
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Fichiers de l'app : réseau d'abord (mises à jour immédiates), cache si hors ligne.
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Polices Google : cache d'abord.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }))
    );
  }
  // Le reste (API Claude, Open Food Facts) passe directement par le réseau.
});

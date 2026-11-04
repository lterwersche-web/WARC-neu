/* =========================================================
   Service Worker = kleiner Helfer im Hintergrund.
   Er speichert alle Dateien der App, damit sie auch OHNE
   Internet startet (z. B. im Flugmodus).

   Strategie "stale-while-revalidate":
   1. Sofort die gespeicherte Version liefern (schnell!)
   2. Im Hintergrund die neue Version holen und für's nächste Mal speichern

   Tipp: Wenn du Dateien änderst, erhöhe die Versionsnummer unten,
   damit alle Geräte sicher die neue Version bekommen.
   ========================================================= */
const CACHE = 'winter-arc-v1';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/app.js',
  './js/store.js',
  './js/stats.js',
  './js/dates.js',
  './js/icons.js',
  './js/quotes.js',
  './js/suggestions.js',
  './js/utils.js',
  './js/ui/overlay.js',
  './js/ui/snow.js',
  './js/views/components.js',
  './js/views/today.js',
  './js/views/progress.js',
  './js/views/habits.js',
  './js/views/settings.js',
  './js/views/onboarding.js',
  './js/views/habitSheet.js',
  './icons/icon.svg',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  // Alte Caches aufräumen
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});

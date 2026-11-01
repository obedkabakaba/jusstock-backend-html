// ============================================================
// Service worker JusStock — rend l'application installable et rapide.
// ------------------------------------------------------------
// - Interface (index.html) : réseau d'abord, copie locale si hors ligne,
//   pour toujours avoir la dernière version quand le réseau est là.
// - Icônes, polices et bibliothèques : copie locale d'abord (rapide).
// - Appels à l'API (Render) : JAMAIS mis en cache — les données de stock,
//   ventes et comptabilité doivent toujours venir du serveur.
// Changer VERSION à chaque modification de ce fichier.
// ============================================================
const VERSION = 'jusstock-v2';
const FICHIERS_DE_BASE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
];
const HOTES_STATIQUES = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(FICHIERS_DE_BASE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== VERSION).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

// La page demande d'activer immédiatement une nouvelle version.
self.addEventListener('message', (event) => {
  if (event.data === 'ACTIVER_MAINTENANT') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const requete = event.request;
  if (requete.method !== 'GET') return;
  const url = new URL(requete.url);

  const memeOrigine = url.origin === self.location.origin;
  const statiqueExterne = HOTES_STATIQUES.includes(url.hostname);
  if (!memeOrigine && !statiqueExterne) return; // API et autres : jamais interceptés

  // Navigation / page : réseau d'abord.
  if (requete.mode === 'navigate' || (memeOrigine && url.pathname.endsWith('.html'))) {
    event.respondWith(
      fetch(requete)
        .then((reponse) => {
          const copie = reponse.clone();
          caches.open(VERSION).then((cache) => cache.put('./index.html', copie));
          return reponse;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Ressources statiques : cache d'abord, puis réseau (et mise en cache).
  event.respondWith(
    caches.match(requete).then((enCache) => enCache || fetch(requete).then((reponse) => {
      if (reponse && (reponse.ok || reponse.type === 'opaque')) {
        const copie = reponse.clone();
        caches.open(VERSION).then((cache) => cache.put(requete, copie));
      }
      return reponse;
    }))
  );
});

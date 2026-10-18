// Lost in the Souks: keeps the site usable with no signal.
// Site files and the Firebase library are cached on first visit.
// Exchange rate and weather use the network first, falling back to the last copy.
// The kitty's own data is handled by Firebase's offline cache, not here.
const V = 'souks-v9';
const CORE = [
  './',
  'index.html',
  'apple-touch-icon.png',
  'laaziri-sign.jpg',
  'fonts/karla-latin-400-normal.woff2',
  'fonts/karla-latin-400-italic.woff2',
  'fonts/karla-latin-500-normal.woff2',
  'fonts/karla-latin-700-normal.woff2',
  'fonts/karla-latin-800-normal.woff2',
  'fonts/young-serif-latin-400-normal.woff2',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const keep = (req, res) => { if (res && res.ok) caches.open(V).then(c => c.put(req, res.clone())); return res; };

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Live data: network first, last copy if offline
  if (url.hostname === 'open.er-api.com' || url.hostname === 'api.open-meteo.com') {
    e.respondWith(fetch(req).then(r => keep(req, r)).catch(() => caches.match(req)));
    return;
  }

  // Site files and Firebase library: serve cached copy, refresh in the background
  if (url.origin === location.origin || url.href.startsWith('https://www.gstatic.com/firebasejs/')) {
    e.respondWith(caches.match(req, { ignoreSearch: url.origin === location.origin }).then(hit => {
      const net = fetch(req).then(r => keep(req, r)).catch(() => hit);
      return hit || net;
    }));
  }
  // Everything else (Firestore sync) goes straight to the network
});

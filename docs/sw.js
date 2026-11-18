// Cambiare CACHE a ogni pubblicazione: è ciò che fa comparire «Nuova versione» sul telefono.
const CACHE = 'palestra-1';
const FILE = ['./', 'index.html', 'stile.css', 'app.js', 'dati.js', 'util.js', 'progressione.js', 'esporta.js',
  'grafico.js', 'manifest.json', 'icona.svg', 'icona-192.png', 'icona-512.png'];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILE))));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(nomi => Promise.all(nomi.filter(n => n !== CACHE).map(n => caches.delete(n)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));
self.addEventListener('message', e => { if (e.data === 'aggiorna') self.skipWaiting(); });

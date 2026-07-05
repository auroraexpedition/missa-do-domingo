/* Missa do Domingo — service worker
   Estratégia:
   - App shell (html/js/ícones/manifest + CDN + fonte): cache-first.
   - Liturgia (API): stale-while-revalidate — mostra a última baixada
     offline e atualiza em segundo plano quando há rede. */
const CACHE = "missa-domingo-v6";
const SHELL = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.7/babel.min.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Liturgia (API) + fontes Google: stale-while-revalidate
  const swr = url.hostname.includes("fonts.googleapis.com") ||
              url.hostname.includes("fonts.gstatic.com");
  if (swr) {
    e.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(req).then((cached) => {
          const net = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => cached);
          return cached || net;
        })
      )
    );
    return;
  }

  // App shell / demais GET: cache-first, com fallback à rede
  e.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res.ok && url.origin === location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match("./index.html")))
  );
});

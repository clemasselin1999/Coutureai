// Service worker : coque de l'app en cache (dÃ©marrage rapide, hors-ligne pour l'interface).
const CACHE = "coutureia-v18";
const SHELL = ["/", "/static/style.css", "/static/app.js", "/static/merceries.js", "/static/grading.js", "/static/cloudsync.js", "/static/manifest.webmanifest", "/static/icons/icon-192.png", "/static/icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(SHELL.map((u) => fetch(u, { cache: "no-store" }).then((r) => c.put(u, r))))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api")) return;
  // RÃ©seau d'abord sans cache disque navigateur, repli sur le cache hors-ligne
  e.respondWith(
    fetch(req, { cache: "no-store" })
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req))
  );
});

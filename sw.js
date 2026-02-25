const CACHE = "highlight-contact-v12"; // bump this anytime you want to force refresh

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./employees.csv",
  "./manifest.webmanifest",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/header.png",
  "./assets/hero.png",
  "./assets/right-panel.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k))))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Always update CSS/JS so phones don't get stuck on old builds
  const isCSS = url.pathname.endsWith("/styles.css");
  const isJS  = url.pathname.endsWith("/app.js");

  if (isCSS || isJS) {
    e.respondWith(
      fetch(e.request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return resp;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Everything else: cache-first
  e.respondWith(
    caches.match(e.request, { ignoreSearch: false }).then((c) => c || fetch(e.request))
  );
});

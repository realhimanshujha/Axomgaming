const CACHE_NAME = "axom-gaming-pwa-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./membership.html",
  "./stock.html",
  "./style.css",
  "./membership.css",
  "./stock.css",
  "./script.js",
  "./membership.js",
  "./stock.js",
  "./axom-logo.jpeg",
  "./icon-192.png",
  "./icon-512.png",
  "./manifest.webmanifest"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  // Never intercept Apps Script/API calls, cross-origin requests, or non-GET requests.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // HTML navigation: try the network first so deployments/updates are picked up.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      }).catch(async () => {
        return (await caches.match(request)) || (await caches.match("./index.html"));
      })
    );
    return;
  }

  // Static same-origin assets: serve cached copy and refresh it in the background.
  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

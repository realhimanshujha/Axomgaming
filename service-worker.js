const CACHE_NAME = "axom-gaming-pwa-v2";

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

/* =====================================
   INSTALL
===================================== */

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

/* =====================================
   ACTIVATE
===================================== */

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* =====================================
   OFFLINE CACHING
===================================== */

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin
  ) return;

  // Always fetch JavaScript and HTML from the network first.
  if (
    request.mode === "navigate" ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".html")
  ) {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, copy);
          });
        }

        return response;
      }).catch(async () => {
        return await caches.match(request) ||
               await caches.match("./index.html");
      })
    );

    return;
  }

  // Other static assets
  event.respondWith(
    caches.match(request).then(cached => {
      return cached || fetch(request);
    })
  );
});

/* =====================================
   FIREBASE CLOUD MESSAGING
===================================== */

importScripts(
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyDTNRP1WNdq1Xl87ATWcxdvQtz0oATsCqM",
  authDomain: "axom-gaming-26a40.firebaseapp.com",
  projectId: "axom-gaming-26a40",
  storageBucket: "axom-gaming-26a40.firebasestorage.app",
  messagingSenderId: "866787050834",
  appId: "1:866787050834:web:9ee0e6f620af249fc0a68b"
});

const messaging = firebase.messaging();

/* =====================================
   BACKGROUND NOTIFICATIONS
===================================== */

messaging.onBackgroundMessage(payload => {
  const title =
    payload.notification?.title || "AXOM GAMING";

  const options = {
    body:
      payload.notification?.body ||
      "A gaming session is ending soon.",

    icon: "./icon-192.png",
    badge: "./icon-192.png",

    tag: payload.data?.sessionId
      ? "axom-session-ending-" + payload.data.sessionId
      : "axom-session-ending",

    renotify: false,

    data: {
      url: "./"
    }
  };

  return self.registration.showNotification(
    title,
    options
  );
});

/* =====================================
   NOTIFICATION CLICK
===================================== */

self.addEventListener("notificationclick", event => {
  event.notification.close();

  const target = new URL(
    "./",
    self.location.origin
  ).href;

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then(windowClients => {

      for (const client of windowClients) {
        if ("focus" in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(target);
      }
    })
  );
});

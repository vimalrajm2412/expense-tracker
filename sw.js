const CACHE_NAME = "pocketledger-v2";

const APP_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./public/icons/apple-touch-icon.png",
  "./public/icons/icon-192.png",
  "./public/icons/icon-512.png",
  "./public/icons/favicon.svg",
  "./styles/style.css",
  "./styles/auth.css",
  "./styles/dashboard.css",
  "./styles/calendar.css",
  "./styles/charts.css",
  "./styles/responsive.css",
  "./scripts/main.js",
  "./scripts/app.js",
  "./scripts/auth.js",
  "./scripts/db.js",
  "./scripts/ui.js",
  "./scripts/dashboard.js",
  "./scripts/calendar.js",
  "./scripts/charts.js",
  "./scripts/analytics.js",
  "./scripts/notifications.js",
  "./scripts/settings.js",
  "./scripts/helpers.js",
  "./scripts/storage.js",
  "./scripts/validation.js"
];

const OPTIONAL_REMOTE_ASSETS = [];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(APP_ASSETS);
      await Promise.allSettled(
        OPTIONAL_REMOTE_ASSETS.map((asset) => cache.add(asset))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
          return Response.error();
        });
    })
  );
});

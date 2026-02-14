const cachePrefix = "chip8-";
const staticCacheName = cachePrefix + "static-cache";
const romsCacheName = cachePrefix + "roms-cache";
const devMode =
  self.location.hostname === "localhost" ||
  self.location.hostname === "127.0.0.1";

self.addEventListener("install", function (event) {
  console.log("SVCW Installing");
  self.skipWaiting();
  event.waitUntil(
    caches.open(staticCacheName).then(function (cache) {
      return cache.addAll(["/", "/index.html"]);
    }),
  );
});

self.addEventListener("activate", function (event) {
  console.log("SVCW Activating");
  event.waitUntil(
    caches
      .keys()
      .then(function (cacheNames) {
        if (devMode) {
          return Promise.all(
            cacheNames.map(function (cacheName) {
              console.log("Clearing cache: " + cacheName);
              return caches.delete(cacheName);
            }),
          );
        }
        return Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName.startsWith(cachePrefix) &&
                cacheName !== staticCacheName &&
                cacheName !== romsCacheName,
            )
            .map(function (cacheName) {
              return caches.delete(cacheName);
            }),
        );
      })
      .then(function () {
        return self.clients.claim();
      }),
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches
      .match(event.request)
      .then(function (cacheResponse) {
        return (
          cacheResponse ||
          fetch(event.request).then(async function (fetchResponse) {
            if (!fetchResponse.ok) {
              return fetchResponse;
            }
            const cache = await caches.open(
              event.request.url.endsWith(".ch8")
                ? romsCacheName
                : staticCacheName,
            );
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          })
        );
      })
      .catch(function () {
        if (event.request.headers.get("accept")?.includes("text/html")) {
          return new Response(
            '<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>Offline</title></head>' +
              "<body><h1>You are offline</h1><p>Please check your internet connection and try again.</p></body></html>",
            {
              status: 503,
              statusText: "Service Unavailable",
              headers: { "Content-Type": "text/html" },
            },
          );
        }
        return new Response(null, {
          status: 503,
          statusText: "Service Unavailable",
        });
      }),
  );
});

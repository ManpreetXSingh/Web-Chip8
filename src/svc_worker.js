const cachePrefix = "chip8-";
const staticCacheName = cachePrefix + "static-cache";
const romsCacheName = cachePrefix + "roms-cache";
const devMode = true;

self.addEventListener("install", function (event) {
  console.log("SVCW Installed");
  event.waitUntil(
    caches.open(staticCacheName).then(function (cache) {
      return cache.addAll(["/", "/index.html"]);
    }),
  );
});

self.addEventListener("activate", function (event) {
  console.log("SVCW Activated");
  if (devMode) {
    event.waitUntil(
      caches.keys().then(function (cacheNames) {
        return Promise.all(
          cacheNames.map(function (cacheName) {
            console.log("Clearing cache: " + cacheName);
            return caches.delete(cacheName);
          }),
        );
      }),
    );
  }
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
          if (
            cacheName.startsWith(cachePrefix) &&
            cacheName !== staticCacheName &&
            cacheName !== romsCacheName
          ) {
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
});

self.addEventListener("fetch", function (event) {
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
        if (event.request.headers.get("accept").includes("text/html")) {
          return new Response(
            `<!DOCTYPE html><h1>Not Found</h1><p>The requested URL was not found on this server.</p>`,
            {
              status: 404,
              statusText: "Not Found",
              headers: { "Content-Type": "text/html" },
            },
          );
        }
        return new Response(null, {
          status: 404,
          statusText: "Not Found",
        });
      }),
  );
});

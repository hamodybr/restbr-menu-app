const CACHE_NAME = "restbr-menu-core-v5";

const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/style.css?v=4.0",
  "./css/cart.css?v=3.6",
  "./js/app.js?v=17.4",
  "./js/cart-preload.js?v=1.0",
  "./js/cart.js?v=4.1",
  "./js/supabase-config.js?v=2.4"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // RESTBR tenant APIs must always stay live and tenant-specific.
  if (url.pathname.startsWith("/_restbr/")) return;

  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          return (
            await caches.match(request) ||
            await caches.match("./index.html") ||
            await caches.match("./")
          );
        })
    );
    return;
  }

  const isStatic =
    /\.(?:css|js|png|jpg|jpeg|webp|gif|svg|ico|webmanifest|json|mp4)$/i
      .test(url.pathname);

  if (!isStatic) return;

  event.respondWith(
    caches.match(request)
      .then(cached => {
        const network = fetch(request)
          .then(response => {
            if (response && response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);

        return cached || network;
      })
  );
});

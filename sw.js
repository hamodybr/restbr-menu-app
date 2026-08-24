const CACHE_NAME = "shorash-menu-restored-v16";

const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/style.css?v=4.0",
  "./css/cart.css?v=3.6",
  "./css/desktop-phone-parity.css?v=1.0",
  "./css/english-card-ltr.css?v=1.0",
  "./js/app.js?v=17.3",
  "./js/cart.js?v=4.1",
  "./js/cart-fab-effects.js?v=1.0",
  "./js/supabase-config.js?v=1.2",
  "./js/language-settings.js?v=1.1",
  "./js/live-prices.js?v=1.0",
  "./js/english-news-ticker.js?v=1.0",
  "./js/card-life-effects.js?v=1.0",
  "./js/admin-product-category-filter.js?v=2.0",
  "./js/admin-takeaway-prices.js?v=1.1",
  "./js/admin-dining-gate-settings.js?v=1.0",
  "./js/dining-mode.js?v=1.2",
  "./assets/favicon.png",
  "./assets/apple-touch-icon.png",
  "./assets/shorash-logo.jpeg"
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

  // Never cache Supabase/API or unrelated third-party requests.
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

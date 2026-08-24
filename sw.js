const CACHE_NAME = "shorash-menu-restored-v44";

const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/style.css?v=4.0",
  "./css/cart.css?v=3.6",
  "./css/desktop-phone-parity.css?v=1.0",
  "./css/english-card-ltr.css?v=1.0",
  "./css/mobile-card-image-fix.css?v=1.1",
  "./js/offline-status.js?v=1.1",
  "./js/unavailable-card-state.js?v=1.1",
  "./js/app.js?v=17.3",
  "./js/product-image-fallback.js?v=1.1",
  "./js/price-safety.js?v=1.0",
  "./js/cart.js?v=4.1",
  "./js/cart-stale-item-guard.js?v=1.1",
  "./js/cart-fab-effects.js?v=1.2",
  "./js/supabase-config.js?v=1.3",
  "./js/language-settings.js?v=1.1",
  "./js/live-prices.js?v=1.0",
  "./js/discount-choice-price-sync.js?v=1.0",
  "./js/restaurant-hours.js?v=1.3",
  "./js/english-news-ticker.js?v=1.0",
  "./js/card-life-effects.js?v=1.0",
  "./js/admin-theme-toolbar.js?v=1.1",
  "./js/admin-light-theme-complete.js?v=1.0",
  "./js/admin-product-category-filter.js?v=2.0",
  "./js/admin-takeaway-prices.js?v=1.1",
  "./js/admin-option-order.js?v=1.4",
  "./js/admin-restaurant-hours.js?v=1.1",
  "./js/admin-dining-gate-settings.js?v=1.0",
  "./js/admin-discounts.js?v=1.0",
  "./js/dining-mode.js?v=1.3",
  "./js/dining-gate-language.js?v=1.0",
  "./data/menu.json?v=32",
  "./assets/favicon.png",
  "./assets/apple-touch-icon.png",
  "./assets/shorash-logo.jpeg"
];

async function cacheOne(cache, path) {
  try {
    const response = await fetch(path, { cache: "reload" });
    if (response && response.ok) {
      await cache.put(path, response.clone());
      return true;
    }
  } catch (_) {}
  return false;
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    await cacheOne(cache, "./index.html");
    await cacheOne(cache, "./");

    await Promise.allSettled(
      CORE
        .filter(path => path !== "./" && path !== "./index.html")
        .map(path => cacheOne(cache, path))
    );

    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  const isAdminPage = /\/admin\.html$/i.test(url.pathname);
  const isAdminAsset =
    /\/js\/admin-[^/]+\.js$/i.test(url.pathname) ||
    /\/js\/supabase-config\.js$/i.test(url.pathname);

  // Admin must always prefer the newest online code. This prevents stale
  // dashboard plugins from being served after a deployment.
  if (isAdminPage || isAdminAsset) {
    event.respondWith((async () => {
      try {
        return await fetch(request, { cache: "no-store" });
      } catch (_) {
        return (
          await caches.match(request, { ignoreSearch: true }) ||
          (isAdminPage
            ? await caches.match("./index.html", { ignoreSearch: true })
            : Response.error())
        );
      }
    })());
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      } catch (_) {
        return (
          await caches.match(request, { ignoreSearch: true }) ||
          await caches.match("./index.html", { ignoreSearch: true }) ||
          await caches.match("./", { ignoreSearch: true }) ||
          Response.error()
        );
      }
    })());
    return;
  }

  const isStatic =
    /\.(?:css|js|png|jpg|jpeg|webp|gif|svg|ico|webmanifest|json|mp4)$/i
      .test(url.pathname);

  if (!isStatic) return;

  const networkUpdate = fetch(request)
    .then(async response => {
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => null);

  event.waitUntil(networkUpdate.then(() => {}).catch(() => {}));

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    return (await networkUpdate) || Response.error();
  })());
});
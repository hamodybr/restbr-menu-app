const CACHE_NAME = "restbr-restaurant-template-v3";

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
  "./js/app.js?v=17.7",
  "./js/product-image-fallback.js?v=1.1",
  "./js/price-safety.js?v=1.0",
  "./js/cart.js?v=4.3",
  "./js/cart-stale-item-guard.js?v=1.1",
  "./js/cart-fab-effects.js?v=1.5",
  "./js/runtime-config.js?v=1.2",
  "./js/supabase-config.js?v=2.2",
  "./js/language-settings.js?v=1.1",
  "./js/live-prices.js?v=1.0",
  "./js/discount-choice-price-sync.js?v=1.0",
  "./js/restaurant-hours.js?v=1.3",
  "./js/whatsapp-order-bullets.js?v=1.0",
  "./js/english-news-ticker.js?v=1.0",
  "./js/seamless-background-video.js?v=1.0",
  "./js/card-life-effects.js?v=1.0",
  "./js/dining-mode.js?v=1.3",
  "./js/dining-gate-language.js?v=1.0",
  "./data/menu.json?v=32",
  "./assets/restaurant-placeholder.svg"
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

async function networkFirst(request, { noStore = false } = {}) {
  try {
    const response = await fetch(
      request,
      noStore ? { cache: "no-store" } : { cache: "no-cache" }
    );

    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone()).catch(() => {});
    }

    return response;
  } catch (_) {
    return (
      await caches.match(request) ||
      await caches.match(request, { ignoreSearch: true }) ||
      Response.error()
    );
  }
}

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  const isAdminPage = /\/admin(?:\.html)?\/?$/i.test(url.pathname);
  const isAdminAsset =
    /\/js\/admin-[^/]+\.js$/i.test(url.pathname) ||
    /\/js\/(?:runtime|supabase)-config\.js$/i.test(url.pathname);

  // Admin code and auth configuration must never be intentionally served stale.
  if (isAdminPage || isAdminAsset) {
    event.respondWith(networkFirst(request, { noStore: true }));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { cache: "no-cache" });
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

  const isCode = /\.(?:css|js|webmanifest|json)$/i.test(url.pathname);
  if (isCode) {
    // Code/config is network-first. This prevents mixed deployments where the
    // HTML is new but a cache-first JavaScript file is still one version old.
    event.respondWith(networkFirst(request));
    return;
  }

  const isMedia = /\.(?:png|jpg|jpeg|webp|gif|svg|ico|mp4)$/i.test(url.pathname);
  if (!isMedia) return;

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

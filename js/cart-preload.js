// ==========================================
// RESTBR CART PRELOAD V1.2
// Reconciles persisted cart rows with the live tenant menu before cart.js
// reads localStorage. Also namespaces carts per restaurant so items can never
// leak between RESTBR tenants on the same browser.
// ==========================================

(() => {
  'use strict';

  const LEGACY_CART_KEY = 'restbrCartV1';
  const tenantIdentity = String(
    window.RESTBR_TENANT?.id ||
    window.RESTBR_BOOTSTRAP?.restaurant?.id ||
    window.RESTBR_TENANT?.slug ||
    window.RESTBR_BOOTSTRAP?.restaurant?.slug ||
    location.hostname ||
    'unknown'
  ).trim().toLowerCase();
  const CART_KEY = `restbrCartV2:${tenantIdentity}`;
  const CART_SCRIPT = 'js/cart.js?v=4.2';
  let started = false;

  window.RESTBR_CART_STORAGE_KEY = CART_KEY;

  function cleanText(value) {
    return String(value ?? '').trim();
  }

  function optionSignature(option = {}) {
    return ['ar', 'ku', 'en']
      .map(key => cleanText(option?.[key]).toLowerCase())
      .filter(Boolean)
      .join('|');
  }

  function findCurrentOptionIndex(product, item) {
    const options = Array.isArray(product?.options) ? product.options : [];
    if (!options.length) return -1;

    const savedOptionId = cleanText(item?.optionId);
    if (savedOptionId) {
      return options.findIndex(option => cleanText(option?.id) === savedOptionId);
    }

    const savedSignature = optionSignature(item?.option || {});
    if (savedSignature) {
      const exact = options.findIndex(option => optionSignature(option) === savedSignature);
      if (exact >= 0) return exact;
      return options.length === 1 ? 0 : -1;
    }

    const savedIndex = Number(item?.optionIndex);
    if (Number.isInteger(savedIndex) && savedIndex >= 0 && options[savedIndex]) {
      return savedIndex;
    }

    return options.length === 1 ? 0 : -1;
  }

  function readCandidateCart() {
    try {
      const current = localStorage.getItem(CART_KEY);
      if (current !== null) return JSON.parse(current || '[]');

      // One-time compatibility path. Legacy rows are only copied after they
      // successfully reconcile against THIS tenant's live product UUIDs.
      return JSON.parse(localStorage.getItem(LEGACY_CART_KEY) || '[]');
    } catch (_) {
      return [];
    }
  }

  function reconcileCart(db) {
    if (!db || !Array.isArray(db.products)) return;

    const saved = readCandidateCart();
    if (!Array.isArray(saved)) return;

    const products = new Map(
      db.products.map(product => [String(product?.id || ''), product])
    );

    const merged = new Map();

    for (const item of saved) {
      const productId = String(item?.productId || '').trim();
      const product = products.get(productId);

      if (!product || product?.badges?.unavailable === true) continue;

      const optionIndex = findCurrentOptionIndex(product, item);
      const option = product.options?.[optionIndex];
      if (!option) continue;

      const price = Number(option.price);
      if (!Number.isFinite(price) || price < 0) continue;

      const qtyRaw = Number(item?.qty);
      const qty = Number.isFinite(qtyRaw) ? Math.max(1, Math.floor(qtyRaw)) : 1;
      const optionId = cleanText(option?.id);
      const stablePart = optionId || String(optionIndex);
      const key = `${productId}:${stablePart}`;

      const next = {
        key,
        productId,
        optionId: optionId || undefined,
        optionIndex,
        name: {
          ar: cleanText(product?.name?.ar),
          ku: cleanText(product?.name?.ku),
          en: cleanText(product?.name?.en)
        },
        option: {
          ar: cleanText(option?.ar),
          ku: cleanText(option?.ku),
          en: cleanText(option?.en)
        },
        price,
        image: cleanText(product?.image),
        qty
      };

      const existing = merged.get(key);
      if (existing) existing.qty += qty;
      else merged.set(key, next);
    }

    try {
      localStorage.setItem(CART_KEY, JSON.stringify([...merged.values()]));
    } catch (_) {}
  }

  function loadCartScript() {
    if (started) return;
    started = true;

    reconcileCart(window.SHORASH_DB);

    const script = document.createElement('script');
    script.src = CART_SCRIPT;
    script.async = false;
    script.onerror = () => console.error('RESTBR cart runtime failed to load.');
    document.body.appendChild(script);
  }

  if (window.SHORASH_DB) {
    loadCartScript();
  } else {
    window.addEventListener('shorash:ready', loadCartScript, { once: true });
  }
})();

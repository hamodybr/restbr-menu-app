// ==========================================
// RESTBR CART PRELOAD V1.1
// Reconciles persisted cart rows with the live tenant menu before cart.js
// reads localStorage. This prevents stale prices/options from being ordered.
//
// V1.1 prefers identity over guessing: if a saved named option no longer
// matches a current option, the cart row is removed instead of falling back
// to the old numeric index (which could select the wrong option after reorder).
// ==========================================

(() => {
  'use strict';

  const CART_KEY = 'restbrCartV1';
  const CART_SCRIPT = 'js/cart.js?v=4.1';
  let started = false;

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

    // Future-proof path: if a newer cart row carries a stable option id,
    // always prefer it over labels or array positions.
    const savedOptionId = cleanText(item?.optionId);
    if (savedOptionId) {
      const byId = options.findIndex(option => cleanText(option?.id) === savedOptionId);
      return byId;
    }

    const savedSignature = optionSignature(item?.option || {});
    if (savedSignature) {
      const exact = options.findIndex(option => optionSignature(option) === savedSignature);
      if (exact >= 0) return exact;

      // A named option existed in the saved cart but no longer exists now.
      // Do not guess by index after a rename/reorder.
      return options.length === 1 ? 0 : -1;
    }

    // Legacy direct-price cart rows use an empty option name. They may safely
    // use index only when it still resolves, with a single-option fallback.
    const savedIndex = Number(item?.optionIndex);
    if (Number.isInteger(savedIndex) && savedIndex >= 0 && options[savedIndex]) {
      return savedIndex;
    }

    return options.length === 1 ? 0 : -1;
  }

  function reconcileCart(db) {
    if (!db || !Array.isArray(db.products)) return;

    let saved;
    try {
      saved = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    } catch (_) {
      saved = [];
    }

    if (!Array.isArray(saved) || !saved.length) return;

    const products = new Map(
      db.products.map(product => [String(product?.id || ''), product])
    );

    const merged = new Map();
    let changed = false;

    for (const item of saved) {
      const productId = String(item?.productId || '').trim();
      const product = products.get(productId);

      // Hidden/deleted products are absent from DB.products. Unavailable
      // products stay in DB.products but must not survive into checkout.
      if (!product || product?.badges?.unavailable === true) {
        changed = true;
        continue;
      }

      const optionIndex = findCurrentOptionIndex(product, item);
      const option = product.options?.[optionIndex];
      if (!option) {
        changed = true;
        continue;
      }

      const price = Number(option.price);
      if (!Number.isFinite(price) || price < 0) {
        changed = true;
        continue;
      }

      const qtyRaw = Number(item?.qty);
      const qty = Number.isFinite(qtyRaw) ? Math.max(1, Math.floor(qtyRaw)) : 1;
      const key = `${productId}:${optionIndex}`;

      const next = {
        key,
        productId,
        optionId: cleanText(option?.id) || undefined,
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
      if (existing) {
        existing.qty += qty;
        changed = true;
      } else {
        merged.set(key, next);
      }

      if (
        item?.key !== next.key ||
        cleanText(item?.optionId) !== cleanText(next.optionId) ||
        Number(item?.price) !== next.price ||
        Number(item?.optionIndex) !== next.optionIndex ||
        cleanText(item?.image) !== next.image ||
        optionSignature(item?.option || {}) !== optionSignature(next.option) ||
        optionSignature(item?.name || {}) !== optionSignature(next.name) ||
        Number(item?.qty) !== next.qty
      ) {
        changed = true;
      }
    }

    const nextCart = [...merged.values()];

    if (changed || nextCart.length !== saved.length) {
      try {
        localStorage.setItem(CART_KEY, JSON.stringify(nextCart));
      } catch (_) {}
    }
  }

  function loadCartScript() {
    if (started) return;
    started = true;

    reconcileCart(window.SHORASH_DB);

    const script = document.createElement('script');
    script.src = CART_SCRIPT;
    script.async = false;
    document.body.appendChild(script);
  }

  if (window.SHORASH_DB) {
    loadCartScript();
  } else {
    window.addEventListener('shorash:ready', loadCartScript, { once: true });
  }
})();

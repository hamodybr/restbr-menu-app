(() => {
  if (/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__RESTBR_PRODUCT_COLOR_CART_META_V1__) return;
  window.__RESTBR_PRODUCT_COLOR_CART_META_V1__ = true;

  const CART_KEY = 'RESTBR_CART_V1';
  const META_KEY = 'RESTBR_CART_COLOR_META_V1';
  const nativeSetItem = Storage.prototype.setItem;
  const nativeGetItem = Storage.prototype.getItem;

  function readMeta() {
    try {
      const raw = nativeGetItem.call(localStorage, META_KEY) || '{}';
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function writeMeta(meta) {
    try {
      nativeSetItem.call(localStorage, META_KEY, JSON.stringify(meta || {}));
    } catch (_) {}
  }

  function localizedSnapshot(color) {
    if (!color) return null;
    return {
      id: String(color.id || ''),
      ar: String(color.ar || color.ku || color.en || '').trim(),
      ku: String(color.ku || color.ar || color.en || '').trim(),
      en: String(color.en || color.ar || color.ku || '').trim(),
      hex: String(color.hex || ''),
      image: String(color.image || '')
    };
  }

  function selectedColor(productId) {
    try {
      return window.RESTBR_PRODUCT_COLORS?.selected?.(String(productId)) || null;
    } catch (_) {
      return null;
    }
  }

  // Keep structured color data inside the persisted cart without changing the
  // legacy cart closure. Existing cart rendering/WhatsApp behavior still uses
  // the localized option label, while newer order/invoice code can read these
  // fields directly.
  Storage.prototype.setItem = function restbrColorAwareSetItem(key, value) {
    if (this !== localStorage || String(key) !== CART_KEY || typeof value !== 'string') {
      return nativeSetItem.call(this, key, value);
    }

    try {
      const rows = JSON.parse(value);
      if (!Array.isArray(rows)) return nativeSetItem.call(this, key, value);

      const meta = readMeta();
      const kept = {};
      for (const row of rows) {
        const cartKey = String(row?.key || '');
        const color = meta[cartKey];
        if (!cartKey || !color) continue;
        kept[cartKey] = color;
        row.colorId = color.id || '';
        row.colorName = color.ar || color.ku || color.en || '';
        row.colorHex = color.hex || '';
        row.colorImage = color.image || '';
        row.selectedColor = color;
      }
      writeMeta(kept);
      value = JSON.stringify(rows);
    } catch (_) {}

    return nativeSetItem.call(this, key, value);
  };

  // product-colors.js runs first on the same capture target and temporarily
  // rewrites the clicked option index to the color-specific synthetic index.
  // We record that exact cart key before cart.js performs its normal add.
  document.addEventListener('click', event => {
    const add = event.target.closest?.('.sm-add-cart,.sm-direct-add');
    const choice = event.target.closest?.('[data-choice-product]');
    const trigger = add || choice;
    if (!trigger) return;

    const productId = String(add?.dataset.productId || choice?.dataset.choiceProduct || '');
    const color = localizedSnapshot(selectedColor(productId));
    if (!productId || !color?.id) return;

    const optionIndex = Number(add?.dataset.optionIndex ?? choice?.dataset.choiceIndex ?? 0);
    if (!Number.isFinite(optionIndex)) return;

    const key = `${productId}:${optionIndex}`;
    const meta = readMeta();
    meta[key] = color;
    writeMeta(meta);
  }, true);

  window.RESTBR_CART_COLOR_META = Object.freeze({
    get(cartKey) {
      return readMeta()[String(cartKey)] || null;
    },
    all() {
      return { ...readMeta() };
    },
    enrich(items) {
      const meta = readMeta();
      return (Array.isArray(items) ? items : []).map(item => {
        const color = meta[String(item?.key || '')] || null;
        return color ? { ...item, selectedColor: { ...color } } : { ...item };
      });
    }
  });
})();

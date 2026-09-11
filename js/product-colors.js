(() => {
  if (/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__RESTBR_PRODUCT_COLORS_V1__) return;
  window.__RESTBR_PRODUCT_COLORS_V1__ = true;

  const SELECTION_KEY = 'RESTBR_PRODUCT_COLOR_SELECTION_V1';
  const states = new Map();
  let menuObserver = null;
  let loadingPromise = null;

  const lang = () => {
    try {
      return typeof window.RESTBR_LANG === 'function'
        ? window.RESTBR_LANG()
        : (localStorage.getItem('RESTBR_LANG_V1') || 'ar');
    } catch (_) {
      return 'ar';
    }
  };

  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const safeMedia = value => {
    try {
      const fn = window.RESTBR_SAFE_MEDIA_URL;
      if (typeof fn === 'function') return fn(value) || '';
    } catch (_) {}
    return String(value || '');
  };

  function localName(color, locale = lang()) {
    if (!color) return '';
    if (locale === 'en') return String(color.en || color.ar || color.ku || '').trim();
    if (locale === 'ku') return String(color.ku || color.ar || color.en || '').trim();
    return String(color.ar || color.ku || color.en || '').trim();
  }

  function loadSelections() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(SELECTION_KEY) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function saveSelection(productId, colorId) {
    try {
      const all = loadSelections();
      all[String(productId)] = String(colorId || '');
      sessionStorage.setItem(SELECTION_KEY, JSON.stringify(all));
    } catch (_) {}
  }

  function installStyles() {
    if (document.getElementById('restbrProductColorsStyles')) return;
    const style = document.createElement('style');
    style.id = 'restbrProductColorsStyles';
    style.textContent = `
      .restbr-color-strip{display:flex;align-items:center;gap:7px;min-width:0;margin:8px 0 3px;padding:2px 0;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;-webkit-overflow-scrolling:touch;overscroll-behavior-inline:contain}
      .restbr-color-strip::-webkit-scrollbar{display:none}
      .restbr-color-dot{position:relative;width:27px;height:27px;min-width:27px;border:1px solid rgba(255,255,255,.28);border-radius:50%;padding:0;background:var(--restbr-color,#d7d1cb);box-shadow:0 2px 9px rgba(0,0,0,.18);outline:0;-webkit-tap-highlight-color:transparent}
      .restbr-color-dot::after{content:"";position:absolute;inset:-4px;border:2px solid transparent;border-radius:50%;pointer-events:none;transition:border-color .16s ease,transform .16s ease}
      .restbr-color-dot.selected::after{border-color:currentColor;transform:scale(.94)}
      .restbr-color-dot.has-image{background-image:var(--restbr-color-image);background-size:cover;background-position:center}
      .restbr-color-dot[disabled]{opacity:.34;filter:grayscale(.45);cursor:not-allowed}
      .restbr-color-name{min-width:0;margin-inline-start:2px;color:inherit;opacity:.76;font-size:9.5px;font-weight:750;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .restbr-choice-colors{display:block;padding:9px 12px 7px;border-bottom:1px solid rgba(255,255,255,.07)}
      .restbr-choice-colors-title{margin-bottom:7px;color:inherit;opacity:.72;font-size:10px;font-weight:800}
      .restbr-choice-colors-row{display:flex;align-items:center;gap:9px;overflow-x:auto;padding:3px 3px 5px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
      .restbr-choice-colors-row::-webkit-scrollbar{display:none}
      .restbr-choice-colors .restbr-color-dot{width:32px;height:32px;min-width:32px}
      @media(max-width:420px){.restbr-color-dot{width:25px;height:25px;min-width:25px}.restbr-choice-colors .restbr-color-dot{width:31px;height:31px;min-width:31px}}
    `;
    document.head.appendChild(style);
  }

  function normalizeColorRow(row) {
    return {
      id: String(row.id || ''),
      productId: String(row.product_id || ''),
      ar: String(row.name_ar || '').trim(),
      ku: String(row.name_ku || row.name_ar || '').trim(),
      en: String(row.name_en || row.name_ar || '').trim(),
      hex: /^#[0-9a-f]{6}$/i.test(String(row.hex_color || '')) ? String(row.hex_color) : '',
      image: safeMedia(row.image_url || ''),
      order: Number(row.sort_order || 0),
      isAvailable: row.is_available !== false,
      isActive: row.is_active !== false
    };
  }

  function colorLabelSuffix(color, locale) {
    const name = localName(color, locale);
    if (!name) return '';
    if (locale === 'en') return `Color: ${name}`;
    if (locale === 'ku') return `رەنگ: ${name}`;
    return `اللون: ${name}`;
  }

  function variantOption(option, color) {
    if (!option || !color) return option;
    const clone = { ...option };
    for (const locale of ['ar', 'ku', 'en']) {
      const base = String(option[locale] || '').trim();
      const suffix = colorLabelSuffix(color, locale);
      clone[locale] = base && suffix ? `${base} • ${suffix}` : (suffix || base);
    }
    clone.__restbrColor = color;
    clone.__restbrBaseOptionId = option.id ?? null;
    return clone;
  }

  function installOptionProxy(product, colors) {
    if (!product || !Array.isArray(product.options) || !product.options.length || !colors.length) return;
    if (product.__restbrColorProxyV1) return;

    const baseOptions = Array.from(product.options);
    const baseLength = baseOptions.length;
    const colorIndex = new Map(colors.map((color, index) => [String(color.id), index]));

    product.__restbrBaseOptions = baseOptions;
    product.__restbrColorIndex = colorIndex;
    product.__restbrColorProxyV1 = true;

    product.options = new Proxy(baseOptions, {
      get(target, prop, receiver) {
        if (typeof prop === 'string' && /^\d+$/.test(prop)) {
          const index = Number(prop);
          if (index >= baseLength) {
            const offset = index - baseLength;
            const cIndex = Math.floor(offset / baseLength);
            const oIndex = offset % baseLength;
            const color = colors[cIndex];
            const option = baseOptions[oIndex];
            if (color && option) return variantOption(option, color);
          }
        }
        return Reflect.get(target, prop, receiver);
      }
    });
  }

  function syntheticOptionIndex(product, baseIndex, colorId) {
    const baseLength = product?.__restbrBaseOptions?.length || product?.options?.length || 0;
    if (!baseLength) return baseIndex;
    const cIndex = product?.__restbrColorIndex?.get(String(colorId));
    if (!Number.isInteger(cIndex)) return baseIndex;
    return baseLength + (cIndex * baseLength) + Number(baseIndex || 0);
  }

  function currentColor(productId) {
    const state = states.get(String(productId));
    if (!state) return null;
    return state.colors.find(color => String(color.id) === String(state.selectedId))
      || state.colors.find(color => color.isAvailable)
      || state.colors[0]
      || null;
  }

  function setSelected(productId, colorId, { persist = true, decorate = true } = {}) {
    const state = states.get(String(productId));
    if (!state) return null;
    const color = state.colors.find(item => String(item.id) === String(colorId));
    if (!color || !color.isAvailable) return null;
    state.selectedId = String(color.id);
    if (persist) saveSelection(productId, color.id);
    if (decorate) {
      decorateProductCard(productId);
      decorateChoiceColors(productId);
    }
    window.dispatchEvent(new CustomEvent('restbr:product-color-selected', {
      detail: { productId: String(productId), color }
    }));
    return color;
  }

  function swatchStyle(color) {
    const parts = [];
    if (color.hex) parts.push(`--restbr-color:${color.hex}`);
    if (color.image) parts.push(`--restbr-color-image:url(\"${String(color.image).replaceAll('"', '%22')}\")`);
    return parts.join(';');
  }

  function colorButtonHtml(productId, color) {
    const selected = String(currentColor(productId)?.id || '') === String(color.id);
    const name = localName(color);
    return `<button type="button" class="restbr-color-dot${selected ? ' selected' : ''}${color.image ? ' has-image' : ''}" data-restbr-color-product="${esc(productId)}" data-restbr-color-id="${esc(color.id)}" style="${esc(swatchStyle(color))}" title="${esc(name)}" aria-label="${esc(name)}" ${color.isAvailable ? '' : 'disabled'}></button>`;
  }

  function decorateProductCard(productId) {
    const state = states.get(String(productId));
    if (!state?.colors?.length) return;
    const card = document.querySelector(`[data-product-card="${CSS.escape(String(productId))}"]`);
    if (!card) return;

    const info = card.querySelector('.sm-info');
    const nameNode = info?.querySelector('.sm-name');
    if (!info || !nameNode) return;

    let strip = info.querySelector('.restbr-color-strip');
    if (!strip) {
      strip = document.createElement('div');
      strip.className = 'restbr-color-strip';
      nameNode.insertAdjacentElement('afterend', strip);
    }

    const selected = currentColor(productId);
    strip.innerHTML = state.colors.map(color => colorButtonHtml(productId, color)).join('')
      + `<span class="restbr-color-name">${esc(localName(selected))}</span>`;

    const image = card.querySelector('.sm-product-image');
    if (image) {
      const product = state.product;
      if (!image.dataset.restbrOriginalImage) {
        image.dataset.restbrOriginalImage = safeMedia(product?.image || image.dataset.fullImage || image.src || '');
      }
      const next = safeMedia(selected?.image || image.dataset.restbrOriginalImage || product?.image || '');
      if (next) {
        if (image.src !== next) image.src = next;
        image.dataset.fullImage = next;
      }
    }
  }

  function decorateAllCards() {
    for (const productId of states.keys()) decorateProductCard(productId);
  }

  function choiceTitle() {
    const locale = lang();
    return locale === 'en' ? 'Choose color' : locale === 'ku' ? 'رەنگ هەڵبژێرە' : 'اختر اللون';
  }

  function decorateChoiceColors(productId) {
    const state = states.get(String(productId));
    const sheet = document.getElementById('smChoiceSheet');
    const list = document.getElementById('smChoiceList');
    if (!sheet || !list) return;

    let holder = sheet.querySelector('.restbr-choice-colors');
    if (!state?.colors?.length) {
      holder?.remove();
      return;
    }
    if (!holder) {
      holder = document.createElement('div');
      holder.className = 'restbr-choice-colors';
      list.parentElement?.insertBefore(holder, list);
    }
    holder.dataset.productId = String(productId);
    holder.innerHTML = `<div class="restbr-choice-colors-title">${esc(choiceTitle())}</div><div class="restbr-choice-colors-row">${state.colors.map(color => colorButtonHtml(productId, color)).join('')}</div>`;
  }

  function ensureMenuObserver() {
    const menu = document.getElementById('smMenu');
    if (!menu || menuObserver) return;
    let raf = 0;
    menuObserver = new MutationObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(decorateAllCards);
    });
    menuObserver.observe(menu, { childList: true, subtree: true });
  }

  function temporarilyUseColorImage(product, color) {
    if (!product || !color?.image) return () => {};
    const previous = product.image;
    product.image = color.image;
    return () => {
      if (product.image === color.image) product.image = previous;
    };
  }

  // Capture phase runs before cart.js. We only rewrite the option index for the
  // single click being added. The cart therefore receives a stable synthetic
  // option label/key while the normal menu keeps rendering only the real options.
  document.addEventListener('click', event => {
    const colorButton = event.target.closest?.('[data-restbr-color-product][data-restbr-color-id]');
    if (colorButton) {
      event.preventDefault();
      event.stopPropagation();
      setSelected(colorButton.dataset.restbrColorProduct, colorButton.dataset.restbrColorId);
      return;
    }

    const choose = event.target.closest?.('.sm-choose-options');
    if (choose) {
      const productId = String(choose.dataset.productId || '');
      if (states.has(productId)) setTimeout(() => decorateChoiceColors(productId), 0);
      return;
    }

    const add = event.target.closest?.('.sm-add-cart,.sm-direct-add');
    const choice = event.target.closest?.('[data-choice-product]');
    const trigger = add || choice;
    if (!trigger) return;

    const productId = String(add?.dataset.productId || choice?.dataset.choiceProduct || '');
    const state = states.get(productId);
    if (!state?.colors?.length) return;

    const color = currentColor(productId);
    if (!color || !color.isAvailable) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    const product = state.product;
    const attr = add ? 'optionIndex' : 'choiceIndex';
    const originalIndex = Number(trigger.dataset[attr] || 0);
    const synthetic = syntheticOptionIndex(product, originalIndex, color.id);
    const restoreImage = temporarilyUseColorImage(product, color);

    trigger.dataset[attr] = String(synthetic);
    queueMicrotask(() => {
      trigger.dataset[attr] = String(originalIndex);
      restoreImage();
    });
  }, true);

  async function fetchColors() {
    if (!window.supabaseClient) return [];
    const { data, error } = await window.supabaseClient
      .from('product_colors')
      .select('id,product_id,name_ar,name_ku,name_en,hex_color,image_url,sort_order,is_active,is_available')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });

    if (error) {
      const code = String(error.code || '');
      const message = String(error.message || '');
      if (code === '42P01' || code === 'PGRST205' || /product_colors/i.test(message)) {
        console.info('RESTBR product colors are not installed in this database yet.');
        return [];
      }
      throw error;
    }
    return Array.isArray(data) ? data : [];
  }

  async function install() {
    if (loadingPromise) return loadingPromise;
    loadingPromise = (async () => {
      installStyles();
      const DB = window.RESTBR_DB;
      if (!DB?.products?.length) return;

      const rows = await fetchColors();
      if (!rows.length) return;

      const grouped = new Map();
      rows.map(normalizeColorRow).filter(row => row.id && row.productId && row.isActive).forEach(color => {
        if (!grouped.has(color.productId)) grouped.set(color.productId, []);
        grouped.get(color.productId).push(color);
      });

      const saved = loadSelections();
      DB.products.forEach(product => {
        const colors = grouped.get(String(product.id)) || [];
        if (!colors.length) return;
        colors.sort((a, b) => (a.order - b.order) || a.id.localeCompare(b.id));
        product.colors = colors;
        installOptionProxy(product, colors);

        const preferred = colors.find(color => String(color.id) === String(saved[String(product.id)] || '') && color.isAvailable)
          || colors.find(color => color.isAvailable)
          || colors[0];

        states.set(String(product.id), {
          product,
          colors,
          selectedId: String(preferred?.id || '')
        });
      });

      if (!states.size) return;
      decorateAllCards();
      ensureMenuObserver();

      window.RESTBR_PRODUCT_COLORS = Object.freeze({
        get(productId) {
          return states.get(String(productId))?.colors?.slice() || [];
        },
        selected(productId) {
          return currentColor(productId);
        },
        select(productId, colorId) {
          return setSelected(productId, colorId);
        }
      });

      window.dispatchEvent(new CustomEvent('restbr:colors-ready', {
        detail: { productCount: states.size }
      }));
    })().catch(error => {
      console.warn('RESTBR product color runtime disabled:', error);
    });
    return loadingPromise;
  }

  window.addEventListener('restbr:ready', install, { once: true });
  window.addEventListener('restbr:prices-updated', decorateAllCards);

  if (window.RESTBR_DB?.products?.length) install();
})();

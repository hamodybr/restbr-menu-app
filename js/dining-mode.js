(() => {
  if (/(?:^|\/)admin\.html$/i.test(location.pathname)) return;

  const PRICE_TABLE = 'product_options';
  const SETTINGS_TABLE = 'restaurant_settings';
  const DISCOUNTS_TABLE = 'discounts';
  const PRODUCTS_TABLE = 'products';
  const priceMap = new Map();
  const productCategoryMap = new Map();
  let discounts = [];
  let selectedMode = '';
  let ready = false;
  let gate = null;
  let channel = null;
  let gateTexts = {};

  const lang = () => localStorage.getItem('shorashLang') || 'ar';

  const DEFAULT_COPY = {
    ar: {
      title: 'طلبك وين؟',
      sub: 'اختر قبل عرض المنيو',
      dinein: 'داخل المطعم',
      dineinSub: 'عرض أسعار الداخل',
      takeaway: 'سفري',
      takeawaySub: 'عرض أسعار السفري',
      loading: 'جاري تحميل الأسعار...'
    },
    ku: {
      title: 'چۆن دەتەوێت خواردنەکەت؟',
      sub: 'پێش بینینی مینیو هەڵبژێرە',
      dinein: 'لە ناو چێشتخانە',
      dineinSub: 'نرخی ناو چێشتخانە',
      takeaway: 'سەفەری',
      takeawaySub: 'نرخی سەفەری',
      loading: 'نرخەکان بار دەکرێن...'
    },
    en: {
      title: 'How will you enjoy your meal?',
      sub: 'Choose before viewing the menu',
      dinein: 'Dine in',
      dineinSub: 'View dine-in prices',
      takeaway: 'Takeaway',
      takeawaySub: 'View takeaway prices',
      loading: 'Loading prices...'
    }
  };

  function objectValue(value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
      } catch (_) {
        return {};
      }
    }
    return {};
  }

  function savedText(language, key, fallback) {
    const value = objectValue(gateTexts?.[language])?.[key];
    const text = String(value ?? '').trim();
    return text || fallback;
  }

  const copy = () => {
    const l = ['ar', 'ku', 'en'].includes(lang()) ? lang() : 'ar';
    const base = DEFAULT_COPY[l] || DEFAULT_COPY.ar;
    return {
      title: savedText(l, 'title', base.title),
      sub: savedText(l, 'subtitle', base.sub),
      dinein: savedText(l, 'dinein', base.dinein),
      dineinSub: savedText(l, 'dinein_sub', base.dineinSub),
      takeaway: savedText(l, 'takeaway', base.takeaway),
      takeawaySub: savedText(l, 'takeaway_sub', base.takeawaySub),
      loading: savedText(l, 'loading', base.loading)
    };
  };

  async function fetchGateTexts() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return;

    const { data, error } = await supabaseClient
      .from(SETTINGS_TABLE)
      .select('dining_gate_texts,updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    gateTexts = objectValue(data?.dining_gate_texts);
  }

  function installStyles() {
    if (document.getElementById('smDiningModeStyles')) return;
    const style = document.createElement('style');
    style.id = 'smDiningModeStyles';
    style.textContent = `
      .sm-dining-gate{
        position:fixed;inset:0;z-index:10050;display:grid;place-items:center;
        padding:24px;background:rgba(5,4,3,.96);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);
      }
      .sm-dining-card{
        width:min(430px,100%);padding:24px 18px 18px;border:1px solid rgba(226,181,94,.25);
        border-radius:24px;background:linear-gradient(155deg,rgba(30,22,14,.96),rgba(10,8,6,.98));
        box-shadow:0 24px 80px rgba(0,0,0,.52);text-align:center;color:#f4efe8;
      }
      .sm-dining-mark{font-size:28px;margin-bottom:9px}.sm-dining-card h2{margin:0;color:#e2b55e;font-size:22px}
      .sm-dining-card p{margin:7px 0 18px;color:#9d958b;font-size:12px}
      .sm-dining-options{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .sm-dining-choice{
        min-height:112px;border:1px solid rgba(255,255,255,.09);border-radius:18px;background:rgba(255,255,255,.035);
        color:#f3eee7;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:13px;
      }
      .sm-dining-choice:active{transform:scale(.985)}
      .sm-dining-choice .icon{font-size:26px}.sm-dining-choice strong{font-size:15px;color:#eccb8b}
      .sm-dining-choice small{font-size:10px;color:#958d83;line-height:1.45}
      .sm-dining-loading{display:none;padding:22px 8px 6px;color:#c9a25e;font-size:12px}
      .sm-dining-gate.loading .sm-dining-options{display:none}.sm-dining-gate.loading .sm-dining-loading{display:block}

      .sm-price.sm-price-discounted{
        display:inline-flex;align-items:baseline;justify-content:flex-end;flex-wrap:wrap;gap:4px 6px;
      }
      .sm-price .sm-price-before{
        color:#8f8880;font-size:.76em;font-weight:700;text-decoration:line-through;text-decoration-thickness:1px;white-space:nowrap;
      }
      .sm-price .sm-price-after{
        color:inherit;font-size:1em;font-weight:inherit;white-space:nowrap;
      }

      html.sm-mode-dinein .sm-add-cart,
      html.sm-mode-dinein .sm-direct-add,
      html.sm-mode-dinein .sm-choose-options,
      html.sm-mode-dinein #smCartFab,
      html.sm-mode-dinein #smCartBackdrop,
      html.sm-mode-dinein #smCartDrawer,
      html.sm-mode-dinein #smCartToast,
      html.sm-mode-dinein #smCheckoutBackdrop,
      html.sm-mode-dinein #smCheckoutSheet,
      html.sm-mode-dinein #smChoiceBackdrop,
      html.sm-mode-dinein #smChoiceSheet,
      html.sm-mode-dinein #smOrderStateBanner{
        display:none!important;
      }
    `;
    document.head.appendChild(style);
  }

  function createGate() {
    if (gate) return;
    installStyles();
    const t = copy();
    gate = document.createElement('div');
    gate.className = 'sm-dining-gate';
    gate.innerHTML = `
      <div class="sm-dining-card">
        <div class="sm-dining-mark">🍽️</div>
        <h2>${escapeHtml(t.title)}</h2>
        <p>${escapeHtml(t.sub)}</p>
        <div class="sm-dining-options">
          <button class="sm-dining-choice" type="button" data-sm-mode="dinein">
            <span class="icon">🍴</span><strong>${escapeHtml(t.dinein)}</strong><small>${escapeHtml(t.dineinSub)}</small>
          </button>
          <button class="sm-dining-choice" type="button" data-sm-mode="takeaway">
            <span class="icon">🥡</span><strong>${escapeHtml(t.takeaway)}</strong><small>${escapeHtml(t.takeawaySub)}</small>
          </button>
        </div>
        <div class="sm-dining-loading">${escapeHtml(t.loading)}</div>
      </div>`;
    document.body.appendChild(gate);

    gate.addEventListener('click', event => {
      const button = event.target.closest('[data-sm-mode]');
      if (!button) return;
      chooseMode(button.dataset.smMode);
    });
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function money(value) {
    const l = window.SHORASH_LANG ? window.SHORASH_LANG() : lang();
    return Number(value || 0).toLocaleString('en-US') + ' ' + (l === 'en' ? 'IQD' : 'د.ع');
  }

  function discountForProduct(product) {
    if (!selectedMode || !product) return 0;

    const productId = String(product.id ?? '');
    const categoryId = String(
      productCategoryMap.get(productId) ??
      product.category?.id ??
      product.category_id ??
      ''
    );

    let bestRank = 0;
    let bestPercent = 0;

    discounts.forEach(row => {
      if (!row || row.is_active === false) return;
      if (row.price_mode !== 'both' && row.price_mode !== selectedMode) return;

      const percent = Number(row.discount_percent);
      if (!Number.isFinite(percent) || percent <= 0 || percent > 100) return;

      let rank = 0;
      if (row.scope_type === 'product' && String(row.target_id ?? '') === productId) rank = 3;
      else if (row.scope_type === 'category' && categoryId && String(row.target_id ?? '') === categoryId) rank = 2;
      else if (row.scope_type === 'restaurant') rank = 1;
      else return;

      if (rank > bestRank || (rank === bestRank && percent > bestPercent)) {
        bestRank = rank;
        bestPercent = percent;
      }
    });

    return bestPercent;
  }

  function discountedPrice(basePrice, percent) {
    const base = Number(basePrice);
    const pct = Number(percent);
    if (!Number.isFinite(base)) return 0;
    if (!Number.isFinite(pct) || pct <= 0) return base;
    return Math.max(0, Math.round(base * (100 - pct) / 100));
  }

  function updateVisiblePrices() {
    const db = window.SHORASH_DB;
    if (!db?.products) return;
    db.products.forEach(product => {
      const card = document.querySelector(`[data-product-card="${String(product.id).replace(/"/g, '\\"')}"]`);
      if (!card) return;
      const nodes = [...card.querySelectorAll('.sm-price')];
      (product.options || []).forEach((option, index) => {
        const node = nodes[index];
        if (!node) return;

        const current = Number(option.price || 0);
        const original = Number(option._modeOriginalPrice ?? current);
        const percent = Number(option._discountPercent || 0);

        if (percent > 0 && original > current) {
          const next = `<span class="sm-price-before">${escapeHtml(money(original))}</span><span class="sm-price-after">${escapeHtml(money(current))}</span>`;
          node.classList.add('sm-price-discounted');
          if (node.innerHTML !== next) node.innerHTML = next;
        } else {
          const next = money(current);
          node.classList.remove('sm-price-discounted');
          if (node.textContent !== next || node.children.length) node.textContent = next;
        }
      });
    });
  }

  function applyModePrices(notify = false) {
    const db = window.SHORASH_DB;
    if (!db?.products || !selectedMode) return;

    db.products.forEach(product => {
      const percent = discountForProduct(product);

      (product.options || []).forEach(option => {
        const row = priceMap.get(String(option.id));
        const inside = Number(row?.price ?? option._insidePrice ?? option.price ?? 0);
        const takeawayRaw = row?.takeaway_price;
        const takeaway = takeawayRaw === null || takeawayRaw === undefined || takeawayRaw === ''
          ? inside
          : Number(takeawayRaw);

        option._insidePrice = Number.isFinite(inside) ? inside : 0;
        option._takeawayPrice = Number.isFinite(takeaway) ? takeaway : option._insidePrice;

        const original = selectedMode === 'takeaway' ? option._takeawayPrice : option._insidePrice;
        option._modeOriginalPrice = original;
        option._discountPercent = percent;
        option.price = discountedPrice(original, percent);
      });
    });

    updateVisiblePrices();

    if (notify) {
      window.dispatchEvent(new CustomEvent('shorash:prices-updated', {
        detail: { source: 'dining-mode', mode: selectedMode, discounts: true }
      }));
    }
  }

  async function fetchPrices() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
    const { data, error } = await supabaseClient
      .from(PRICE_TABLE)
      .select('id,product_id,price,takeaway_price');
    if (error) throw error;
    priceMap.clear();
    (data || []).forEach(row => priceMap.set(String(row.id), row));
  }

  async function fetchDiscounts() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return;

    const [{ data: discountData, error: discountError }, { data: productData, error: productError }] = await Promise.all([
      supabaseClient
        .from(DISCOUNTS_TABLE)
        .select('id,discount_percent,price_mode,scope_type,target_id,is_active,created_at'),
      supabaseClient
        .from(PRODUCTS_TABLE)
        .select('id,category_id')
    ]);

    if (discountError) throw discountError;
    if (productError) throw productError;

    discounts = (discountData || []).filter(row => row?.is_active !== false);
    productCategoryMap.clear();
    (productData || []).forEach(row => {
      if (row?.id) productCategoryMap.set(String(row.id), row.category_id ?? null);
    });
  }

  function applyModeClass() {
    document.documentElement.classList.toggle('sm-mode-dinein', selectedMode === 'dinein');
    document.documentElement.classList.toggle('sm-mode-takeaway', selectedMode === 'takeaway');
    document.documentElement.dataset.smDiningMode = selectedMode;
    window.SHORASH_ORDER_MODE = selectedMode;
  }

  async function finishSelection() {
    if (!selectedMode || !window.SHORASH_DB) return;
    try {
      await Promise.all([fetchPrices(), fetchDiscounts()]);
    } catch (error) {
      console.debug('Dining prices/discounts fallback:', error?.message || error);
    }
    applyModeClass();
    applyModePrices(true);
    ready = true;
    gate?.remove();
    gate = null;
  }

  function chooseMode(mode) {
    if (!['dinein', 'takeaway'].includes(mode)) return;
    selectedMode = mode;
    applyModeClass();
    gate?.classList.add('loading');
    if (window.SHORASH_DB) void finishSelection();
  }

  function subscribePrices() {
    if (channel || typeof supabaseClient === 'undefined' || !supabaseClient) return;
    channel = supabaseClient
      .channel('shorash-dining-mode-prices')
      .on('postgres_changes', { event: '*', schema: 'public', table: PRICE_TABLE }, payload => {
        const row = payload.new;
        if (row?.id) priceMap.set(String(row.id), row);
        if (payload.eventType === 'DELETE' && payload.old?.id) priceMap.delete(String(payload.old.id));
        if (ready) applyModePrices(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: DISCOUNTS_TABLE }, () => {
        void fetchDiscounts()
          .then(() => {
            if (ready) applyModePrices(true);
          })
          .catch(error => console.debug('Discount refresh fallback:', error?.message || error));
      })
      .subscribe();
  }

  window.addEventListener('shorash:ready', () => {
    subscribePrices();
    if (selectedMode) void finishSelection();
  });

  window.addEventListener('shorash:prices-updated', event => {
    if (!ready || event?.detail?.source === 'dining-mode') return;
    applyModePrices(false);
  });

  const rerenderObserver = new MutationObserver(() => {
    if (ready) requestAnimationFrame(() => {
      applyModeClass();
      updateVisiblePrices();
    });
  });

  async function start() {
    try {
      await fetchGateTexts();
    } catch (error) {
      console.debug('Dining gate settings fallback:', error?.message || error);
    }

    createGate();
    const menu = document.getElementById('smMenu');
    if (menu) rerenderObserver.observe(menu, { childList: true });
    subscribePrices();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => void start(), { once: true });
  } else {
    void start();
  }
})();
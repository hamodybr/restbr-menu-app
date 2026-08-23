(() => {
  if (/(?:^|\/)admin\.html$/i.test(location.pathname)) return;

  const PRICE_TABLE = 'product_options';
  const priceMap = new Map();
  let selectedMode = '';
  let ready = false;
  let gate = null;
  let channel = null;

  const lang = () => localStorage.getItem('shorashLang') || 'ar';
  const copy = () => {
    const l = lang();
    if (l === 'en') return {
      title: 'How will you enjoy your meal?',
      sub: 'Choose before viewing the menu',
      dinein: 'Dine in',
      dineinSub: 'View dine-in prices',
      takeaway: 'Takeaway',
      takeawaySub: 'View takeaway prices',
      loading: 'Loading prices...'
    };
    if (l === 'ku') return {
      title: 'چۆن دەتەوێت خواردنەکەت؟',
      sub: 'پێش بینینی مینیو هەڵبژێرە',
      dinein: 'لە ناو چێشتخانە',
      dineinSub: 'نرخی ناو چێشتخانە',
      takeaway: 'سەفەری',
      takeawaySub: 'نرخی سەفەری',
      loading: 'نرخەکان بار دەکرێن...'
    };
    return {
      title: 'طلبك وين؟',
      sub: 'اختر قبل عرض المنيو',
      dinein: 'داخل المطعم',
      dineinSub: 'عرض أسعار الداخل',
      takeaway: 'سفري',
      takeawaySub: 'عرض أسعار السفري',
      loading: 'جاري تحميل الأسعار...'
    };
  };

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
        <h2>${t.title}</h2>
        <p>${t.sub}</p>
        <div class="sm-dining-options">
          <button class="sm-dining-choice" type="button" data-sm-mode="dinein">
            <span class="icon">🍴</span><strong>${t.dinein}</strong><small>${t.dineinSub}</small>
          </button>
          <button class="sm-dining-choice" type="button" data-sm-mode="takeaway">
            <span class="icon">🥡</span><strong>${t.takeaway}</strong><small>${t.takeawaySub}</small>
          </button>
        </div>
        <div class="sm-dining-loading">${t.loading}</div>
      </div>`;
    document.body.appendChild(gate);

    gate.addEventListener('click', event => {
      const button = event.target.closest('[data-sm-mode]');
      if (!button) return;
      chooseMode(button.dataset.smMode);
    });
  }

  function money(value) {
    const l = window.SHORASH_LANG ? window.SHORASH_LANG() : lang();
    return Number(value || 0).toLocaleString('en-US') + ' ' + (l === 'en' ? 'IQD' : 'د.ع');
  }

  function updateVisiblePrices() {
    const db = window.SHORASH_DB;
    if (!db?.products) return;
    db.products.forEach(product => {
      const card = document.querySelector(`[data-product-card="${String(product.id).replace(/"/g, '\\"')}"]`);
      if (!card) return;
      const nodes = [...card.querySelectorAll('.sm-price')];
      (product.options || []).forEach((option, index) => {
        if (nodes[index]) {
          const next = money(option.price);
          if (nodes[index].textContent !== next) nodes[index].textContent = next;
        }
      });
    });
  }

  function applyModePrices(notify = false) {
    const db = window.SHORASH_DB;
    if (!db?.products || !selectedMode) return;

    db.products.forEach(product => {
      (product.options || []).forEach(option => {
        const row = priceMap.get(String(option.id));
        const inside = Number(row?.price ?? option._insidePrice ?? option.price ?? 0);
        const takeawayRaw = row?.takeaway_price;
        const takeaway = takeawayRaw === null || takeawayRaw === undefined || takeawayRaw === ''
          ? inside
          : Number(takeawayRaw);

        option._insidePrice = Number.isFinite(inside) ? inside : 0;
        option._takeawayPrice = Number.isFinite(takeaway) ? takeaway : option._insidePrice;
        option.price = selectedMode === 'takeaway' ? option._takeawayPrice : option._insidePrice;
      });
    });

    updateVisiblePrices();

    if (notify) {
      window.dispatchEvent(new CustomEvent('shorash:prices-updated', {
        detail: { source: 'dining-mode', mode: selectedMode }
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

  function applyModeClass() {
    document.documentElement.classList.toggle('sm-mode-dinein', selectedMode === 'dinein');
    document.documentElement.classList.toggle('sm-mode-takeaway', selectedMode === 'takeaway');
    document.documentElement.dataset.smDiningMode = selectedMode;
    window.SHORASH_ORDER_MODE = selectedMode;
  }

  async function finishSelection() {
    if (!selectedMode || !window.SHORASH_DB) return;
    try {
      await fetchPrices();
    } catch (error) {
      console.debug('Dining prices fallback:', error?.message || error);
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

  function start() {
    createGate();
    const menu = document.getElementById('smMenu');
    if (menu) rerenderObserver.observe(menu, { childList: true });
    subscribePrices();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

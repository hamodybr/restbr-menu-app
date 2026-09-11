(() => {
  if (window.__RESTBR_LIVE_PRICES_V2__) return;
  window.__RESTBR_LIVE_PRICES_V2__ = true;

  const PAGE_SIZE = 1000;
  const MAX_ROWS = 50000;
  const PRICE_SYNC_INTERVAL_MS = 5 * 60 * 1000;

  let channel = null;
  let started = false;
  let activeChoiceProductId = null;
  let syncInFlight = null;

  const client = () =>
    typeof supabaseClient !== 'undefined'
      ? supabaseClient
      : null;

  const lang = () =>
    window.RESTBR_LANG
      ? window.RESTBR_LANG()
      : (localStorage.getItem('RESTBR_LANG_V1') || 'ar');

  const money = value => {
    if (value === null || value === undefined || value === '') return '';
    return Number(value).toLocaleString('en-US') + ' ' + (lang() === 'en' ? 'IQD' : 'د.ع');
  };

  const db = () => window.RESTBR_DB;

  function productById(productId) {
    return db()?.products?.find(
      product => String(product.id) === String(productId)
    ) || null;
  }

  function optionById(product, optionId) {
    return product?.options?.find(
      option => String(option.id) === String(optionId)
    ) || null;
  }

  function productCard(productId) {
    return [...document.querySelectorAll('[data-product-card]')].find(
      card => String(card.dataset.productCard) === String(productId)
    ) || null;
  }

  function refreshProductDom(productId) {
    const product = productById(productId);
    const card = productCard(productId);

    if (product && card) {
      const rows = [...card.querySelectorAll('.sm-option')];

      (product.options || []).forEach((option, index) => {
        const price = rows[index]?.querySelector('.sm-price');
        if (price) price.textContent = money(option.price);
      });
    }

    if (
      product &&
      activeChoiceProductId !== null &&
      String(activeChoiceProductId) === String(productId)
    ) {
      const choiceRows = [...document.querySelectorAll('#smChoiceList .sm-choice-option')];

      (product.options || []).forEach((option, index) => {
        const price = choiceRows[index]?.querySelector('b');
        if (price) price.textContent = money(option.price);
      });
    }
  }

  function notifyPriceUpdate(detail = {}) {
    window.dispatchEvent(
      new CustomEvent('restbr:prices-updated', { detail })
    );
  }

  function applyRow(row, notify = true) {
    if (!row || row.id === undefined || row.product_id === undefined) return false;

    const product = productById(row.product_id);
    const option = optionById(product, row.id);
    if (!option) return false;

    const nextPrice = Number(row.price);
    if (!Number.isFinite(nextPrice)) return false;

    const changed = Number(option.price) !== nextPrice;
    option.price = nextPrice;

    if (changed) refreshProductDom(product.id);

    if (changed && notify) {
      notifyPriceUpdate({
        productId: product.id,
        optionId: option.id,
        price: nextPrice
      });
    }

    return changed;
  }

  async function fetchAllPriceRows() {
    const sb = client();
    if (!sb) return [];

    const rows = [];
    let from = 0;

    while (true) {
      const { data, error } = await sb
        .from('product_options')
        .select('id,product_id,price')
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;

      const page = Array.isArray(data) ? data : [];
      rows.push(...page);

      if (page.length < PAGE_SIZE) break;
      from += PAGE_SIZE;

      if (from >= MAX_ROWS) {
        throw new Error(`product_options exceeded ${MAX_ROWS} row live-price safety limit`);
      }
    }

    return rows;
  }

  async function syncAllPrices() {
    if (syncInFlight) return syncInFlight;

    syncInFlight = (async () => {
      if (!client() || !db()?.products) return false;

      let data;
      try {
        data = await fetchAllPriceRows();
      } catch (error) {
        console.warn('Live price sync failed:', error?.message || error);
        return false;
      }

      const touchedProducts = new Set();
      let changed = false;

      data.forEach(row => {
        const didChange = applyRow(row, false);
        if (didChange) {
          changed = true;
          touchedProducts.add(String(row.product_id));
        }
      });

      touchedProducts.forEach(refreshProductDom);

      if (changed) {
        notifyPriceUpdate({ bulk: true, rows: data.length });
      }

      return changed;
    })().finally(() => {
      syncInFlight = null;
    });

    return syncInFlight;
  }

  function start() {
    const sb = client();
    if (started || !sb || !db()?.products) return;
    started = true;

    // Realtime is the primary update path. Reconcile once after subscription so
    // startup does not download the same price table twice back-to-back.
    channel = sb
      .channel('restbr-live-prices-v2')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_options'
        },
        payload => {
          if (payload.eventType === 'DELETE') {
            void syncAllPrices();
            return;
          }

          applyRow(payload.new, true);
        }
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          void syncAllPrices();
        }
      });

    // Reconciliation is only a safety net for missed Realtime events. Do not
    // repeatedly download prices every 30 seconds or while the page is hidden.
    window.setInterval(() => {
      if (document.visibilityState !== 'visible' || navigator.onLine === false) return;
      void syncAllPrices();
    }, PRICE_SYNC_INTERVAL_MS);
  }

  document.addEventListener('click', event => {
    const choose = event.target.closest('.sm-choose-options');
    if (choose) {
      activeChoiceProductId = choose.dataset.productId || null;
    }

    if (event.target.closest('#smChoiceClose,#smChoiceBackdrop')) {
      activeChoiceProductId = null;
    }
  }, true);

  window.addEventListener('online', () => void syncAllPrices());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void syncAllPrices();
  });
  window.addEventListener('restbr:catalog-expanded', () => void syncAllPrices());

  window.addEventListener('restbr:ready', start, { once: true });

  if (db()?.products) {
    start();
  }
})();

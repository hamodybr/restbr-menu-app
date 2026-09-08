(() => {
  if (/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;

  const PRODUCTS_TABLE = 'products';
  const modeByProduct = new Map();
  let sourceProducts = null;
  let loaded = false;
  let channel = null;
  let lastMode = '';
  let modeWatchTimer = 0;
  let applying = false;

  function normalizeMode(value) {
    const mode = String(value || '').trim();
    return ['both', 'dinein', 'takeaway'].includes(mode) ? mode : 'both';
  }

  function currentMode() {
    if (document.documentElement.classList.contains('sm-mode-dinein')) return 'dinein';
    if (document.documentElement.classList.contains('sm-mode-takeaway')) return 'takeaway';

    const mode = String(
      document.documentElement.dataset.smDiningMode ||
      window.RESTBR_ORDER_MODE ||
      ''
    ).trim();

    return ['dinein', 'takeaway'].includes(mode) ? mode : '';
  }

  function allowedForMode(serviceMode, orderMode) {
    const mode = normalizeMode(serviceMode);
    if (!orderMode) return true;
    return mode === 'both' || mode === orderMode;
  }

  function installStyles() {
    if (document.getElementById('smProductServiceModeStyles')) return;
    const style = document.createElement('style');
    style.id = 'smProductServiceModeStyles';
    style.textContent = `.sm-service-mode-hidden{display:none!important}`;
    document.head.appendChild(style);
  }

  async function fetchModes() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return false;

    const { data, error } = await supabaseClient
      .from(PRODUCTS_TABLE)
      .select('id,service_mode');

    if (error) throw error;

    modeByProduct.clear();
    (data || []).forEach(row => {
      if (!row?.id) return;
      modeByProduct.set(String(row.id), normalizeMode(row.service_mode));
    });

    loaded = true;
    return true;
  }

  function captureSourceProducts() {
    const db = window.RESTBR_DB;
    if (!db || !Array.isArray(db.products)) return false;

    if (!sourceProducts) {
      sourceProducts = db.products.slice();
    }

    return true;
  }

  function idsOf(list) {
    return (list || []).map(item => String(item?.id || '')).join('|');
  }

  function applyDomFallback(orderMode) {
    document.querySelectorAll('#smMenu [data-product-card]').forEach(card => {
      const id = String(card.dataset.productCard || '');
      const allowed = allowedForMode(modeByProduct.get(id), orderMode);
      card.classList.toggle('sm-service-mode-hidden', !allowed);
    });
  }

  function ensureActiveCategory() {
    if (document.getElementById('smSearchInput')?.value?.trim()) return;
    if (document.querySelector('#smCats .sm-cat.active')) return;

    const first = document.querySelector('#smCats .sm-cat');
    if (first) first.click();
  }

  function rerenderMenu() {
    try {
      if (typeof window.renderCats === 'function') window.renderCats();
      if (typeof window.render === 'function') window.render();
    } catch (error) {
      console.debug('Service-mode rerender fallback:', error?.message || error);
    }

    requestAnimationFrame(ensureActiveCategory);
  }

  function applyFilter(forceRender = false) {
    if (applying || !loaded || !captureSourceProducts()) return;

    const db = window.RESTBR_DB;
    const orderMode = currentMode();
    const next = orderMode
      ? sourceProducts.filter(product =>
          allowedForMode(modeByProduct.get(String(product?.id || '')), orderMode)
        )
      : sourceProducts.slice();

    const changed = idsOf(db.products) !== idsOf(next);

    applying = true;
    try {
      db.products = next;

      if (changed || forceRender) {
        rerenderMenu();
      }

      applyDomFallback(orderMode);
    } finally {
      applying = false;
    }
  }

  async function refreshModes(forceRender = false) {
    try {
      await fetchModes();
      applyFilter(forceRender);
    } catch (error) {
      console.error('Product service-mode load failed:', error);
    }
  }

  function subscribeProducts() {
    if (channel || typeof supabaseClient === 'undefined' || !supabaseClient) return;

    channel = supabaseClient
      .channel('restbr-product-service-mode-v2')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: PRODUCTS_TABLE },
        () => void refreshModes(true)
      )
      .subscribe();
  }

  function startModeWatcher() {
    if (modeWatchTimer) return;

    modeWatchTimer = window.setInterval(() => {
      const mode = currentMode();
      if (mode === lastMode) return;

      lastMode = mode;
      if (loaded) applyFilter(true);
      else void refreshModes(true);
    }, 150);
  }

  function boot() {
    installStyles();
    startModeWatcher();
    subscribeProducts();
    void refreshModes(false);
  }

  window.addEventListener('restbr:ready', () => {
    captureSourceProducts();
    subscribeProducts();
    void refreshModes(true);
  });

  window.addEventListener('restbr:prices-updated', event => {
    if (event?.detail?.source !== 'dining-mode') return;
    applyFilter(true);
  });

  window.addEventListener('pageshow', () => {
    void refreshModes(true);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();

(() => {
  'use strict';

  const LABELS = {
    ar: percent => `🏷 خصم ${percent}%`,
    ku: percent => `🏷 داشکاندنی ${percent}%`,
    en: percent => `🏷 ${percent}% OFF`
  };

  let frame = 0;

  const currentLanguage = () => {
    const value = document.documentElement.lang || localStorage.getItem('RESTBR_LANG_V1') || 'ar';
    return ['ar', 'ku', 'en'].includes(value) ? value : 'ar';
  };

  const discountPercent = product => Math.max(
    0,
    ...(Array.isArray(product?.options) ? product.options : [])
      .map(option => Number(option?._discountPercent || 0))
      .filter(value => Number.isFinite(value) && value > 0 && value <= 100)
  );

  function badgeHolder(card) {
    let holder = card.querySelector('.sm-badges');
    if (holder) return holder;

    holder = document.createElement('div');
    holder.className = 'sm-badges';
    holder.dataset.liveBadgesCreated = 'true';
    card.querySelector('.sm-img')?.before(holder);
    return holder;
  }

  function syncCard(card, product) {
    const percent = discountPercent(product);
    let holder = card.querySelector('.sm-badges');
    const manualOffer = holder?.querySelector('.sm-display-badge.offer:not(.sm-live-discount)');

    if (!percent) {
      manualOffer?.classList.remove('sm-badge-suppressed');
      holder?.querySelector('.sm-live-discount')?.remove();
      if (holder?.dataset.liveBadgesCreated === 'true' && !holder.children.length) holder.remove();
      return;
    }

    holder = holder || badgeHolder(card);
    manualOffer?.classList.add('sm-badge-suppressed');

    let badge = holder.querySelector('.sm-live-discount');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'sm-display-badge offer sm-live-discount';
      badge.dataset.badgeKind = 'discount';
      holder.prepend(badge);
    }

    const label = LABELS[currentLanguage()](Number(percent.toFixed(2)));
    if (badge.textContent !== label) badge.textContent = label;
  }

  function syncAll() {
    frame = 0;
    const products = Array.isArray(window.RESTBR_DB?.products) ? window.RESTBR_DB.products : [];
    const byId = new Map(products.map(product => [String(product?.id ?? ''), product]));

    document.querySelectorAll('[data-product-card]').forEach(card => {
      const product = byId.get(String(card.dataset.productCard || ''));
      if (product) syncCard(card, product);
    });
  }

  function scheduleSync() {
    if (frame) return;
    frame = requestAnimationFrame(syncAll);
  }

  window.addEventListener('restbr:ready', scheduleSync);
  window.addEventListener('restbr:prices-updated', scheduleSync);
  document.addEventListener('click', event => {
    if (event.target.closest?.('[data-lang]')) setTimeout(scheduleSync, 60);
  });

  const start = () => {
    const menu = document.getElementById('smMenu');
    if (menu) new MutationObserver(scheduleSync).observe(menu, { childList: true, subtree: true });
    scheduleSync();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

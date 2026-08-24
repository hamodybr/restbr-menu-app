(() => {
  if (/(?:^|\/)admin\.html$/i.test(location.pathname)) return;

  const currentLang = () =>
    window.SHORASH_LANG
      ? window.SHORASH_LANG()
      : (localStorage.getItem('shorashLang') || 'ar');

  const money = value =>
    Number(value || 0).toLocaleString('en-US') + ' ' +
    (currentLang() === 'en' ? 'IQD' : 'د.ع');

  function productById(productId) {
    return window.SHORASH_DB?.products?.find(
      product => String(product.id) === String(productId)
    ) || null;
  }

  function refreshOpenChoicePrices() {
    if (!document.documentElement.dataset.smDiningMode) return;

    const list = document.getElementById('smChoiceList');
    if (!list) return;

    const rows = [...list.querySelectorAll('[data-choice-product]')];
    if (!rows.length) return;

    rows.forEach((row, fallbackIndex) => {
      const product = productById(row.dataset.choiceProduct);
      if (!product) return;

      const optionIndex = Number.isFinite(Number(row.dataset.choiceIndex))
        ? Number(row.dataset.choiceIndex)
        : fallbackIndex;
      const option = (product.options || [])[optionIndex];
      if (!option) return;

      const price = row.querySelector('b');
      if (!price) return;

      const next = money(option.price);
      if (price.textContent !== next) price.textContent = next;
    });
  }

  function refreshAfterPriceEngine() {
    // dining-mode handles the discount first; refresh the open option sheet
    // before the browser paints the 30-second base-price sync.
    requestAnimationFrame(refreshOpenChoicePrices);
  }

  window.addEventListener('shorash:prices-updated', refreshAfterPriceEngine);

  document.addEventListener('click', event => {
    if (event.target.closest('.sm-choose-options')) {
      requestAnimationFrame(refreshOpenChoicePrices);
    }

    if (event.target.closest('[data-lang]')) {
      requestAnimationFrame(refreshOpenChoicePrices);
    }
  });

  window.addEventListener('shorash:ready', refreshAfterPriceEngine);
})();

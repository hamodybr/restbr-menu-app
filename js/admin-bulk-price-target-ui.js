(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;
  if (window.__SHORASH_BULK_PRICE_TARGET_UI_V1__) return;
  window.__SHORASH_BULK_PRICE_TARGET_UI_V1__ = true;

  function install() {
    if (document.getElementById('bulkPriceTargetMode')) return true;

    const scope = document.getElementById('bulkPriceCategorySelect');
    const scopeField = scope?.closest('.bulk-price-field');
    if (!scope || !scopeField) return false;

    const field = document.createElement('div');
    field.className = 'bulk-price-field full';
    field.id = 'bulkPriceTargetField';
    field.innerHTML = `
      <label for="bulkPriceTargetMode">نوع السعر المراد تغييره</label>
      <select id="bulkPriceTargetMode">
        <option value="dinein">داخل المطعم فقط</option>
        <option value="takeaway">سفري فقط</option>
        <option value="both">داخل + سفري</option>
      </select>
    `;

    scopeField.insertAdjacentElement('beforebegin', field);
    return true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }

  const timer = setInterval(() => {
    if (install()) clearInterval(timer);
  }, 250);

  setTimeout(() => clearInterval(timer), 15000);
})();

(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;
  if (window.__SHORASH_EXCEL_IMPORT_TAKEAWAY_V1__) return;
  window.__SHORASH_EXCEL_IMPORT_TAKEAWAY_V1__ = true;

  function install() {
    const original = window.updateRowsFromExcel;
    if (typeof original !== 'function') return false;
    if (original.__shorashTakeawayPriceSupport) return true;

    async function enhancedUpdateRowsFromExcel(table, rows, currentRows, allowed, types = {}) {
      let nextAllowed = Array.isArray(allowed) ? [...allowed] : [];
      let nextTypes = { ...(types || {}) };

      if (table === 'product_options') {
        if (!nextAllowed.includes('takeaway_price')) {
          nextAllowed.push('takeaway_price');
        }
        nextTypes.takeaway_price = 'number';
      }

      return original(table, rows, currentRows, nextAllowed, nextTypes);
    }

    enhancedUpdateRowsFromExcel.__shorashTakeawayPriceSupport = true;
    enhancedUpdateRowsFromExcel.__original = original;
    window.updateRowsFromExcel = enhancedUpdateRowsFromExcel;
    return true;
  }

  if (install()) return;

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (install() || attempts >= 80) clearInterval(timer);
  }, 125);

  document.addEventListener('DOMContentLoaded', install, { once: true });
})();

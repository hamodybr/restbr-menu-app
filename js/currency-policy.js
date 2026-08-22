// ============================================================
// RESTBR CURRENCY POLICY V1.0
// Makes public menu prices follow the tenant currency instead of legacy IQD.
// Loaded immediately after app.js, while its async menu bootstrap is pending.
// ============================================================
(() => {
  'use strict';

  const code = () => String(
    window.SHORASH_DB?.restaurant?.currency ||
    window.RESTBR_TENANT?.currency ||
    window.RESTBR_BOOTSTRAP?.restaurant?.currency ||
    'IQD'
  ).trim().toUpperCase() || 'IQD';

  const currentLang = () => {
    try {
      if (typeof lang !== 'undefined' && lang) return lang;
    } catch (_) {}
    return localStorage.getItem('shorashLang') || 'ar';
  };

  const label = () => {
    const value = code();
    if (value === 'IQD') return currentLang() === 'en' ? 'IQD' : 'د.ع';
    return value;
  };

  const formatter = value => {
    if (value === null || value === undefined || value === '') return '';
    const number = Number(value);
    if (!Number.isFinite(number)) return '';
    return number.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: code() === 'IQD' ? 0 : 2,
    }) + ' ' + label();
  };

  // app.js is a classic script, so its global function binding is writable.
  // Assignment here updates every subsequent product render.
  try { money = formatter; } catch (_) { window.money = formatter; }
  window.RESTBR_FORMAT_MONEY = formatter;
  window.RESTBR_CURRENCY_CODE = code;

  window.addEventListener('shorash:ready', event => {
    const db = event?.detail?.DB || window.SHORASH_DB;
    if (db?.restaurant) db.restaurant.currency = code();
    try { render(); } catch (_) {}
  }, { once: true });

  console.log('✅ RESTBR currency policy V1.0 ready');
})();

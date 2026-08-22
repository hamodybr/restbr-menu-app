// ============================================================
// RESTBR BRAND TEMPLATE FIX V1.0
// Prevents legacy SHORASH replacement from re-replacing the restaurant name
// after {name} has already been expanded (e.g. "مطعم مطعم شوراش").
// Loaded immediately after app.js while menu data is still being fetched.
// ============================================================
(() => {
  'use strict';

  window.formatRestaurantTemplate = function(value, targetLang = (window.SHORASH_LANG?.() || localStorage.getItem('shorashLang') || 'ar')) {
    let text = String(value ?? '');
    const currentName = typeof window.restaurantNameForLang === 'function'
      ? String(window.restaurantNameForLang(targetLang) || '').trim()
      : '';

    if (!currentName) {
      return text.replace(/\s{2,}/g, ' ').trim();
    }

    // Protect explicit {name} expansion first, then only migrate genuinely
    // legacy hard-coded brand text that existed in the original template.
    const token = '__RESTBR_CURRENT_RESTAURANT_NAME__';
    text = text.replaceAll('{name}', token);

    const oldBrandPatterns = targetLang === 'en'
      ? [/SHORASH/gi,/Shorash/g]
      : [/شوراش/g,/شورش/g,/SHORASH/gi];

    oldBrandPatterns.forEach(pattern => {
      text = text.replace(pattern, currentName);
    });

    return text
      .replaceAll(token, currentName)
      .replace(/\s{2,}/g, ' ')
      .trim();
  };

  console.log('✅ RESTBR brand template fix V1.0 ready');
})();

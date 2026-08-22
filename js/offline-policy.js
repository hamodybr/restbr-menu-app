// ==========================================
// RESTBR OFFLINE POLICY V1.0
// Surfaces when the tenant menu is running from the cached bootstrap.
// ==========================================

(() => {
  'use strict';

  function showOfflineNotice() {
    if (!window.RESTBR_OFFLINE_BOOTSTRAP) return;

    if (typeof window.showOfflineDataBanner === 'function') {
      window.showOfflineDataBanner();
      return;
    }

    if (document.getElementById('restbrOfflineNotice')) return;

    const lang = localStorage.getItem('shorashLang') || 'ar';
    const text = lang === 'en'
      ? 'Offline mode — showing the last saved menu'
      : lang === 'ku'
        ? 'دۆخی ئۆفلاین — دوایین مینیو نیشان دەدرێت'
        : 'وضع أوفلاين — نعرض آخر نسخة محفوظة';

    const notice = document.createElement('div');
    notice.id = 'restbrOfflineNotice';
    notice.textContent = text;
    notice.style.cssText = [
      'position:fixed',
      'z-index:90',
      'left:50%',
      'bottom:calc(82px + env(safe-area-inset-bottom))',
      'transform:translateX(-50%)',
      'width:max-content',
      'max-width:88%',
      'padding:7px 11px',
      'border:1px solid rgba(232,184,98,.2)',
      'border-radius:999px',
      'background:rgba(10,7,4,.92)',
      'color:#d6aa5b',
      'font-size:9px',
      'text-align:center',
      'backdrop-filter:blur(12px)',
      '-webkit-backdrop-filter:blur(12px)'
    ].join(';');

    document.body.appendChild(notice);
    setTimeout(() => notice.remove(), 4500);
  }

  if (window.SHORASH_DB) {
    showOfflineNotice();
  } else {
    window.addEventListener('shorash:ready', showOfflineNotice, { once: true });
  }
})();

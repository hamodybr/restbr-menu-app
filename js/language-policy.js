// ==========================================
// RESTBR LANGUAGE POLICY V1.0
// Enforces restaurant_settings.languages on the legacy menu language UI.
// ==========================================

(() => {
  'use strict';

  const VALID = ['ar', 'ku', 'en'];
  let observer = null;
  let switching = false;

  function allowedLanguages() {
    const raw = window.RESTBR_BOOTSTRAP?.settings?.languages;

    if (!Array.isArray(raw)) return [...VALID];

    const allowed = [...new Set(
      raw
        .map(value => String(value || '').trim().toLowerCase())
        .filter(value => VALID.includes(value))
    )];

    return allowed.length ? allowed : ['ar'];
  }

  function enforce() {
    const holder = document.getElementById('smLangs');
    const toggle = document.getElementById('smLangToggle');
    if (!holder) return;

    const allowed = allowedLanguages();
    const settings = window.RESTBR_BOOTSTRAP?.settings || {};
    const switchEnabled = settings.show_language_switch !== false;

    holder.querySelectorAll('[data-lang]').forEach(button => {
      const code = String(button.dataset.lang || '').toLowerCase();
      button.hidden = !allowed.includes(code);
      button.style.display = allowed.includes(code) ? '' : 'none';
    });

    if (toggle) {
      toggle.style.display = switchEnabled && allowed.length > 1 ? 'grid' : 'none';
    }

    if (!switchEnabled || allowed.length <= 1) {
      holder.classList.remove('open');
    }

    const current = String(localStorage.getItem('shorashLang') || 'ar').toLowerCase();
    if (!allowed.includes(current) && !switching) {
      const fallback = holder.querySelector(`[data-lang="${allowed[0]}"]`);
      if (fallback) {
        switching = true;
        fallback.click();
        queueMicrotask(() => {
          switching = false;
          enforce();
        });
      }
    }
  }

  function install() {
    const holder = document.getElementById('smLangs');
    if (!holder) return;

    observer?.disconnect();
    observer = new MutationObserver(enforce);
    observer.observe(holder, { childList: true, subtree: true });

    enforce();
  }

  if (window.SHORASH_DB) {
    install();
  } else {
    window.addEventListener('shorash:ready', install, { once: true });
  }
})();

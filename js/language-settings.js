(() => {
  const ALL = ['ar', 'ku', 'en'];
  const LABELS = { ar: 'العربية', ku: 'کوردی', en: 'English' };
  const CACHE_KEY = 'SHORASH_ENABLED_LANGUAGES_V1';
  const isAdmin = /(?:^|\/)admin\.html$/i.test(location.pathname);

  let rowId = null;
  let enabled = readCached() || [...ALL];
  let adminDirty = false;

  function normalize(value) {
    let list = value;
    if (typeof list === 'string') {
      try { list = JSON.parse(list); } catch (_) { list = []; }
    }
    if (!Array.isArray(list)) list = [];
    const clean = ALL.filter(code => list.includes(code));
    return clean.length ? clean : [...ALL];
  }

  function readCached() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? normalize(JSON.parse(raw)) : null;
    } catch (_) {
      return null;
    }
  }

  function cache(list) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(list)); } catch (_) {}
  }

  async function loadPolicy() {
    try {
      if (typeof supabaseClient === 'undefined' || !supabaseClient) return enabled;

      const { data, error } = await supabaseClient
        .from('restaurant_settings')
        .select('id,enabled_languages')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        rowId = data.id || null;
        enabled = normalize(data.enabled_languages);
        cache(enabled);
      }
    } catch (error) {
      console.debug('Language settings:', error?.message || error);
    }

    return enabled;
  }

  function installAdminStyles() {
    if (document.getElementById('smAdminLanguageSettingsStyle')) return;

    const style = document.createElement('style');
    style.id = 'smAdminLanguageSettingsStyle';
    style.textContent = `
      .sm-language-setting-card{display:grid;gap:10px;padding:12px;border:1px solid rgba(216,169,88,.18);border-radius:13px;background:rgba(216,169,88,.045)}
      .sm-language-setting-head strong{display:block;color:#eee9e2;font-size:13px;margin-bottom:3px}
      .sm-language-setting-head span{display:block;color:#827c74;font-size:10px;line-height:1.5}
      .sm-language-setting-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
      .sm-language-setting-option{display:flex;align-items:center;justify-content:center;gap:7px;min-height:40px;padding:7px;border:1px solid rgba(255,255,255,.075);border-radius:10px;background:#090705;color:#d8d1c9;font-size:11px;font-weight:800;cursor:pointer}
      .sm-language-setting-option input{width:17px;height:17px;accent-color:#d8a958;cursor:pointer}
      .sm-language-setting-status{min-height:14px;color:#8f8981;font-size:9px;line-height:1.5}
      @media(max-width:520px){.sm-language-setting-options{grid-template-columns:1fr}.sm-language-setting-option{justify-content:flex-start}}
    `;
    document.head.appendChild(style);
  }

  function currentAdminSelection() {
    return ALL.filter(code => document.getElementById(`rs_language_${code}`)?.checked);
  }

  function setAdminStatus(text, ok = true) {
    const el = document.getElementById('smLanguageSettingStatus');
    if (!el) return;
    el.textContent = text || '';
    el.style.color = ok ? '#9ccfb7' : '#fecaca';
  }

  function handleAdminLanguageChange(event) {
    adminDirty = true;

    const selected = currentAdminSelection();
    if (!selected.length) {
      if (event?.target) event.target.checked = true;
      setAdminStatus('يجب إبقاء لغة واحدة على الأقل.', false);
      return;
    }

    setAdminStatus('تم تغيير الاختيار. اضغط حفظ التغييرات.', true);
  }

  function syncAdminInputsFromSaved() {
    if (adminDirty) return;

    ALL.forEach(code => {
      const input = document.getElementById(`rs_language_${code}`);
      if (input) input.checked = enabled.includes(code);
    });
  }

  function installAdminUI() {
    installAdminStyles();

    const switchInput = document.getElementById('rs_show_language_switch');
    const anchor = switchInput?.closest('.settings-toggle-card');
    if (!anchor) return false;

    let card = document.getElementById('smLanguageSettingCard');

    if (!card) {
      card = document.createElement('div');
      card.id = 'smLanguageSettingCard';
      card.className = 'sm-language-setting-card';
      card.innerHTML = `
        <div class="sm-language-setting-head">
          <strong>لغات المنيو</strong>
          <span>اختر لغة واحدة أو لغتين أو اللغات الثلاث.</span>
        </div>
        <div class="sm-language-setting-options">
          ${ALL.map(code => `
            <label class="sm-language-setting-option">
              <input id="rs_language_${code}" type="checkbox" value="${code}">
              <span>${LABELS[code]}</span>
            </label>
          `).join('')}
        </div>
        <div id="smLanguageSettingStatus" class="sm-language-setting-status">سيتم حفظ اختيار اللغات مع زر حفظ التغييرات.</div>
      `;

      anchor.insertAdjacentElement('afterend', card);

      card.querySelectorAll('input[type="checkbox"]').forEach(input => {
        input.addEventListener('change', handleAdminLanguageChange);
      });
    }

    syncAdminInputsFromSaved();
    return true;
  }

  async function saveAdminLanguages() {
    if (!installAdminUI()) return;

    const chosen = currentAdminSelection();
    if (!chosen.length) {
      setAdminStatus('اختر لغة واحدة على الأقل.', false);
      return;
    }

    try {
      setAdminStatus('جاري حفظ اللغات...', true);

      if (typeof supabaseClient === 'undefined' || !supabaseClient) {
        throw new Error('Supabase غير متاح');
      }

      let targetId = rowId;

      if (!targetId) {
        const latest = await supabaseClient
          .from('restaurant_settings')
          .select('id')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latest.error) throw latest.error;
        targetId = latest.data?.id || null;
      }

      if (!targetId) throw new Error('لم يتم العثور على سجل إعدادات المطعم');

      const { error } = await supabaseClient
        .from('restaurant_settings')
        .update({ enabled_languages: chosen })
        .eq('id', targetId);

      if (error) throw error;

      rowId = targetId;
      enabled = normalize(chosen);
      cache(enabled);
      adminDirty = false;
      syncAdminInputsFromSaved();
      setAdminStatus('تم حفظ لغات المنيو ✓', true);
    } catch (error) {
      console.error('Save menu languages:', error);
      setAdminStatus('فشل حفظ اللغات: ' + (error?.message || error), false);
    }
  }

  function installMenuPolicyStyle() {
    let style = document.getElementById('smMenuLanguagePolicyStyle');
    if (!style) {
      style = document.createElement('style');
      style.id = 'smMenuLanguagePolicyStyle';
      document.head.appendChild(style);
    }

    const hidden = ALL.filter(code => !enabled.includes(code));
    style.textContent = hidden.map(code => `[data-lang="${code}"]{display:none!important}`).join('\n');
  }

  function enforceMenuPolicy() {
    if (isAdmin) return;

    installMenuPolicyStyle();

    const current = localStorage.getItem('shorashLang') || 'ar';
    const first = enabled[0] || 'ar';

    if (!enabled.includes(current)) {
      localStorage.setItem('shorashLang', first);
      const target = document.querySelector(`[data-lang="${first}"]`);
      if (target) target.click();
    }

    const toggle = document.getElementById('smLangToggle');
    const holder = document.getElementById('smLangs');

    if (enabled.length <= 1) {
      if (toggle) toggle.style.setProperty('display', 'none', 'important');
      if (holder) {
        holder.classList.remove('open');
        holder.style.setProperty('display', 'none', 'important');
      }
    }
  }

  async function initAdmin() {
    await loadPolicy();

    const tryInstall = () => installAdminUI();
    tryInstall();
    setTimeout(tryInstall, 250);
    setTimeout(tryInstall, 900);
    setTimeout(tryInstall, 1800);

    document.addEventListener('click', event => {
      if (event.target.closest('#saveRestaurantSettingsBtn')) {
        void saveAdminLanguages();
        return;
      }

      setTimeout(tryInstall, 60);
      setTimeout(tryInstall, 350);
    });
  }

  async function initMenu() {
    await loadPolicy();
    enforceMenuPolicy();

    window.addEventListener('shorash:ready', () => {
      enforceMenuPolicy();
      setTimeout(enforceMenuPolicy, 80);
    });

    document.addEventListener('click', event => {
      if (event.target.closest('[data-lang]')) setTimeout(enforceMenuPolicy, 30);
    });
  }

  if (isAdmin) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initAdmin, { once: true });
    } else {
      void initAdmin();
    }
  } else {
    void initMenu();
  }
})();

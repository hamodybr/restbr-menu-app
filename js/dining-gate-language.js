(() => {
  if (/(?:^|\/)admin\.html$/i.test(location.pathname)) return;

  const ALL = ['ar', 'ku', 'en'];
  const LABELS = { ar: 'عربي', ku: 'کوردی', en: 'English' };
  const ENABLED_CACHE_KEY = 'SHORASH_ENABLED_LANGUAGES_V1';
  const SETTINGS_TABLE = 'restaurant_settings';

  let enabledLanguages = readEnabledCache() || [...ALL];
  let gateTexts = {};
  let settingsLoaded = false;

  const DEFAULT_COPY = {
    ar: {
      title: 'طلبك وين؟',
      subtitle: 'اختر قبل عرض المنيو',
      dinein: 'داخل المطعم',
      dinein_sub: 'عرض أسعار الداخل',
      takeaway: 'سفري',
      takeaway_sub: 'عرض أسعار السفري',
      loading: 'جاري تحميل الأسعار...'
    },
    ku: {
      title: 'چۆن دەتەوێت خواردنەکەت؟',
      subtitle: 'پێش بینینی مینیو هەڵبژێرە',
      dinein: 'لە ناو چێشتخانە',
      dinein_sub: 'نرخی ناو چێشتخانە',
      takeaway: 'سەفەری',
      takeaway_sub: 'نرخی سەفەری',
      loading: 'نرخەکان بار دەکرێن...'
    },
    en: {
      title: 'How will you enjoy your meal?',
      subtitle: 'Choose before viewing the menu',
      dinein: 'Dine in',
      dinein_sub: 'View dine-in prices',
      takeaway: 'Takeaway',
      takeaway_sub: 'View takeaway prices',
      loading: 'Loading prices...'
    }
  };

  function objectValue(value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
      } catch (_) {
        return {};
      }
    }
    return {};
  }

  function normalizeLanguages(value) {
    let list = value;
    if (typeof list === 'string') {
      try { list = JSON.parse(list); } catch (_) { list = []; }
    }
    if (!Array.isArray(list)) list = [];
    const clean = ALL.filter(code => list.includes(code));
    return clean.length ? clean : [...ALL];
  }

  function readEnabledCache() {
    try {
      const raw = localStorage.getItem(ENABLED_CACHE_KEY);
      return raw ? normalizeLanguages(JSON.parse(raw)) : null;
    } catch (_) {
      return null;
    }
  }

  function currentLanguage() {
    const value = localStorage.getItem('shorashLang') || 'ar';
    return ALL.includes(value) ? value : 'ar';
  }

  function copyFor(language) {
    const base = DEFAULT_COPY[language] || DEFAULT_COPY.ar;
    const saved = objectValue(gateTexts?.[language]);
    const value = key => {
      const text = String(saved?.[key] ?? '').trim();
      return text || base[key];
    };

    return {
      title: value('title'),
      subtitle: value('subtitle'),
      dinein: value('dinein'),
      dineinSub: value('dinein_sub'),
      takeaway: value('takeaway'),
      takeawaySub: value('takeaway_sub'),
      loading: value('loading')
    };
  }

  async function loadSettings() {
    if (settingsLoaded) return;
    settingsLoaded = true;

    try {
      if (typeof supabaseClient === 'undefined' || !supabaseClient) return;

      const { data, error } = await supabaseClient
        .from(SETTINGS_TABLE)
        .select('dining_gate_texts,enabled_languages,updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      gateTexts = objectValue(data?.dining_gate_texts);
      enabledLanguages = normalizeLanguages(data?.enabled_languages);

      try {
        localStorage.setItem(ENABLED_CACHE_KEY, JSON.stringify(enabledLanguages));
      } catch (_) {}
    } catch (error) {
      console.debug('Dining gate language fallback:', error?.message || error);
    }
  }

  function installStyles() {
    if (document.getElementById('smDiningGateLanguageStyles')) return;

    const style = document.createElement('style');
    style.id = 'smDiningGateLanguageStyles';
    style.textContent = `
      .sm-dining-gate-langs{
        display:flex;
        align-items:center;
        justify-content:center;
        gap:5px;
        width:max-content;
        max-width:100%;
        margin:0 auto 14px;
        padding:4px;
        border:1px solid rgba(226,181,94,.18);
        border-radius:999px;
        background:rgba(0,0,0,.18);
        direction:ltr;
      }
      .sm-dining-gate-langs::before{
        content:'🌐';
        display:grid;
        place-items:center;
        width:27px;
        height:27px;
        font-size:13px;
        opacity:.82;
      }
      .sm-dining-gate-lang{
        min-height:30px;
        padding:0 10px;
        border:0;
        border-radius:999px;
        background:transparent;
        color:#9d958b;
        font:inherit;
        font-size:10px;
        font-weight:800;
        cursor:pointer;
        -webkit-tap-highlight-color:transparent;
        transition:background .16s ease,color .16s ease,transform .16s ease;
      }
      .sm-dining-gate-lang.active{
        background:rgba(226,181,94,.14);
        color:#edc978;
        box-shadow:inset 0 0 0 1px rgba(226,181,94,.16);
      }
      .sm-dining-gate-lang:active{transform:scale(.95)}
      .sm-dining-gate.loading .sm-dining-gate-langs{pointer-events:none;opacity:.5}
      @media(max-width:390px){
        .sm-dining-gate-lang{padding:0 8px;font-size:9.5px}
      }
    `;
    document.head.appendChild(style);
  }

  function renderLanguageButtons(gate) {
    const holder = gate.querySelector('.sm-dining-gate-langs');
    if (!holder) return;

    if (enabledLanguages.length <= 1) {
      holder.hidden = true;
      holder.innerHTML = '';
      return;
    }

    holder.hidden = false;
    const current = currentLanguage();
    holder.innerHTML = enabledLanguages.map(code => `
      <button
        type="button"
        class="sm-dining-gate-lang${code === current ? ' active' : ''}"
        data-lang="${code}"
        data-sm-gate-lang="${code}"
        aria-pressed="${code === current ? 'true' : 'false'}">
        ${LABELS[code]}
      </button>
    `).join('');
  }

  function updateGateCopy(gate, language = currentLanguage()) {
    const t = copyFor(language);
    const card = gate.querySelector('.sm-dining-card');
    if (card) {
      card.lang = language;
      card.dir = language === 'en' ? 'ltr' : 'rtl';
    }

    const title = gate.querySelector('.sm-dining-card > h2');
    const subtitle = gate.querySelector('.sm-dining-card > p');
    const dinein = gate.querySelector('[data-sm-mode="dinein"]');
    const takeaway = gate.querySelector('[data-sm-mode="takeaway"]');
    const loading = gate.querySelector('.sm-dining-loading');

    if (title) title.textContent = t.title;
    if (subtitle) subtitle.textContent = t.subtitle;
    if (dinein) {
      const strong = dinein.querySelector('strong');
      const small = dinein.querySelector('small');
      if (strong) strong.textContent = t.dinein;
      if (small) small.textContent = t.dineinSub;
    }
    if (takeaway) {
      const strong = takeaway.querySelector('strong');
      const small = takeaway.querySelector('small');
      if (strong) strong.textContent = t.takeaway;
      if (small) small.textContent = t.takeawaySub;
    }
    if (loading) loading.textContent = t.loading;

    renderLanguageButtons(gate);
  }

  async function enhanceGate(gate) {
    if (!gate || gate.dataset.smLanguageEnhanced === '1') return;
    gate.dataset.smLanguageEnhanced = '1';
    installStyles();

    const card = gate.querySelector('.sm-dining-card');
    if (!card) return;

    const holder = document.createElement('div');
    holder.className = 'sm-dining-gate-langs';
    holder.setAttribute('aria-label', 'Language');
    card.prepend(holder);

    renderLanguageButtons(gate);
    updateGateCopy(gate);

    gate.addEventListener('click', event => {
      const button = event.target.closest('[data-sm-gate-lang]');
      if (!button) return;

      const language = button.dataset.smGateLang;
      if (!ALL.includes(language) || !enabledLanguages.includes(language)) return;

      try { localStorage.setItem('shorashLang', language); } catch (_) {}

      document.documentElement.lang = language;
      document.documentElement.dir = language === 'en' ? 'ltr' : 'rtl';
      updateGateCopy(gate, language);
    });

    await loadSettings();
    if (document.body.contains(gate)) updateGateCopy(gate);
  }

  function findGate() {
    const gate = document.querySelector('.sm-dining-gate');
    if (gate) void enhanceGate(gate);
  }

  const observer = new MutationObserver(findGate);

  function start() {
    findGate();
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

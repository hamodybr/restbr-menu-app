(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;

  const DEFAULTS = {
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

  const FIELDS = [
    { key: 'title', label: 'العنوان الرئيسي', hint: 'النص الكبير أعلى نافذة الاختيار.' },
    { key: 'subtitle', label: 'النص تحت العنوان', hint: 'التوضيح القصير قبل خياري الطلب.' },
    { key: 'dinein', label: 'اسم خيار داخل المطعم', hint: 'العنوان داخل زر 🍴.' },
    { key: 'dinein_sub', label: 'النص تحت داخل المطعم', hint: 'الوصف الصغير داخل خيار داخل المطعم.' },
    { key: 'takeaway', label: 'اسم خيار سفري', hint: 'العنوان داخل زر 🥡.' },
    { key: 'takeaway_sub', label: 'النص تحت سفري', hint: 'الوصف الصغير داخل خيار سفري.' },
    { key: 'loading', label: 'نص التحميل', hint: 'يظهر بعد اختيار داخل المطعم أو سفري أثناء تجهيز الأسعار.' }
  ];

  let settingsRowId = null;
  let loadedTexts = {};

  function objectValue(value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return JSON.parse(JSON.stringify(value));
    }
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

  function valueFor(source, language, key) {
    const text = String(objectValue(source?.[language])?.[key] ?? '').trim();
    return text || DEFAULTS[language][key];
  }

  function panelHtml() {
    const fields = FIELDS.map(field => `
      <div class="settings-element" data-dining-gate-field="${field.key}">
        <div class="settings-element-head">
          <div>
            <strong>${field.label}</strong>
            <small>${field.hint}</small>
          </div>
        </div>

        <div class="tri-box">
          <div class="tri-tabs" role="tablist" aria-label="لغة ${field.label}">
            <button type="button" class="active" data-dg-lang="ar">عربي</button>
            <button type="button" data-dg-lang="ku">کوردی</button>
            <button type="button" data-dg-lang="en">English</button>
          </div>

          <div class="tri-pane active" data-dg-pane="ar">
            <input id="rs_dining_gate_${field.key}_ar" type="text" autocomplete="off">
          </div>
          <div class="tri-pane" data-dg-pane="ku">
            <input id="rs_dining_gate_${field.key}_ku" type="text" autocomplete="off">
          </div>
          <div class="tri-pane" data-dg-pane="en">
            <input id="rs_dining_gate_${field.key}_en" type="text" autocomplete="off">
          </div>
        </div>
      </div>
    `).join('');

    return `
      <details id="diningGateSettingsPanel" class="settings-accordion">
        <summary>
          <span class="settings-accordion-icon">🍽️</span>
          <span class="settings-accordion-title">
            <strong>نافذة داخل المطعم / سفري</strong>
            <small>تعديل كل النصوص التي تظهر قبل فتح المنيو — عربي، کوردي وEnglish</small>
          </span>
          <span class="settings-chevron">⌄</span>
        </summary>

        <div class="settings-accordion-body">
          <div class="settings-element" style="margin-top:10px;">
            <div class="settings-element-head">
              <div>
                <strong>تخصيص نافذة نوع الطلب</strong>
                <small>عدّل النصوص أدناه ثم استخدم زر «حفظ التغييرات» الرئيسي أعلى صفحة الإعدادات.</small>
              </div>
              <button id="resetDiningGateTextsBtn" class="ui-design-reset" type="button">افتراضي</button>
            </div>
            <div id="diningGateSettingsStatus" class="settings-msg" style="min-height:18px;"></div>
          </div>
          ${fields}
        </div>
      </details>
    `;
  }

  function setStatus(message = '', ok = true) {
    const el = document.getElementById('diningGateSettingsStatus');
    if (!el) return;
    el.textContent = message;
    el.style.color = ok ? '#baf3d7' : '#fecaca';
  }

  function setInputs(source) {
    ['ar', 'ku', 'en'].forEach(language => {
      FIELDS.forEach(field => {
        const input = document.getElementById(`rs_dining_gate_${field.key}_${language}`);
        if (input) input.value = valueFor(source, language, field.key);
      });
    });
  }

  function collectInputs() {
    const result = {};
    ['ar', 'ku', 'en'].forEach(language => {
      result[language] = {};
      FIELDS.forEach(field => {
        const input = document.getElementById(`rs_dining_gate_${field.key}_${language}`);
        result[language][field.key] = String(input?.value ?? '').trim() || DEFAULTS[language][field.key];
      });
    });
    return result;
  }

  function bindTabs(panel) {
    panel.querySelectorAll('[data-dining-gate-field]').forEach(holder => {
      holder.querySelectorAll('[data-dg-lang]').forEach(button => {
        button.addEventListener('click', () => {
          const language = button.dataset.dgLang;
          holder.querySelectorAll('[data-dg-lang]').forEach(btn => {
            btn.classList.toggle('active', btn === button);
          });
          holder.querySelectorAll('[data-dg-pane]').forEach(pane => {
            pane.classList.toggle('active', pane.dataset.dgPane === language);
          });
        });
      });
    });
  }

  function insertPanel() {
    if (document.getElementById('diningGateSettingsPanel')) return document.getElementById('diningGateSettingsPanel');

    const wrap = document.querySelector('#viewTools .settings-clean-wrap');
    if (!wrap) return null;

    const template = document.createElement('template');
    template.innerHTML = panelHtml().trim();
    const panel = template.content.firstElementChild;

    const accordions = [...wrap.querySelectorAll(':scope > details.settings-accordion')];
    const identityPanel = accordions[1];

    if (identityPanel) identityPanel.after(panel);
    else wrap.appendChild(panel);

    bindTabs(panel);

    document.getElementById('resetDiningGateTextsBtn')?.addEventListener('click', () => {
      setInputs(DEFAULTS);
      setStatus('تمت إعادة النصوص للقيم الافتراضية محلياً. اضغط «حفظ التغييرات» لتثبيتها.', true);
    });

    return panel;
  }

  async function loadSettings() {
    insertPanel();
    setStatus('جاري تحميل نصوص النافذة...');

    try {
      if (typeof supabaseClient === 'undefined' || !supabaseClient) {
        throw new Error('Supabase غير جاهز.');
      }

      const { data, error } = await supabaseClient
        .from('restaurant_settings')
        .select('id,dining_gate_texts,updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      settingsRowId = data?.id || null;
      loadedTexts = objectValue(data?.dining_gate_texts);
      setInputs(loadedTexts);
      setStatus('');
    } catch (error) {
      console.error('DINING GATE SETTINGS LOAD ERROR:', error);
      setInputs(DEFAULTS);
      setStatus('تعذر تحميل النصوص المحفوظة، لذلك تظهر القيم الافتراضية.', false);
    }
  }

  async function saveSettings() {
    if (!document.getElementById('diningGateSettingsPanel')) return;

    const texts = collectInputs();
    setStatus('جاري حفظ نصوص نافذة داخل المطعم / سفري...');

    try {
      if (typeof supabaseClient === 'undefined' || !supabaseClient) {
        throw new Error('Supabase غير جاهز.');
      }

      if (!settingsRowId) {
        const { data, error } = await supabaseClient
          .from('restaurant_settings')
          .select('id')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        settingsRowId = data?.id || null;
      }

      if (!settingsRowId) {
        throw new Error('لم أجد سجل إعدادات المطعم.');
      }

      const { error } = await supabaseClient
        .from('restaurant_settings')
        .update({ dining_gate_texts: texts })
        .eq('id', settingsRowId);

      if (error) throw error;

      loadedTexts = texts;
      setStatus('تم حفظ نصوص نافذة داخل المطعم / سفري ✓', true);
    } catch (error) {
      console.error('DINING GATE SETTINGS SAVE ERROR:', error);
      setStatus('فشل حفظ نصوص النافذة: ' + (error?.message || error), false);
    }
  }

  function bindSaveButton() {
    const button = document.getElementById('saveRestaurantSettingsBtn');
    if (!button || button.dataset.diningGateBound === '1') return;
    button.dataset.diningGateBound = '1';
    button.addEventListener('click', () => void saveSettings());
  }

  function start() {
    const panel = insertPanel();
    if (!panel) return;
    bindSaveButton();
    void loadSettings();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

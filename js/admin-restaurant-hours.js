(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;

  const TIMEZONE = 'Asia/Baghdad';
  const DAY_ORDER = ['sat','sun','mon','tue','wed','thu','fri'];
  const DAYS = {
    sat:'السبت', sun:'الأحد', mon:'الاثنين', tue:'الثلاثاء',
    wed:'الأربعاء', thu:'الخميس', fri:'الجمعة'
  };
  const MODE_LABELS = {
    always:'24/7',
    daily:'نفس الوقت كل يوم',
    weekly:'حسب اليوم والوقت'
  };
  const DAY_FROM_SHORT = {
    Sun:'sun', Mon:'mon', Tue:'tue', Wed:'wed', Thu:'thu', Fri:'fri', Sat:'sat'
  };

  let rowId = null;
  let manualOpen = true;
  let currentMode = 'always';
  let currentSchedule = defaultSchedule();

  function defaultSchedule() {
    const weekly = {};
    DAY_ORDER.forEach(day => {
      weekly[day] = { enabled:true, open:'10:00', close:'02:00' };
    });
    return {
      timezone:TIMEZONE,
      daily:{ enabled:true, open:'10:00', close:'02:00' },
      weekly
    };
  }

  function safeObject(value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
      } catch (_) {}
    }
    return {};
  }

  function normalizeSchedule(value) {
    const incoming = safeObject(value);
    const fallback = defaultSchedule();
    const daily = safeObject(incoming.daily);
    const weeklyIncoming = safeObject(incoming.weekly);
    const weekly = {};

    DAY_ORDER.forEach(day => {
      const slot = safeObject(weeklyIncoming[day]);
      weekly[day] = {
        enabled:slot.enabled !== false,
        open:/^\d{2}:\d{2}$/.test(String(slot.open || '')) ? slot.open : fallback.weekly[day].open,
        close:/^\d{2}:\d{2}$/.test(String(slot.close || '')) ? slot.close : fallback.weekly[day].close
      };
    });

    return {
      timezone:TIMEZONE,
      daily:{
        enabled:daily.enabled !== false,
        open:/^\d{2}:\d{2}$/.test(String(daily.open || '')) ? daily.open : fallback.daily.open,
        close:/^\d{2}:\d{2}$/.test(String(daily.close || '')) ? daily.close : fallback.daily.close
      },
      weekly
    };
  }

  function minutes(value) {
    const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return h * 60 + m;
  }

  function baghdadNow() {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone:TIMEZONE,
      weekday:'short',
      hour:'2-digit',
      minute:'2-digit',
      hourCycle:'h23'
    }).formatToParts(new Date());
    const get = type => parts.find(p => p.type === type)?.value || '';
    return {
      day:DAY_FROM_SHORT[get('weekday')] || 'sun',
      minute:Number(get('hour') || 0) * 60 + Number(get('minute') || 0)
    };
  }

  function slotOpenSameDay(slot, nowMinute) {
    if (!slot || slot.enabled === false) return false;
    const start = minutes(slot.open);
    const end = minutes(slot.close);
    if (start === null || end === null) return false;
    if (start === end) return true;
    if (start < end) return nowMinute >= start && nowMinute < end;
    return nowMinute >= start;
  }

  function carryFromPrevious(slot, nowMinute) {
    if (!slot || slot.enabled === false) return false;
    const start = minutes(slot.open);
    const end = minutes(slot.close);
    if (start === null || end === null || start === end) return false;
    return start > end && nowMinute < end;
  }

  function scheduleAllowsOpen(mode, schedule) {
    if (mode === 'always') return true;
    const now = baghdadNow();

    if (mode === 'daily') {
      const slot = schedule.daily;
      const start = minutes(slot.open);
      const end = minutes(slot.close);
      if (slot.enabled === false || start === null || end === null) return false;
      if (start === end) return true;
      return start < end
        ? now.minute >= start && now.minute < end
        : now.minute >= start || now.minute < end;
    }

    const weekly = schedule.weekly || {};
    const sunOrder = ['sun','mon','tue','wed','thu','fri','sat'];
    const index = sunOrder.indexOf(now.day);
    if (slotOpenSameDay(weekly[now.day], now.minute)) return true;
    const prev = sunOrder[(index + 6) % 7];
    return carryFromPrevious(weekly[prev], now.minute);
  }

  function injectStyles() {
    let style = document.getElementById('smRestaurantHoursStyles');
    if (!style) {
      style = document.createElement('style');
      style.id = 'smRestaurantHoursStyles';
      document.head.appendChild(style);
    }

    style.textContent = `
      .sm-hours-box{
        margin-top:12px;border:1px solid rgba(216,169,88,.16);
        border-radius:14px;background:rgba(216,169,88,.035);overflow:hidden
      }
      .sm-hours-toggle{
        width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;
        padding:12px;border:0;background:transparent;color:inherit;font:inherit;text-align:start;
        cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent
      }
      .sm-hours-toggle-main{min-width:0;display:grid;gap:3px}
      .sm-hours-toggle-title{color:#e2b55e;font-size:12px;font-weight:900}
      .sm-hours-toggle-summary{color:#918981;font-size:9px;line-height:1.45;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .sm-hours-chevron{
        flex:0 0 auto;width:28px;height:28px;display:grid;place-items:center;
        border:1px solid rgba(216,169,88,.2);border-radius:9px;color:#d8a958;
        background:rgba(216,169,88,.055);font-size:14px;transition:transform .18s ease
      }
      .sm-hours-box:not(.is-collapsed) .sm-hours-chevron{transform:rotate(180deg)}
      .sm-hours-content{padding:0 12px 12px;border-top:1px solid rgba(255,255,255,.055)}
      .sm-hours-box.is-collapsed .sm-hours-content{display:none}
      .sm-hours-help{color:#817a72;font-size:9px;line-height:1.55;margin:10px 0}
      .sm-hours-mode{
        width:100%;border:1px solid rgba(255,255,255,.09);background:#050403;color:#fff;
        border-radius:11px;padding:11px;font:inherit;font-size:16px;outline:none
      }
      .sm-hours-pane{display:none;margin-top:10px}
      .sm-hours-pane.active{display:block}
      .sm-hours-times,.sm-hours-day-times{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .sm-hours-times label,.sm-hours-day-times label{display:grid;gap:5px;color:#918981;font-size:9px}
      .sm-hours-times input,.sm-hours-day-times input{
        width:100%;min-width:0;border:1px solid rgba(255,255,255,.085);background:#030201;
        color:#f2eee8;border-radius:10px;padding:10px;font:inherit;font-size:16px;
        outline:none;box-sizing:border-box
      }
      .sm-hours-week{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      .sm-hours-day{
        min-width:0;padding:10px;border:1px solid rgba(255,255,255,.065);
        border-radius:12px;background:#070503;transition:opacity .16s ease,border-color .16s ease
      }
      .sm-hours-day-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
      .sm-hours-day-name{color:#ddd5cc;font-size:11px;font-weight:900}
      .sm-hours-day-toggle{
        display:flex;align-items:center;gap:6px;margin:0;color:#cbbda9;font-size:10px;
        cursor:pointer;white-space:nowrap
      }
      .sm-hours-day-toggle input{width:17px;height:17px;margin:0;accent-color:#d8a958}
      .sm-hours-day-state{min-width:34px;text-align:start}
      .sm-hours-day-times{margin-top:9px}
      .sm-hours-day.is-off{opacity:.6}
      .sm-hours-day.is-off .sm-hours-day-times{display:none}
      .sm-hours-day.is-off .sm-hours-day-state{color:#9b9289}
      .sm-hours-note{margin-top:9px;color:#817970;font-size:9px;line-height:1.7}
      .sm-hours-preview{
        margin-top:10px;padding:9px 10px;border-radius:10px;background:#080604;
        border:1px solid rgba(255,255,255,.06);font-size:10px;line-height:1.6;color:#aaa198
      }
      .sm-hours-preview.open{color:#baf3d7;border-color:rgba(52,211,153,.18)}
      .sm-hours-preview.closed{color:#fecaca;border-color:rgba(248,113,113,.18)}
      .sm-hours-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:10px}
      .sm-hours-actions .btn{min-width:150px}
      .sm-hours-status{font-size:10px;color:#8d867e}

      body.admin-light-mode .sm-hours-box,
      body.sm-admin-light .sm-hours-box,
      html[data-admin-theme="light"] .sm-hours-box{
        background:#fffaf3;border-color:rgba(112,79,34,.16)
      }
      body.admin-light-mode .sm-hours-content,
      body.sm-admin-light .sm-hours-content,
      html[data-admin-theme="light"] .sm-hours-content{border-top-color:rgba(104,74,34,.09)}
      body.admin-light-mode .sm-hours-mode,
      body.admin-light-mode .sm-hours-times input,
      body.admin-light-mode .sm-hours-day-times input,
      body.sm-admin-light .sm-hours-mode,
      body.sm-admin-light .sm-hours-times input,
      body.sm-admin-light .sm-hours-day-times input,
      html[data-admin-theme="light"] .sm-hours-mode,
      html[data-admin-theme="light"] .sm-hours-times input,
      html[data-admin-theme="light"] .sm-hours-day-times input{
        background:#fff;color:#2c251e;border-color:rgba(104,74,34,.18)
      }
      body.admin-light-mode .sm-hours-day,
      body.admin-light-mode .sm-hours-preview,
      body.sm-admin-light .sm-hours-day,
      body.sm-admin-light .sm-hours-preview,
      html[data-admin-theme="light"] .sm-hours-day,
      html[data-admin-theme="light"] .sm-hours-preview{
        background:#fff;border-color:rgba(104,74,34,.12)
      }
      body.admin-light-mode .sm-hours-day-name,
      body.sm-admin-light .sm-hours-day-name,
      html[data-admin-theme="light"] .sm-hours-day-name{color:#332a20}
      body.admin-light-mode .sm-hours-day-toggle,
      body.sm-admin-light .sm-hours-day-toggle,
      html[data-admin-theme="light"] .sm-hours-day-toggle{color:#695d51}

      @media(max-width:650px){
        .sm-hours-toggle{padding:11px 10px}
        .sm-hours-content{padding:0 10px 10px}
        .sm-hours-week{grid-template-columns:1fr;gap:7px}
        .sm-hours-day{padding:9px 10px}
        .sm-hours-day-times{gap:7px}
        .sm-hours-times{grid-template-columns:1fr 1fr}
        .sm-hours-actions .btn{width:100%;min-width:0}
      }
    `;
  }

  function buildHtml() {
    return `
      <div class="sm-hours-box is-collapsed" id="smRestaurantHoursBox">
        <button id="smHoursToggle" class="sm-hours-toggle" type="button" aria-expanded="false">
          <span class="sm-hours-toggle-main">
            <span class="sm-hours-toggle-title">🕒 أوقات عمل المطعم</span>
            <span id="smHoursSummary" class="sm-hours-toggle-summary">جاري تحميل الإعدادات...</span>
          </span>
          <span class="sm-hours-chevron" aria-hidden="true">⌄</span>
        </button>

        <div class="sm-hours-content" id="smHoursContent">
          <div class="sm-hours-help">حسب توقيت العراق. زر «المطعم مفتوح» أعلاه يبقى إغلاق يدوي فوري.</div>

          <select id="smHoursMode" class="sm-hours-mode">
            <option value="always">24/7 — مفتوح دائماً</option>
            <option value="daily">نفس الوقت كل يوم</option>
            <option value="weekly">حسب اليوم والوقت</option>
          </select>

          <div class="sm-hours-pane" data-sm-hours-pane="always">
            <div class="sm-hours-note">إذا كان زر «المطعم مفتوح» مفعلاً، يبقى استقبال الطلبات مفتوحاً طوال الأسبوع.</div>
          </div>

          <div class="sm-hours-pane" data-sm-hours-pane="daily">
            <div class="sm-hours-times">
              <label><span>يفتح</span><input id="smDailyOpen" type="time"></label>
              <label><span>يغلق</span><input id="smDailyClose" type="time"></label>
            </div>
            <div class="sm-hours-note">مثال: 10:00 → 02:00 يعني يستمر الدوام بعد منتصف الليل.</div>
          </div>

          <div class="sm-hours-pane" data-sm-hours-pane="weekly">
            <div class="sm-hours-week" id="smHoursWeek">
              ${DAY_ORDER.map(day => `
                <div class="sm-hours-day" data-sm-day="${day}">
                  <div class="sm-hours-day-head">
                    <strong class="sm-hours-day-name">${DAYS[day]}</strong>
                    <label class="sm-hours-day-toggle">
                      <input type="checkbox" data-sm-day-enabled="${day}">
                      <span class="sm-hours-day-state" data-sm-day-state="${day}">مفتوح</span>
                    </label>
                  </div>
                  <div class="sm-hours-day-times">
                    <label><span>يفتح</span><input type="time" data-sm-day-open="${day}"></label>
                    <label><span>يغلق</span><input type="time" data-sm-day-close="${day}"></label>
                  </div>
                </div>
              `).join('')}
            </div>
            <div class="sm-hours-note">إذا أغلقت يوماً، تختفي حقول الوقت لذلك اليوم. والفترات مثل 18:00 → 02:00 مدعومة.</div>
          </div>

          <div id="smHoursPreview" class="sm-hours-preview"></div>
          <div class="sm-hours-actions">
            <button id="smSaveHours" class="btn btn-gold" type="button">حفظ أوقات الدوام</button>
            <span id="smHoursStatus" class="sm-hours-status"></span>
          </div>
        </div>
      </div>
    `;
  }

  function locateStatusBody() {
    const openToggle = document.getElementById('rs_is_open');
    if (!openToggle) return null;
    return openToggle.closest('.settings-accordion-body');
  }

  function injectUi() {
    if (document.getElementById('smRestaurantHoursBox')) return true;
    const body = locateStatusBody();
    if (!body) return false;

    const firstGrid = body.querySelector('.settings-toggle-grid');
    if (firstGrid) firstGrid.insertAdjacentHTML('afterend', buildHtml());
    else body.insertAdjacentHTML('afterbegin', buildHtml());

    bindUi();
    renderValues();
    return true;
  }

  function setCollapsed(collapsed) {
    const box = document.getElementById('smRestaurantHoursBox');
    const toggle = document.getElementById('smHoursToggle');
    if (!box || !toggle) return;
    box.classList.toggle('is-collapsed', collapsed);
    toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  }

  function updateSummary() {
    const summary = document.getElementById('smHoursSummary');
    if (!summary) return;
    const mode = document.getElementById('smHoursMode')?.value || currentMode || 'always';
    const label = MODE_LABELS[mode] || MODE_LABELS.always;
    summary.textContent = `الوضع الحالي: ${label} — اضغط للتعديل`;
  }

  function setStatus(text, ok = true) {
    const el = document.getElementById('smHoursStatus');
    if (!el) return;
    el.textContent = text || '';
    el.style.color = ok ? '#baf3d7' : '#fecaca';
  }

  function renderValues() {
    const mode = document.getElementById('smHoursMode');
    if (!mode) return;
    mode.value = currentMode;

    const dailyOpen = document.getElementById('smDailyOpen');
    const dailyClose = document.getElementById('smDailyClose');
    if (dailyOpen) dailyOpen.value = currentSchedule.daily.open;
    if (dailyClose) dailyClose.value = currentSchedule.daily.close;

    DAY_ORDER.forEach(day => {
      const slot = currentSchedule.weekly[day];
      const enabled = document.querySelector(`[data-sm-day-enabled="${day}"]`);
      const open = document.querySelector(`[data-sm-day-open="${day}"]`);
      const close = document.querySelector(`[data-sm-day-close="${day}"]`);
      if (enabled) enabled.checked = slot.enabled !== false;
      if (open) open.value = slot.open;
      if (close) close.value = slot.close;
      updateDayDisabled(day);
    });

    updatePanes();
    updatePreview();
    updateSummary();
  }

  function updatePanes() {
    const mode = document.getElementById('smHoursMode')?.value || 'always';
    document.querySelectorAll('[data-sm-hours-pane]').forEach(pane => {
      pane.classList.toggle('active', pane.dataset.smHoursPane === mode);
    });
    updateSummary();
  }

  function updateDayDisabled(day) {
    const row = document.querySelector(`[data-sm-day="${day}"]`);
    const toggle = document.querySelector(`[data-sm-day-enabled="${day}"]`);
    const enabled = toggle?.checked !== false;
    row?.classList.toggle('is-off', !enabled);

    const open = document.querySelector(`[data-sm-day-open="${day}"]`);
    const close = document.querySelector(`[data-sm-day-close="${day}"]`);
    const state = document.querySelector(`[data-sm-day-state="${day}"]`);
    if (open) open.disabled = !enabled;
    if (close) close.disabled = !enabled;
    if (state) state.textContent = enabled ? 'مفتوح' : 'مغلق';
  }

  function collect() {
    const mode = document.getElementById('smHoursMode')?.value || 'always';
    const schedule = defaultSchedule();
    schedule.daily.open = document.getElementById('smDailyOpen')?.value || '10:00';
    schedule.daily.close = document.getElementById('smDailyClose')?.value || '02:00';

    DAY_ORDER.forEach(day => {
      schedule.weekly[day] = {
        enabled:document.querySelector(`[data-sm-day-enabled="${day}"]`)?.checked !== false,
        open:document.querySelector(`[data-sm-day-open="${day}"]`)?.value || '10:00',
        close:document.querySelector(`[data-sm-day-close="${day}"]`)?.value || '02:00'
      };
    });

    return { mode, schedule };
  }

  function updatePreview() {
    const preview = document.getElementById('smHoursPreview');
    if (!preview) return;
    const draft = collect();
    const scheduleOpen = scheduleAllowsOpen(draft.mode, draft.schedule);
    const effective = manualOpen && scheduleOpen;

    preview.classList.toggle('open', effective);
    preview.classList.toggle('closed', !effective);

    if (!manualOpen) {
      preview.textContent = '🔴 الآن مغلق — زر «المطعم مفتوح» مطفأ يدوياً.';
    } else if (draft.mode === 'always') {
      preview.textContent = '🟢 الآن مفتوح — وضع 24/7.';
    } else {
      preview.textContent = effective
        ? '🟢 الآن مفتوح حسب جدول الدوام.'
        : '🔴 الآن مغلق حسب جدول الدوام.';
    }
  }

  function bindUi() {
    document.getElementById('smHoursToggle')?.addEventListener('click', () => {
      const box = document.getElementById('smRestaurantHoursBox');
      setCollapsed(!box?.classList.contains('is-collapsed'));
    });

    document.getElementById('smHoursMode')?.addEventListener('change', () => {
      updatePanes();
      updatePreview();
    });
    document.getElementById('smDailyOpen')?.addEventListener('input', updatePreview);
    document.getElementById('smDailyClose')?.addEventListener('input', updatePreview);

    DAY_ORDER.forEach(day => {
      document.querySelector(`[data-sm-day-enabled="${day}"]`)?.addEventListener('change', () => {
        updateDayDisabled(day);
        updatePreview();
      });
      document.querySelector(`[data-sm-day-open="${day}"]`)?.addEventListener('input', updatePreview);
      document.querySelector(`[data-sm-day-close="${day}"]`)?.addEventListener('input', updatePreview);
    });

    document.getElementById('rs_is_open')?.addEventListener('change', event => {
      manualOpen = !!event.target.checked;
      updatePreview();
    });

    document.getElementById('smSaveHours')?.addEventListener('click', saveHours);
  }

  async function loadHours() {
    try {
      if (typeof supabaseClient === 'undefined' || !supabaseClient) return;

      const { data, error } = await supabaseClient
        .from('restaurant_settings')
        .select('id,is_open,restaurant_schedule_mode,restaurant_schedule,updated_at')
        .order('updated_at', { ascending:false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;

      rowId = data?.id || null;
      manualOpen = data?.is_open !== false;
      currentMode = ['always','daily','weekly'].includes(data?.restaurant_schedule_mode)
        ? data.restaurant_schedule_mode
        : 'always';
      currentSchedule = normalizeSchedule(data?.restaurant_schedule);
      injectUi();
      renderValues();
      setCollapsed(true);
    } catch (error) {
      console.error('LOAD RESTAURANT HOURS ERROR:', error);
      setStatus('تعذر تحميل أوقات الدوام: ' + (error.message || error), false);
    }
  }

  async function saveHours() {
    const button = document.getElementById('smSaveHours');
    if (!button) return;
    const draft = collect();

    button.disabled = true;
    button.textContent = 'جاري الحفظ...';
    setStatus('');

    try {
      if (!rowId) throw new Error('إعدادات المطعم غير موجودة.');

      const { error } = await supabaseClient
        .from('restaurant_settings')
        .update({
          restaurant_schedule_mode:draft.mode,
          restaurant_schedule:draft.schedule,
          updated_at:new Date().toISOString()
        })
        .eq('id', rowId);

      if (error) throw error;

      currentMode = draft.mode;
      currentSchedule = draft.schedule;
      manualOpen = document.getElementById('rs_is_open')?.checked !== false;
      updatePreview();
      updateSummary();
      setStatus('تم حفظ أوقات الدوام ✓', true);
    } catch (error) {
      console.error('SAVE RESTAURANT HOURS ERROR:', error);
      setStatus('فشل الحفظ: ' + (error.message || error), false);
    } finally {
      button.disabled = false;
      button.textContent = 'حفظ أوقات الدوام';
    }
  }

  injectStyles();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      injectUi();
      loadHours();
    }, { once:true });
  } else {
    injectUi();
    loadHours();
  }

  const observer = new MutationObserver(() => injectUi());
  observer.observe(document.documentElement, { childList:true, subtree:true });
})();

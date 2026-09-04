(() => {
  if (/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__RESTBR_SECTION_HOURS_HIGHLIGHT_V1__) return;
  window.__RESTBR_SECTION_HOURS_HIGHLIGHT_V1__ = true;

  const AR_DIGITS = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];

  const toArabicDigits = value =>
    String(value).replace(/\d/g, digit => AR_DIGITS[Number(digit)] || digit);

  const normalizeDigits = value =>
    String(value || '').replace(/[٠-٩]/g, digit => String(AR_DIGITS.indexOf(digit)));

  function parseTwoTimes(text) {
    const matches = [...normalizeDigits(text).matchAll(/(\d{1,2}):(\d{2})/g)];
    if (matches.length < 2) return null;

    const read = match => ({ hour:Number(match[1]), minute:Number(match[2]) });
    const from = read(matches[0]);
    const to = read(matches[1]);

    if (
      !Number.isFinite(from.hour) || !Number.isFinite(from.minute) ||
      !Number.isFinite(to.hour) || !Number.isFinite(to.minute)
    ) return null;

    return { from, to };
  }

  function format12(time, language) {
    const hour24 = Math.max(0, Math.min(23, Number(time.hour) || 0));
    const minute = Math.max(0, Math.min(59, Number(time.minute) || 0));
    const hour12 = hour24 % 12 || 12;
    const mm = String(minute).padStart(2, '0');

    if (language === 'ar') {
      return `${toArabicDigits(hour12)}:${toArabicDigits(mm)} ${hour24 < 12 ? 'ص' : 'م'}`;
    }

    return `${hour12}:${mm} ${hour24 < 12 ? 'AM' : 'PM'}`;
  }

  function currentLanguage(text) {
    const saved = String(
      localStorage.getItem('RESTBR_LANG_V1') ||
      localStorage.getItem('shorashLang') ||
      ''
    ).trim();

    if (['ar','ku','en'].includes(saved)) return saved;
    if (/Category\s+available/i.test(text)) return 'en';
    if (/بەشەکە\s+بەردەستە/u.test(text)) return 'ku';
    return 'ar';
  }

  function isCategorySchedule(text) {
    return (
      /القسم\s+متوفر/u.test(text) ||
      /Category\s+available/i.test(text) ||
      /بەشەکە\s+بەردەستە/u.test(text)
    );
  }

  function renderArabic(note, times) {
    const kicker = document.createElement('span');
    kicker.className = 'sm-category-schedule-kicker';
    kicker.textContent = '⏰ وقت توفر القسم';

    const range = document.createElement('strong');
    range.className = 'sm-category-schedule-range';
    range.dir = 'rtl';

    const from = document.createElement('bdi');
    from.textContent = format12(times.from, 'ar');
    const to = document.createElement('bdi');
    to.textContent = format12(times.to, 'ar');

    range.append('من ', from, ' إلى ', to);
    note.replaceChildren(kicker, range);
    note.dir = 'rtl';
  }

  function renderEnglish(note, times) {
    const kicker = document.createElement('span');
    kicker.className = 'sm-category-schedule-kicker';
    kicker.textContent = '⏰ Category hours';

    const range = document.createElement('strong');
    range.className = 'sm-category-schedule-range';
    range.dir = 'ltr';
    range.textContent = `From ${format12(times.from, 'en')} to ${format12(times.to, 'en')}`;

    note.replaceChildren(kicker, range);
    note.dir = 'ltr';
  }

  function placeUnderUnavailable(note) {
    const card = note.closest('.sm-card');
    const unavailable = card?.querySelector('.sm-off');
    if (!card || !unavailable) return;

    note.classList.add('sm-category-schedule-under-unavailable');
    if (note.parentElement !== card) card.appendChild(note);
  }

  function enhanceNote(note) {
    if (!(note instanceof Element)) return;

    const liveText = String(note.textContent || '').replace(/\s+/g, ' ').trim();
    if (!liveText || liveText === note.dataset.smScheduleRendered) return;

    if (!isCategorySchedule(liveText)) return;

    const times = parseTwoTimes(liveText);
    if (!times) return;

    note.classList.add('sm-category-schedule-highlight');
    const language = currentLanguage(liveText);

    if (language === 'ar') renderArabic(note, times);
    else if (language === 'en') renderEnglish(note, times);
    else note.dir = 'rtl';

    placeUnderUnavailable(note);
    note.dataset.smScheduleRendered = String(note.textContent || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function refresh(root = document) {
    if (root instanceof Element && root.matches('.sm-schedule-note')) enhanceNote(root);
    root.querySelectorAll?.('.sm-schedule-note').forEach(enhanceNote);
  }

  function installStyles() {
    if (document.getElementById('restbrSectionHoursHighlightStyles')) return;

    const style = document.createElement('style');
    style.id = 'restbrSectionHoursHighlightStyles';
    style.textContent = `
      .sm-schedule-note.sm-category-schedule-highlight{
        isolation:isolate;
        overflow:hidden;
        width:max-content;
        max-width:96%;
        padding:6px 11px 7px !important;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:2px;
        border:1px solid rgba(232,184,98,.62);
        border-radius:999px;
        background:radial-gradient(circle at 50% -30%,rgba(255,220,145,.2),transparent 60%),linear-gradient(135deg,rgba(91,56,20,.92),rgba(18,11,6,.94));
        color:#ffe0a0 !important;
        box-shadow:inset 0 1px 0 rgba(255,236,188,.15),0 0 0 1px rgba(232,184,98,.07),0 7px 18px rgba(0,0,0,.22),0 0 17px rgba(216,169,88,.14);
        backdrop-filter:blur(10px);
        -webkit-backdrop-filter:blur(10px);
        text-align:center;
        line-height:1.25 !important;
        box-sizing:border-box;
        pointer-events:none;
      }

      .sm-card > .sm-schedule-note.sm-category-schedule-under-unavailable{
        position:absolute !important;
        z-index:24 !important;
        left:50% !important;
        right:auto !important;
        top:calc(50% + 30px) !important;
        transform:translateX(-50%) !important;
        margin:0 !important;
        max-width:calc(100% - 24px) !important;
      }

      .sm-schedule-note.sm-category-schedule-highlight::after{
        content:"";
        position:absolute;
        z-index:-1;
        inset:-40% auto -40% -55%;
        width:38%;
        transform:skewX(-18deg);
        background:linear-gradient(90deg,transparent,rgba(255,229,167,.16),transparent);
        animation:smCategoryHoursShine 4.2s ease-in-out infinite;
        pointer-events:none;
      }

      .sm-category-schedule-kicker{
        display:block;
        color:rgba(255,222,149,.82);
        font-size:7.8px !important;
        font-weight:800;
        line-height:1.2;
        white-space:nowrap;
      }

      .sm-category-schedule-range{
        display:block;
        color:#ffe7ad;
        font-size:10.5px !important;
        font-weight:950;
        line-height:1.35;
        white-space:nowrap;
        text-shadow:0 1px 10px rgba(216,169,88,.16);
        font-variant-numeric:tabular-nums;
      }

      .sm-category-schedule-range bdi{
        unicode-bidi:isolate;
        font-weight:950;
      }

      @keyframes smCategoryHoursShine{
        0%,68%,100%{left:-55%;opacity:0}
        74%{opacity:1}
        88%{left:125%;opacity:.45}
      }

      @media (prefers-reduced-motion:reduce){
        .sm-schedule-note.sm-category-schedule-highlight::after{animation:none}
      }
    `;

    document.head.appendChild(style);
  }

  function start() {
    installStyles();
    refresh();

    let queued = false;
    const scheduleRefresh = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        refresh();
      });
    };

    new MutationObserver(scheduleRefresh).observe(document.body, {
      subtree:true,
      childList:true,
      characterData:true
    });

    window.addEventListener('restbr:ready', scheduleRefresh);
    document.addEventListener('click', event => {
      if (event.target.closest('[data-lang]')) setTimeout(scheduleRefresh, 40);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once:true });
  } else {
    start();
  }
})();

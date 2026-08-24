(() => {
  if (/(?:^|\/)admin\.html$/i.test(location.pathname)) return;

  const TIMEZONE = 'Asia/Baghdad';
  const DAY_KEYS = ['sun','mon','tue','wed','thu','fri','sat'];
  const DAY_FROM_SHORT = {
    Sun:'sun', Mon:'mon', Tue:'tue', Wed:'wed', Thu:'thu', Fri:'fri', Sat:'sat'
  };
  const ORDER_SELECTOR = '.sm-add-cart,.sm-direct-add,.sm-choose-options,[data-choice-product],#smCartContinue,#smSendWhatsApp';

  // Fail closed during the short startup window until the real opening-hours
  // state has been loaded and applied to SHORASH_DB.
  window.SHORASH_HOURS_READY = false;
  document.documentElement.classList.add('sm-hours-pending');

  let settings = {
    manualOpen:true,
    mode:'always',
    schedule:{}
  };
  let loaded = false;
  let lastEffective = null;
  let broadcastLock = false;

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

    const get = type => parts.find(part => part.type === type)?.value || '';
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

  function carriesFromPreviousDay(slot, nowMinute) {
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
      const slot = safeObject(schedule.daily);
      if (slot.enabled === false) return false;
      const start = minutes(slot.open);
      const end = minutes(slot.close);
      if (start === null || end === null) return false;
      if (start === end) return true;
      return start < end
        ? now.minute >= start && now.minute < end
        : now.minute >= start || now.minute < end;
    }

    if (mode === 'weekly') {
      const weekly = safeObject(schedule.weekly);
      const todayIndex = DAY_KEYS.indexOf(now.day);
      const today = safeObject(weekly[now.day]);

      if (slotOpenSameDay(today, now.minute)) return true;

      const prevKey = DAY_KEYS[(todayIndex + 6) % 7];
      const previous = safeObject(weekly[prevKey]);
      return carriesFromPreviousDay(previous, now.minute);
    }

    return true;
  }

  function lang() {
    return localStorage.getItem('shorashLang') || 'ar';
  }

  function closedText(scheduleOpen) {
    const restaurant = window.SHORASH_DB?.restaurant || {};
    const custom = safeObject(restaurant.closedMessage);
    const current = lang();
    const customText = custom[current] || custom.ar || custom.en || '';
    if (customText) return customText;

    if (!settings.manualOpen) {
      if (current === 'en') return 'The restaurant is currently closed.';
      if (current === 'ku') return 'چێشتخانە لە ئێستادا داخراوە.';
      return 'المطعم مغلق حالياً.';
    }

    if (!scheduleOpen) {
      if (current === 'en') return 'The restaurant is currently closed according to opening hours.';
      if (current === 'ku') return 'چێشتخانە بەپێی کاتەکانی کارکردن لە ئێستادا داخراوە.';
      return 'المطعم مغلق حالياً حسب أوقات الدوام.';
    }

    return '';
  }

  function ensureBanner() {
    let banner = document.getElementById('smRestaurantClosedBanner');
    if (banner) return banner;

    if (!document.getElementById('smRestaurantClosedBannerStyle')) {
      const style = document.createElement('style');
      style.id = 'smRestaurantClosedBannerStyle';
      style.textContent = `
        #smRestaurantClosedBanner{
          position:fixed;
          z-index:999;
          top:calc(8px + env(safe-area-inset-top));
          left:50%;
          width:min(calc(100% - 20px),680px);
          margin:0;
          padding:11px 13px;
          box-sizing:border-box;
          border:1px solid rgba(244,184,82,.58);
          border-radius:13px;
          background:rgba(63,29,8,.96);
          color:#ffd67e;
          text-align:center;
          font-size:12px;
          font-weight:900;
          line-height:1.55;
          letter-spacing:.1px;
          box-shadow:0 10px 28px rgba(0,0,0,.28),0 0 0 0 rgba(244,184,82,.48);
          backdrop-filter:blur(14px);
          -webkit-backdrop-filter:blur(14px);
          transform:translateX(-50%) scale(1);
          transform-origin:center;
          animation:smRestaurantClosedPulse 1.05s ease-in-out infinite;
          pointer-events:none;
        }
        #smRestaurantClosedBanner[hidden]{display:none!important}
        body.sm-hours-closed #smOrderStateBanner{display:none!important}
        body.sm-hours-closed .sm-cats-wrap{top:calc(64px + env(safe-area-inset-top))!important}
        body.sm-hours-closed .sm-add-cart,
        body.sm-hours-closed .sm-direct-add,
        body.sm-hours-closed .sm-choose-options,
        body.sm-hours-closed [data-choice-product],
        body.sm-hours-closed #smCartContinue,
        body.sm-hours-closed #smSendWhatsApp{
          pointer-events:none!important;
          opacity:.46!important;
          filter:saturate(.55)!important;
        }
        @keyframes smRestaurantClosedPulse{
          0%,100%{
            transform:translateX(-50%) scale(1);
            box-shadow:0 10px 28px rgba(0,0,0,.28),0 0 0 0 rgba(244,184,82,.42);
            background:rgba(63,29,8,.96)
          }
          50%{
            transform:translateX(-50%) scale(1.018);
            box-shadow:0 13px 34px rgba(0,0,0,.36),0 0 0 6px rgba(244,184,82,.12),0 0 24px rgba(244,184,82,.28);
            background:rgba(91,37,8,.98)
          }
        }
        @media(prefers-reduced-motion:reduce){
          #smRestaurantClosedBanner{animation:none}
        }
      `;
      document.head.appendChild(style);
    }

    banner = document.createElement('div');
    banner.id = 'smRestaurantClosedBanner';
    banner.hidden = true;
    banner.setAttribute('role', 'alert');
    banner.setAttribute('aria-live', 'assertive');

    const header = document.querySelector('.sm-header');
    if (header?.parentNode) header.insertAdjacentElement('afterend', banner);
    else document.body.prepend(banner);

    return banner;
  }

  function renderBanner(effective, scheduleOpen) {
    const banner = ensureBanner();
    document.body.classList.toggle('sm-hours-closed', !effective);

    if (effective) {
      banner.hidden = true;
      banner.textContent = '';
      return;
    }

    banner.textContent = '⏰ ' + closedText(scheduleOpen);
    banner.hidden = false;
  }

  function markResolved() {
    if (window.SHORASH_HOURS_READY === true) return;
    window.SHORASH_HOURS_READY = true;
    document.documentElement.classList.remove('sm-hours-pending');
    window.dispatchEvent(new CustomEvent('shorash:hours-ready'));
  }

  function applyToMenu({ broadcast = false } = {}) {
    const restaurant = window.SHORASH_DB?.restaurant;
    if (!restaurant || !loaded) return false;

    const scheduleOpen = scheduleAllowsOpen(settings.mode, settings.schedule);
    const effective = settings.manualOpen && scheduleOpen;
    const changed = lastEffective !== effective || restaurant.isOpen !== effective;

    restaurant.manualIsOpen = settings.manualOpen;
    restaurant.scheduleMode = settings.mode;
    restaurant.scheduleOpen = scheduleOpen;
    restaurant.isOpen = effective;
    restaurant.restaurantSchedule = settings.schedule;

    renderBanner(effective, scheduleOpen);
    lastEffective = effective;

    // Only release the startup order lock after the real state has already
    // been written to the shared restaurant model and the closed class/banner.
    markResolved();

    if (changed && broadcast && !broadcastLock) {
      broadcastLock = true;
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('shorash:ready', {
          detail:{ reason:'restaurant-hours' }
        }));
        broadcastLock = false;
      }, 0);
    }

    return changed;
  }

  async function loadSettings() {
    try {
      if (typeof supabaseClient === 'undefined' || !supabaseClient) return;

      const { data, error } = await supabaseClient
        .from('restaurant_settings')
        .select('is_open,restaurant_schedule_mode,restaurant_schedule,updated_at')
        .order('updated_at', { ascending:false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      settings = {
        manualOpen:data?.is_open !== false,
        mode:['always','daily','weekly'].includes(data?.restaurant_schedule_mode)
          ? data.restaurant_schedule_mode
          : 'always',
        schedule:safeObject(data?.restaurant_schedule)
      };
      loaded = true;
      applyToMenu({ broadcast:true });
    } catch (error) {
      console.warn('Restaurant hours could not be loaded:', error);
      // Keep ordering locked when the current opening-hours state is unknown.
    }
  }

  // Hard click guard: CSS handles appearance, this capture listener prevents
  // accidental ordering even during render/event timing races.
  document.addEventListener('click', event => {
    const orderControl = event.target.closest?.(ORDER_SELECTOR);
    if (!orderControl) return;

    if (window.SHORASH_HOURS_READY !== true || document.body.classList.contains('sm-hours-closed')) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener('shorash:ready', () => {
    applyToMenu({ broadcast:false });
  });

  document.addEventListener('click', event => {
    if (!event.target.closest('[data-lang]')) return;
    setTimeout(() => applyToMenu({ broadcast:false }), 40);
  });

  loadSettings();
  setInterval(() => applyToMenu({ broadcast:true }), 30000);
  setInterval(loadSettings, 60000);
})();

(() => {
  if (/(?:^|\/)admin\.html$/i.test(location.pathname)) return;

  const TIMEZONE = 'Asia/Baghdad';
  const DAY_KEYS = ['sun','mon','tue','wed','thu','fri','sat'];
  const DAY_FROM_SHORT = {
    Sun:'sun', Mon:'mon', Tue:'tue', Wed:'wed', Thu:'thu', Fri:'fri', Sat:'sat'
  };

  let settings = {
    manualOpen: true,
    mode: 'always',
    schedule: {}
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
      timeZone: TIMEZONE,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(new Date());

    const get = type => parts.find(part => part.type === type)?.value || '';
    return {
      day: DAY_FROM_SHORT[get('weekday')] || 'sun',
      minute: Number(get('hour') || 0) * 60 + Number(get('minute') || 0)
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
      if (!slot || slot.enabled === false) return false;
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

    lastEffective = effective;

    if (changed && broadcast && !broadcastLock) {
      broadcastLock = true;
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('shorash:ready', {
          detail: { reason: 'restaurant-hours' }
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
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      settings = {
        manualOpen: data?.is_open !== false,
        mode: ['always','daily','weekly'].includes(data?.restaurant_schedule_mode)
          ? data.restaurant_schedule_mode
          : 'always',
        schedule: safeObject(data?.restaurant_schedule)
      };
      loaded = true;
      applyToMenu({ broadcast: true });
    } catch (error) {
      console.warn('Restaurant hours could not be loaded:', error);
    }
  }

  window.addEventListener('shorash:ready', () => {
    applyToMenu({ broadcast: false });
  });

  loadSettings();

  // Re-evaluate locally around opening/closing boundaries.
  setInterval(() => applyToMenu({ broadcast: true }), 30000);

  // Pick up admin schedule/manual changes without requiring a long-lived tab refresh.
  setInterval(loadSettings, 60000);
})();

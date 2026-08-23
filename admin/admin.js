(() => {
  'use strict';

  const $ = s => document.querySelector(s);

  const state = {
    client: null,
    user: null,
    restaurants: [],
    domains: [],
    subscriptions: [],
    loading: false
  };

  const els = {
    loginView: $('#loginView'),
    appView: $('#appView'),
    loginForm: $('#loginForm'),
    loginEmail: $('#loginEmail'),
    loginPassword: $('#loginPassword'),
    loginBtn: $('#loginBtn'),
    loginMsg: $('#loginMsg'),
    logoutBtn: $('#logoutBtn'),
    refreshBtn: $('#refreshBtn'),
    themeBtn: $('#themeBtn'),
    statTotal: $('#statTotal'),
    statActive: $('#statActive'),
    statSuspended: $('#statSuspended'),
    statSubs: $('#statSubs'),
    lastUpdated: $('#lastUpdated'),
    searchInput: $('#searchInput'),
    restaurantList: $('#restaurantList'),
    emptyState: $('#emptyState'),
    addRestaurantBtn: $('#addRestaurantBtn'),
    modalBackdrop: $('#modalBackdrop'),
    restaurantModal: $('#restaurantModal'),
    closeModalBtn: $('#closeModalBtn'),
    cancelModalBtn: $('#cancelModalBtn'),
    restaurantForm: $('#restaurantForm'),
    restaurantName: $('#restaurantName'),
    restaurantSlug: $('#restaurantSlug'),
    restaurantPlan: $('#restaurantPlan'),
    restaurantPhone: $('#restaurantPhone'),
    restaurantWhatsapp: $('#restaurantWhatsapp'),
    restaurantLanguage: $('#restaurantLanguage'),
    restaurantCurrency: $('#restaurantCurrency'),
    slugPreview: $('#slugPreview'),
    urlPreview: $('#urlPreview'),
    createMsg: $('#createMsg'),
    createRestaurantBtn: $('#createRestaurantBtn'),
    toast: $('#toast')
  };

  function esc(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function setMessage(el, text = '', kind = '') {
    if (!el) return;
    el.textContent = text;
    el.className = `message${kind ? ` ${kind}` : ''}`;
  }

  let toastTimer = null;
  function toast(text) {
    clearTimeout(toastTimer);
    els.toast.textContent = text;
    els.toast.classList.remove('hidden');
    toastTimer = setTimeout(() => els.toast.classList.add('hidden'), 2400);
  }

  function normalizeSlug(value) {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 63);
  }

  function showLogin() {
    els.loginView.classList.remove('hidden');
    els.appView.classList.add('hidden');
  }

  function showApp() {
    els.loginView.classList.add('hidden');
    els.appView.classList.remove('hidden');
  }

  async function getPlatformConfig() {
    const response = await fetch('/_restbr/platform-config', {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok || !data?.supabase_url || !data?.publishable_key) {
      throw new Error(data?.message || 'تعذر تحميل إعدادات المنصة. تأكد من نشر RESTBR Router.');
    }
    return data;
  }

  async function isPlatformAdmin(userId) {
    const { data, error } = await state.client
      .from('platform_admins')
      .select('user_id,is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return Boolean(data?.user_id);
  }

  async function acceptSession(session) {
    if (!session?.user) {
      state.user = null;
      showLogin();
      return false;
    }

    const allowed = await isPlatformAdmin(session.user.id);
    if (!allowed) {
      await state.client.auth.signOut();
      throw new Error('هذا الحساب ليس Super Admin في RESTBR.');
    }

    state.user = session.user;
    showApp();
    await loadDashboard();
    return true;
  }

  async function boot() {
    try {
      const theme = localStorage.getItem('RESTBR_ADMIN_THEME');
      if (theme === 'light') document.documentElement.dataset.theme = 'light';

      const config = await getPlatformConfig();
      state.client = window.supabase.createClient(
        config.supabase_url,
        config.publishable_key,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        }
      );

      const { data, error } = await state.client.auth.getSession();
      if (error) throw error;

      if (data?.session) {
        await acceptSession(data.session);
      } else {
        showLogin();
      }

      state.client.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') {
          state.user = null;
          showLogin();
        }
      });
    } catch (error) {
      console.error(error);
      showLogin();
      setMessage(els.loginMsg, error?.message || 'تعذر تشغيل لوحة RESTBR.', 'error');
    }
  }

  async function login(event) {
    event.preventDefault();
    setMessage(els.loginMsg, '');
    els.loginBtn.disabled = true;
    els.loginBtn.textContent = 'جاري الدخول...';

    try {
      const { data, error } = await state.client.auth.signInWithPassword({
        email: els.loginEmail.value.trim(),
        password: els.loginPassword.value
      });
      if (error) throw error;
      await acceptSession(data.session);
      els.loginPassword.value = '';
    } catch (error) {
      console.error(error);
      setMessage(els.loginMsg, error?.message || 'فشل تسجيل الدخول.', 'error');
    } finally {
      els.loginBtn.disabled = false;
      els.loginBtn.textContent = 'تسجيل الدخول';
    }
  }

  async function loadDashboard() {
    if (!state.client || state.loading) return;
    state.loading = true;
    els.refreshBtn.disabled = true;

    try {
      const [restaurantsResult, domainsResult, subscriptionsResult] = await Promise.all([
        state.client
          .from('restaurants')
          .select('id,name,slug,status,default_language,timezone,currency,created_at,updated_at')
          .order('created_at', { ascending: false }),
        state.client
          .from('restaurant_domains')
          .select('restaurant_id,hostname,status,is_verified,is_primary'),
        state.client
          .from('subscriptions')
          .select('restaurant_id,plan,status,starts_at,expires_at')
      ]);

      if (restaurantsResult.error) throw restaurantsResult.error;
      if (domainsResult.error) throw domainsResult.error;
      if (subscriptionsResult.error) throw subscriptionsResult.error;

      state.restaurants = restaurantsResult.data || [];
      state.domains = domainsResult.data || [];
      state.subscriptions = subscriptionsResult.data || [];

      render();
      els.lastUpdated.textContent = `آخر تحديث: ${new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}`;
    } catch (error) {
      console.error(error);
      toast(error?.message || 'فشل تحميل بيانات المطاعم.');
    } finally {
      state.loading = false;
      els.refreshBtn.disabled = false;
    }
  }

  function domainFor(restaurantId) {
    return state.domains.find(d => d.restaurant_id === restaurantId && d.is_primary)
      || state.domains.find(d => d.restaurant_id === restaurantId)
      || null;
  }

  function subscriptionFor(restaurantId) {
    return state.subscriptions.find(s => s.restaurant_id === restaurantId) || null;
  }

  function statusLabel(status) {
    return ({
      active: 'نشط',
      suspended: 'موقوف',
      draft: 'مسودة',
      archived: 'مؤرشف'
    })[status] || status;
  }

  function renderStats() {
    const total = state.restaurants.length;
    const active = state.restaurants.filter(r => r.status === 'active').length;
    const suspended = state.restaurants.filter(r => r.status === 'suspended').length;
    const subs = state.subscriptions.filter(s => s.status === 'active' || s.status === 'trial').length;

    els.statTotal.textContent = total;
    els.statActive.textContent = active;
    els.statSuspended.textContent = suspended;
    els.statSubs.textContent = subs;
  }

  function renderRestaurants() {
    const q = els.searchInput.value.trim().toLowerCase();
    const rows = state.restaurants.filter(r => {
      const d = domainFor(r.id);
      const haystack = `${r.name} ${r.slug} ${d?.hostname || ''}`.toLowerCase();
      return !q || haystack.includes(q);
    });

    els.emptyState.classList.toggle('hidden', rows.length > 0);
    els.restaurantList.innerHTML = rows.map(r => {
      const domain = domainFor(r.id);
      const sub = subscriptionFor(r.id);
      const hostname = domain?.hostname || `${r.slug}.restbr.com`;
      const url = `https://${hostname}`;
      const manageUrl = `https://hamodybr.github.io/restbr-menu-app/owner/?tenant=${encodeURIComponent(r.slug)}&mode=superadmin`;
      const nextStatus = r.status === 'active' ? 'suspended' : 'active';
      const nextLabel = r.status === 'active' ? 'إيقاف' : 'تفعيل';

      return `
        <article class="restaurant-card" data-id="${esc(r.id)}">
          <div class="restaurant-main">
            <h4>${esc(r.name)}</h4>
            <a href="${esc(url)}" target="_blank" rel="noopener">${esc(hostname)}</a>
          </div>

          <div class="meta">
            <span>الحالة</span>
            <strong class="status-pill status-${esc(r.status)}">${esc(statusLabel(r.status))}</strong>
          </div>

          <div class="meta">
            <span>الخطة</span>
            <strong>${esc(sub?.plan || '—')}</strong>
          </div>

          <div class="card-actions">
            <button class="mini-btn manage" data-action="manage" data-url="${esc(manageUrl)}">⚙ إدارة المطعم</button>
            <button class="mini-btn" data-action="open" data-url="${esc(url)}">فتح المنيو</button>
            <button class="mini-btn" data-action="copy" data-url="${esc(url)}">نسخ الرابط</button>
            <button class="mini-btn ${nextStatus === 'suspended' ? 'danger' : ''}" data-action="status" data-id="${esc(r.id)}" data-status="${nextStatus}">${nextLabel}</button>
          </div>
        </article>
      `;
    }).join('');
  }

  function render() {
    renderStats();
    renderRestaurants();
  }

  function openModal() {
    els.restaurantForm.reset();
    els.restaurantPlan.value = 'basic';
    els.restaurantLanguage.value = 'ar';
    els.restaurantCurrency.value = 'IQD';
    setMessage(els.createMsg, '');
    updateSlugPreview();
    els.modalBackdrop.classList.remove('hidden');
    els.restaurantModal.classList.remove('hidden');
    els.restaurantModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => els.restaurantName.focus(), 50);
  }

  function closeModal() {
    els.modalBackdrop.classList.add('hidden');
    els.restaurantModal.classList.add('hidden');
    els.restaurantModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function updateSlugPreview() {
    const slug = normalizeSlug(els.restaurantSlug.value) || 'yourcoffee';
    els.restaurantSlug.value = normalizeSlug(els.restaurantSlug.value);
    els.slugPreview.textContent = `${slug}.restbr.com`;
    els.urlPreview.textContent = `https://${slug}.restbr.com`;
  }

  async function createRestaurant(event) {
    event.preventDefault();
    setMessage(els.createMsg, '');

    const name = els.restaurantName.value.trim();
    const slug = normalizeSlug(els.restaurantSlug.value);

    if (!name || slug.length < 2) {
      setMessage(els.createMsg, 'اكتب اسم المطعم وSlug صالح مثل yourcoffee.', 'error');
      return;
    }

    els.createRestaurantBtn.disabled = true;
    els.createRestaurantBtn.textContent = 'جاري الإنشاء...';

    try {
      const { data, error } = await state.client.rpc('admin_create_restaurant', {
        p_name: name,
        p_slug: slug,
        p_default_language: els.restaurantLanguage.value,
        p_timezone: 'Asia/Baghdad',
        p_currency: els.restaurantCurrency.value.trim() || 'IQD',
        p_phone: els.restaurantPhone.value.trim(),
        p_whatsapp: els.restaurantWhatsapp.value.trim(),
        p_plan: els.restaurantPlan.value
      });

      if (error) throw error;
      setMessage(els.createMsg, `تم إنشاء ${data?.hostname || `${slug}.restbr.com`} بنجاح.`, 'success');
      toast('تم إنشاء المطعم وهو جاهز للإدارة مباشرة ✅');
      await loadDashboard();
      setTimeout(closeModal, 850);
    } catch (error) {
      console.error(error);
      const msg = String(error?.message || 'فشل إنشاء المطعم.');
      let friendly = msg;
      if (/duplicate key|unique/i.test(msg)) friendly = 'هذا الـSlug أو الدومين مستخدم مسبقًا.';
      if (/reserved slug/i.test(msg)) friendly = 'هذا الـSlug محجوز للمنصة. اختر اسمًا آخر.';
      if (/function .*admin_create_restaurant.* does not exist/i.test(msg)) friendly = 'وظيفة إنشاء المطعم غير موجودة في Supabase.';
      setMessage(els.createMsg, friendly, 'error');
    } finally {
      els.createRestaurantBtn.disabled = false;
      els.createRestaurantBtn.textContent = 'إنشاء المطعم';
    }
  }

  async function changeStatus(id, status, button) {
    button.disabled = true;
    try {
      const { error } = await state.client
        .from('restaurants')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      toast(status === 'active' ? 'تم تفعيل المطعم ✅' : 'تم إيقاف المطعم مؤقتًا.');
      await loadDashboard();
    } catch (error) {
      console.error(error);
      toast(error?.message || 'تعذر تغيير الحالة.');
    } finally {
      button.disabled = false;
    }
  }

  async function handleRestaurantAction(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;

    if (action === 'manage') {
      window.open(button.dataset.url, '_blank', 'noopener');
      return;
    }

    if (action === 'open') {
      window.open(button.dataset.url, '_blank', 'noopener');
      return;
    }

    if (action === 'copy') {
      try {
        await navigator.clipboard.writeText(button.dataset.url || '');
        toast('تم نسخ الرابط.');
      } catch (_) {
        toast(button.dataset.url || '');
      }
      return;
    }

    if (action === 'status') {
      const status = button.dataset.status;
      const question = status === 'suspended'
        ? 'إيقاف هذا المطعم؟ سيصبح الرابط غير متاح للعملاء حتى تعيد تفعيله.'
        : 'إعادة تفعيل هذا المطعم؟';
      if (!window.confirm(question)) return;
      await changeStatus(button.dataset.id, status, button);
    }
  }

  async function logout() {
    if (!state.client) return;
    await state.client.auth.signOut();
    state.restaurants = [];
    state.domains = [];
    state.subscriptions = [];
    showLogin();
  }

  function toggleTheme() {
    const light = document.documentElement.dataset.theme === 'light';
    if (light) {
      delete document.documentElement.dataset.theme;
      localStorage.setItem('RESTBR_ADMIN_THEME', 'dark');
    } else {
      document.documentElement.dataset.theme = 'light';
      localStorage.setItem('RESTBR_ADMIN_THEME', 'light');
    }
  }

  els.loginForm.addEventListener('submit', login);
  els.logoutBtn.addEventListener('click', logout);
  els.refreshBtn.addEventListener('click', loadDashboard);
  els.themeBtn.addEventListener('click', toggleTheme);
  els.searchInput.addEventListener('input', renderRestaurants);
  els.addRestaurantBtn.addEventListener('click', openModal);
  els.closeModalBtn.addEventListener('click', closeModal);
  els.cancelModalBtn.addEventListener('click', closeModal);
  els.modalBackdrop.addEventListener('click', closeModal);
  els.restaurantForm.addEventListener('submit', createRestaurant);
  els.restaurantSlug.addEventListener('input', updateSlugPreview);
  els.restaurantName.addEventListener('input', () => {
    if (!els.restaurantSlug.dataset.touched) {
      const candidate = normalizeSlug(els.restaurantName.value);
      if (candidate) {
        els.restaurantSlug.value = candidate;
        updateSlugPreview();
      }
    }
  });
  els.restaurantSlug.addEventListener('keydown', () => {
    els.restaurantSlug.dataset.touched = '1';
  });
  els.restaurantList.addEventListener('click', handleRestaurantAction);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !els.restaurantModal.classList.contains('hidden')) closeModal();
  });

  boot();
})();

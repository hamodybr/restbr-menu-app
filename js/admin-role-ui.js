(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;
  if (window.__RESTBR_ADMIN_ROLE_UI_V1__) return;
  window.__RESTBR_ADMIN_ROLE_UI_V1__ = true;

  const ROLE_LABELS = {
    super_admin: 'مدير النظام',
    owner: 'صاحب المطعم',
    manager: 'مدير',
    menu_editor: 'محرر المنيو',
    viewer: 'مشاهدة فقط'
  };

  const VALID_ROLES = new Set(Object.keys(ROLE_LABELS));
  let currentProfile = null;
  let observer = null;
  let applyTimer = null;

  document.documentElement.classList.add('restbr-role-pending');

  function q(sel, root = document){ return root.querySelector(sel); }
  function qa(sel, root = document){ return [...root.querySelectorAll(sel)]; }
  function roleLabel(role){ return ROLE_LABELS[role] || role || 'بدون صلاحية'; }

  function installStyles(){
    if (q('#restbrAdminRoleStyles')) return;
    const style = document.createElement('style');
    style.id = 'restbrAdminRoleStyles';
    style.textContent = `
      html.restbr-role-pending body:not(.auth-locked) > .admin-main,
      html.restbr-role-pending body:not(.auth-locked) > .bottom-nav{visibility:hidden!important}
      .restbr-role-hidden{display:none!important}
      #adminRoleBadge{display:inline-flex;align-items:center;width:max-content;max-width:100%;margin-top:4px;padding:3px 7px;border:1px solid rgba(216,169,88,.22);border-radius:999px;background:rgba(216,169,88,.06);color:#e2b55e;font-size:9px;font-weight:800;line-height:1.3}
      .restbr-account-identity{display:grid;gap:5px;margin-bottom:10px;padding:10px;border:1px solid rgba(216,169,88,.13);border-radius:11px;background:rgba(216,169,88,.035)}
      .restbr-account-identity strong{color:#eee7dd;font-size:13px}.restbr-account-identity span{color:#e2b55e;font-size:11px;font-weight:800}
      .restbr-access-denied{position:fixed;inset:0;z-index:20000;display:none;place-items:center;padding:20px;background:#050403}
      body.restbr-role-denied .restbr-access-denied{display:grid}
      body.restbr-role-denied > .admin-header,body.restbr-role-denied > .admin-main,body.restbr-role-denied > .bottom-nav{display:none!important}
      .restbr-access-denied-card{width:min(430px,100%);padding:22px;border:1px solid rgba(248,113,113,.25);border-radius:20px;background:#0d0907;text-align:center;box-shadow:0 24px 70px rgba(0,0,0,.45)}
      .restbr-access-denied-card h2{margin:0 0 8px;color:#fecaca;font-size:20px}.restbr-access-denied-card p{margin:0 0 14px;color:#a89f96;font-size:12px;line-height:1.7}.restbr-access-denied-card button{width:100%;min-height:44px;border:1px solid rgba(248,113,113,.28);border-radius:11px;background:rgba(95,20,20,.28);color:#fecaca;font-weight:800}
    `;
    document.head.appendChild(style);
  }

  function ensureDeniedUi(){
    if (q('#restbrAccessDenied')) return;
    const box = document.createElement('section');
    box.id = 'restbrAccessDenied';
    box.className = 'restbr-access-denied';
    box.innerHTML = `<div class="restbr-access-denied-card"><h2>لا توجد صلاحية للداشبورد</h2><p>هذا الحساب مسجّل دخول لكنه غير مضاف كمستخدم إدارة فعال.</p><button id="restbrDeniedLogout" type="button">تسجيل الخروج</button></div>`;
    document.body.appendChild(box);
    q('#restbrDeniedLogout')?.addEventListener('click', async () => {
      try { await supabaseClient.auth.signOut(); } catch (_) {}
      location.reload();
    });
  }

  function setDenied(denied){
    document.body?.classList.toggle('restbr-role-denied', !!denied);
    if (denied) ensureDeniedUi();
  }

  function setHidden(el, hidden){
    if (!el) return;
    el.classList.toggle('restbr-role-hidden', !!hidden);
  }

  function setNavVisibility(role){
    const allowed = {
      super_admin: ['home','products','categories','analytics','tools'],
      owner: ['home','products','categories','analytics','tools'],
      manager: ['home','products','categories','analytics','tools'],
      menu_editor: ['home','products','categories','tools'],
      viewer: ['home','analytics','tools']
    }[role] || ['home'];

    qa('[data-admin-nav]').forEach(btn => setHidden(btn, !allowed.includes(btn.dataset.adminNav)));

    const nav = q('.bottom-nav');
    const visible = qa('[data-admin-nav]').filter(btn => !btn.classList.contains('restbr-role-hidden')).length;
    if (nav && visible) nav.style.gridTemplateColumns = `repeat(${visible},1fr)`;

    const toolsBtn = q('[data-admin-nav="tools"]');
    if (toolsBtn) {
      const label = toolsBtn.querySelector('span:last-child');
      const icon = toolsBtn.querySelector('.nav-icon');
      const accountOnly = role === 'menu_editor' || role === 'viewer';
      if (label) label.textContent = accountOnly ? 'الحساب' : 'الإعدادات';
      if (icon) icon.textContent = accountOnly ? '🔐' : '⚙';
    }
  }

  function accordionTitle(details){
    return (details.querySelector('summary .settings-accordion-title strong')?.textContent || details.querySelector('summary')?.textContent || '').replace(/\s+/g,' ').trim();
  }

  function toolPanelAllowed(role, details){
    if (role === 'super_admin' || role === 'owner') return true;
    const id = details.id || '';
    const title = accordionTitle(details);
    if (/حساب الإدارة/.test(title)) return true;
    if (role === 'manager') {
      if (id === 'discountsSettingsPanel') return true;
      if (/تعديل الأسعار دفعة واحدة/.test(title)) return true;
      if (/Excel/.test(title)) return true;
    }
    return false;
  }

  function filterTools(role){
    qa('#viewTools .settings-accordion').forEach(details => {
      setHidden(details, !toolPanelAllowed(role, details));
    });
  }

  function filterHome(role){
    const canMenu = ['super_admin','owner','manager','menu_editor'].includes(role);
    const canReports = ['super_admin','owner','manager','viewer'].includes(role);
    const canFullTools = ['super_admin','owner','manager'].includes(role);

    setHidden(q('#homeAddProductBtn'), !canMenu);
    setHidden(q('#homeAddCategoryBtn'), !canMenu);
    qa('#viewHome [data-go-view="products"]').forEach(el => setHidden(el, !canMenu));
    qa('#viewHome [data-go-view="analytics"]').forEach(el => setHidden(el, !canReports));
    qa('#viewHome [data-go-view="tools"]').forEach(el => setHidden(el, !canFullTools));
  }

  function filterDeleteControls(role){
    const canDeleteMenu = ['super_admin','owner','manager'].includes(role);
    qa('button').forEach(btn => {
      const text = (btn.textContent || '').replace(/\s+/g,' ').trim();
      const isDelete = btn.classList.contains('danger-action-btn') || btn.classList.contains('danger-mini') || /حذف/.test(text);
      if (isDelete && !btn.closest('#restbrAccessDenied')) setHidden(btn, !canDeleteMenu);
    });
  }

  function renderIdentity(profile){
    const role = profile.role;
    const displayName = profile.display_name || profile.email || 'مستخدم الإدارة';

    const headerCopy = q('.admin-header-copy');
    if (headerCopy) {
      let badge = q('#adminRoleBadge');
      if (!badge) {
        badge = document.createElement('span');
        badge.id = 'adminRoleBadge';
        headerCopy.appendChild(badge);
      }
      badge.textContent = `${displayName} • ${roleLabel(role)}`;
    }

    const emailEl = q('#adminAccountEmail');
    if (emailEl) {
      let identity = q('#adminAccountIdentity');
      if (!identity) {
        identity = document.createElement('div');
        identity.id = 'adminAccountIdentity';
        identity.className = 'restbr-account-identity';
        emailEl.before(identity);
      }
      identity.innerHTML = `<strong></strong><span></span>`;
      identity.querySelector('strong').textContent = displayName;
      identity.querySelector('span').textContent = roleLabel(role);
    }
  }

  function ensureAllowedView(role){
    const active = q('.admin-view.active')?.dataset.view || 'home';
    const allowed = {
      super_admin: ['home','products','categories','analytics','tools'],
      owner: ['home','products','categories','analytics','tools'],
      manager: ['home','products','categories','analytics','tools'],
      menu_editor: ['home','products','categories','tools'],
      viewer: ['home','analytics','tools']
    }[role] || ['home'];
    if (!allowed.includes(active)) q('[data-admin-nav="home"]')?.click();
  }

  function applyUi(){
    if (!currentProfile || !VALID_ROLES.has(currentProfile.role) || currentProfile.is_active !== true) return;
    const role = currentProfile.role;
    document.body.dataset.adminRole = role;
    setNavVisibility(role);
    filterHome(role);
    filterTools(role);
    filterDeleteControls(role);
    renderIdentity(currentProfile);
    ensureAllowedView(role);
  }

  function scheduleApply(){
    clearTimeout(applyTimer);
    applyTimer = setTimeout(applyUi, 30);
  }

  function startObserver(){
    if (observer || !document.body) return;
    observer = new MutationObserver(() => scheduleApply());
    observer.observe(document.body, { childList:true, subtree:true });
  }

  async function loadProfile(session){
    if (!session?.user?.id) {
      currentProfile = null;
      setDenied(false);
      document.documentElement.classList.remove('restbr-role-pending');
      return;
    }

    try {
      const { data, error } = await supabaseClient
        .from('admin_users')
        .select('display_name,role,is_active')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) throw error;

      const profile = data ? { ...data, email: session.user.email || '' } : null;
      if (!profile || profile.is_active !== true || !VALID_ROLES.has(profile.role)) {
        currentProfile = null;
        setDenied(true);
        return;
      }

      currentProfile = profile;
      setDenied(false);
      applyUi();
      startObserver();
    } catch (error) {
      console.error('RESTBR ROLE UI ERROR:', error);
      currentProfile = null;
      setDenied(true);
    } finally {
      document.documentElement.classList.remove('restbr-role-pending');
    }
  }

  async function init(){
    installStyles();
    ensureDeniedUi();
    if (typeof supabaseClient === 'undefined' || !supabaseClient?.auth) {
      setTimeout(init, 100);
      return;
    }

    const { data:{ session } } = await supabaseClient.auth.getSession();
    await loadProfile(session);

    supabaseClient.auth.onAuthStateChange((event, sessionNow) => {
      if (event === 'SIGNED_OUT') {
        currentProfile = null;
        setDenied(false);
        document.documentElement.classList.remove('restbr-role-pending');
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        setTimeout(() => void loadProfile(sessionNow), 0);
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => void init(), { once:true });
  else void init();
})();

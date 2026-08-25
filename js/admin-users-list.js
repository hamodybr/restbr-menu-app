(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;
  if (window.__RESTBR_ADMIN_USERS_LIST_V1__) return;
  window.__RESTBR_ADMIN_USERS_LIST_V1__ = true;

  const ROLE_LABELS = {
    super_admin: 'مدير النظام',
    owner: 'صاحب المطعم',
    manager: 'مدير',
    menu_editor: 'محرر المنيو',
    viewer: 'مشاهدة فقط'
  };

  const q = (sel, root = document) => root.querySelector(sel);

  function installStyles(){
    if (q('#restbrUsersListStyles')) return;
    const style = document.createElement('style');
    style.id = 'restbrUsersListStyles';
    style.textContent = `
      #restbrUsersPanel .restbr-users-wrap{display:grid;gap:10px}
      #restbrUsersPanel .restbr-users-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
      #restbrUsersPanel .restbr-users-note{margin:0;color:#8f877e;font-size:10px;line-height:1.7}
      #restbrUsersRefresh{border:1px solid rgba(216,169,88,.24);background:rgba(216,169,88,.07);color:#e2b55e;border-radius:9px;padding:8px 10px;font:inherit;font-size:10px;font-weight:800;white-space:nowrap}
      #restbrUsersRefresh:disabled{opacity:.55;cursor:not-allowed}
      #restbrUsersStatus{min-height:18px;color:#9d958c;font-size:10px;line-height:1.6}
      .restbr-user-card{display:grid;gap:7px;padding:11px;border:1px solid rgba(255,255,255,.07);border-radius:12px;background:rgba(255,255,255,.025)}
      .restbr-user-top{display:flex;align-items:center;justify-content:space-between;gap:10px}
      .restbr-user-name{min-width:0;color:#f1ece5;font-size:12px;font-weight:900;overflow-wrap:anywhere}
      .restbr-user-role{flex:0 0 auto;padding:4px 7px;border-radius:999px;border:1px solid rgba(216,169,88,.22);background:rgba(216,169,88,.06);color:#e2b55e;font-size:9px;font-weight:900}
      .restbr-user-email{direction:ltr;text-align:left;color:#b8b0a7;font-size:10px;overflow-wrap:anywhere}
      .restbr-user-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap;color:#817970;font-size:9px}
      .restbr-user-chip{display:inline-flex;align-items:center;padding:3px 6px;border-radius:999px;border:1px solid rgba(255,255,255,.07)}
      .restbr-user-chip.active{color:#86efac;border-color:rgba(134,239,172,.18);background:rgba(34,197,94,.06)}
      .restbr-user-chip.inactive{color:#fecaca;border-color:rgba(248,113,113,.18);background:rgba(248,113,113,.05)}
      .restbr-user-current{color:#93c5fd;border-color:rgba(147,197,253,.18);background:rgba(59,130,246,.05)}
      body.admin-light-theme #restbrUsersPanel .restbr-user-card,#viewTools.admin-settings-light #restbrUsersPanel .restbr-user-card{background:#fff;border-color:rgba(104,74,34,.12)}
      body.admin-light-theme #restbrUsersPanel .restbr-user-name,#viewTools.admin-settings-light #restbrUsersPanel .restbr-user-name{color:#2c251e}
      body.admin-light-theme #restbrUsersPanel .restbr-user-email,#viewTools.admin-settings-light #restbrUsersPanel .restbr-user-email{color:#5e554c}
    `;
    document.head.appendChild(style);
  }

  function roleLabel(role){
    return ROLE_LABELS[role] || role || '—';
  }

  function ensurePanel(){
    if (q('#restbrUsersPanel')) return true;
    const tools = q('#viewTools');
    if (!tools) return false;

    const panel = document.createElement('details');
    panel.id = 'restbrUsersPanel';
    panel.className = 'settings-accordion';
    panel.innerHTML = `
      <summary>
        <span class="settings-accordion-title">
          <strong>إدارة المستخدمين</strong>
          <small>الحسابات والصلاحيات</small>
        </span>
        <span class="settings-accordion-chevron">⌄</span>
      </summary>
      <div class="settings-accordion-body">
        <div class="restbr-users-wrap">
          <div class="restbr-users-head">
            <p class="restbr-users-note">عرض حسابات الداشبورد الحالية فقط. الإضافة والتعديل والحذف راح نضيفها بالخطوات الجاية بعد الاختبار.</p>
            <button id="restbrUsersRefresh" type="button">تحديث</button>
          </div>
          <div id="restbrUsersStatus">جاري التحميل...</div>
          <div id="restbrUsersList"></div>
        </div>
      </div>
    `;

    tools.appendChild(panel);
    q('#restbrUsersRefresh')?.addEventListener('click', () => void loadUsers());
    return true;
  }

  function allowedRole(){
    return ['super_admin','owner'].includes(document.body?.dataset?.adminRole || '');
  }

  function setStatus(message, error = false){
    const el = q('#restbrUsersStatus');
    if (!el) return;
    el.textContent = message || '';
    el.style.color = error ? '#fecaca' : '#9d958c';
  }

  function renderUsers(users){
    const list = q('#restbrUsersList');
    if (!list) return;
    list.innerHTML = '';

    if (!Array.isArray(users) || !users.length) {
      list.innerHTML = '<div class="restbr-user-card"><div class="restbr-user-name">لا توجد حسابات إدارة.</div></div>';
      return;
    }

    users.forEach(user => {
      const card = document.createElement('div');
      card.className = 'restbr-user-card';

      const top = document.createElement('div');
      top.className = 'restbr-user-top';

      const name = document.createElement('div');
      name.className = 'restbr-user-name';
      name.textContent = user.display_name || user.email || 'مستخدم';

      const role = document.createElement('span');
      role.className = 'restbr-user-role';
      role.textContent = roleLabel(user.role);

      top.append(name, role);

      const email = document.createElement('div');
      email.className = 'restbr-user-email';
      email.textContent = user.email || '—';

      const meta = document.createElement('div');
      meta.className = 'restbr-user-meta';

      const state = document.createElement('span');
      state.className = `restbr-user-chip ${user.is_active ? 'active' : 'inactive'}`;
      state.textContent = user.is_active ? 'فعال' : 'موقوف';
      meta.appendChild(state);

      if (user.email_confirmed) {
        const confirmed = document.createElement('span');
        confirmed.className = 'restbr-user-chip';
        confirmed.textContent = 'البريد مؤكد';
        meta.appendChild(confirmed);
      }

      if (user.is_current_user) {
        const current = document.createElement('span');
        current.className = 'restbr-user-chip restbr-user-current';
        current.textContent = 'حسابك الحالي';
        meta.appendChild(current);
      }

      card.append(top, email, meta);
      list.appendChild(card);
    });
  }

  async function loadUsers(){
    if (!allowedRole()) return;
    const btn = q('#restbrUsersRefresh');
    if (btn) btn.disabled = true;
    setStatus('جاري تحميل المستخدمين...');

    try {
      if (typeof supabaseClient === 'undefined' || !supabaseClient?.functions) {
        throw new Error('Supabase غير جاهز.');
      }

      const { data, error } = await supabaseClient.functions.invoke('admin-users', {
        method: 'GET'
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'تعذر تحميل المستخدمين.');

      renderUsers(data.users || []);
      setStatus(`عدد حسابات الإدارة: ${(data.users || []).length}`);
    } catch (error) {
      console.error('RESTBR USERS LIST ERROR:', error);
      setStatus('فشل تحميل المستخدمين: ' + String(error?.message || error || ''), true);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function initWhenReady(){
    installStyles();
    if (!ensurePanel()) {
      setTimeout(initWhenReady, 120);
      return;
    }

    const role = document.body?.dataset?.adminRole || '';
    if (!role) {
      setTimeout(initWhenReady, 120);
      return;
    }

    const panel = q('#restbrUsersPanel');
    if (!allowedRole()) {
      if (panel) panel.style.display = 'none';
      return;
    }

    if (panel) panel.style.display = '';
    void loadUsers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWhenReady, { once:true });
  } else {
    initWhenReady();
  }
})();

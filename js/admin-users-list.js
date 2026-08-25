(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;
  if (window.__RESTBR_ADMIN_USERS_LIST_V2__) return;
  window.__RESTBR_ADMIN_USERS_LIST_V2__ = true;

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
      #restbrUsersPanel .restbr-users-wrap{display:grid;gap:12px}
      #restbrUsersPanel .restbr-users-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
      #restbrUsersPanel .restbr-users-note{margin:0;color:#8f877e;font-size:10px;line-height:1.7}
      #restbrUsersRefresh{border:1px solid rgba(216,169,88,.24);background:rgba(216,169,88,.07);color:#e2b55e;border-radius:9px;padding:8px 10px;font:inherit;font-size:10px;font-weight:800;white-space:nowrap}
      #restbrUsersRefresh:disabled{opacity:.55;cursor:not-allowed}
      #restbrUsersStatus{min-height:18px;color:#9d958c;font-size:10px;line-height:1.6}
      .restbr-user-create{display:grid;gap:10px;padding:12px;border:1px solid rgba(216,169,88,.14);border-radius:12px;background:rgba(216,169,88,.025)}
      .restbr-user-create-title{font-size:11px;font-weight:900;color:#f1ece5}
      .restbr-user-create-sub{margin:0;color:#8f877e;font-size:9px;line-height:1.7}
      .restbr-user-create-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
      .restbr-user-field{display:grid;gap:5px}
      .restbr-user-field label{font-size:9px;font-weight:800;color:#a99f94}
      .restbr-user-field input,.restbr-user-field select{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.035);color:#f1ece5;border-radius:9px;padding:9px 10px;font:inherit;font-size:10px;outline:none}
      .restbr-user-field input:focus,.restbr-user-field select:focus{border-color:rgba(216,169,88,.42)}
      .restbr-user-field input[type="email"]{direction:ltr;text-align:left}
      .restbr-user-create-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px}
      #restbrUserCreateBtn{border:1px solid rgba(216,169,88,.34);background:rgba(216,169,88,.12);color:#f0c66f;border-radius:9px;padding:9px 13px;font:inherit;font-size:10px;font-weight:900}
      #restbrUserCreateBtn:disabled{opacity:.55;cursor:not-allowed}
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
      body.admin-light-theme #restbrUsersPanel .restbr-user-card,#viewTools.admin-settings-light #restbrUsersPanel .restbr-user-card,body.admin-light-theme #restbrUsersPanel .restbr-user-create,#viewTools.admin-settings-light #restbrUsersPanel .restbr-user-create{background:#fff;border-color:rgba(104,74,34,.12)}
      body.admin-light-theme #restbrUsersPanel .restbr-user-name,#viewTools.admin-settings-light #restbrUsersPanel .restbr-user-name,body.admin-light-theme #restbrUsersPanel .restbr-user-create-title,#viewTools.admin-settings-light #restbrUsersPanel .restbr-user-create-title{color:#2c251e}
      body.admin-light-theme #restbrUsersPanel .restbr-user-email,#viewTools.admin-settings-light #restbrUsersPanel .restbr-user-email{color:#5e554c}
      body.admin-light-theme #restbrUsersPanel .restbr-user-field input,body.admin-light-theme #restbrUsersPanel .restbr-user-field select,#viewTools.admin-settings-light #restbrUsersPanel .restbr-user-field input,#viewTools.admin-settings-light #restbrUsersPanel .restbr-user-field select{background:#fff;color:#2c251e;border-color:rgba(104,74,34,.15)}
      @media(max-width:680px){#restbrUsersPanel .restbr-user-create-grid{grid-template-columns:1fr}.restbr-users-head{align-items:flex-start!important}}
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
            <p class="restbr-users-note">إدارة حسابات الداشبورد. في هذه المرحلة نضيف مستخدم جديد فقط؛ التعديل والإيقاف والحذف نضيفها بعد الاختبار.</p>
            <button id="restbrUsersRefresh" type="button">تحديث</button>
          </div>

          <form id="restbrUserCreateForm" class="restbr-user-create" autocomplete="off">
            <div class="restbr-user-create-title">إضافة مستخدم جديد</div>
            <p class="restbr-user-create-sub">الباسورد هنا مؤقت. بعد أول تسجيل دخول يقدر المستخدم يغيره من حساب الإدارة. دور مدير النظام غير متاح من هذه الشاشة.</p>
            <div class="restbr-user-create-grid">
              <div class="restbr-user-field">
                <label for="restbrUserName">الاسم</label>
                <input id="restbrUserName" name="display_name" type="text" maxlength="80" required placeholder="مثال: أحمد" />
              </div>
              <div class="restbr-user-field">
                <label for="restbrUserEmail">البريد الإلكتروني</label>
                <input id="restbrUserEmail" name="email" type="email" maxlength="254" required autocomplete="off" placeholder="name@example.com" />
              </div>
              <div class="restbr-user-field">
                <label for="restbrUserPassword">الباسورد المؤقت</label>
                <input id="restbrUserPassword" name="password" type="password" minlength="8" required autocomplete="new-password" placeholder="8 أحرف على الأقل" />
              </div>
              <div class="restbr-user-field">
                <label for="restbrUserRole">الصلاحية</label>
                <select id="restbrUserRole" name="role" required>
                  <option value="owner">صاحب المطعم</option>
                  <option value="manager">مدير</option>
                  <option value="menu_editor">محرر المنيو</option>
                  <option value="viewer">مشاهدة فقط</option>
                </select>
              </div>
            </div>
            <div class="restbr-user-create-actions">
              <button id="restbrUserCreateBtn" type="submit">إضافة المستخدم</button>
            </div>
          </form>

          <div id="restbrUsersStatus">جاري التحميل...</div>
          <div id="restbrUsersList"></div>
        </div>
      </div>
    `;

    tools.appendChild(panel);
    q('#restbrUsersRefresh')?.addEventListener('click', () => void loadUsers());
    q('#restbrUserCreateForm')?.addEventListener('submit', event => void createUser(event));
    return true;
  }

  function allowedRole(){
    return ['super_admin','owner'].includes(document.body?.dataset?.adminRole || '');
  }

  function setStatus(message, state = 'normal'){
    const el = q('#restbrUsersStatus');
    if (!el) return;
    el.textContent = message || '';
    el.style.color = state === 'error' ? '#fecaca' : state === 'success' ? '#86efac' : '#9d958c';
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
      setStatus('فشل تحميل المستخدمين: ' + String(error?.message || error || ''), 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function functionErrorMessage(error){
    try {
      const response = error?.context;
      if (response && typeof response.clone === 'function') {
        const payload = await response.clone().json();
        if (payload?.error) return String(payload.error);
      }
    } catch (_) {}
    return String(error?.message || error || 'تعذر تنفيذ العملية.');
  }

  async function createUser(event){
    event?.preventDefault?.();
    if (!allowedRole()) return;

    const form = q('#restbrUserCreateForm');
    const btn = q('#restbrUserCreateBtn');
    if (!form || !btn) return;
    if (!form.reportValidity()) return;

    const displayName = q('#restbrUserName')?.value?.trim() || '';
    const email = q('#restbrUserEmail')?.value?.trim() || '';
    const password = q('#restbrUserPassword')?.value || '';
    const role = q('#restbrUserRole')?.value || '';

    btn.disabled = true;
    setStatus('جاري إنشاء المستخدم...');

    try {
      const { data, error } = await supabaseClient.functions.invoke('admin-users', {
        method: 'POST',
        body: {
          display_name: displayName,
          email,
          password,
          role
        }
      });

      if (error) throw new Error(await functionErrorMessage(error));
      if (!data?.ok) throw new Error(data?.error || 'تعذر إنشاء المستخدم.');

      form.reset();
      const roleSelect = q('#restbrUserRole');
      if (roleSelect) roleSelect.value = 'owner';
      await loadUsers();
      setStatus(`تم إنشاء المستخدم ${data.user?.display_name || displayName} بنجاح ✓`, 'success');
    } catch (error) {
      console.error('RESTBR USER CREATE ERROR:', error);
      let message = String(error?.message || error || 'تعذر إنشاء المستخدم.');
      if (/already registered|already exists|duplicate/i.test(message)) message = 'هذا البريد مستخدم مسبقًا.';
      if (/password.*8/i.test(message)) message = 'الباسورد لازم يكون 8 أحرف على الأقل.';
      setStatus('فشل إنشاء المستخدم: ' + message, 'error');
    } finally {
      btn.disabled = false;
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

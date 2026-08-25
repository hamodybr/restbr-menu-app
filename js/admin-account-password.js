(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;
  if (window.__RESTBR_ADMIN_ACCOUNT_PASSWORD_V1__) return;
  window.__RESTBR_ADMIN_ACCOUNT_PASSWORD_V1__ = true;

  const q = (sel, root = document) => root.querySelector(sel);

  function installStyles(){
    if (q('#restbrAccountPasswordStyles')) return;
    const style = document.createElement('style');
    style.id = 'restbrAccountPasswordStyles';
    style.textContent = `
      .restbr-password-box{display:grid;gap:9px;margin:12px 0;padding:12px;border:1px solid rgba(216,169,88,.13);border-radius:12px;background:rgba(216,169,88,.025)}
      .restbr-password-box h4{margin:0;color:#e2b55e;font-size:12px}
      .restbr-password-box p{margin:0;color:#837b72;font-size:9px;line-height:1.65}
      .restbr-password-field{display:grid;gap:5px}
      .restbr-password-field span{color:#a79f96;font-size:9px}
      .restbr-password-field input{width:100%;min-width:0;box-sizing:border-box;border:1px solid rgba(255,255,255,.09);background:#050403;color:#fff;border-radius:10px;padding:10px 11px;font:inherit;font-size:16px;outline:none;direction:ltr;text-align:left}
      .restbr-password-field input:focus{border-color:rgba(216,169,88,.55)}
      #restbrChangePasswordBtn{width:100%;min-height:42px;border:0;border-radius:10px;background:#d8a958;color:#100b05;font:inherit;font-weight:900;cursor:pointer}
      #restbrChangePasswordBtn:disabled{opacity:.55;cursor:not-allowed}
      #restbrPasswordStatus{min-height:18px;font-size:10px;line-height:1.6}
      body.admin-light-theme .restbr-password-box,#viewTools.admin-settings-light .restbr-password-box{background:#fffaf3;border-color:rgba(112,79,34,.16)}
      body.admin-light-theme .restbr-password-field input,#viewTools.admin-settings-light .restbr-password-field input{background:#fff;color:#2c251e;border-color:rgba(104,74,34,.18)}
    `;
    document.head.appendChild(style);
  }

  function ensureUi(){
    if (q('#restbrPasswordBox')) return true;
    const emailEl = q('#adminAccountEmail');
    const logoutBtn = q('#adminLogoutBtn');
    const body = emailEl?.closest('.settings-accordion-body');
    if (!emailEl || !logoutBtn || !body) return false;

    const box = document.createElement('div');
    box.id = 'restbrPasswordBox';
    box.className = 'restbr-password-box';
    box.innerHTML = `
      <h4>تغيير كلمة المرور</h4>
      <p>اكتب كلمة المرور الحالية ثم كلمة جديدة لا تقل عن 8 أحرف.</p>
      <label class="restbr-password-field">
        <span>كلمة المرور الحالية</span>
        <input id="restbrCurrentPassword" type="password" autocomplete="current-password" placeholder="••••••••">
      </label>
      <label class="restbr-password-field">
        <span>كلمة المرور الجديدة</span>
        <input id="restbrNewPassword" type="password" autocomplete="new-password" placeholder="8 أحرف أو أكثر">
      </label>
      <label class="restbr-password-field">
        <span>تأكيد كلمة المرور الجديدة</span>
        <input id="restbrConfirmPassword" type="password" autocomplete="new-password" placeholder="أعد كتابة كلمة المرور">
      </label>
      <button id="restbrChangePasswordBtn" type="button">تغيير كلمة المرور</button>
      <div id="restbrPasswordStatus"></div>
    `;

    body.insertBefore(box, logoutBtn);
    q('#restbrChangePasswordBtn')?.addEventListener('click', () => void changePassword());
    return true;
  }

  function status(message = '', ok = false){
    const el = q('#restbrPasswordStatus');
    if (!el) return;
    el.textContent = message;
    el.style.color = ok ? '#86efac' : '#fecaca';
  }

  function clearFields(){
    ['#restbrCurrentPassword','#restbrNewPassword','#restbrConfirmPassword'].forEach(sel => {
      const el = q(sel);
      if (el) el.value = '';
    });
  }

  async function changePassword(){
    const currentPassword = q('#restbrCurrentPassword')?.value || '';
    const newPassword = q('#restbrNewPassword')?.value || '';
    const confirmPassword = q('#restbrConfirmPassword')?.value || '';
    const btn = q('#restbrChangePasswordBtn');

    if (!currentPassword) { status('اكتب كلمة المرور الحالية.'); return; }
    if (newPassword.length < 8) { status('كلمة المرور الجديدة لازم تكون 8 أحرف على الأقل.'); return; }
    if (newPassword !== confirmPassword) { status('تأكيد كلمة المرور غير مطابق.'); return; }
    if (newPassword === currentPassword) { status('اختر كلمة مرور جديدة مختلفة عن الحالية.'); return; }

    btn.disabled = true;
    btn.textContent = 'جاري التغيير...';
    status('');

    try {
      if (typeof supabaseClient === 'undefined' || !supabaseClient?.auth) {
        throw new Error('Supabase Auth غير جاهز.');
      }

      const { data:{ user }, error:userError } = await supabaseClient.auth.getUser();
      if (userError) throw userError;
      if (!user?.id) throw new Error('لا توجد جلسة تسجيل دخول فعالة.');

      const { error } = await supabaseClient.auth.updateUser({
        password: newPassword,
        currentPassword
      });

      if (error) throw error;

      clearFields();
      status('تم تغيير كلمة المرور بنجاح ✓', true);
    } catch (error) {
      console.error('RESTBR PASSWORD CHANGE ERROR:', error);
      const raw = String(error?.message || error || '');
      let message = raw;
      if (/password.*incorrect|invalid.*password|current.*password|credentials/i.test(raw)) {
        message = 'كلمة المرور الحالية غير صحيحة.';
      } else if (/weak|least|characters|password/i.test(raw) && /short|weak|length|characters/i.test(raw)) {
        message = 'كلمة المرور الجديدة لا تطابق شروط الأمان.';
      } else if (/session|jwt|auth/i.test(raw) && /expired|invalid|missing/i.test(raw)) {
        message = 'انتهت جلسة الدخول. سجل دخول من جديد ثم حاول.';
      }
      status('فشل تغيير كلمة المرور: ' + message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'تغيير كلمة المرور';
    }
  }

  function init(){
    installStyles();
    if (ensureUi()) return;
    const observer = new MutationObserver(() => {
      if (ensureUi()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList:true, subtree:true });
    setTimeout(() => observer.disconnect(), 15000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();

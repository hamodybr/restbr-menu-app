(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;
  if (window.__RESTBR_ADMIN_ACCOUNT_EMAIL_V1__) return;
  window.__RESTBR_ADMIN_ACCOUNT_EMAIL_V1__ = true;

  const q = (sel, root = document) => root.querySelector(sel);

  function installStyles(){
    if (q('#restbrAccountEmailStyles')) return;
    const style = document.createElement('style');
    style.id = 'restbrAccountEmailStyles';
    style.textContent = `
      .restbr-email-box{display:grid;gap:9px;margin:12px 0;padding:12px;border:1px solid rgba(216,169,88,.13);border-radius:12px;background:rgba(216,169,88,.025)}
      .restbr-email-box h4{margin:0;color:#e2b55e;font-size:12px}
      .restbr-email-box p{margin:0;color:#837b72;font-size:9px;line-height:1.65}
      .restbr-email-current{padding:9px 10px;border-radius:10px;background:rgba(255,255,255,.025);color:#c8c0b7;font-size:10px;direction:ltr;text-align:left;word-break:break-all}
      .restbr-email-field{display:grid;gap:5px}
      .restbr-email-field span{color:#a79f96;font-size:9px}
      .restbr-email-field input{width:100%;min-width:0;box-sizing:border-box;border:1px solid rgba(255,255,255,.09);background:#050403;color:#fff;border-radius:10px;padding:10px 11px;font:inherit;font-size:16px;outline:none;direction:ltr;text-align:left}
      .restbr-email-field input:focus{border-color:rgba(216,169,88,.55)}
      #restbrChangeEmailBtn{width:100%;min-height:42px;border:0;border-radius:10px;background:#d8a958;color:#100b05;font:inherit;font-weight:900;cursor:pointer}
      #restbrChangeEmailBtn:disabled{opacity:.55;cursor:not-allowed}
      #restbrEmailStatus{min-height:18px;font-size:10px;line-height:1.6}
      body.admin-light-theme .restbr-email-box,#viewTools.admin-settings-light .restbr-email-box{background:#fffaf3;border-color:rgba(112,79,34,.16)}
      body.admin-light-theme .restbr-email-field input,#viewTools.admin-settings-light .restbr-email-field input{background:#fff;color:#2c251e;border-color:rgba(104,74,34,.18)}
      body.admin-light-theme .restbr-email-current,#viewTools.admin-settings-light .restbr-email-current{background:#fff;color:#4b4036;border:1px solid rgba(104,74,34,.12)}
    `;
    document.head.appendChild(style);
  }

  function ensureUi(){
    if (q('#restbrEmailBox')) return true;
    const emailEl = q('#adminAccountEmail');
    const passwordBox = q('#restbrPasswordBox');
    const logoutBtn = q('#adminLogoutBtn');
    const body = emailEl?.closest('.settings-accordion-body');
    if (!emailEl || !logoutBtn || !body) return false;

    const box = document.createElement('div');
    box.id = 'restbrEmailBox';
    box.className = 'restbr-email-box';
    box.innerHTML = `
      <h4>تغيير البريد الإلكتروني</h4>
      <p>البريد الحالي:</p>
      <div id="restbrCurrentEmailDisplay" class="restbr-email-current">—</div>
      <label class="restbr-email-field">
        <span>البريد الإلكتروني الجديد</span>
        <input id="restbrNewEmail" type="email" autocomplete="email" autocapitalize="none" spellcheck="false" placeholder="new@example.com">
      </label>
      <label class="restbr-email-field">
        <span>تأكيد البريد الإلكتروني الجديد</span>
        <input id="restbrConfirmEmail" type="email" autocomplete="email" autocapitalize="none" spellcheck="false" placeholder="أعد كتابة البريد الجديد">
      </label>
      <label class="restbr-email-field">
        <span>كلمة المرور الحالية</span>
        <input id="restbrEmailCurrentPassword" type="password" autocomplete="current-password" placeholder="••••••••">
      </label>
      <button id="restbrChangeEmailBtn" type="button">طلب تغيير البريد الإلكتروني</button>
      <div id="restbrEmailStatus"></div>
    `;

    if (passwordBox) body.insertBefore(box, passwordBox);
    else body.insertBefore(box, logoutBtn);

    q('#restbrChangeEmailBtn')?.addEventListener('click', () => void changeEmail());
    void refreshCurrentEmail();
    return true;
  }

  function status(message = '', ok = false){
    const el = q('#restbrEmailStatus');
    if (!el) return;
    el.textContent = message;
    el.style.color = ok ? '#86efac' : '#fecaca';
  }

  function normalizeEmail(value){
    return String(value || '').trim().toLowerCase();
  }

  function validEmail(value){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function clearFields(){
    ['#restbrNewEmail','#restbrConfirmEmail','#restbrEmailCurrentPassword'].forEach(sel => {
      const el = q(sel);
      if (el) el.value = '';
    });
  }

  async function refreshCurrentEmail(){
    try {
      if (typeof supabaseClient === 'undefined' || !supabaseClient?.auth) return;
      const { data:{ user }, error } = await supabaseClient.auth.getUser();
      if (error) throw error;
      const value = user?.email || '—';
      const el = q('#restbrCurrentEmailDisplay');
      if (el) el.textContent = value;
    } catch (error) {
      console.error('RESTBR EMAIL DISPLAY ERROR:', error);
    }
  }

  async function changeEmail(){
    const newEmail = normalizeEmail(q('#restbrNewEmail')?.value);
    const confirmEmail = normalizeEmail(q('#restbrConfirmEmail')?.value);
    const currentPassword = q('#restbrEmailCurrentPassword')?.value || '';
    const btn = q('#restbrChangeEmailBtn');

    if (!validEmail(newEmail)) { status('اكتب بريد إلكتروني جديد صحيح.'); return; }
    if (newEmail !== confirmEmail) { status('تأكيد البريد الإلكتروني غير مطابق.'); return; }
    if (!currentPassword) { status('اكتب كلمة المرور الحالية للتأكيد.'); return; }

    btn.disabled = true;
    btn.textContent = 'جاري إرسال الطلب...';
    status('');

    try {
      if (typeof supabaseClient === 'undefined' || !supabaseClient?.auth) {
        throw new Error('Supabase Auth غير جاهز.');
      }

      const { data:{ user }, error:userError } = await supabaseClient.auth.getUser();
      if (userError) throw userError;
      if (!user?.id || !user.email) throw new Error('لا توجد جلسة تسجيل دخول فعالة.');

      const currentEmail = normalizeEmail(user.email);
      if (newEmail === currentEmail) {
        status('البريد الجديد هو نفسه البريد الحالي.');
        return;
      }

      const { error: verifyError } = await supabaseClient.auth.signInWithPassword({
        email: currentEmail,
        password: currentPassword
      });
      if (verifyError) throw verifyError;

      const emailRedirectTo = `${window.location.origin}${window.location.pathname}`;
      const { data, error } = await supabaseClient.auth.updateUser(
        { email: newEmail },
        { emailRedirectTo }
      );
      if (error) throw error;

      clearFields();

      const returnedEmail = normalizeEmail(data?.user?.email || '');
      if (returnedEmail === newEmail) {
        status('تم تغيير البريد الإلكتروني بنجاح ✓', true);
        await refreshCurrentEmail();
      } else {
        status('تم إرسال طلب تغيير البريد ✓ افتح رسائل التحقق المطلوبة في البريد القديم والجديد وأكمل التأكيد. بعد التأكيد استخدم البريد الجديد لتسجيل الدخول.', true);
      }
    } catch (error) {
      console.error('RESTBR EMAIL CHANGE ERROR:', error);
      const raw = String(error?.message || error || '');
      let message = raw;
      if (/invalid login credentials|invalid.*credentials|password/i.test(raw)) {
        message = 'كلمة المرور الحالية غير صحيحة.';
      } else if (/email.*already|already.*registered|user.*already/i.test(raw)) {
        message = 'هذا البريد مستخدم في حساب آخر.';
      } else if (/email.*invalid|invalid.*email/i.test(raw)) {
        message = 'البريد الإلكتروني الجديد غير صحيح.';
      } else if (/rate|too many/i.test(raw)) {
        message = 'تم إرسال طلبات كثيرة. انتظر قليلًا ثم حاول مرة ثانية.';
      } else if (/session|jwt|auth/i.test(raw) && /expired|invalid|missing/i.test(raw)) {
        message = 'انتهت جلسة الدخول. سجل دخول من جديد ثم حاول.';
      }
      status('فشل تغيير البريد الإلكتروني: ' + message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'طلب تغيير البريد الإلكتروني';
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

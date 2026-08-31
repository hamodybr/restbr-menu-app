(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__RESTBR_ADMIN_ACCOUNT_PASSWORD_V2__) return;
  window.__RESTBR_ADMIN_ACCOUNT_PASSWORD_V2__ = true;

  const q = (sel, root = document) => root.querySelector(sel);
  const cleanAdminUrl = () => `${window.location.origin}${window.location.pathname}`;
  const recoveryAdminUrl = () => `${cleanAdminUrl()}?recovery=1`;

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

      .restbr-forgot-btn{width:100%;margin-top:8px;border:0;background:transparent;color:#d8a958;font:inherit;font-size:12px;font-weight:800;cursor:pointer;padding:8px}
      .restbr-forgot-panel{display:none;gap:8px;margin-top:10px;padding:11px;border:1px solid rgba(216,169,88,.18);border-radius:12px;background:rgba(216,169,88,.035)}
      .restbr-forgot-panel.open{display:grid}
      .restbr-forgot-panel p{margin:0;color:#9b9389;font-size:10px;line-height:1.7}
      .restbr-forgot-panel input{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.1);background:#080604;color:#fff;border-radius:10px;padding:10px 11px;font:inherit;font-size:16px;direction:ltr;text-align:left;outline:none}
      .restbr-forgot-actions{display:grid;grid-template-columns:1fr auto;gap:7px}
      .restbr-forgot-send{border:0;border-radius:10px;background:#d8a958;color:#100b05;font:inherit;font-weight:900;padding:10px;cursor:pointer}
      .restbr-forgot-send:disabled{opacity:.55;cursor:not-allowed}
      .restbr-forgot-cancel{border:1px solid rgba(255,255,255,.1);border-radius:10px;background:#15110d;color:#ddd;font:inherit;padding:10px 12px;cursor:pointer}
      .restbr-forgot-status{min-height:18px;font-size:10px;line-height:1.6}

      .restbr-recovery-overlay{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;padding:18px;background:rgba(3,2,1,.93);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
      .restbr-recovery-card{width:min(420px,100%);display:grid;gap:12px;padding:20px;border:1px solid rgba(216,169,88,.28);border-radius:20px;background:#0b0805;box-shadow:0 25px 80px rgba(0,0,0,.65)}
      .restbr-recovery-card h2{margin:0;color:#e2b55e;font-size:21px;text-align:center}
      .restbr-recovery-card p{margin:0;color:#9d958c;font-size:11px;line-height:1.8;text-align:center}
      .restbr-recovery-card label{display:grid;gap:6px;color:#b7aea5;font-size:10px}
      .restbr-recovery-card input{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.11);background:#050403;color:#fff;border-radius:11px;padding:12px;font:inherit;font-size:16px;outline:none;direction:ltr;text-align:left}
      .restbr-recovery-card input:focus{border-color:rgba(216,169,88,.58)}
      #restbrRecoverySaveBtn{border:0;border-radius:11px;background:#d8a958;color:#100b05;font:inherit;font-weight:900;padding:12px;cursor:pointer}
      #restbrRecoverySaveBtn:disabled{opacity:.55;cursor:not-allowed}
      #restbrRecoveryCancelBtn{border:1px solid rgba(255,255,255,.1);border-radius:11px;background:#17120e;color:#ddd;font:inherit;padding:10px;cursor:pointer}
      #restbrRecoveryStatus{min-height:19px;font-size:10px;line-height:1.6;text-align:center}

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
      <p>إذا دخلت من رابط الاستعادة، استخدم شاشة الاستعادة التي تظهر تلقائياً.</p>
      <label class="restbr-password-field">
        <span>كلمة المرور الحالية</span>
        <input id="restbrCurrentPassword" type="password" autocomplete="current-password" placeholder="كلمة المرور الحالية">
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

  function ensureForgotUi(){
    if (q('#restbrForgotPasswordBtn')) return true;
    const form = q('#adminLoginForm');
    const loginBtn = q('#adminLoginBtn');
    const loginEmail = q('#adminLoginEmail');
    if (!form || !loginBtn || !loginEmail) return false;

    const forgotBtn = document.createElement('button');
    forgotBtn.id = 'restbrForgotPasswordBtn';
    forgotBtn.className = 'restbr-forgot-btn';
    forgotBtn.type = 'button';
    forgotBtn.textContent = 'نسيت كلمة المرور؟';

    const panel = document.createElement('div');
    panel.id = 'restbrForgotPanel';
    panel.className = 'restbr-forgot-panel';
    panel.innerHTML = `
      <p>اكتب بريد حساب الإدارة، ونرسل لك رابط آمن لاختيار كلمة مرور جديدة.</p>
      <input id="restbrForgotEmail" type="email" autocomplete="email" autocapitalize="none" spellcheck="false" placeholder="admin@example.com">
      <div class="restbr-forgot-actions">
        <button id="restbrForgotSendBtn" class="restbr-forgot-send" type="button">إرسال رابط الاستعادة</button>
        <button id="restbrForgotCancelBtn" class="restbr-forgot-cancel" type="button">إلغاء</button>
      </div>
      <div id="restbrForgotStatus" class="restbr-forgot-status"></div>
    `;

    loginBtn.insertAdjacentElement('afterend', forgotBtn);
    forgotBtn.insertAdjacentElement('afterend', panel);

    forgotBtn.addEventListener('click', () => {
      const email = q('#restbrForgotEmail');
      if (email && !email.value) email.value = loginEmail.value || '';
      panel.classList.toggle('open');
      if (panel.classList.contains('open')) setTimeout(() => email?.focus(), 0);
    });

    q('#restbrForgotCancelBtn')?.addEventListener('click', () => {
      panel.classList.remove('open');
      forgotStatus('');
    });
    q('#restbrForgotSendBtn')?.addEventListener('click', () => void sendRecoveryEmail());
    q('#restbrForgotEmail')?.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        void sendRecoveryEmail();
      }
    });
    return true;
  }

  function status(message = '', ok = false){
    const el = q('#restbrPasswordStatus');
    if (!el) return;
    el.textContent = message;
    el.style.color = ok ? '#86efac' : '#fecaca';
  }

  function forgotStatus(message = '', ok = false){
    const el = q('#restbrForgotStatus');
    if (!el) return;
    el.textContent = message;
    el.style.color = ok ? '#86efac' : '#fecaca';
  }

  function recoveryStatus(message = '', ok = false){
    const el = q('#restbrRecoveryStatus');
    if (!el) return;
    el.textContent = message;
    el.style.color = ok ? '#86efac' : '#fecaca';
  }

  function validEmail(value){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  }

  async function sendRecoveryEmail(){
    const email = String(q('#restbrForgotEmail')?.value || '').trim().toLowerCase();
    const btn = q('#restbrForgotSendBtn');
    if (!validEmail(email)) {
      forgotStatus('اكتب بريد إلكتروني صحيح.');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'جاري الإرسال...';
    forgotStatus('');

    try {
      if (typeof supabaseClient === 'undefined' || !supabaseClient?.auth) {
        throw new Error('Supabase Auth غير جاهز.');
      }

      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: recoveryAdminUrl()
      });
      if (error) throw error;

      forgotStatus('تم إرسال رابط الاستعادة ✓ افتح أحدث رسالة في بريدك واضغط الرابط.', true);
    } catch (error) {
      console.error('RESTBR PASSWORD RECOVERY EMAIL ERROR:', error);
      const raw = String(error?.message || error || '');
      let message = raw;
      if (/rate|too many/i.test(raw)) message = 'تم إرسال طلبات كثيرة. انتظر قليلًا ثم حاول مرة ثانية.';
      else if (/redirect|url/i.test(raw)) message = 'رابط الرجوع غير مسموح في إعدادات Supabase Auth.';
      forgotStatus('فشل إرسال رابط الاستعادة: ' + message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'إرسال رابط الاستعادة';
    }
  }

  function showRecoveryOverlay(){
    if (q('#restbrRecoveryOverlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'restbrRecoveryOverlay';
    overlay.className = 'restbr-recovery-overlay';
    overlay.innerHTML = `
      <div class="restbr-recovery-card" dir="rtl">
        <h2>اختيار كلمة مرور جديدة</h2>
        <p>تم التحقق من رابط الاستعادة. اختر كلمة مرور جديدة لحساب الإدارة.</p>
        <label>كلمة المرور الجديدة
          <input id="restbrRecoveryPassword" type="password" autocomplete="new-password" placeholder="8 أحرف أو أكثر">
        </label>
        <label>تأكيد كلمة المرور الجديدة
          <input id="restbrRecoveryConfirm" type="password" autocomplete="new-password" placeholder="أعد كتابة كلمة المرور">
        </label>
        <button id="restbrRecoverySaveBtn" type="button">حفظ كلمة المرور الجديدة</button>
        <button id="restbrRecoveryCancelBtn" type="button">إلغاء والعودة لتسجيل الدخول</button>
        <div id="restbrRecoveryStatus"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    q('#restbrRecoverySaveBtn')?.addEventListener('click', () => void saveRecoveredPassword());
    q('#restbrRecoveryCancelBtn')?.addEventListener('click', () => void cancelRecovery());
    q('#restbrRecoveryConfirm')?.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        void saveRecoveredPassword();
      }
    });
    setTimeout(() => q('#restbrRecoveryPassword')?.focus(), 50);
  }

  async function saveRecoveredPassword(){
    const password = q('#restbrRecoveryPassword')?.value || '';
    const confirm = q('#restbrRecoveryConfirm')?.value || '';
    const btn = q('#restbrRecoverySaveBtn');

    if (password.length < 8) {
      recoveryStatus('كلمة المرور لازم تكون 8 أحرف على الأقل.');
      return;
    }
    if (password !== confirm) {
      recoveryStatus('تأكيد كلمة المرور غير مطابق.');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'جاري الحفظ...';
    recoveryStatus('');

    try {
      const { data:{ session }, error:sessionError } = await supabaseClient.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error('رابط الاستعادة منتهي أو جلسة الاستعادة غير موجودة.');

      const { error } = await supabaseClient.auth.updateUser({ password });
      if (error) throw error;

      recoveryStatus('تم تغيير كلمة المرور بنجاح ✓ جاري العودة لتسجيل الدخول...', true);
      await supabaseClient.auth.signOut();
      history.replaceState(null, '', window.location.pathname);
      setTimeout(() => window.location.replace(cleanAdminUrl()), 900);
    } catch (error) {
      console.error('RESTBR PASSWORD RECOVERY SAVE ERROR:', error);
      const raw = String(error?.message || error || '');
      let message = raw;
      if (/expired|invalid|missing|session|otp/i.test(raw)) message = 'رابط الاستعادة منتهي أو غير صالح. اطلب رابط جديد.';
      else if (/weak|least|characters|password/i.test(raw) && /short|weak|length|characters/i.test(raw)) message = 'كلمة المرور الجديدة لا تطابق شروط الأمان.';
      recoveryStatus('فشل تغيير كلمة المرور: ' + message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'حفظ كلمة المرور الجديدة';
    }
  }

  async function cancelRecovery(){
    try { await supabaseClient.auth.signOut(); } catch (_) {}
    history.replaceState(null, '', window.location.pathname);
    window.location.replace(cleanAdminUrl());
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
      if (!user?.id || !user.email) throw new Error('لا توجد جلسة تسجيل دخول فعالة.');

      const verify = await supabaseClient.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });
      if (verify.error) throw verify.error;

      const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
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

  function watchRecovery(){
    if (typeof supabaseClient === 'undefined' || !supabaseClient?.auth) return;

    supabaseClient.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setTimeout(showRecoveryOverlay, 0);
    });

    const params = new URLSearchParams(window.location.search || '');
    const hash = window.location.hash || '';
    const marker = params.get('recovery') === '1' || /type=recovery/i.test(hash);
    if (marker) setTimeout(showRecoveryOverlay, 0);
  }

  function init(){
    installStyles();
    ensureForgotUi();
    ensureUi();
    watchRecovery();

    const observer = new MutationObserver(() => {
      const a = ensureForgotUi();
      const b = ensureUi();
      if (a && b) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList:true, subtree:true });
    setTimeout(() => observer.disconnect(), 15000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();

// Copy this template once per restaurant and replace only these values.
// The publishable/anon key is safe to use in browser code. Never put the
// Supabase service_role key in this repository or in any browser file.
window.RESTBR_CONFIG = Object.freeze({
  restaurantName: 'Restaurant',
  supabaseUrl: 'https://YOUR_PROJECT_REF.supabase.co',
  supabasePublishableKey: 'YOUR_SUPABASE_PUBLISHABLE_KEY',
  enableUserManagement: false,
  enableRestaurantReset: false
});

// Keep the admin dashboard locked until the current Supabase session is
// confirmed against public.admin_users. This does not monkey-patch Supabase
// Auth methods; it only controls the dashboard gate and performs a normal
// read against the existing RLS-protected admin_users table.
(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(window.location.pathname)) return;
  if (window.__RESTBR_ADMIN_GATE_V2__) return;
  window.__RESTBR_ADMIN_GATE_V2__ = true;

  const allowedRoles = new Set([
    'super_admin',
    'owner',
    'manager',
    'menu_editor',
    'viewer'
  ]);

  const RECOVERY_MAX_AGE_MS = 30 * 60 * 1000;
  let verifiedAdmin = false;
  let client = null;
  let authSubscribed = false;
  let verifyingUserId = null;

  const recoveryLocation = () => {
    const params = new URLSearchParams(window.location.search || '');
    return (
      params.get('recovery') === '1' ||
      /type=recovery/i.test(window.location.search || '') ||
      /type=recovery/i.test(window.location.hash || '')
    );
  };

  const style = document.createElement('style');
  style.id = 'restbrAdminAuthorizationGateStyle';
  style.textContent = `
    body:not(.restbr-admin-authorized) > .admin-header,
    body:not(.restbr-admin-authorized) > .admin-main,
    body:not(.restbr-admin-authorized) > .bottom-nav{
      display:none !important;
    }

    body.restbr-admin-recovery > #adminLoginGate{
      display:none !important;
    }
  `;
  document.head.appendChild(style);

  const body = document.body;
  if (!body) return;

  if (recoveryLocation()) {
    body.classList.add('restbr-admin-recovery');
  }

  function setLoginMessageSafe(message = '', ok = false) {
    const el = document.getElementById('adminLoginMsg');
    if (!el) return;
    el.textContent = message;
    el.style.color = ok ? '#baf3d7' : '#fecaca';
  }

  function lockGate() {
    verifiedAdmin = false;
    body.classList.remove('restbr-admin-authorized');
    body.classList.add('auth-locked');
  }

  function unlockGate() {
    if (recoveryLocation()) {
      lockGate();
      body.classList.add('restbr-admin-recovery');
      return;
    }

    verifiedAdmin = true;
    body.classList.add('restbr-admin-authorized');
    body.classList.remove('auth-locked');
  }

  function recordRecoveryProof(session) {
    const userId = session?.user?.id || null;
    if (!userId) return;

    window.__RESTBR_GENUINE_PASSWORD_RECOVERY__ = {
      userId,
      at: Date.now()
    };

    body.classList.add('restbr-admin-recovery');
    lockGate();
  }

  function hasFreshRecoveryProof() {
    const proof = window.__RESTBR_GENUINE_PASSWORD_RECOVERY__;
    if (!proof?.userId || !Number.isFinite(Number(proof.at))) return false;
    return Date.now() - Number(proof.at) <= RECOVERY_MAX_AGE_MS;
  }

  function blockFakeRecoveryAction(event) {
    if (hasFreshRecoveryProof()) return false;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const message =
      'رابط الاستعادة غير موثّق من Supabase. اطلب رابط استعادة جديد من شاشة الدخول.';

    const ids = ['restbrRecoveryFixStatus', 'restbrRecoveryStatus', 'restbrForgotStatus'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = message;
      el.style.color = '#fecaca';
    });

    return true;
  }

  document.addEventListener('click', event => {
    const target = event.target?.closest?.(
      '#restbrRecoveryFixSave, #restbrRecoverySaveBtn'
    );
    if (!target) return;
    blockFakeRecoveryAction(event);
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    const id = event.target?.id || '';
    if (!['restbrRecoveryFixConfirm', 'restbrRecoveryConfirm'].includes(id)) return;
    blockFakeRecoveryAction(event);
  }, true);

  async function signOutUnauthorized() {
    try {
      if (client?.auth) await client.auth.signOut();
    } catch (_) {}
  }

  async function verifySession(session) {
    const userId = session?.user?.id || null;

    if (!userId) {
      verifyingUserId = null;
      lockGate();
      return false;
    }

    if (verifyingUserId === userId) return false;
    verifyingUserId = userId;

    try {
      const { data, error } = await client
        .from('admin_users')
        .select('role,is_active')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      const allowed =
        data?.is_active === true &&
        allowedRoles.has(String(data?.role || ''));

      if (!allowed) {
        lockGate();
        setLoginMessageSafe('هذا الحساب غير مخول للدخول إلى لوحة الإدارة.');
        await signOutUnauthorized();
        return false;
      }

      unlockGate();
      return true;
    } catch (error) {
      console.error('RESTBR ADMIN GATE ERROR:', error);
      lockGate();
      setLoginMessageSafe(
        'تعذر التحقق من صلاحية حساب الإدارة. حاول تحديث الصفحة.'
      );
      return false;
    } finally {
      verifyingUserId = null;
    }
  }

  function scheduleVerify(session) {
    setTimeout(() => {
      void verifySession(session);
    }, 0);
  }

  function startGate() {
    try {
      if (typeof supabaseClient === 'undefined' || !supabaseClient?.auth) {
        return false;
      }
      client = supabaseClient;
    } catch (_) {
      return false;
    }

    if (!authSubscribed) {
      authSubscribed = true;

      client.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          recordRecoveryProof(session);
          return;
        }

        if (event === 'SIGNED_OUT' || !session) {
          setTimeout(lockGate, 0);
          return;
        }

        if (
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'INITIAL_SESSION'
        ) {
          scheduleVerify(session);
        }
      });
    }

    client.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        return verifySession(data?.session || null);
      })
      .catch(error => {
        console.error('RESTBR ADMIN GATE INIT ERROR:', error);
        lockGate();
      });

    return true;
  }

  const classObserver = new MutationObserver(() => {
    if (!verifiedAdmin && !body.classList.contains('auth-locked')) {
      body.classList.add('auth-locked');
    }
  });
  classObserver.observe(body, { attributes: true, attributeFilter: ['class'] });

  lockGate();

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (startGate() || attempts >= 200) {
      clearInterval(timer);
    }
  }, 25);
})();

// Public/menu URL hardening. The guard allows only explicit safe schemes for
// restaurant-configured action and social links.
(() => {
  if (document.getElementById('restbrUrlSafetyScript')) return;
  const script = document.createElement('script');
  script.id = 'restbrUrlSafetyScript';
  script.src = 'js/url-safety.js?v=1.0';
  script.defer = true;
  document.head.appendChild(script);
})();

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

// Admin security hardening. This wraps the Supabase browser client before the
// dashboard creates it, so a valid Auth session alone is never enough to open
// the admin UI. The session must also belong to an active admin_users row.
(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(window.location.pathname)) return;
  if (!window.supabase?.createClient || window.__RESTBR_AUTH_HARDENING_V1__) return;

  window.__RESTBR_AUTH_HARDENING_V1__ = true;

  const originalCreateClient = window.supabase.createClient.bind(window.supabase);

  window.supabase.createClient = (...args) => {
    const client = originalCreateClient(...args);
    if (!client?.auth || client.auth.__restbrAuthHardened) return client;

    try {
      Object.defineProperty(client.auth, '__restbrAuthHardened', {
        value: true,
        configurable: false,
        enumerable: false,
        writable: false
      });
    } catch (_) {
      client.auth.__restbrAuthHardened = true;
    }

    const allowedRoles = new Set([
      'super_admin',
      'owner',
      'manager',
      'menu_editor',
      'viewer'
    ]);

    const originalGetSession = client.auth.getSession.bind(client.auth);
    const originalSignInWithPassword = client.auth.signInWithPassword.bind(client.auth);
    const originalOnAuthStateChange = client.auth.onAuthStateChange.bind(client.auth);
    const originalSignOut = client.auth.signOut.bind(client.auth);
    const originalUpdateUser = client.auth.updateUser.bind(client.auth);

    const recoveryState = {
      verified: false,
      userId: null
    };

    async function checkAdminSession(session) {
      const userId = session?.user?.id;
      if (!userId) return { ok: false, profile: null };

      try {
        const { data, error } = await client
          .from('admin_users')
          .select('role,is_active')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) return { ok: false, profile: null, error };

        const ok =
          data?.is_active === true &&
          allowedRoles.has(String(data?.role || ''));

        return { ok, profile: data || null };
      } catch (error) {
        return { ok: false, profile: null, error };
      }
    }

    async function rejectUnauthorizedSession() {
      try {
        await originalSignOut();
      } catch (_) {}
    }

    // Capture a genuine Supabase recovery event independently of dashboard
    // plugins. A plain ?recovery=1 marker is deliberately not trusted.
    originalOnAuthStateChange((event, session) => {
      if (event !== 'PASSWORD_RECOVERY') return;
      recoveryState.verified = true;
      recoveryState.userId = session?.user?.id || null;
    });

    client.auth.getSession = async (...callArgs) => {
      const result = await originalGetSession(...callArgs);
      const session = result?.data?.session;

      if (result?.error || !session) return result;

      const verdict = await checkAdminSession(session);
      if (verdict.ok) return result;

      await rejectUnauthorizedSession();
      return { data: { session: null }, error: null };
    };

    client.auth.signInWithPassword = async (...callArgs) => {
      const result = await originalSignInWithPassword(...callArgs);
      const session = result?.data?.session;

      if (result?.error || !session) return result;

      const verdict = await checkAdminSession(session);
      if (verdict.ok) return result;

      await rejectUnauthorizedSession();

      return {
        data: { user: null, session: null },
        error: new Error('هذا الحساب غير مخول للدخول إلى لوحة الإدارة.')
      };
    };

    client.auth.onAuthStateChange = callback => {
      if (typeof callback !== 'function') {
        return originalOnAuthStateChange(callback);
      }

      return originalOnAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          recoveryState.verified = true;
          recoveryState.userId = session?.user?.id || null;
          callback(event, session);
          return;
        }

        if (!session || event === 'SIGNED_OUT') {
          callback(event, session);
          return;
        }

        if (!['SIGNED_IN', 'TOKEN_REFRESHED', 'INITIAL_SESSION'].includes(event)) {
          callback(event, session);
          return;
        }

        // Avoid doing Supabase queries from inside the auth callback itself.
        // The deferred check also prevents the dashboard from briefly opening
        // before the admin_users authorization decision is known.
        setTimeout(async () => {
          const verdict = await checkAdminSession(session);

          if (verdict.ok) {
            callback(event, session);
            return;
          }

          await rejectUnauthorizedSession();
          callback('SIGNED_OUT', null);
        }, 0);
      });
    };

    client.auth.updateUser = async (attributes, ...callArgs) => {
      const isPasswordChange =
        attributes &&
        Object.prototype.hasOwnProperty.call(attributes, 'password');

      const params = new URLSearchParams(window.location.search || '');
      const recoveryPage =
        params.get('recovery') === '1' ||
        /type=recovery/i.test(window.location.hash || '');

      if (isPasswordChange && recoveryPage) {
        const sessionResult = await originalGetSession();
        const session = sessionResult?.data?.session;
        const sameRecoveryUser =
          recoveryState.verified === true &&
          !!session?.user?.id &&
          (!recoveryState.userId || recoveryState.userId === session.user.id);

        if (!sameRecoveryUser) {
          return {
            data: { user: null },
            error: new Error('رابط استعادة كلمة المرور غير صالح أو لم يتم التحقق منه.')
          };
        }
      }

      return originalUpdateUser(attributes, ...callArgs);
    };

    return client;
  };
})();

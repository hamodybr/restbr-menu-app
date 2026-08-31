(() => {
  const SYSTEM_SLUG = 'hidden-products';
  const SYSTEM_NAME_AR = 'غير معروض';
  const SYSTEM_NAME_KU = 'پیشان نەدراو';
  const SYSTEM_NAME_EN = 'Hidden Products';
  const SYSTEM_SORT = 9999;

  if (!window.supabaseClient && typeof supabaseClient === 'undefined') return;

  const client = window.supabaseClient || supabaseClient;
  let running = false;
  let completed = false;

  async function ensureHiddenCategory() {
    if (running || completed) return;
    running = true;

    try {
      const sessionResult = await client.auth.getSession();
      const session = sessionResult?.data?.session;
      if (!session) return;

      const lookup = await client
        .from('categories')
        .select('id,slug,name_ar,name_ku,name_en,sort_order,is_active,is_visible,availability_schedule_enabled')
        .or(`slug.eq.${SYSTEM_SLUG},name_ar.eq.${SYSTEM_NAME_AR}`)
        .limit(1);

      if (lookup.error) throw lookup.error;

      const existing = lookup.data?.[0] || null;
      let changed = false;
      let categoryId = existing?.id || null;

      if (existing) {
        const needsRepair =
          existing.slug !== SYSTEM_SLUG ||
          existing.name_ar !== SYSTEM_NAME_AR ||
          existing.name_ku !== SYSTEM_NAME_KU ||
          existing.name_en !== SYSTEM_NAME_EN ||
          Number(existing.sort_order) !== SYSTEM_SORT ||
          existing.is_active !== true ||
          existing.is_visible !== false ||
          existing.availability_schedule_enabled !== false;

        if (needsRepair) {
          const repair = await client
            .from('categories')
            .update({
              slug: SYSTEM_SLUG,
              name_ar: SYSTEM_NAME_AR,
              name_ku: SYSTEM_NAME_KU,
              name_en: SYSTEM_NAME_EN,
              sort_order: SYSTEM_SORT,
              is_active: true,
              is_visible: false,
              availability_schedule_enabled: false,
              available_from: null,
              available_to: null
            })
            .eq('id', existing.id)
            .select('id')
            .single();

          if (repair.error) throw repair.error;
          categoryId = repair.data?.id || existing.id;
          changed = true;
        }
      } else {
        const created = await client
          .from('categories')
          .insert({
            name_ar: SYSTEM_NAME_AR,
            name_ku: SYSTEM_NAME_KU,
            name_en: SYSTEM_NAME_EN,
            slug: SYSTEM_SLUG,
            sort_order: SYSTEM_SORT,
            is_active: true,
            is_visible: false,
            availability_schedule_enabled: false,
            available_from: null,
            available_to: null
          })
          .select('id')
          .single();

        if (created.error) throw created.error;
        categoryId = created.data?.id || null;
        changed = true;
      }

      completed = true;
      window.dispatchEvent(new CustomEvent('restbr:hidden-category-ready', {
        detail: { id: categoryId, changed }
      }));

      if (changed) {
        console.log('✅ RESTBR system category ready: hidden-products');
        setTimeout(() => {
          if (typeof window.loadAdminDashboard === 'function') {
            window.loadAdminDashboard().catch?.(() => {});
          }
        }, 250);
      }
    } catch (error) {
      // A read-only admin role may not have permission to create/repair the
      // system category. Owners/super-admins will self-heal it on their login.
      console.warn('RESTBR hidden category guard:', error?.message || error);
    } finally {
      running = false;
    }
  }

  client.auth.onAuthStateChange((event, session) => {
    if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED')) {
      setTimeout(ensureHiddenCategory, 80);
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(ensureHiddenCategory, 120);
    }, { once: true });
  } else {
    setTimeout(ensureHiddenCategory, 120);
  }
})();

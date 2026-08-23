// ============================================================
// RESTBR RESTAURANT MANAGER V1.2
// Internal dashboard mode: Platform Admin only.
// Fixes the previous MutationObserver feedback loop.
// ============================================================
(() => {
  'use strict';

  const cfg = window.RESTBR_OWNER_CONFIG || {};
  const $ = id => document.getElementById(id);

  function renameUi(){
    if(document.title !== 'RESTBR • Restaurant Manager'){
      document.title = 'RESTBR • Restaurant Manager';
    }

    document.querySelectorAll('h1').forEach(el => {
      const text = String(el.textContent || '').trim();
      if(text === 'RESTBR Owner' && text !== 'RESTBR Manager') el.textContent = 'RESTBR Manager';
    });

    const loginTenant = $('loginTenant');
    if(loginTenant && /لوحة إدارة المطعم|Owner/i.test(loginTenant.textContent || '')){
      const next = 'إدارة المطعم — Super Admin فقط';
      if(loginTenant.textContent !== next) loginTenant.textContent = next;
    }

    document.querySelectorAll('.panel-head small').forEach(el => {
      if(String(el.textContent || '').includes('مطعمك فقط') && el.textContent !== 'المطعم المحدد'){
        el.textContent = 'المطعم المحدد';
      }
    });

    $('rbOwnerCreateAccount')?.remove();
    $('rbOwnerSignupModal')?.remove();

    const topActions = document.querySelector('.top-actions');
    if(topActions && !$('backToSuperAdminBtn')){
      const back = document.createElement('button');
      back.id = 'backToSuperAdminBtn';
      back.type = 'button';
      back.className = 'icon-btn';
      back.title = 'العودة إلى Super Admin';
      back.textContent = '←';
      back.onclick = () => { location.href = 'https://admin.restbr.com'; };
      topActions.prepend(back);
    }

    const roleBadge = $('roleBadge');
    if(roleBadge && roleBadge.textContent !== 'Super Admin') roleBadge.textContent = 'Super Admin';
  }

  async function enforcePlatformAdmin(){
    if(!cfg.supabaseUrl || !cfg.publishableKey || !window.supabase) return;

    try{
      const sb = window.RESTBR_OWNER_V2_CLIENT || window.supabase.createClient(
        cfg.supabaseUrl,
        cfg.publishableKey,
        { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } }
      );
      window.RESTBR_OWNER_V2_CLIENT = sb;

      const { data:{ session } } = await sb.auth.getSession();
      if(!session?.user) return;

      const { data, error } = await sb
        .from('platform_admins')
        .select('user_id,is_active')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .maybeSingle();

      if(error) throw error;
      if(data?.user_id) return;

      await sb.auth.signOut();
      const app = $('app');
      const login = $('loginScreen');
      if(app) app.classList.add('hidden');
      if(login) login.classList.remove('hidden');
      const msg = $('loginMsg');
      if(msg){
        msg.textContent = 'هذه اللوحة مخصصة لحساب Super Admin فقط.';
        msg.className = 'status err';
      }
    }catch(error){
      console.warn('RESTBR Manager access check:', error);
    }
  }

  function boot(){
    renameUi();
    void enforcePlatformAdmin();

    // Finite delayed refreshes only. Never observe our own DOM mutations.
    setTimeout(renameUi, 250);
    setTimeout(renameUi, 1000);

    console.log('✅ RESTBR Restaurant Manager V1.2 — loop fixed');
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();

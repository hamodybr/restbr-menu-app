// ============================================================
// RESTBR RESTAURANT MANAGER V1
// Internal dashboard mode: Platform Admin only.
// No restaurant Owner/Manager/Editor accounts are supported.
// ============================================================
(() => {
  'use strict';

  const cfg = window.RESTBR_OWNER_CONFIG || {};
  const $ = id => document.getElementById(id);

  function renameUi(){
    document.title = 'RESTBR • Restaurant Manager';

    document.querySelectorAll('h1').forEach(el => {
      if(String(el.textContent || '').trim() === 'RESTBR Owner') el.textContent = 'RESTBR Manager';
    });

    const loginTenant = $('loginTenant');
    if(loginTenant && /لوحة إدارة المطعم|Owner/i.test(loginTenant.textContent || '')){
      loginTenant.textContent = 'إدارة المطعم — Super Admin فقط';
    }

    document.querySelectorAll('.panel-head small').forEach(el => {
      if(String(el.textContent || '').includes('مطعمك فقط')) el.textContent = 'المطعم المحدد';
    });

    const createAccount = $('rbOwnerCreateAccount');
    if(createAccount) createAccount.remove();

    const signupModal = $('rbOwnerSignupModal');
    if(signupModal) signupModal.remove();

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
    if(roleBadge) roleBadge.textContent = 'Super Admin';
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
    new MutationObserver(renameUi).observe(document.body,{childList:true,subtree:true});
    console.log('✅ RESTBR Restaurant Manager V1 — Super Admin only');
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();

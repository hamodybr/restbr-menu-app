// ============================================================
// RESTBR RESTAURANT MANAGER V1.1
// Internal dashboard mode: Platform Admin only.
// Restores the Super Admin session handoff on iOS/in-app browsers.
// ============================================================
(() => {
  'use strict';

  const cfg = window.RESTBR_OWNER_CONFIG || {};
  const $ = id => document.getElementById(id);

  function renameUi(){
    document.title = 'RESTBR • Restaurant Manager';

    document.querySelectorAll('h1').forEach(el => {
      if(/RESTBR Owner|RESTBR Manager/i.test(String(el.textContent || '').trim())) el.textContent = 'RESTBR Manager';
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
      back.onclick = () => { location.href = 'https://admin.restbr.com/control-v7/'; };
      topActions.prepend(back);
    }

    const roleBadge = $('roleBadge');
    if(roleBadge) roleBadge.textContent = 'Super Admin';
  }

  function makeClient(){
    if(!cfg.supabaseUrl || !cfg.publishableKey || !window.supabase) return null;
    const sb = window.RESTBR_OWNER_V2_CLIENT || window.supabase.createClient(
      cfg.supabaseUrl,
      cfg.publishableKey,
      { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } }
    );
    window.RESTBR_OWNER_V2_CLIENT = sb;
    return sb;
  }

  async function restoreHandoffIfNeeded(){
    const sb=makeClient();
    if(!sb) return false;
    try{
      const current=await sb.auth.getSession();
      if(current.data?.session?.user) return false;

      const raw=sessionStorage.getItem('RESTBR_SUPERADMIN_HANDOFF');
      if(!raw) return false;
      const handoff=JSON.parse(raw);
      const fresh=Date.now()-Number(handoff?.created_at||0) < 2*60*1000;
      if(!fresh || !handoff?.access_token || !handoff?.refresh_token){
        sessionStorage.removeItem('RESTBR_SUPERADMIN_HANDOFF');
        return false;
      }

      const {data,error}=await sb.auth.setSession({
        access_token:handoff.access_token,
        refresh_token:handoff.refresh_token
      });
      if(error) throw error;
      sessionStorage.removeItem('RESTBR_SUPERADMIN_HANDOFF');

      if(data?.session?.user){
        // The legacy inline manager boot already ran before this extension.
        // Reload once so it sees the restored session immediately.
        const url=new URL(location.href);
        url.searchParams.set('restored','1');
        location.replace(url.toString());
        return true;
      }
    }catch(error){
      console.warn('RESTBR Manager session restore:',error);
      sessionStorage.removeItem('RESTBR_SUPERADMIN_HANDOFF');
    }
    return false;
  }

  async function enforcePlatformAdmin(){
    const sb=makeClient();
    if(!sb) return;

    try{
      const { data:{ session } } = await sb.auth.getSession();
      if(!session?.user){
        // No second login page in Super Admin mode. Go back to the single login.
        const target=location.href;
        location.replace(`https://admin.restbr.com/control-v7/?return=${encodeURIComponent(target)}`);
        return;
      }

      const { data, error } = await sb
        .from('platform_admins')
        .select('user_id,is_active')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .maybeSingle();

      if(error) throw error;
      if(data?.user_id) return;

      await sb.auth.signOut();
      location.replace('https://admin.restbr.com/control-v7/');
    }catch(error){
      console.warn('RESTBR Manager access check:', error);
    }
  }

  async function boot(){
    renameUi();
    const restored=await restoreHandoffIfNeeded();
    if(restored) return;
    await enforcePlatformAdmin();
    new MutationObserver(renameUi).observe(document.body,{childList:true,subtree:true});
    console.log('✅ RESTBR Restaurant Manager V1.1 — Super Admin session only');
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else void boot();
})();
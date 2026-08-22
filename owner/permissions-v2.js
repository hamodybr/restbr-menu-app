// ============================================================
// RESTBR OWNER PERMISSIONS V2.0
// Mirrors backend RLS roles in the Owner UI for a cleaner experience.
// Backend RLS remains the final security boundary.
// ============================================================
(() => {
  'use strict';

  const cfg=window.RESTBR_OWNER_CONFIG||{};
  if(!cfg.supabaseUrl||!cfg.publishableKey||!window.supabase)return;
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const $=id=>document.getElementById(id);
  const state={tenantId:null,access:null,running:false};

  async function tenantId(){
    if(state.tenantId)return state.tenantId;
    const host=location.hostname.toLowerCase().replace(/^www\./,'');
    if(host==='hamodybr.github.io'){
      const slug=new URLSearchParams(location.search).get('tenant');
      if(!slug)return null;
      const {data,error}=await sb.from('restaurants').select('id').eq('slug',slug).maybeSingle();
      if(error)throw error;
      return state.tenantId=data?.id||null;
    }
    const {data,error}=await sb.from('restaurant_domains').select('restaurant_id').eq('hostname',host).eq('status','active').eq('is_verified',true).maybeSingle();
    if(error)throw error;
    return state.tenantId=data?.restaurant_id||null;
  }

  function setDisabled(selector,disabled){
    document.querySelectorAll(selector).forEach(el=>{
      el.disabled=Boolean(disabled);
      if(disabled)el.setAttribute('aria-disabled','true');else el.removeAttribute('aria-disabled');
    });
  }

  function apply(){
    const a=state.access;if(!a)return;
    setDisabled('#addProductBtn,#addCategoryBtn,#rbv2BulkPriceBtn',!a.canEditMenu);
    setDisabled('#saveDesignBtn,#saveSettingsBtn',!a.canManageSettings);

    document.querySelectorAll('#rbv2Operations input,#rbv2Operations select,#rbv2Operations textarea').forEach(el=>el.disabled=!a.canManageSettings);
    document.querySelectorAll('#view-design input,#view-design select,#view-settings input,#view-settings select,#view-settings textarea').forEach(el=>{
      if(!a.canManageSettings)el.disabled=true;
    });

    const roleBadge=$('roleBadge');
    if(roleBadge && !a.isPlatformAdmin)roleBadge.textContent=`الدور: ${a.role||'viewer'}`;

    document.documentElement.dataset.restbrOwnerRole=a.isPlatformAdmin?'platform_admin':(a.role||'viewer');
  }

  async function refresh(){
    if(state.running)return state.access;
    state.running=true;
    try{
      const {data:{session}}=await sb.auth.getSession();
      const user=session?.user;
      if(!user){state.access=null;return null;}
      const rid=await tenantId();
      if(!rid)return null;

      const [adminRes,memberRes]=await Promise.all([
        sb.from('platform_admins').select('user_id,is_active').eq('user_id',user.id).eq('is_active',true).maybeSingle(),
        sb.from('restaurant_members').select('role,is_active').eq('restaurant_id',rid).eq('user_id',user.id).eq('is_active',true).maybeSingle()
      ]);

      const isPlatformAdmin=Boolean(adminRes.data);
      const role=isPlatformAdmin?'platform_admin':(memberRes.data?.role||null);
      state.access={
        userId:user.id,
        restaurantId:rid,
        role,
        isPlatformAdmin,
        canEditMenu:isPlatformAdmin||['owner','manager','editor'].includes(role),
        canManageSettings:isPlatformAdmin||['owner','manager'].includes(role),
        canViewAnalytics:Boolean(isPlatformAdmin||role)
      };
      window.RESTBR_OWNER_ACCESS=state.access;
      apply();
      window.dispatchEvent(new CustomEvent('restbr:owner-access',{detail:state.access}));
      return state.access;
    }catch(error){console.warn('RESTBR Owner Permissions V2:',error);return null;}
    finally{state.running=false;}
  }

  window.RESTBR_OWNER_REFRESH_ACCESS=refresh;

  function boot(){
    const app=$('app');
    if(app){
      new MutationObserver(()=>{if(!app.classList.contains('hidden'))void refresh();}).observe(app,{attributes:true,attributeFilter:['class']});
      if(!app.classList.contains('hidden'))void refresh();
    }
    new MutationObserver(()=>apply()).observe(document.body,{childList:true,subtree:true});
    console.log('✅ RESTBR Owner Permissions V2.0 ready');
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

// ============================================================
// RESTBR SUPER ADMIN SESSION V2.2
// Shared Supabase session + Safari-safe hidden/interaction semantics.
// ============================================================
(() => {
  'use strict';

  if(!document.getElementById('restbrAdminHiddenGuard')){
    const style=document.createElement('style');
    style.id='restbrAdminHiddenGuard';
    style.textContent=`
      [hidden],.hidden{display:none!important;visibility:hidden!important;pointer-events:none!important}
      .app-view:not(.hidden),.app-view:not(.hidden) button,.app-view:not(.hidden) input,.app-view:not(.hidden) select,.app-view:not(.hidden) a{pointer-events:auto}
    `;
    document.head.appendChild(style);
  }

  const resetStaleOverlays=()=>{
    const legacy=document.getElementById('restaurantModal');
    const backdrop=document.getElementById('modalBackdrop');
    if(legacy?.getAttribute('aria-hidden')!=='false'){
      legacy?.classList.add('hidden');
      backdrop?.classList.add('hidden');
    }
    [
      'rbAdminMembersModal','rbPlanModal','rbTenantSettingsModal','rbDomainsModal','rbOnboardingModal'
    ].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.hidden=true;
    });
    document.body.style.overflow='';
  };

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>setTimeout(resetStaleOverlays,0),{once:true});
  }else{
    setTimeout(resetStaleOverlays,0);
  }
  window.addEventListener('pageshow',event=>{
    if(event.persisted) setTimeout(resetStaleOverlays,0);
  });

  if(!window.supabase?.createClient || window.__RESTBR_ADMIN_CREATE_CLIENT_WRAPPED)return;

  const nativeCreateClient=window.supabase.createClient.bind(window.supabase);
  window.__RESTBR_ADMIN_CREATE_CLIENT_WRAPPED=true;
  window.__RESTBR_ADMIN_CLIENTS=new Map();

  window.supabase.createClient=(url,key,options)=>{
    const cacheKey=`${String(url||'')}::${String(key||'')}`;
    if(window.__RESTBR_ADMIN_CLIENTS.has(cacheKey)){
      return window.__RESTBR_ADMIN_CLIENTS.get(cacheKey);
    }
    const client=nativeCreateClient(url,key,options);
    window.__RESTBR_ADMIN_CLIENTS.set(cacheKey,client);
    window.RESTBR_ADMIN_CLIENT=client;
    return client;
  };

  console.log('✅ RESTBR Super Admin shared session V2.2 ready');
})();

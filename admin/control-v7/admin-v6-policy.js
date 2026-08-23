// RESTBR Control Center V7.1 — cache-isolated routing + iOS session handoff
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  function forceInternalPlan(){ const plan=$('#restaurantPlan'); if(plan) plan.value='internal'; }

  function rewrite(){
    const badge=document.querySelector('.login-card .safe-build');
    if(badge) badge.textContent='CONTROL CENTER V7.1';
    document.querySelectorAll('[data-action="manage"]').forEach(button=>{
      const card=button.closest('.restaurant-card');
      const link=card?.querySelector('.restaurant-main a');
      const hostname=String(link?.textContent||'').trim();
      const slug=hostname.replace(/\.restbr\.com$/i,'');
      if(!slug) return;
      button.dataset.url=`https://admin.restbr.com/manage-v7-1/?tenant=${encodeURIComponent(slug)}&mode=superadmin&v=7.1`;
    });
    document.querySelectorAll('.restaurant-card > .meta').forEach(meta=>{
      const label=meta.querySelector('span');
      if(String(label?.textContent||'').trim()==='الخطة') meta.remove();
    });
  }

  async function goManager(button){
    const url=button?.dataset?.url;
    if(!url) return;
    button.disabled=true;
    const oldText=button.textContent;
    button.textContent='جاري الفتح...';
    try{
      if(window.supabase){
        const res=await fetch('/_restbr/platform-config',{cache:'no-store',headers:{Accept:'application/json'}});
        const cfg=await res.json().catch(()=>null);
        if(res.ok && cfg?.supabase_url && cfg?.publishable_key){
          const client=window.supabase.createClient(cfg.supabase_url,cfg.publishable_key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
          const {data}=await client.auth.getSession();
          const s=data?.session;
          if(s?.access_token && s?.refresh_token){
            sessionStorage.setItem('RESTBR_SUPERADMIN_HANDOFF',JSON.stringify({access_token:s.access_token,refresh_token:s.refresh_token,expires_at:s.expires_at||null,created_at:Date.now()}));
          }
        }
      }
    }catch(error){console.warn('RESTBR session handoff skipped:',error);}
    location.assign(url);
    setTimeout(()=>{button.disabled=false;button.textContent=oldText;},3000);
  }

  function interceptManage(event){
    const button=event.target.closest?.('[data-action="manage"]');
    if(!button) return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    void goManager(button);
  }

  function boot(){
    forceInternalPlan();rewrite();
    $('#addRestaurantBtn')?.addEventListener('click',()=>setTimeout(forceInternalPlan,0));
    $('#restaurantForm')?.addEventListener('submit',forceInternalPlan,true);
    document.addEventListener('click',interceptManage,true);
    const list=$('#restaurantList');
    if(list) new MutationObserver(rewrite).observe(list,{childList:true,subtree:true});
    console.log('RESTBR CONTROL V7.1 ACTIVE — same-tab manager handoff');
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
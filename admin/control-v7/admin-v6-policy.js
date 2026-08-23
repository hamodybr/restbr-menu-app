// RESTBR Control Center V7 — cache-isolated routing policy
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  function forceInternalPlan(){ const plan=$('#restaurantPlan'); if(plan) plan.value='internal'; }
  function rewrite(){
    document.querySelectorAll('[data-action="manage"]').forEach(button=>{
      const card=button.closest('.restaurant-card');
      const link=card?.querySelector('.restaurant-main a');
      const hostname=String(link?.textContent||'').trim();
      const slug=hostname.replace(/\.restbr\.com$/i,'');
      if(!slug) return;
      button.dataset.url=`https://admin.restbr.com/manage-v7/?tenant=${encodeURIComponent(slug)}&mode=superadmin&v=7`;
    });
    document.querySelectorAll('.restaurant-card > .meta').forEach(meta=>{
      const label=meta.querySelector('span');
      if(String(label?.textContent||'').trim()==='الخطة') meta.remove();
    });
  }
  function boot(){
    forceInternalPlan(); rewrite();
    $('#addRestaurantBtn')?.addEventListener('click',()=>setTimeout(forceInternalPlan,0));
    $('#restaurantForm')?.addEventListener('submit',forceInternalPlan,true);
    const list=$('#restaurantList');
    if(list) new MutationObserver(rewrite).observe(list,{childList:true,subtree:true});
    console.log('RESTBR CONTROL V7 ACTIVE');
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
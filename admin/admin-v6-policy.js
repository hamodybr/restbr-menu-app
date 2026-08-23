// RESTBR Super Admin V6 — single-admin UX policy
(() => {
  'use strict';

  const $ = s => document.querySelector(s);

  function forceInternalPlan(){
    const plan = $('#restaurantPlan');
    if(plan) plan.value = 'internal';
  }

  function rewriteManageLinks(){
    document.querySelectorAll('[data-action="manage"]').forEach(button => {
      const card = button.closest('.restaurant-card');
      const link = card?.querySelector('.restaurant-main a');
      const hostname = String(link?.textContent || '').trim();
      const slug = hostname.replace(/\.restbr\.com$/i,'');
      if(!slug) return;
      button.dataset.url = `https://admin.restbr.com/manage/?tenant=${encodeURIComponent(slug)}&mode=superadmin`;
    });
  }

  function cleanPlanUi(){
    document.querySelectorAll('.restaurant-card > .meta').forEach(meta => {
      const label = meta.querySelector('span');
      if(String(label?.textContent || '').trim() === 'الخطة') meta.remove();
    });
    rewriteManageLinks();
  }

  function boot(){
    forceInternalPlan();

    const add = $('#addRestaurantBtn');
    if(add) add.addEventListener('click', () => setTimeout(forceInternalPlan, 0));

    const form = $('#restaurantForm');
    if(form) form.addEventListener('submit', forceInternalPlan, true);

    const list = $('#restaurantList');
    if(list){
      cleanPlanUi();
      new MutationObserver(cleanPlanUi).observe(list,{childList:true,subtree:true});
    }

    console.log('✅ RESTBR Super Admin V6 policy active — no plan UI, same-origin manager');
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();

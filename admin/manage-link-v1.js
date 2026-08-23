// RESTBR Super Admin manage-link policy V1
(() => {
  'use strict';

  function rewrite(){
    document.querySelectorAll('[data-action="manage"]').forEach(button => {
      try{
        const current = new URL(button.dataset.url || '', location.href);
        const tenant = current.searchParams.get('tenant');
        if(!tenant) return;
        button.dataset.url = `https://hamodybr.github.io/restbr-menu-app/owner/manager/?tenant=${encodeURIComponent(tenant)}&mode=superadmin`;
      }catch(_){}
    });
  }

  function boot(){
    rewrite();
    const list = document.getElementById('restaurantList');
    if(list) new MutationObserver(rewrite).observe(list,{childList:true,subtree:true});
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();

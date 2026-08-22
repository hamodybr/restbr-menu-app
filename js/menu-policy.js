// ==========================================
// RESTBR MENU POLICY V1.0
// Applies tenant-level menu_enabled without modifying legacy app.js.
// ==========================================
(() => {
  'use strict';

  function lang(){
    return window.SHORASH_LANG ? window.SHORASH_LANG() : (localStorage.getItem('shorashLang') || 'ar');
  }

  function message(){
    const l=lang();
    if(l==='en')return 'The menu is temporarily unavailable.';
    if(l==='ku')return 'مێنیو لە ئێستادا بەردەست نییە.';
    return 'المنيو متوقف مؤقتاً.';
  }

  function apply(){
    const settings=window.RESTBR_BOOTSTRAP?.settings || {};
    const enabled=settings.menu_enabled !== false;
    document.documentElement.dataset.restbrMenuEnabled=enabled?'true':'false';
    if(enabled)return;

    const menu=document.getElementById('smMenu');
    const cats=document.getElementById('smCats');
    const catsWrap=document.querySelector('.sm-cats-wrap');
    const actions=document.getElementById('smActions');

    if(cats)cats.style.display='none';
    if(catsWrap)catsWrap.style.display='none';
    if(actions)actions.style.display='none';

    if(menu){
      menu.innerHTML=`
        <section style="min-height:38vh;display:grid;place-items:center;padding:30px 14px;">
          <div style="width:min(92%,460px);text-align:center;padding:24px 18px;border:1px solid rgba(216,169,88,.25);border-radius:20px;background:rgba(10,8,6,.86);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);color:#d8a958;line-height:1.8;font-weight:800;">
            ⏸<br>${message()}
          </div>
        </section>`;
    }

    // cart.js checks ordersEnabled. Force the public runtime state closed too.
    if(window.SHORASH_DB?.restaurant){
      window.SHORASH_DB.restaurant.ordersEnabled=false;
    }
  }

  if(window.SHORASH_DB)apply();
  else window.addEventListener('shorash:ready',apply,{once:true});

  document.addEventListener('click',event=>{
    if(event.target.closest?.('[data-lang]') && window.RESTBR_BOOTSTRAP?.settings?.menu_enabled===false){
      setTimeout(apply,60);
    }
  });
})();

// ==========================================
// RESTBR TENANT HEAD V1.0
// Applies tenant title/favicon/apple-title from the live bootstrap.
// ==========================================
(() => {
  'use strict';

  function setLink(rel,href){
    if(!href)return;
    let link=document.querySelector(`link[rel="${rel}"]`);
    if(!link){link=document.createElement('link');link.rel=rel;document.head.appendChild(link);}
    link.href=href;
  }

  async function apply(){
    try{
      if(typeof window.RESTBR_LOAD_BOOTSTRAP!=='function')return;
      const payload=await window.RESTBR_LOAD_BOOTSTRAP();
      const s=payload?.settings||{};
      const r=payload?.restaurant||{};
      const lang=localStorage.getItem('shorashLang')||r.default_language||'ar';
      const name=
        lang==='ku'?(s.restaurant_name_ku||s.name_ku||s.restaurant_name_ar||r.name):
        lang==='en'?(s.restaurant_name_en||s.name_en||s.restaurant_name_ar||r.name):
        (s.restaurant_name_ar||s.name_ar||r.name||'Menu');
      const logo=String(s.logo_url||r.logo_url||'').trim();

      document.title=name?`${name} — Menu`:'Menu';
      const apple=document.querySelector('meta[name="apple-mobile-web-app-title"]');
      if(apple)apple.setAttribute('content',name||'Menu');
      if(logo){
        setLink('icon',logo);
        setLink('apple-touch-icon',logo);
      }else{
        setLink('icon','assets/restbr-icon.svg');
      }
    }catch(error){console.debug('RESTBR tenant head skipped:',error);}
  }

  apply();
  document.addEventListener('click',event=>{
    if(event.target.closest?.('[data-lang]'))setTimeout(apply,80);
  });
})();

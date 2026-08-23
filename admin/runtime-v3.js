// ============================================================
// RESTBR SUPER ADMIN RUNTIME V3.0
// Defensive Safari interaction recovery + dashboard hydration fallback.
// Does not bypass RLS and reuses the authenticated shared client.
// ============================================================
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  let fallbackHydrated=false;

  function addSafetyStyles(){
    if($('restbrAdminRuntimeV3Styles'))return;
    const s=document.createElement('style');
    s.id='restbrAdminRuntimeV3Styles';
    s.textContent=`
      [hidden],.hidden{display:none!important;visibility:hidden!important;pointer-events:none!important}
      #appView:not(.hidden){position:relative;z-index:1;pointer-events:auto!important}
      #appView:not(.hidden) button,#appView:not(.hidden) input,#appView:not(.hidden) select,#appView:not(.hidden) a{pointer-events:auto!important;touch-action:manipulation}
      #modalBackdrop.hidden,#restaurantModal.hidden{pointer-events:none!important}
      .rb-admin-runtime-warning{margin:0 0 12px;padding:10px 12px;border:1px solid rgba(232,184,98,.3);border-radius:13px;background:rgba(232,184,98,.07);color:var(--gold2);font-size:10px;line-height:1.6}
    `;
    document.head.appendChild(s);
  }

  function closeStaleOverlays(){
    const modal=$('restaurantModal'),backdrop=$('modalBackdrop');
    if(modal?.getAttribute('aria-hidden')!=='false'){
      modal?.classList.add('hidden');
      backdrop?.classList.add('hidden');
    }
    ['rbAdminMembersModal','rbPlanModal','rbTenantSettingsModal','rbDomainsModal','rbOnboardingModal'].forEach(id=>{
      const el=$(id);if(el&&el.hidden!==false)el.hidden=true;
    });
    if(!document.querySelector('.modal:not(.hidden),[id^="rb"][class*="modal"]:not([hidden])')){
      document.body.style.overflow='';
    }
  }

  function ensureCoreButtonFallbacks(){
    const add=$('addRestaurantBtn');
    if(add&&!add.dataset.rbRuntimeBound){
      add.dataset.rbRuntimeBound='1';
      add.addEventListener('click',()=>setTimeout(()=>{
        const modal=$('restaurantModal');
        if(!modal||!modal.classList.contains('hidden'))return;
        $('restaurantForm')?.reset();
        if($('restaurantPlan'))$('restaurantPlan').value='basic';
        if($('restaurantLanguage'))$('restaurantLanguage').value='ar';
        if($('restaurantCurrency'))$('restaurantCurrency').value='IQD';
        $('modalBackdrop')?.classList.remove('hidden');
        modal.classList.remove('hidden');modal.setAttribute('aria-hidden','false');
        document.body.style.overflow='hidden';
      },0),{capture:false});
    }

    const theme=$('themeBtn');
    if(theme&&!theme.dataset.rbRuntimeBound){
      theme.dataset.rbRuntimeBound='1';
      theme.addEventListener('click',()=>{
        const before=document.documentElement.dataset.theme||'dark';
        setTimeout(()=>{
          const after=document.documentElement.dataset.theme||'dark';
          if(after===before){
            const next=before==='light'?'dark':'light';
            document.documentElement.dataset.theme=next;
            try{localStorage.setItem('RESTBR_ADMIN_THEME',next);}catch(_){}
          }
        },0);
      });
    }

    const refresh=$('refreshBtn');
    if(refresh&&!refresh.dataset.rbRuntimeBound){
      refresh.dataset.rbRuntimeBound='1';
      refresh.addEventListener('click',()=>setTimeout(()=>void hydrate(true),120));
    }
  }

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
  function domainFor(domains,id){return domains.find(x=>x.restaurant_id===id&&x.is_primary)||domains.find(x=>x.restaurant_id===id)||null;}
  function subFor(subs,id){return subs.find(x=>x.restaurant_id===id)||null;}

  function renderFallback(restaurants,domains,subscriptions){
    const list=$('restaurantList');if(!list)return;
    $('statTotal').textContent=restaurants.length;
    $('statActive').textContent=restaurants.filter(r=>r.status==='active').length;
    $('statSuspended').textContent=restaurants.filter(r=>r.status==='suspended').length;
    $('statSubs').textContent=subscriptions.filter(s=>['active','trial'].includes(s.status)).length;
    list.innerHTML=restaurants.map(r=>{
      const d=domainFor(domains,r.id),sub=subFor(subscriptions,r.id),host=d?.hostname||`${r.slug}.restbr.com`,url=`https://${host}`;
      const next=r.status==='active'?'suspended':'active';
      return `<article class="restaurant-card" data-id="${esc(r.id)}"><div class="restaurant-main"><h4>${esc(r.name)}</h4><a href="${esc(url)}" target="_blank" rel="noopener">${esc(host)}</a></div><div class="meta"><span>الحالة</span><strong class="status-pill status-${esc(r.status)}">${r.status==='active'?'نشط':esc(r.status)}</strong></div><div class="meta"><span>الخطة</span><strong>${esc(sub?.plan||'—')}</strong></div><div class="card-actions"><button class="mini-btn" data-action="open" data-url="${esc(url)}">فتح المنيو</button><button class="mini-btn" data-action="copy" data-url="${esc(url)}">نسخ الرابط</button><button class="mini-btn ${next==='suspended'?'danger':''}" data-action="status" data-id="${esc(r.id)}" data-status="${next}">${next==='suspended'?'إيقاف':'تفعيل'}</button></div></article>`;
    }).join('');
    $('emptyState')?.classList.toggle('hidden',restaurants.length>0);
    if($('lastUpdated'))$('lastUpdated').textContent=`آخر تحديث: ${new Date().toLocaleTimeString('ar-IQ',{hour:'2-digit',minute:'2-digit'})} • Runtime V3`;
    fallbackHydrated=true;
  }

  function showWarning(text){
    const panel=document.querySelector('.panel.glass');if(!panel)return;
    let w=$('rbAdminRuntimeWarning');if(!w){w=document.createElement('div');w.id='rbAdminRuntimeWarning';w.className='rb-admin-runtime-warning';panel.prepend(w);}w.textContent=text;
  }

  async function sharedClient(){
    for(let i=0;i<30;i++){
      if(window.RESTBR_ADMIN_CLIENT)return window.RESTBR_ADMIN_CLIENT;
      await sleep(100);
    }
    return null;
  }

  async function hydrate(force=false){
    if(fallbackHydrated&&!force)return;
    const app=$('appView');if(!app||app.classList.contains('hidden'))return;
    const client=await sharedClient();if(!client)return;
    try{
      const {data:{session}}=await client.auth.getSession();if(!session?.user)return;
      const [r,d,s]=await Promise.all([
        client.from('restaurants').select('id,name,slug,status,default_language,timezone,currency,created_at,updated_at').order('created_at',{ascending:false}),
        client.from('restaurant_domains').select('restaurant_id,hostname,status,is_verified,is_primary'),
        client.from('subscriptions').select('restaurant_id,plan,status,starts_at,expires_at')
      ]);
      if(r.error)throw r.error;
      const restaurants=r.data||[],domains=d.error?[]:(d.data||[]),subscriptions=s.error?[]:(s.data||[]);
      const current=Number($('statTotal')?.textContent||0);
      if(restaurants.length>0&&(current===0||force))renderFallback(restaurants,domains,subscriptions);
      if(d.error||s.error)showWarning(`تم تحميل المطاعم، لكن بعض البيانات الثانوية تعذر تحميلها: ${d.error?.message||s.error?.message}`);
    }catch(error){showWarning('تعذر تحديث لوحة Super Admin: '+(error?.message||String(error)));}
  }

  function boot(){
    addSafetyStyles();closeStaleOverlays();ensureCoreButtonFallbacks();
    setTimeout(()=>void hydrate(false),900);
    window.addEventListener('pageshow',()=>{closeStaleOverlays();setTimeout(()=>void hydrate(false),350);});
    console.log('✅ RESTBR Super Admin Runtime V3.0 ready');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

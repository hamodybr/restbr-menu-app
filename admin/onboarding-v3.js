// ============================================================
// RESTBR SUPER ADMIN ONBOARDING V3.0
// Per-restaurant readiness status: domain, subscription, settings and owner.
// Uses the shared Admin Supabase session created by session-v2.js.
// ============================================================
(() => {
  'use strict';
  const state={client:null,rows:new Map(),loading:false};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function styles(){
    if(document.getElementById('rbOnboardingV3Styles'))return;const s=document.createElement('style');s.id='rbOnboardingV3Styles';s.textContent=`
      .rb-ready{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}.rb-ready-chip{font-size:9px;padding:5px 7px;border:1px solid rgba(255,255,255,.1);border-radius:999px;color:#9b9389;background:rgba(255,255,255,.025)}.rb-ready-chip.ok{color:#4ade80;border-color:rgba(74,222,128,.25);background:rgba(74,222,128,.05)}.rb-ready-chip.warn{color:#f1b85b;border-color:rgba(241,184,91,.25);background:rgba(241,184,91,.05)}.rb-onboard-btn{border-color:rgba(216,169,88,.35)!important;color:#d8a958!important}.rb-onboard-modal{position:fixed;z-index:150;inset:0;display:grid;place-items:center;padding:15px;background:rgba(0,0,0,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}.rb-onboard-card{width:min(650px,100%);max-height:92dvh;overflow:auto;background:#11100e;color:#f8f4ed;border:1px solid rgba(255,255,255,.12);border-radius:24px;padding:16px;box-shadow:0 30px 90px rgba(0,0,0,.5)}html[data-theme="light"] .rb-onboard-card{background:#fff;color:#191713}.rb-onboard-head{display:flex;justify-content:space-between;gap:10px}.rb-onboard-head h3{margin:0}.rb-onboard-head p{margin:4px 0 0;color:#9b9389;font-size:10px}.rb-onboard-close{width:38px;height:38px;border:1px solid rgba(255,255,255,.12);border-radius:11px;background:transparent;color:inherit;font-size:20px}.rb-onboard-steps{display:grid;gap:8px;margin-top:13px}.rb-onboard-step{display:grid;grid-template-columns:32px minmax(0,1fr) auto;gap:9px;align-items:center;padding:10px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(255,255,255,.025)}.rb-onboard-step b{width:30px;height:30px;border-radius:999px;display:grid;place-items:center;background:rgba(216,169,88,.1);color:#d8a958}.rb-onboard-step strong{display:block;font-size:11px}.rb-onboard-step small{display:block;margin-top:3px;color:#9b9389;font-size:9px;line-height:1.45}.rb-onboard-step button{border:1px solid rgba(216,169,88,.3);border-radius:10px;background:rgba(216,169,88,.08);color:#d8a958;min-height:34px;padding:0 9px;font-size:9px;font-weight:900}.rb-onboard-links{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}.rb-onboard-links button{min-height:40px}.rb-onboard-note{margin-top:10px;padding:9px;border:1px solid rgba(216,169,88,.18);border-radius:12px;color:#9b9389;font-size:9px;line-height:1.55}@media(max-width:600px){.rb-onboard-step{grid-template-columns:30px minmax(0,1fr)}.rb-onboard-step button{grid-column:1/-1}.rb-onboard-links{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  async function client(){
    if(state.client)return state.client;
    if(window.RESTBR_ADMIN_CLIENT)return state.client=window.RESTBR_ADMIN_CLIENT;
    for(let i=0;i<40;i++){await new Promise(r=>setTimeout(r,100));if(window.RESTBR_ADMIN_CLIENT)return state.client=window.RESTBR_ADMIN_CLIENT;}
    throw new Error('Admin client not ready');
  }

  async function load(){
    if(state.loading)return;state.loading=true;
    try{const c=await client();const [r,d,s,m,st]=await Promise.all([
      c.from('restaurants').select('id,name,slug,status'),
      c.from('restaurant_domains').select('restaurant_id,hostname,status,is_verified,is_primary'),
      c.from('subscriptions').select('restaurant_id,plan,status'),
      c.from('restaurant_members').select('restaurant_id,role,is_active'),
      c.from('restaurant_settings').select('restaurant_id')
    ]);for(const x of [r,d,s,m,st])if(x.error)throw x.error;state.rows.clear();(r.data||[]).forEach(x=>{const domains=(d.data||[]).filter(v=>v.restaurant_id===x.id);const domain=domains.find(v=>v.is_primary)||domains[0]||null;const sub=(s.data||[]).find(v=>v.restaurant_id===x.id)||null;const members=(m.data||[]).filter(v=>v.restaurant_id===x.id&&v.is_active);state.rows.set(x.id,{restaurant:x,domain,subscription:sub,owners:members.filter(v=>v.role==='owner').length,members:members.length,hasSettings:(st.data||[]).some(v=>v.restaurant_id===x.id)});});decorate();}
    catch(error){console.error('RESTBR onboarding status:',error);}finally{state.loading=false;}
  }

  function decorate(){
    document.querySelectorAll('.restaurant-card').forEach(card=>{const row=state.rows.get(card.dataset.id);if(!row)return;let holder=card.querySelector('.rb-ready');if(!holder){holder=document.createElement('div');holder.className='rb-ready';card.querySelector('.restaurant-main')?.appendChild(holder);}const domainOk=Boolean(row.domain?.is_verified&&row.domain?.status==='active'),subOk=Boolean(row.subscription&&['active','trial'].includes(row.subscription.status)),ownerOk=row.owners>0;holder.innerHTML=`<span class="rb-ready-chip ${domainOk?'ok':'warn'}">${domainOk?'✓':'!'} Domain</span><span class="rb-ready-chip ${subOk?'ok':'warn'}">${subOk?'✓':'!'} Subscription</span><span class="rb-ready-chip ${row.hasSettings?'ok':'warn'}">${row.hasSettings?'✓':'!'} Settings</span><span class="rb-ready-chip ${ownerOk?'ok':'warn'}">${ownerOk?'✓':'!'} Owner ${row.owners||0}</span>`;
      const actions=card.querySelector('.card-actions');if(actions&&!actions.querySelector('[data-onboarding]')){const b=document.createElement('button');b.type='button';b.className='mini-btn rb-onboard-btn';b.dataset.onboarding=row.restaurant.id;b.textContent='تهيئة';b.onclick=()=>open(row.restaurant.id);actions.appendChild(b);}
    });
  }

  function ensureModal(){let modal=document.getElementById('rbOnboardingModal');if(modal)return modal;modal=document.createElement('div');modal.id='rbOnboardingModal';modal.className='rb-onboard-modal';modal.hidden=true;modal.innerHTML='<div class="rb-onboard-card"><div class="rb-onboard-head"><div><h3 id="rbOnboardTitle">تهيئة المطعم</h3><p id="rbOnboardDomain"></p></div><button id="rbOnboardClose" class="rb-onboard-close" type="button">×</button></div><div id="rbOnboardSteps" class="rb-onboard-steps"></div><div class="rb-onboard-links"><button id="rbOnboardMenu" class="btn" type="button">فتح المنيو</button><button id="rbOnboardOwner" class="btn primary" type="button">فتح Owner</button></div><div class="rb-onboard-note">التسلسل الصحيح: أنشئ المطعم → افتح Owner وأجعل صاحب المطعم ينشئ حسابه → من «المالك/الفريق» اربط بريده بدور Owner → بعدها يصبح المطعم جاهز للتسليم.</div></div>';document.body.appendChild(modal);document.getElementById('rbOnboardClose').onclick=()=>modal.hidden=true;modal.onclick=e=>{if(e.target===modal)modal.hidden=true;};return modal;}

  function ownerUrl(row){const host=row.domain?.hostname||`${row.restaurant.slug}.restbr.com`;const u=new URL(`https://${host}/owner/`);u.searchParams.set('tenant',row.restaurant.slug);return u.toString();}
  function menuUrl(row){return `https://${row.domain?.hostname||`${row.restaurant.slug}.restbr.com`}/`;}
  function open(id){const row=state.rows.get(id);if(!row)return;const modal=ensureModal();document.getElementById('rbOnboardTitle').textContent=`تهيئة ${row.restaurant.name}`;document.getElementById('rbOnboardDomain').textContent=row.domain?.hostname||`${row.restaurant.slug}.restbr.com`;const domainOk=Boolean(row.domain?.is_verified&&row.domain?.status==='active'),subOk=Boolean(row.subscription&&['active','trial'].includes(row.subscription.status)),ownerOk=row.owners>0;document.getElementById('rbOnboardSteps').innerHTML=`
    <div class="rb-onboard-step"><b>1</b><div><strong>${domainOk?'الدومين جاهز ✓':'الدومين يحتاج مراجعة'}</strong><small>${esc(row.domain?.hostname||'لا يوجد دومين')}</small></div></div>
    <div class="rb-onboard-step"><b>2</b><div><strong>${subOk?'الاشتراك فعال ✓':'الاشتراك غير فعال'}</strong><small>${esc(row.subscription?.plan||'—')} • ${esc(row.subscription?.status||'—')}</small></div></div>
    <div class="rb-onboard-step"><b>3</b><div><strong>${row.hasSettings?'إعدادات tenant موجودة ✓':'إعدادات tenant ناقصة'}</strong><small>صف restaurant_settings مستقل لهذا المطعم.</small></div></div>
    <div class="rb-onboard-step"><b>4</b><div><strong>${ownerOk?'Owner مربوط ✓':'لا يوجد Owner مربوط بعد'}</strong><small>${row.members} عضو فعال • ${row.owners} Owner</small></div><button type="button" id="rbOnboardMembers">المالك/الفريق</button></div>`;document.getElementById('rbOnboardMenu').onclick=()=>window.open(menuUrl(row),'_blank','noopener');document.getElementById('rbOnboardOwner').onclick=()=>window.open(ownerUrl(row),'_blank','noopener');document.getElementById('rbOnboardMembers')?.addEventListener('click',()=>{modal.hidden=true;const card=document.querySelector(`.restaurant-card[data-id="${CSS.escape(id)}"]`);const button=[...card?.querySelectorAll('button')||[]].find(b=>/المالك\/الفريق/.test(b.textContent||''));button?.click();});modal.hidden=false;}

  function boot(){styles();ensureModal();const list=document.getElementById('restaurantList');if(list)new MutationObserver(()=>{decorate();setTimeout(load,150);}).observe(list,{childList:true,subtree:true});const app=document.getElementById('appView');if(app)new MutationObserver(()=>{if(!app.classList.contains('hidden'))void load();}).observe(app,{attributes:true,attributeFilter:['class']});setTimeout(()=>void load(),900);console.log('✅ RESTBR Super Admin Onboarding V3.0 ready');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

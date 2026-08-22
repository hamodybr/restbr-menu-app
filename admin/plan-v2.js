// ============================================================
// RESTBR SUPER ADMIN PLAN V2.1
// Changes Basic / Pro / Premium / Internal using existing RLS policies.
// No privileged RPC is required.
// ============================================================
(() => {
  'use strict';

  let sb=null;
  const state={restaurantId:null,name:'',currentPlan:'basic',subscriptionId:null};
  const $=id=>document.getElementById(id);

  async function client(){
    if(sb)return sb;
    const response=await fetch('/_restbr/platform-config',{headers:{Accept:'application/json'},cache:'no-store'});
    const config=await response.json().catch(()=>({}));
    if(!response.ok||!config?.ok)throw new Error(config?.message||'تعذر تحميل إعدادات RESTBR.');
    sb=window.supabase.createClient(config.supabase_url,config.publishable_key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return sb;
  }

  function styles(){
    if($('rbPlanV2Styles'))return;
    const s=document.createElement('style');s.id='rbPlanV2Styles';s.textContent=`
      .rb-plan-modal{position:fixed;z-index:125;inset:0;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.68);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
      .rb-plan-card{width:min(430px,100%);border:1px solid rgba(255,255,255,.12);border-radius:22px;background:#11100e;color:#f8f4ed;padding:17px;box-shadow:0 30px 90px rgba(0,0,0,.5)}
      html[data-theme="light"] .rb-plan-card{background:#fff;color:#191713}
      .rb-plan-card h3{margin:0 0 5px}.rb-plan-card p{font-size:11px;color:#9b9389;margin:0 0 13px;line-height:1.6}
      .rb-plan-card select{width:100%;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:rgba(0,0,0,.16);color:inherit;padding:12px;font-size:16px}
      .rb-plan-actions{display:flex;gap:8px;margin-top:13px}.rb-plan-actions button{flex:1}.rb-plan-msg{min-height:18px;margin-top:9px;font-size:11px}.rb-plan-msg.ok{color:#4ade80}.rb-plan-msg.err{color:#ef6b6b}
    `;document.head.appendChild(s);
  }

  function ensureModal(){
    let modal=$('rbPlanModal');if(modal)return modal;
    modal=document.createElement('div');modal.id='rbPlanModal';modal.className='rb-plan-modal';modal.hidden=true;
    modal.innerHTML=`<div class="rb-plan-card"><h3 id="rbPlanTitle">تغيير الخطة</h3><p>يتم تحديث اشتراك المطعم عبر RLS الخاص بالـ Platform Admin. إيقاف المطعم نفسه يبقى منفصلًا من زر الحالة.</p><select id="rbPlanSelect"><option value="basic">Basic</option><option value="pro">Pro</option><option value="premium">Premium</option><option value="internal">Internal</option></select><div class="rb-plan-actions"><button id="rbPlanCancel" class="btn subtle" type="button">إلغاء</button><button id="rbPlanSave" class="btn primary" type="button">حفظ الخطة</button></div><div id="rbPlanMsg" class="rb-plan-msg"></div></div>`;
    document.body.appendChild(modal);
    modal.onclick=e=>{if(e.target===modal)close();};$('rbPlanCancel').onclick=close;$('rbPlanSave').onclick=save;
    return modal;
  }

  function msg(text,type=''){const el=$('rbPlanMsg');if(!el)return;el.textContent=text||'';el.className='rb-plan-msg'+(type?' '+type:'');}
  function close(){const m=$('rbPlanModal');if(m)m.hidden=true;document.body.style.overflow='';}

  async function open(id,name){
    state.restaurantId=id;state.name=name||'المطعم';state.subscriptionId=null;
    const modal=ensureModal();modal.hidden=false;document.body.style.overflow='hidden';$('rbPlanTitle').textContent=`خطة ${state.name}`;msg('جاري تحميل الخطة...');
    try{
      const c=await client();
      const {data,error}=await c.from('subscriptions').select('id,plan,starts_at').eq('restaurant_id',id).order('starts_at',{ascending:false}).limit(1);
      if(error)throw error;
      state.subscriptionId=data?.[0]?.id||null;
      state.currentPlan=data?.[0]?.plan||'basic';$('rbPlanSelect').value=state.currentPlan;msg('');
    }catch(error){msg(error?.message||String(error),'err');}
  }

  async function save(){
    const plan=$('rbPlanSelect').value;const button=$('rbPlanSave');button.disabled=true;msg('جاري تحديث الخطة...');
    try{
      const c=await client();
      let result;
      if(state.subscriptionId){
        result=await c.from('subscriptions').update({plan,updated_at:new Date().toISOString()}).eq('id',state.subscriptionId).eq('restaurant_id',state.restaurantId);
      }else{
        result=await c.from('subscriptions').insert({restaurant_id:state.restaurantId,plan,status:'active',starts_at:new Date().toISOString(),notes:'Created from RESTBR Super Admin Plan V2'});
      }
      if(result.error)throw result.error;
      state.currentPlan=plan;msg('تم تحديث الخطة ✓','ok');
      setTimeout(()=>{close();document.getElementById('refreshBtn')?.click();},450);
    }catch(error){msg(error?.message||String(error),'err');}
    finally{button.disabled=false;}
  }

  function inject(){
    document.querySelectorAll('.restaurant-card').forEach(card=>{
      if(card.querySelector('[data-rb-plan]'))return;
      const id=card.dataset.id;const actions=card.querySelector('.card-actions');if(!id||!actions)return;
      const button=document.createElement('button');button.className='mini-btn';button.type='button';button.dataset.rbPlan='1';button.textContent='الخطة';button.onclick=()=>open(id,card.querySelector('h4')?.textContent||'');actions.appendChild(button);
    });
  }

  function boot(){styles();ensureModal();inject();const list=$('restaurantList');if(list)new MutationObserver(inject).observe(list,{childList:true,subtree:true});console.log('✅ RESTBR Super Admin Plan V2.1 ready — RLS mode');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

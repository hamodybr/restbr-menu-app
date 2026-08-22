// ============================================================
// RESTBR SUPER ADMIN PLAN V2.2
// Manages plan, billing status, expiry and notes through existing RLS.
// Restaurant access status remains controlled separately by restaurants.status.
// ============================================================
(() => {
  'use strict';

  let sb=null;
  const state={restaurantId:null,name:'',subscriptionId:null};
  const $=id=>document.getElementById(id);

  async function client(){
    if(sb)return sb;
    const response=await fetch('/_restbr/platform-config',{headers:{Accept:'application/json'},cache:'no-store'});
    const config=await response.json().catch(()=>({}));
    if(!response.ok||!config?.ok)throw new Error(config?.message||'تعذر تحميل إعدادات RESTBR.');
    sb=window.supabase.createClient(config.supabase_url,config.publishable_key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return sb;
  }

  function isoToLocalInput(value){
    if(!value)return '';
    const d=new Date(value);if(Number.isNaN(d.getTime()))return '';
    const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);
    return local.toISOString().slice(0,16);
  }

  function localInputToIso(value){
    const text=String(value||'').trim();if(!text)return null;
    const d=new Date(text);return Number.isNaN(d.getTime())?null:d.toISOString();
  }

  function styles(){
    if($('rbPlanV2Styles'))return;
    const s=document.createElement('style');s.id='rbPlanV2Styles';s.textContent=`
      .rb-plan-modal{position:fixed;z-index:125;inset:0;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.68);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
      .rb-plan-card{width:min(520px,100%);border:1px solid rgba(255,255,255,.12);border-radius:22px;background:#11100e;color:#f8f4ed;padding:17px;box-shadow:0 30px 90px rgba(0,0,0,.5)}
      html[data-theme="light"] .rb-plan-card{background:#fff;color:#191713}
      .rb-plan-card h3{margin:0 0 5px}.rb-plan-card>p{font-size:11px;color:#9b9389;margin:0 0 13px;line-height:1.6}
      .rb-plan-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.rb-plan-field{display:block;color:#9b9389;font-size:10px}.rb-plan-field.wide{grid-column:1/-1}.rb-plan-field select,.rb-plan-field input,.rb-plan-field textarea{display:block;width:100%;margin-top:5px;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:rgba(0,0,0,.16);color:inherit;padding:11px;font-size:16px}.rb-plan-field textarea{min-height:72px;resize:vertical}
      .rb-plan-note{margin-top:9px;padding:9px;border:1px solid rgba(216,169,88,.22);border-radius:11px;background:rgba(216,169,88,.05);font-size:9px;color:#9b9389;line-height:1.6}.rb-plan-actions{display:flex;gap:8px;margin-top:13px}.rb-plan-actions button{flex:1}.rb-plan-msg{min-height:18px;margin-top:9px;font-size:11px}.rb-plan-msg.ok{color:#4ade80}.rb-plan-msg.err{color:#ef6b6b}
      @media(max-width:560px){.rb-plan-grid{grid-template-columns:1fr}.rb-plan-field.wide{grid-column:auto}}
    `;document.head.appendChild(s);
  }

  function ensureModal(){
    let modal=$('rbPlanModal');if(modal)return modal;
    modal=document.createElement('div');modal.id='rbPlanModal';modal.className='rb-plan-modal';modal.hidden=true;
    modal.innerHTML=`<div class="rb-plan-card"><h3 id="rbPlanTitle">الاشتراك والخطة</h3><p>إدارة سجل الاشتراك التجاري عبر RLS الخاص بالـ Platform Admin.</p><div class="rb-plan-grid"><label class="rb-plan-field">الخطة<select id="rbPlanSelect"><option value="basic">Basic</option><option value="pro">Pro</option><option value="premium">Premium</option><option value="internal">Internal</option></select></label><label class="rb-plan-field">حالة الاشتراك<select id="rbPlanStatus"><option value="trial">Trial</option><option value="active">Active</option><option value="past_due">Past Due</option><option value="suspended">Suspended</option><option value="cancelled">Cancelled</option></select></label><label class="rb-plan-field wide">تاريخ الانتهاء (اختياري)<input id="rbPlanExpires" type="datetime-local"></label><label class="rb-plan-field wide">ملاحظات<textarea id="rbPlanNotes" placeholder="ملاحظات الفوترة أو الاتفاق..."></textarea></label></div><div class="rb-plan-note">مهم: حالة الاشتراك هنا سجل Billing. إيقاف الوصول الفعلي للمنيو يتم من زر حالة المطعم (Active / Suspended) حتى ما يتوقف مطعم تلقائيًا بسبب تعديل محاسبي.</div><div class="rb-plan-actions"><button id="rbPlanCancel" class="btn subtle" type="button">إلغاء</button><button id="rbPlanSave" class="btn primary" type="button">حفظ الاشتراك</button></div><div id="rbPlanMsg" class="rb-plan-msg"></div></div>`;
    document.body.appendChild(modal);modal.onclick=e=>{if(e.target===modal)close();};$('rbPlanCancel').onclick=close;$('rbPlanSave').onclick=save;return modal;
  }

  function msg(text,type=''){const el=$('rbPlanMsg');if(!el)return;el.textContent=text||'';el.className='rb-plan-msg'+(type?' '+type:'');}
  function close(){const m=$('rbPlanModal');if(m)m.hidden=true;document.body.style.overflow='';}

  async function open(id,name){
    state.restaurantId=id;state.name=name||'المطعم';state.subscriptionId=null;const modal=ensureModal();modal.hidden=false;document.body.style.overflow='hidden';$('rbPlanTitle').textContent=`اشتراك ${state.name}`;msg('جاري تحميل الاشتراك...');
    try{
      const c=await client();const {data,error}=await c.from('subscriptions').select('id,plan,status,starts_at,expires_at,notes').eq('restaurant_id',id).limit(1);if(error)throw error;
      const row=data?.[0]||null;state.subscriptionId=row?.id||null;$('rbPlanSelect').value=row?.plan||'basic';$('rbPlanStatus').value=row?.status||'trial';$('rbPlanExpires').value=isoToLocalInput(row?.expires_at);$('rbPlanNotes').value=row?.notes||'';msg(row?.starts_at?`بدأ الاشتراك: ${new Date(row.starts_at).toLocaleString('ar-IQ')}`:'لا يوجد اشتراك مسجل بعد.');
    }catch(error){msg(error?.message||String(error),'err');}
  }

  async function save(){
    const plan=$('rbPlanSelect').value;const status=$('rbPlanStatus').value;const expiresText=$('rbPlanExpires').value;const expiresAt=localInputToIso(expiresText);const notes=String($('rbPlanNotes').value||'').trim()||null;
    if(expiresText && !expiresAt){msg('تاريخ الانتهاء غير صالح.','err');return;}
    const button=$('rbPlanSave');button.disabled=true;msg('جاري تحديث الاشتراك...');
    try{
      const c=await client();let result;
      const payload={plan,status,expires_at:expiresAt,notes,updated_at:new Date().toISOString()};
      if(state.subscriptionId){result=await c.from('subscriptions').update(payload).eq('id',state.subscriptionId).eq('restaurant_id',state.restaurantId);}else{result=await c.from('subscriptions').insert({restaurant_id:state.restaurantId,...payload,starts_at:new Date().toISOString()});}
      if(result.error)throw result.error;msg('تم حفظ الخطة وحالة الاشتراك ✓','ok');setTimeout(()=>{close();$('refreshBtn')?.click();},450);
    }catch(error){msg(error?.message||String(error),'err');}
    finally{button.disabled=false;}
  }

  function inject(){
    document.querySelectorAll('.restaurant-card').forEach(card=>{
      if(card.querySelector('[data-rb-plan]'))return;const id=card.dataset.id;const actions=card.querySelector('.card-actions');if(!id||!actions)return;
      const button=document.createElement('button');button.className='mini-btn';button.type='button';button.dataset.rbPlan='1';button.textContent='الاشتراك';button.onclick=()=>open(id,card.querySelector('h4')?.textContent||'');actions.appendChild(button);
    });
  }

  function boot(){styles();ensureModal();inject();const list=$('restaurantList');if(list)new MutationObserver(inject).observe(list,{childList:true,subtree:true});console.log('✅ RESTBR Super Admin Plan V2.2 ready — billing record mode');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

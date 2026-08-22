// ============================================================
// RESTBR SUPER ADMIN — TENANT SETTINGS V2.0
// Edits platform-level restaurant name/default language/currency/timezone.
// Uses existing Platform Admin RLS. No privileged RPC required.
// ============================================================
(() => {
  'use strict';

  let sb=null;
  const $=id=>document.getElementById(id);
  const state={restaurantId:null,row:null};

  async function client(){
    if(sb)return sb;
    const response=await fetch('/_restbr/platform-config',{headers:{Accept:'application/json'},cache:'no-store'});
    const config=await response.json().catch(()=>({}));
    if(!response.ok||!config?.ok)throw new Error(config?.message||'تعذر تحميل إعدادات RESTBR.');
    sb=window.supabase.createClient(config.supabase_url,config.publishable_key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return sb;
  }

  function validTimeZone(value){
    const zone=String(value||'').trim();
    if(!zone)return false;
    try{new Intl.DateTimeFormat('en-US',{timeZone:zone}).format(new Date());return true;}catch(_){return false;}
  }

  function styles(){
    if($('rbTenantSettingsStyles'))return;
    const s=document.createElement('style');s.id='rbTenantSettingsStyles';s.textContent=`
      .rb-tenant-modal{position:fixed;z-index:126;inset:0;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.68);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
      .rb-tenant-card{width:min(520px,100%);border:1px solid rgba(255,255,255,.12);border-radius:22px;background:#11100e;color:#f8f4ed;padding:17px;box-shadow:0 30px 90px rgba(0,0,0,.5)}
      html[data-theme="light"] .rb-tenant-card{background:#fff;color:#191713}
      .rb-tenant-card h3{margin:0 0 5px}.rb-tenant-card>p{font-size:11px;color:#9b9389;margin:0 0 13px;line-height:1.6}
      .rb-tenant-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.rb-tenant-field{display:block;color:#9b9389;font-size:10px}.rb-tenant-field.wide{grid-column:1/-1}.rb-tenant-field input,.rb-tenant-field select{display:block;width:100%;margin-top:5px;border:1px solid rgba(255,255,255,.12);border-radius:11px;background:rgba(0,0,0,.18);color:inherit;padding:11px;font-size:16px}
      .rb-tenant-actions{display:flex;gap:8px;margin-top:13px}.rb-tenant-actions button{flex:1}.rb-tenant-msg{min-height:18px;margin-top:9px;font-size:11px}.rb-tenant-msg.ok{color:#4ade80}.rb-tenant-msg.err{color:#ef6b6b}.rb-tenant-hint{font-size:9px;color:#9b9389;margin-top:4px;line-height:1.5}
      @media(max-width:600px){.rb-tenant-grid{grid-template-columns:1fr}.rb-tenant-field.wide{grid-column:auto}}
    `;document.head.appendChild(s);
  }

  function ensureModal(){
    let modal=$('rbTenantSettingsModal');if(modal)return modal;
    modal=document.createElement('div');modal.id='rbTenantSettingsModal';modal.className='rb-tenant-modal';modal.hidden=true;
    modal.innerHTML=`<div class="rb-tenant-card"><h3 id="rbTenantSettingsTitle">إعدادات المطعم</h3><p>هذه إعدادات المنصة الأساسية. أسماء المنيو والشعار والتصميم تبقى من Owner Dashboard.</p><div class="rb-tenant-grid"><label class="rb-tenant-field wide">اسم المطعم في المنصة<input id="rbTenantName" maxlength="100"></label><label class="rb-tenant-field">اللغة الافتراضية<select id="rbTenantLanguage"><option value="ar">العربية</option><option value="ku">کوردی</option><option value="en">English</option></select></label><label class="rb-tenant-field">العملة<input id="rbTenantCurrency" dir="ltr" maxlength="10" placeholder="IQD"></label><label class="rb-tenant-field wide">Timezone<input id="rbTenantTimezone" dir="ltr" placeholder="Asia/Baghdad"><div class="rb-tenant-hint">مثال: Asia/Baghdad — يؤثر على جدولة الأصناف والأقسام وتحليلات اليوم.</div></label></div><div class="rb-tenant-actions"><button id="rbTenantCancel" class="btn subtle" type="button">إلغاء</button><button id="rbTenantSave" class="btn primary" type="button">حفظ</button></div><div id="rbTenantMsg" class="rb-tenant-msg"></div></div>`;
    document.body.appendChild(modal);modal.onclick=e=>{if(e.target===modal)close();};$('rbTenantCancel').onclick=close;$('rbTenantSave').onclick=save;
    return modal;
  }

  function msg(text,type=''){const el=$('rbTenantMsg');if(!el)return;el.textContent=text||'';el.className='rb-tenant-msg'+(type?' '+type:'');}
  function close(){const m=$('rbTenantSettingsModal');if(m)m.hidden=true;document.body.style.overflow='';}

  async function open(id,name){
    state.restaurantId=id;state.row=null;const modal=ensureModal();modal.hidden=false;document.body.style.overflow='hidden';$('rbTenantSettingsTitle').textContent=`إعدادات ${name||'المطعم'}`;msg('جاري التحميل...');
    try{
      const c=await client();const {data,error}=await c.from('restaurants').select('id,name,slug,status,default_language,timezone,currency').eq('id',id).maybeSingle();if(error)throw error;if(!data)throw new Error('المطعم غير موجود.');
      state.row=data;$('rbTenantName').value=data.name||'';$('rbTenantLanguage').value=data.default_language||'ar';$('rbTenantCurrency').value=data.currency||'IQD';$('rbTenantTimezone').value=data.timezone||'Asia/Baghdad';msg('');
    }catch(error){msg(error?.message||String(error),'err');}
  }

  async function save(){
    const name=String($('rbTenantName').value||'').trim();const language=$('rbTenantLanguage').value;const currency=String($('rbTenantCurrency').value||'').trim().toUpperCase();const timezone=String($('rbTenantTimezone').value||'').trim();
    if(!name){msg('اسم المطعم مطلوب.','err');return;}if(!currency){msg('العملة مطلوبة.','err');return;}if(!validTimeZone(timezone)){msg('Timezone غير صالح. استخدم صيغة مثل Asia/Baghdad.','err');return;}
    const button=$('rbTenantSave');button.disabled=true;msg('جاري الحفظ...');
    try{
      const c=await client();const {error}=await c.from('restaurants').update({name,default_language:language,currency,timezone,updated_at:new Date().toISOString()}).eq('id',state.restaurantId);if(error)throw error;
      msg('تم حفظ إعدادات الـ tenant ✓','ok');setTimeout(()=>{close();$('refreshBtn')?.click();},400);
    }catch(error){msg(error?.message||String(error),'err');}
    finally{button.disabled=false;}
  }

  function inject(){
    document.querySelectorAll('.restaurant-card').forEach(card=>{
      if(card.querySelector('[data-rb-tenant-settings]'))return;const id=card.dataset.id;const actions=card.querySelector('.card-actions');if(!id||!actions)return;
      const button=document.createElement('button');button.className='mini-btn';button.type='button';button.dataset.rbTenantSettings='1';button.textContent='إعدادات';button.onclick=()=>open(id,card.querySelector('h4')?.textContent||'');actions.appendChild(button);
    });
  }

  function boot(){styles();ensureModal();inject();const list=$('restaurantList');if(list)new MutationObserver(inject).observe(list,{childList:true,subtree:true});console.log('✅ RESTBR Super Admin tenant settings V2.0 ready');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

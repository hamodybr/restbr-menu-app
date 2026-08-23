// ============================================================
// RESTBR OWNER VISIBILITY V2.0
// Controls public menu display elements supported by legacy app.js.
// Persists to restaurant_settings.features and preserves unknown settings.
// ============================================================
(() => {
  'use strict';

  const cfg=window.RESTBR_OWNER_CONFIG||{};
  if(!cfg.supabaseUrl||!cfg.publishableKey||!window.supabase)return;
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const $=id=>document.getElementById(id);
  const state={tenantId:null,settings:null};

  const obj=value=>{
    if(value&&typeof value==='object'&&!Array.isArray(value))return {...value};
    if(typeof value==='string'&&value.trim()){
      try{const parsed=JSON.parse(value);return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?{...parsed}:{};}catch(_){}
    }
    return {};
  };

  const fields=[
    ['show_logo','عرض الشعار','الهوية'],
    ['show_menu_title','عرض عنوان MENU','الهوية'],
    ['show_subtitle','عرض النص التعريفي','الهوية'],
    ['show_language_switch','مبدّل اللغات','التصفح'],
    ['show_category_nav','شريط الأقسام','التصفح'],
    ['show_back_to_top','زر الرجوع للأعلى','التصفح'],
    ['intro_enabled','شاشة المقدمة','التجربة'],
    ['background_video_enabled','فيديو الخلفية','التجربة'],
    ['top_location_enabled','زر الموقع بالأعلى','الأزرار السريعة'],
    ['top_call_enabled','زر الاتصال بالأعلى','الأزرار السريعة'],
    ['top_whatsapp_enabled','زر واتساب بالأعلى','الأزرار السريعة'],
    ['show_footer','إظهار الفوتر','الفوتر'],
    ['show_footer_brand','اسم المطعم في الفوتر','الفوتر'],
    ['show_footer_location','عنوان المطعم في الفوتر','الفوتر'],
    ['show_footer_phone','رقم الهاتف في الفوتر','الفوتر'],
    ['show_footer_socials','روابط السوشيال في الفوتر','الفوتر'],
    ['show_footer_copy','حقوق النشر في الفوتر','الفوتر'],
    ['footer_location_enabled','زر الموقع في الفوتر','أزرار الفوتر'],
    ['footer_call_enabled','زر الاتصال في الفوتر','أزرار الفوتر'],
    ['footer_whatsapp_enabled','زر واتساب في الفوتر','أزرار الفوتر']
  ];

  async function tenantId(){
    if(state.tenantId)return state.tenantId;
    const host=location.hostname.toLowerCase().replace(/^www\./,'');
    if(host==='hamodybr.github.io'){
      const slug=new URLSearchParams(location.search).get('tenant');
      const {data,error}=await sb.from('restaurants').select('id').eq('slug',slug).maybeSingle();
      if(error)throw error;if(!data?.id)throw new Error('restaurant not found');
      return state.tenantId=data.id;
    }
    const {data,error}=await sb.from('restaurant_domains').select('restaurant_id').eq('hostname',host).eq('status','active').eq('is_verified',true).maybeSingle();
    if(error)throw error;if(!data?.restaurant_id)throw new Error('restaurant domain not found');
    return state.tenantId=data.restaurant_id;
  }

  function styles(){
    if($('rbVisibilityStyles'))return;
    const s=document.createElement('style');s.id='rbVisibilityStyles';s.textContent=`
      .rb-vis-modal{position:fixed;z-index:165;inset:0;display:grid;place-items:end center;padding:9px;background:rgba(0,0,0,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
      .rb-vis-card{width:min(720px,100%);max-height:92dvh;overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:25px;padding:15px;box-shadow:0 30px 90px rgba(0,0,0,.5)}
      .rb-vis-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.rb-vis-head h3{margin:0;font-size:17px}.rb-vis-head p{margin:4px 0 0;color:var(--muted);font-size:10px;line-height:1.5}.rb-vis-close{width:38px;height:38px;border:1px solid var(--line);border-radius:12px;background:var(--panel2);color:var(--text);font-size:20px}
      .rb-vis-section{margin-top:11px;border:1px solid var(--line);border-radius:15px;padding:10px;background:var(--panel2)}.rb-vis-section h4{margin:0 0 8px;color:var(--gold);font-size:11px}.rb-vis-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.rb-vis-item{display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid var(--line);border-radius:11px;padding:9px;background:var(--panel)}.rb-vis-item span{font-size:10px}.rb-vis-actions{display:flex;gap:8px;margin-top:13px}.rb-vis-actions button{flex:1}.rb-vis-msg{min-height:18px;margin-top:8px;font-size:10px;color:var(--muted)}.rb-vis-msg.ok{color:var(--ok)}.rb-vis-msg.err{color:var(--danger)}
      @media(max-width:650px){.rb-vis-grid{grid-template-columns:1fr}.rb-vis-card{border-radius:22px 22px 12px 12px}}
    `;document.head.appendChild(s);
  }

  function ensureModal(){
    let modal=$('rbVisibilityModal');if(modal)return modal;
    modal=document.createElement('div');modal.id='rbVisibilityModal';modal.className='rb-vis-modal';modal.hidden=true;
    const groups=[...new Set(fields.map(x=>x[2]))];
    modal.innerHTML=`<div class="rb-vis-card"><div class="rb-vis-head"><div><h3>👁 عناصر واجهة المنيو</h3><p>اخفِ أو أظهر العناصر بدون حذف بياناتها. التغييرات تخص هذا المطعم فقط.</p></div><button id="rbVisibilityClose" class="rb-vis-close" type="button">×</button></div>${groups.map(group=>`<section class="rb-vis-section"><h4>${group}</h4><div class="rb-vis-grid">${fields.filter(x=>x[2]===group).map(([key,label])=>`<label class="rb-vis-item"><span>${label}</span><input type="checkbox" data-vis-key="${key}"></label>`).join('')}</div></section>`).join('')}<div class="rb-vis-actions"><button id="rbVisibilityCancel" class="btn" type="button">إلغاء</button><button id="rbVisibilitySave" class="btn primary" type="button">حفظ العرض</button></div><div id="rbVisibilityMsg" class="rb-vis-msg"></div></div>`;
    document.body.appendChild(modal);modal.onclick=e=>{if(e.target===modal)close();};$('rbVisibilityClose').onclick=close;$('rbVisibilityCancel').onclick=close;$('rbVisibilitySave').onclick=save;
    return modal;
  }

  function msg(text,type=''){const el=$('rbVisibilityMsg');if(!el)return;el.textContent=text||'';el.className='rb-vis-msg'+(type?' '+type:'');}
  function close(){const modal=$('rbVisibilityModal');if(modal)modal.hidden=true;document.body.style.overflow='';}
  function valueFor(settings,key){const features=obj(settings.features);const branding=obj(settings.branding);return settings[key]??features[key]??branding[key]??true;}

  async function open(){
    ensureModal().hidden=false;document.body.style.overflow='hidden';msg('جاري تحميل إعدادات العرض...');
    try{
      const rid=await tenantId();const {data,error}=await sb.from('restaurant_settings').select('*').eq('restaurant_id',rid).maybeSingle();if(error)throw error;state.settings=data||{restaurant_id:rid,features:{}};
      document.querySelectorAll('[data-vis-key]').forEach(input=>input.checked=valueFor(state.settings,input.dataset.visKey)!==false);
      const canManage=window.RESTBR_OWNER_ACCESS?.canManageSettings!==false;document.querySelectorAll('#rbVisibilityModal input,#rbVisibilitySave').forEach(el=>el.disabled=!canManage);msg(canManage?'':'دورك يسمح بالمشاهدة فقط.');
    }catch(error){msg(error?.message||String(error),'err');}
  }

  async function save(){
    if(window.RESTBR_OWNER_ACCESS && !window.RESTBR_OWNER_ACCESS.canManageSettings){msg('ليس لديك صلاحية تعديل إعدادات المطعم.','err');return;}
    const button=$('rbVisibilitySave');button.disabled=true;msg('جاري الحفظ...');
    try{
      const rid=await tenantId();if(!state.settings){const {data,error}=await sb.from('restaurant_settings').select('*').eq('restaurant_id',rid).maybeSingle();if(error)throw error;state.settings=data||{restaurant_id:rid};}
      const features=obj(state.settings.features);document.querySelectorAll('[data-vis-key]').forEach(input=>{features[input.dataset.visKey]=Boolean(input.checked);});
      const {data,error}=await sb.from('restaurant_settings').update({features,updated_at:new Date().toISOString()}).eq('restaurant_id',rid).select().single();if(error)throw error;state.settings={...state.settings,...data};msg('تم حفظ عناصر الواجهة ✓','ok');setTimeout(()=>{$('refreshBtn')?.click();},250);
    }catch(error){msg(error?.message||String(error),'err');}
    finally{button.disabled=false;}
  }

  function injectButton(){
    if($('rbVisibilityOpen'))return;const bar=$('saveSettingsBtn')?.closest('.savebar');if(!bar)return;const button=document.createElement('button');button.id='rbVisibilityOpen';button.className='btn';button.type='button';button.textContent='👁 عناصر الواجهة';button.onclick=open;bar.appendChild(button);
  }

  function boot(){styles();ensureModal();injectButton();const settings=$('view-settings');if(settings)new MutationObserver(injectButton).observe(settings,{childList:true,subtree:true});console.log('✅ RESTBR Owner Visibility V2.0 ready');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

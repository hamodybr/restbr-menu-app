// ============================================================
// RESTBR OWNER SETTINGS V2.0 — operations, ordering and social settings
// ============================================================
(() => {
  'use strict';

  const cfg = window.RESTBR_OWNER_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.publishableKey || !window.supabase) return;

  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.publishableKey, {
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });

  const $ = id => document.getElementById(id);
  const state = { tenantId:null, settings:null, loading:false };
  const obj = value => {
    if (value && typeof value === 'object' && !Array.isArray(value)) return {...value};
    if (typeof value === 'string' && value.trim()) {
      try { const p=JSON.parse(value); return p&&typeof p==='object'&&!Array.isArray(p)?{...p}:{}; } catch(_){}
    }
    return {};
  };
  const val = id => String($(id)?.value || '').trim();
  const checked = id => Boolean($(id)?.checked);

  function status(message,type=''){
    const el=$('settingsMsg'); if(!el)return;
    el.textContent=message||'';
    el.className='status'+(type?' '+type:'');
  }

  async function tenantId(){
    if(state.tenantId)return state.tenantId;
    const hostname=location.hostname.toLowerCase().replace(/^www\./,'');
    if(hostname==='hamodybr.github.io'){
      const slug=new URLSearchParams(location.search).get('tenant');
      if(!slug)throw new Error('tenant slug missing');
      const {data,error}=await sb.from('restaurants').select('id').eq('slug',slug).maybeSingle();
      if(error)throw error;if(!data?.id)throw new Error('restaurant not found');
      return state.tenantId=data.id;
    }
    const {data,error}=await sb.from('restaurant_domains').select('restaurant_id').eq('hostname',hostname).eq('status','active').eq('is_verified',true).maybeSingle();
    if(error)throw error;if(!data?.restaurant_id)throw new Error('restaurant domain not found');
    return state.tenantId=data.restaurant_id;
  }

  function inject(){
    if($('rbv2Operations'))return;
    const savebar=$('saveSettingsBtn')?.closest('.savebar');
    if(!savebar)return;

    const wrap=document.createElement('div');
    wrap.id='rbv2Operations';
    wrap.innerHTML=`
      <div class="rbv2-box">
        <div class="rbv2-title"><span>🛒 الطلب والتشغيل</span><span class="rbv2-badge">Owner V2</span></div>
        <div class="rbv2-grid two">
          <div class="rbv2-switch"><span>عرض المنيو</span><input id="rbv2MenuEnabled" type="checkbox" checked></div>
          <div class="rbv2-switch"><span>المطعم مفتوح</span><input id="rbv2IsOpen" type="checkbox" checked></div>
          <div class="rbv2-switch"><span>استقبال الطلبات</span><input id="rbv2OrdersEnabled" type="checkbox" checked></div>
          <div class="rbv2-switch"><span>التوصيل</span><input id="rbv2DeliveryEnabled" type="checkbox" checked></div>
          <div class="rbv2-switch"><span>الاستلام من المطعم</span><input id="rbv2PickupEnabled" type="checkbox" checked></div>
          <div class="rbv2-switch"><span>عرض معلومات التوصيل</span><input id="rbv2DeliveryInfoEnabled" type="checkbox"></div>
        </div>
        <div class="rbv2-grid" style="margin-top:9px">
          <div class="rbv2-field"><label>معلومات التوصيل عربي</label><textarea id="rbv2DeliveryAr"></textarea></div>
          <div class="rbv2-field"><label>معلومات التوصيل كوردي</label><textarea id="rbv2DeliveryKu"></textarea></div>
          <div class="rbv2-field"><label>Delivery info English</label><textarea id="rbv2DeliveryEn" dir="ltr"></textarea></div>
        </div>
      </div>

      <div class="rbv2-box">
        <div class="rbv2-title">⏸ رسالة إيقاف الطلبات</div>
        <div class="rbv2-grid">
          <div class="rbv2-field"><label>عربي</label><textarea id="rbv2ClosedAr"></textarea></div>
          <div class="rbv2-field"><label>كوردي</label><textarea id="rbv2ClosedKu"></textarea></div>
          <div class="rbv2-field"><label>English</label><textarea id="rbv2ClosedEn" dir="ltr"></textarea></div>
        </div>
      </div>

      <div class="rbv2-box">
        <div class="rbv2-title">📍 الموقع وروابط التواصل</div>
        <div class="rbv2-grid two">
          <div class="rbv2-field"><label>Google Maps / Location URL</label><input id="rbv2Location" dir="ltr" placeholder="https://maps.app.goo.gl/..."></div>
          <div class="rbv2-field"><label>Instagram</label><input id="rbv2Instagram" dir="ltr" placeholder="https://instagram.com/..."></div>
          <div class="rbv2-field"><label>Facebook</label><input id="rbv2Facebook" dir="ltr" placeholder="https://facebook.com/..."></div>
          <div class="rbv2-field"><label>TikTok</label><input id="rbv2TikTok" dir="ltr" placeholder="https://tiktok.com/@..."></div>
          <div class="rbv2-field"><label>Snapchat</label><input id="rbv2Snapchat" dir="ltr" placeholder="https://snapchat.com/add/..."></div>
        </div>
      </div>`;
    savebar.before(wrap);
  }

  function fill(settings){
    const s=settings||{};
    const branding=obj(s.branding);
    const features=obj(s.features);
    const get=(key,fallback=null)=>s[key] ?? features[key] ?? branding[key] ?? fallback;

    $('rbv2MenuEnabled').checked=get('menu_enabled',true)!==false;
    $('rbv2IsOpen').checked=get('is_open',true)!==false;
    $('rbv2OrdersEnabled').checked=get('orders_enabled',true)!==false;
    $('rbv2DeliveryEnabled').checked=get('delivery_enabled',true)!==false;
    $('rbv2PickupEnabled').checked=get('pickup_enabled',true)!==false;
    $('rbv2DeliveryInfoEnabled').checked=get('delivery_info_enabled',false)===true;
    $('rbv2DeliveryAr').value=get('delivery_info_ar','')||'';
    $('rbv2DeliveryKu').value=get('delivery_info_ku','')||'';
    $('rbv2DeliveryEn').value=get('delivery_info_en','')||'';
    $('rbv2ClosedAr').value=get('closed_message_ar','')||'';
    $('rbv2ClosedKu').value=get('closed_message_ku','')||'';
    $('rbv2ClosedEn').value=get('closed_message_en','')||'';
    $('rbv2Location').value=get('location_url',get('location',''))||'';
    $('rbv2Instagram').value=get('instagram_url','')||'';
    $('rbv2Facebook').value=get('facebook_url','')||'';
    $('rbv2TikTok').value=get('tiktok_url','')||'';
    $('rbv2Snapchat').value=get('snapchat_url','')||'';
  }

  async function load(){
    if(state.loading)return;
    state.loading=true;
    try{
      inject();
      const rid=await tenantId();
      const {data,error}=await sb.from('restaurant_settings').select('*').eq('restaurant_id',rid).maybeSingle();
      if(error)throw error;
      state.settings=data||{restaurant_id:rid};
      fill(state.settings);
    }catch(error){console.error('RESTBR Owner Settings V2 load:',error);}
    finally{state.loading=false;}
  }

  async function upload(file,folder){
    if(!file)return null;
    const rid=await tenantId();
    const ext=String(file.name||'file').split('.').pop().toLowerCase().replace(/[^a-z0-9]/g,'')||'bin';
    const path=`${rid}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
    const {error}=await sb.storage.from('menu-images').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
    if(error)throw error;
    return sb.storage.from('menu-images').getPublicUrl(path).data.publicUrl;
  }

  async function save(event){
    if(!$('rbv2Operations'))return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    status('جاري حفظ كل إعدادات المطعم...');
    try{
      const rid=await tenantId();
      if(!state.settings){
        const {data,error}=await sb.from('restaurant_settings').select('*').eq('restaurant_id',rid).maybeSingle();
        if(error)throw error;state.settings=data||{restaurant_id:rid};
      }

      let logoUrl=val('sLogoUrl')||state.settings.logo_url||null;
      if($('logoFile')?.files?.[0])logoUrl=await upload($('logoFile').files[0],'branding/logo');
      let backgroundUrl=state.settings.background_url||null;
      if($('backgroundFile')?.files?.[0])backgroundUrl=await upload($('backgroundFile').files[0],'branding/background');

      const languages=[];
      if(checked('langAr'))languages.push('ar');
      if(checked('langKu'))languages.push('ku');
      if(checked('langEn'))languages.push('en');
      if(!languages.length)languages.push('ar');

      const location=val('rbv2Location');
      const instagram=val('rbv2Instagram');
      const facebook=val('rbv2Facebook');
      const tiktok=val('rbv2TikTok');
      const snapchat=val('rbv2Snapchat');

      const branding={
        ...obj(state.settings.branding),
        location,
        location_url:location,
        instagram_url:instagram,
        facebook_url:facebook,
        tiktok_url:tiktok,
        snapchat_url:snapchat,
        top_location_enabled:Boolean(location),
        footer_location_enabled:Boolean(location||val('sAddrAr')||val('sAddrKu')||val('sAddrEn')),
        instagram_enabled:Boolean(instagram),
        facebook_enabled:Boolean(facebook),
        tiktok_enabled:Boolean(tiktok),
        snapchat_enabled:Boolean(snapchat),
        show_footer_socials:Boolean(instagram||facebook||tiktok||snapchat)
      };

      const features={
        ...obj(state.settings.features),
        menu_enabled:checked('rbv2MenuEnabled'),
        is_open:checked('rbv2IsOpen'),
        orders_enabled:checked('rbv2OrdersEnabled'),
        delivery_enabled:checked('rbv2DeliveryEnabled'),
        pickup_enabled:checked('rbv2PickupEnabled'),
        delivery_info_enabled:checked('rbv2DeliveryInfoEnabled'),
        delivery_info_ar:val('rbv2DeliveryAr'),
        delivery_info_ku:val('rbv2DeliveryKu'),
        delivery_info_en:val('rbv2DeliveryEn'),
        closed_message_ar:val('rbv2ClosedAr'),
        closed_message_ku:val('rbv2ClosedKu'),
        closed_message_en:val('rbv2ClosedEn')
      };

      const payload={
        restaurant_id:rid,
        restaurant_name_ar:val('sNameAr')||null,
        restaurant_name_ku:val('sNameKu')||null,
        restaurant_name_en:val('sNameEn')||null,
        subtitle_ar:val('sSubAr')||null,
        subtitle_ku:val('sSubKu')||null,
        subtitle_en:val('sSubEn')||null,
        phone:val('sPhone')||null,
        whatsapp:val('sWhatsapp')||null,
        address_ar:val('sAddrAr')||null,
        address_ku:val('sAddrKu')||null,
        address_en:val('sAddrEn')||null,
        logo_url:logoUrl,
        background_url:backgroundUrl,
        announcement_enabled:checked('sAnnEnabled'),
        announcement_ar:val('sAnnAr')||null,
        announcement_ku:val('sAnnKu')||null,
        announcement_en:val('sAnnEn')||null,
        languages,
        branding,
        features
      };

      const {data,error}=await sb.from('restaurant_settings').upsert(payload,{onConflict:'restaurant_id'}).select().single();
      if(error)throw error;
      state.settings={...state.settings,...data};
      if($('sLogoUrl'))$('sLogoUrl').value=logoUrl||'';
      if($('logoFile'))$('logoFile').value='';
      if($('backgroundFile'))$('backgroundFile').value='';
      status('تم حفظ التشغيل والطلبات والتواصل ومعلومات المطعم ✓','ok');
      setTimeout(()=>$('refreshBtn')?.click(),250);
    }catch(error){
      console.error('RESTBR Owner Settings V2 save:',error);
      status(error?.message||String(error),'err');
    }
  }

  function boot(){
    inject();
    document.addEventListener('click',event=>{
      if(event.target.closest?.('[data-view="settings"], [data-go="settings"]'))setTimeout(load,80);
      if(event.target.closest?.('#saveSettingsBtn')&&$('rbv2Operations'))void save(event);
    },true);

    const app=$('app');
    if(app){
      const observer=new MutationObserver(()=>{if(!app.classList.contains('hidden'))setTimeout(load,120);});
      observer.observe(app,{attributes:true,attributeFilter:['class']});
      if(!app.classList.contains('hidden'))void load();
    }
    console.log('✅ RESTBR Owner Settings V2.0 ready');
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();

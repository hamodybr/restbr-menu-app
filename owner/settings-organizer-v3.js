// ============================================================
// RESTBR OWNER SETTINGS ORGANIZER V3.1
// Topic-based groups + per-setting reset + per-section reset.
// Resets edit the form only; Save commits them deliberately.
// ============================================================
(() => {
  'use strict';
  const sb=window.RESTBR_OWNER_V2_CLIENT;if(!sb)return;
  const $=id=>document.getElementById(id);
  const state={restaurantName:''};

  const defaults={
    sNameAr:()=>state.restaurantName||'',sNameKu:()=>state.restaurantName||'',sNameEn:()=>state.restaurantName||'',
    sSubAr:'اكتشف منيو {name}',sSubKu:'مێنیوی {name} ببینە',sSubEn:'Discover {name} Menu',
    sPhone:'',sWhatsapp:'',sLogoUrl:'',sAddrAr:'',sAddrKu:'',sAddrEn:'',logoFile:'',backgroundFile:'',
    langAr:true,langKu:true,langEn:true,sAnnEnabled:false,sAnnAr:'',sAnnKu:'',sAnnEn:'',
    rbv2MenuEnabled:true,rbv2IsOpen:true,rbv2OrdersEnabled:true,rbv2DeliveryEnabled:true,rbv2PickupEnabled:true,rbv2DeliveryInfoEnabled:false,
    rbv2DeliveryAr:'',rbv2DeliveryKu:'',rbv2DeliveryEn:'',rbv2ClosedAr:'',rbv2ClosedKu:'',rbv2ClosedEn:'',
    rbv2Location:'',rbv2Instagram:'',rbv2Facebook:'',rbv2TikTok:'',rbv2Snapchat:'',

    dAccent:'#d8a958',dGlassColor:'#080604',dOpacity:14,dBlur:18,dCardHeight:160,dRadius:18,dImagePercent:40,dBackgroundEffect:'',
    dCardGap:10,dInfoPadding:10,dProductNameFont:13,dOptionFont:12,dPriceFont:12,dSectionTitleFont:22,dAddButtonHeight:30,dAddButtonFont:10,
    dLogoSize:84,dMenuTitleFont:26,dSubtitleFont:12,dCategoryHeight:41,dCategoryFont:12,dTopActionHeight:48,dTopActionFont:11,dSearchHeight:46,dSearchFont:16,
    dCartWidth:160,dCartHeight:43,dCartFont:10,dCartBottom:16,dCartHorizontal:50,
    dFooterTitleFont:17,dFooterActionFont:10.5,dFooterPhoneFont:17,
    dTextPrimary:'#ffffff',dTextMuted:'#b7b0a6',dCardBorder:'#5b4024',dButtonBorder:'#5b4024',dCardShadow:28,
    dFontFamily:'Arial,Tahoma,sans-serif',dHeadingFontFamily:'Georgia,serif',
    rbFooterOpacity:14,rbFooterBlur:18,rbFooterColor:'#080604'
  };

  const groups={
    settings:[
      {id:'rbGroupBrand',title:'🏷 الهوية والنصوص',desc:'اسم المطعم، النص التعريفي، الشعار والخلفية.',fields:['sNameAr','sNameKu','sNameEn','sSubAr','sSubKu','sSubEn','sLogoUrl','logoFile','backgroundFile']},
      {id:'rbGroupContact',title:'📍 التواصل والموقع والسوشيال',desc:'الهاتف، واتساب، العنوان وروابط التواصل.',fields:['sPhone','sWhatsapp','sAddrAr','sAddrKu','sAddrEn','rbv2Location','rbv2Instagram','rbv2Facebook','rbv2TikTok','rbv2Snapchat']},
      {id:'rbGroupOperations',title:'🛒 التشغيل والطلبات',desc:'فتح المطعم، استقبال الطلبات، التوصيل والاستلام والرسائل.',fields:['rbv2MenuEnabled','rbv2IsOpen','rbv2OrdersEnabled','rbv2DeliveryEnabled','rbv2PickupEnabled','rbv2DeliveryInfoEnabled','rbv2DeliveryAr','rbv2DeliveryKu','rbv2DeliveryEn','rbv2ClosedAr','rbv2ClosedKu','rbv2ClosedEn']},
      {id:'rbGroupLanguages',title:'🌐 اللغات',desc:'اللغات المتاحة في منيو هذا المطعم.',fields:['langAr','langKu','langEn']},
      {id:'rbGroupAnnouncement',title:'📣 الإعلان',desc:'شريط الأخبار والنصوص لكل لغة.',fields:['sAnnEnabled','sAnnAr','sAnnKu','sAnnEn']}
    ],
    design:[
      {id:'rbGroupTheme',title:'🎨 الثيم والألوان',desc:'ألوان الثيم والزجاج والحدود والخطوط ومؤثر الخلفية.',fields:['dAccent','dTextPrimary','dTextMuted','dGlassColor','dCardBorder','dButtonBorder','dCardShadow','dFontFamily','dHeadingFontFamily','dBackgroundEffect']},
      {id:'rbGroupCards',title:'🍽 كروت المنتجات',desc:'الأبعاد، الشفافية، النصوص، الأسعار وزر الإضافة.',fields:['dOpacity','dBlur','dCardHeight','dRadius','dImagePercent','dCardGap','dInfoPadding','dProductNameFont','dOptionFont','dPriceFont','dSectionTitleFont','dAddButtonHeight','dAddButtonFont']},
      {id:'rbGroupHeaderNav',title:'🧭 الهيدر والتصفح والبحث',desc:'الشعار، عنوان المنيو، الأقسام، أزرار الأعلى والبحث.',fields:['dLogoSize','dMenuTitleFont','dSubtitleFont','dCategoryHeight','dCategoryFont','dTopActionHeight','dTopActionFont','dSearchHeight','dSearchFont']},
      {id:'rbGroupCart',title:'🛒 السلة',desc:'حجم زر السلة، موقعه وخطه.',fields:['dCartWidth','dCartHeight','dCartFont','dCartBottom','dCartHorizontal']},
      {id:'rbGroupFooter',title:'🪟 الفوتر',desc:'الشفافية، Blur، اللون وأحجام النصوص والأزرار.',fields:['rbFooterOpacity','rbFooterBlur','rbFooterColor','dFooterTitleFont','dFooterActionFont','dFooterPhoneFont']}
    ]
  };

  function styles(){
    if($('rbSettingsOrganizerStyles'))return;const s=document.createElement('style');s.id='rbSettingsOrganizerStyles';s.textContent=`
      .rb-org-stack{display:grid;gap:12px;margin:12px 0}.rb-org-section{border:1px solid var(--line);border-radius:18px;padding:12px;background:var(--panel2)}.rb-org-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px}.rb-org-head h4{margin:0;color:var(--gold);font-size:13px}.rb-org-head p{margin:3px 0 0;color:var(--muted);font-size:9.5px;line-height:1.55}.rb-org-reset{border:1px solid var(--line);border-radius:10px;background:var(--panel);color:var(--gold);min-height:34px;padding:0 9px;font-size:9px;font-weight:900;white-space:nowrap}.rb-org-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.rb-org-extra{display:grid;gap:9px}.rb-reset-wrap{position:relative!important}.rb-reset-one{position:absolute;z-index:4;top:1px;left:1px;width:25px;height:25px;display:grid;place-items:center;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--gold);font-size:12px;padding:0}.rb-reset-wrap>label{padding-left:29px}.switchline.rb-reset-wrap,.rbv2-switch.rb-reset-wrap{padding-left:39px!important}.switchline.rb-reset-wrap .rb-reset-one,.rbv2-switch.rb-reset-wrap .rb-reset-one{top:50%;left:7px;transform:translateY(-50%)}.rb-org-note{font-size:9px;color:var(--muted);margin-top:8px}.rb-org-tools{display:flex;gap:8px;flex-wrap:wrap}.rb-org-tools .btn{flex:1 1 160px}.rb-vis-item{position:relative}.rb-vis-reset-one{width:27px;height:27px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--gold)}@media(max-width:720px){.rb-org-grid{grid-template-columns:1fr}.rb-org-head{align-items:center}.rb-org-section{padding:10px}}
    `;document.head.appendChild(s);
  }

  async function resolveRestaurantName(){
    if(state.restaurantName)return state.restaurantName;
    try{const host=location.hostname.toLowerCase().replace(/^www\./,'');let q;if(host==='hamodybr.github.io'){const slug=String(new URLSearchParams(location.search).get('tenant')||'').trim().toLowerCase();q=await sb.from('restaurants').select('name').eq('slug',slug).maybeSingle();}else q=await sb.from('restaurant_domains').select('restaurants!inner(name)').eq('hostname',host).eq('status','active').eq('is_verified',true).maybeSingle();if(!q.error)state.restaurantName=q.data?.restaurants?.name||q.data?.name||'';}catch(_){}
    return state.restaurantName;
  }

  function wrapperFor(el){return el?.closest('.field,.rbv2-field,.rb-design-adv-field,.switchline,.rbv2-switch')||null;}
  function dispatch(el){el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
  async function resetField(id){const el=$(id);if(!el||!(id in defaults))return;await resolveRestaurantName();let value=defaults[id];if(typeof value==='function')value=value();if(el.type==='checkbox')el.checked=Boolean(value);else if(el.type==='file')el.value='';else el.value=String(value??'');dispatch(el);showPending(el);}
  function showPending(el){const view=el.closest('#view-design')?'designMsg':'settingsMsg',msg=$(view);if(msg){msg.textContent='تم إرجاع القيمة الافتراضية داخل النموذج. اضغط حفظ لتثبيت التغيير.';msg.className='status';}}

  function addFieldReset(id){const el=$(id);if(!el||!(id in defaults)||el.dataset.rbResetReady==='1')return;const wrap=wrapperFor(el);if(!wrap)return;el.dataset.rbResetReady='1';wrap.classList.add('rb-reset-wrap');const b=document.createElement('button');b.type='button';b.className='rb-reset-one';b.title='إعادة هذا الإعداد للافتراضي';b.textContent='↺';b.onclick=e=>{e.preventDefault();e.stopPropagation();void resetField(id);};wrap.appendChild(b);}
  function sectionMarkup(group){const section=document.createElement('section');section.id=group.id;section.className='rb-org-section';section.innerHTML=`<div class="rb-org-head"><div><h4>${group.title}</h4><p>${group.desc}</p></div><button type="button" class="rb-org-reset">↺ إعادة ضبط القسم</button></div><div class="rb-org-grid"></div><div class="rb-org-extra"></div><div class="rb-org-note">زر ↺ يرجع القيمة داخل النموذج فقط. استخدم زر الحفظ في الصفحة لتثبيت التغيير.</div>`;section.querySelector('.rb-org-reset').onclick=()=>group.fields.forEach(id=>void resetField(id));return section;}
  function moveFields(group,section){const grid=section.querySelector('.rb-org-grid');group.fields.forEach(id=>{const el=$(id),wrap=wrapperFor(el);if(wrap&&wrap.closest('.rb-org-section')!==section)grid.appendChild(wrap);addFieldReset(id);});}
  function hideLegacyEmpty(view){view.querySelectorAll(':scope > .panel > .grid2,:scope > .panel > .grid3,:scope > .panel > .panel').forEach(node=>{if(!node.querySelector('input,select,textarea,button'))node.style.display='none';});}

  function organizeSettings(){
    const view=$('view-settings'),panel=view?.querySelector(':scope > .panel');if(!panel)return;let stack=$('rbSettingsGroups');if(!stack){stack=document.createElement('div');stack.id='rbSettingsGroups';stack.className='rb-org-stack';const bar=$('saveSettingsBtn')?.closest('.savebar');bar?.before(stack);}groups.settings.forEach(group=>{let section=$(group.id);if(!section){section=sectionMarkup(group);stack.appendChild(section);}moveFields(group,section);});
    const operations=$('rbGroupOperations')?.querySelector('.rb-org-extra'),contact=$('rbGroupContact')?.querySelector('.rb-org-extra');const boxes=[...document.querySelectorAll('#rbv2Operations>.rbv2-box')];boxes.forEach(box=>{const text=box.textContent||'';if(/الموقع|روابط التواصل/.test(text))contact?.appendChild(box);else operations?.appendChild(box);});const rbv2=$('rbv2Operations');if(rbv2&&!rbv2.querySelector('.rbv2-box'))rbv2.style.display='none';
    let tools=$('rbInterfaceTools');if(!tools){tools=document.createElement('section');tools.id='rbInterfaceTools';tools.className='rb-org-section';tools.innerHTML='<div class="rb-org-head"><div><h4>🧩 عناصر الواجهة والأزرار</h4><p>إظهار/إخفاء عناصر المنيو وإدارة الأزرار والروابط المخصصة.</p></div></div><div class="rb-org-tools"></div>';stack.appendChild(tools);}const toolBox=tools.querySelector('.rb-org-tools');['rbVisibilityOpen','rbActionsOpen'].forEach(id=>{const el=$(id);if(el&&el.parentElement!==toolBox)toolBox.appendChild(el);});
    const backup=$('rbBackupBox');if(backup&&backup.parentElement!==stack){let recovery=$('rbRecoveryGroup');if(!recovery){recovery=document.createElement('section');recovery.id='rbRecoveryGroup';recovery.className='rb-org-section';recovery.innerHTML='<div class="rb-org-head"><div><h4>💾 Backup و Recovery</h4><p>نسخ واستعادة بمستويات مستقلة، مع Reset شامل منفصل.</p></div></div><div class="rb-org-extra"></div>';stack.appendChild(recovery);}recovery.querySelector('.rb-org-extra').appendChild(backup);}hideLegacyEmpty(view);
  }

  function organizeDesign(){
    const view=$('view-design'),panel=view?.querySelector(':scope > .panel');if(!panel)return;let stack=$('rbDesignGroups');if(!stack){stack=document.createElement('div');stack.id='rbDesignGroups';stack.className='rb-org-stack';const bar=$('saveDesignBtn')?.closest('.savebar');bar?.before(stack);}groups.design.forEach(group=>{let section=$(group.id);if(!section){section=sectionMarkup(group);stack.appendChild(section);}moveFields(group,section);});
    const adv=$('rbDesignAdvanced'),footer=$('rbGroupFooter')?.querySelector('.rb-org-extra');if(adv&&footer&&adv.parentElement!==footer)footer.appendChild(adv);const v3=$('rbDesignControlsV3');if(v3&&!v3.querySelector('input,select,textarea'))v3.style.display='none';hideLegacyEmpty(view);
  }

  function enhanceVisibility(){const modal=$('rbVisibilityModal');if(!modal)return;modal.querySelectorAll('[data-vis-key]').forEach(input=>{if(input.dataset.rbResetReady==='1')return;input.dataset.rbResetReady='1';const row=input.closest('.rb-vis-item');if(!row)return;const b=document.createElement('button');b.type='button';b.className='rb-vis-reset-one';b.title='الافتراضي: ظاهر';b.textContent='↺';b.onclick=e=>{e.preventDefault();input.checked=true;};row.appendChild(b);});modal.querySelectorAll('.rb-vis-section').forEach(section=>{if(section.dataset.rbSectionReset==='1')return;section.dataset.rbSectionReset='1';const h=section.querySelector('h4');if(!h)return;const b=document.createElement('button');b.type='button';b.className='rb-org-reset';b.textContent='↺ القسم';b.onclick=()=>section.querySelectorAll('[data-vis-key]').forEach(i=>i.checked=true);h.insertAdjacentElement('afterend',b);});}
  function enhanceActions(){const modal=$('rbActionsModal');if(!modal)return;modal.querySelectorAll('.rb-actions-section').forEach(section=>{if(section.dataset.rbResetList==='1')return;section.dataset.rbResetList='1';const title=section.querySelector('.rb-actions-title');if(!title)return;const b=document.createElement('button');b.type='button';b.className='mini';b.textContent='↺ تفريغ';b.onclick=()=>{let guard=0;while(section.querySelector('.rb-action-remove')&&guard++<20)section.querySelector('.rb-action-remove').click();};title.appendChild(b);});}

  function scan(){styles();organizeSettings();organizeDesign();Object.keys(defaults).forEach(addFieldReset);enhanceVisibility();enhanceActions();}
  function boot(){scan();new MutationObserver(()=>requestAnimationFrame(scan)).observe(document.body,{childList:true,subtree:true});console.log('✅ RESTBR Owner Settings Organizer V3.1 ready');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

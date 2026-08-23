// ============================================================
// RESTBR OWNER DESIGN CONTROLS V3.0
// Exposes every public UI variable supported by the menu runtime and makes
// the main Save Design button save the whole design object in one fresh merge.
// ============================================================
(() => {
  'use strict';
  const sb=window.RESTBR_OWNER_V2_CLIENT;if(!sb)return;
  const $=id=>document.getElementById(id);
  const state={tenantId:null,loading:false};
  const D={
    card_gap:10,info_padding:10,product_name_font:13,option_font:12,price_font:12,section_title_font:22,
    add_button_height:30,add_button_font:10,category_height:41,category_font:12,top_action_height:48,top_action_font:11,
    cart_width:160,cart_height:43,cart_font:10,cart_bottom:16,cart_horizontal:50,logo_size:84,menu_title_font:26,
    subtitle_font:12,search_height:46,search_font:16,footer_title_font:17,footer_action_font:10.5,footer_phone_font:17,
    text_primary:'#ffffff',text_muted:'#b7b0a6',card_border_color:'#5b4024',button_border_color:'#5b4024',card_shadow_strength:28,
    font_family:'Arial,Tahoma,sans-serif',heading_font_family:'Georgia,serif'
  };

  async function tenantId(){
    if(state.tenantId)return state.tenantId;const host=location.hostname.toLowerCase().replace(/^www\./,'');let q;
    if(host==='hamodybr.github.io'){const slug=String(new URLSearchParams(location.search).get('tenant')||'').trim().toLowerCase();q=await sb.from('restaurants').select('id').eq('slug',slug).maybeSingle();}
    else q=await sb.from('restaurant_domains').select('restaurant_id').eq('hostname',host).eq('status','active').eq('is_verified',true).maybeSingle();
    if(q.error)throw q.error;const id=q.data?.id||q.data?.restaurant_id;if(!id)throw new Error('restaurant not found');return state.tenantId=id;
  }

  function styles(){if($('rbDesignControlsV3Styles'))return;const s=document.createElement('style');s.id='rbDesignControlsV3Styles';s.textContent=`
    .rb-design-v3{margin-top:12px}.rb-design-v3-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.rb-design-v3 .field{margin:0}.rb-design-v3 .field label{font-size:10px}.rb-design-v3 input[type=range]{width:100%}.rb-design-v3-val{display:block;margin-top:3px;text-align:center;color:var(--gold);font-size:9px}.rb-design-v3-note{margin-top:9px;color:var(--muted);font-size:9px;line-height:1.55}@media(max-width:700px){.rb-design-v3-grid{grid-template-columns:1fr}}
  `;document.head.appendChild(s);}
  const range=(id,label,min,max,step,value,unit='')=>`<div class="field"><label>${label}</label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"><span id="${id}Val" class="rb-design-v3-val">${value}${unit}</span></div>`;
  const color=(id,label,value)=>`<div class="field"><label>${label}</label><input id="${id}" type="color" value="${value}"></div>`;
  const text=(id,label,value)=>`<div class="field"><label>${label}</label><input id="${id}" dir="ltr" value="${value}"></div>`;

  function inject(){
    if($('rbDesignControlsV3'))return;const panel=$('view-design')?.querySelector(':scope>.panel');const bar=$('saveDesignBtn')?.closest('.savebar');if(!panel||!bar)return;
    const box=document.createElement('div');box.id='rbDesignControlsV3';box.className='rb-design-v3';box.innerHTML=`<div class="rb-design-v3-grid">
      ${range('dCardGap','المسافة بين الكروت',0,40,1,D.card_gap,'px')}
      ${range('dInfoPadding','Padding داخل الكارت',0,30,1,D.info_padding,'px')}
      ${range('dProductNameFont','حجم اسم الصنف',9,28,.5,D.product_name_font,'px')}
      ${range('dOptionFont','حجم اسم الخيار',8,24,.5,D.option_font,'px')}
      ${range('dPriceFont','حجم السعر',8,28,.5,D.price_font,'px')}
      ${range('dSectionTitleFont','عنوان القسم',14,38,.5,D.section_title_font,'px')}
      ${range('dAddButtonHeight','ارتفاع زر الإضافة',22,60,1,D.add_button_height,'px')}
      ${range('dAddButtonFont','خط زر الإضافة',8,20,.5,D.add_button_font,'px')}
      ${range('dLogoSize','حجم الشعار',48,150,1,D.logo_size,'px')}
      ${range('dMenuTitleFont','عنوان MENU',16,44,.5,D.menu_title_font,'px')}
      ${range('dSubtitleFont','النص التعريفي',8,24,.5,D.subtitle_font,'px')}
      ${range('dCategoryHeight','ارتفاع الأقسام',30,65,1,D.category_height,'px')}
      ${range('dCategoryFont','خط الأقسام',8,22,.5,D.category_font,'px')}
      ${range('dTopActionHeight','ارتفاع أزرار الأعلى',34,70,1,D.top_action_height,'px')}
      ${range('dTopActionFont','خط أزرار الأعلى',8,20,.5,D.top_action_font,'px')}
      ${range('dSearchHeight','ارتفاع البحث',34,70,1,D.search_height,'px')}
      ${range('dSearchFont','خط البحث',10,22,.5,D.search_font,'px')}
      ${range('dCartWidth','عرض زر السلة',120,300,1,D.cart_width,'px')}
      ${range('dCartHeight','ارتفاع زر السلة',36,80,1,D.cart_height,'px')}
      ${range('dCartFont','خط السلة',8,22,.5,D.cart_font,'px')}
      ${range('dCartBottom','بعد السلة عن الأسفل',0,60,1,D.cart_bottom,'px')}
      ${range('dCartHorizontal','الموقع الأفقي للسلة',10,90,1,D.cart_horizontal,'%')}
      ${range('dFooterTitleFont','عنوان الفوتر',10,32,.5,D.footer_title_font,'px')}
      ${range('dFooterActionFont','خط أزرار الفوتر',8,20,.5,D.footer_action_font,'px')}
      ${range('dFooterPhoneFont','حجم هاتف الفوتر',10,30,.5,D.footer_phone_font,'px')}
      ${color('dTextPrimary','لون النص الرئيسي',D.text_primary)}
      ${color('dTextMuted','لون النص الثانوي',D.text_muted)}
      ${color('dCardBorder','لون حدود الكروت',D.card_border_color)}
      ${color('dButtonBorder','لون حدود الأزرار',D.button_border_color)}
      ${range('dCardShadow','قوة ظل الكارت',0,100,1,D.card_shadow_strength,'%')}
      ${text('dFontFamily','Font Family العام',D.font_family)}
      ${text('dHeadingFontFamily','Font Family للعناوين',D.heading_font_family)}
    </div><div class="rb-design-v3-note">هذه القيم كلها مدعومة من Runtime نفسه وتطبق على iPhone وDesktop بنفس التصميم.</div>`;
    bar.before(box);
    box.querySelectorAll('input[type=range]').forEach(input=>input.addEventListener('input',()=>{const out=$(`${input.id}Val`);if(out){const unit=/Horizontal|Shadow/.test(input.id)?'%':'px';out.textContent=input.value+unit;}}));
  }

  function number(id,fallback){const n=Number($(id)?.value);return Number.isFinite(n)?n:fallback;}
  function validColor(v,fallback){return /^#[0-9a-f]{6}$/i.test(String(v||''))?v:fallback;}
  function set(id,value){const el=$(id);if(!el)return;el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));}

  async function load(){
    if(state.loading)return;state.loading=true;
    try{inject();const rid=await tenantId();const {data,error}=await sb.from('restaurant_settings').select('ui_design_settings').eq('restaurant_id',rid).maybeSingle();if(error)throw error;const ui=data?.ui_design_settings||{};
      const map={dCardGap:'card_gap',dInfoPadding:'info_padding',dProductNameFont:'product_name_font',dOptionFont:'option_font',dPriceFont:'price_font',dSectionTitleFont:'section_title_font',dAddButtonHeight:'add_button_height',dAddButtonFont:'add_button_font',dLogoSize:'logo_size',dMenuTitleFont:'menu_title_font',dSubtitleFont:'subtitle_font',dCategoryHeight:'category_height',dCategoryFont:'category_font',dTopActionHeight:'top_action_height',dTopActionFont:'top_action_font',dSearchHeight:'search_height',dSearchFont:'search_font',dCartWidth:'cart_width',dCartHeight:'cart_height',dCartFont:'cart_font',dCartBottom:'cart_bottom',dCartHorizontal:'cart_horizontal',dFooterTitleFont:'footer_title_font',dFooterActionFont:'footer_action_font',dFooterPhoneFont:'footer_phone_font',dCardShadow:'card_shadow_strength'};
      Object.entries(map).forEach(([id,key])=>set(id,ui[key]??D[key]));
      set('dTextPrimary',validColor(ui.text_primary,D.text_primary));set('dTextMuted',validColor(ui.text_muted,D.text_muted));set('dCardBorder',validColor(ui.card_border_color,D.card_border_color));set('dButtonBorder',validColor(ui.button_border_color,D.button_border_color));set('dFontFamily',ui.font_family||D.font_family);set('dHeadingFontFamily',ui.heading_font_family||D.heading_font_family);
      const can=window.RESTBR_OWNER_ACCESS?.canManageSettings!==false;boxDisabled(!can);
    }catch(error){console.error('RESTBR Design V3 load:',error);}finally{state.loading=false;}
  }
  function boxDisabled(disabled){document.querySelectorAll('#rbDesignControlsV3 input').forEach(el=>el.disabled=disabled);}

  async function saveAll(event){
    if(event){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();}
    if(window.RESTBR_OWNER_ACCESS && !window.RESTBR_OWNER_ACCESS.canManageSettings)return;
    const msg=$('designMsg'),btn=$('saveDesignBtn');if(btn)btn.disabled=true;if(msg){msg.textContent='جاري حفظ كل إعدادات التصميم...';msg.className='status';}
    try{const rid=await tenantId();const {data,error}=await sb.from('restaurant_settings').select('ui_design_settings').eq('restaurant_id',rid).maybeSingle();if(error)throw error;const ui={...(data?.ui_design_settings||{})};
      Object.assign(ui,{
        design_system_version:1.3,accent_color:$('dAccent')?.value||'#d8a958',card_glass_color:$('dGlassColor')?.value||'#080604',card_glass_opacity:number('dOpacity',14),card_glass_blur:number('dBlur',18),card_height:number('dCardHeight',160),card_radius:number('dRadius',18),image_percent:number('dImagePercent',40),
        card_gap:number('dCardGap',D.card_gap),info_padding:number('dInfoPadding',D.info_padding),product_name_font:number('dProductNameFont',D.product_name_font),option_font:number('dOptionFont',D.option_font),price_font:number('dPriceFont',D.price_font),section_title_font:number('dSectionTitleFont',D.section_title_font),add_button_height:number('dAddButtonHeight',D.add_button_height),add_button_font:number('dAddButtonFont',D.add_button_font),
        logo_size:number('dLogoSize',D.logo_size),menu_title_font:number('dMenuTitleFont',D.menu_title_font),subtitle_font:number('dSubtitleFont',D.subtitle_font),category_height:number('dCategoryHeight',D.category_height),category_font:number('dCategoryFont',D.category_font),top_action_height:number('dTopActionHeight',D.top_action_height),top_action_font:number('dTopActionFont',D.top_action_font),search_height:number('dSearchHeight',D.search_height),search_font:number('dSearchFont',D.search_font),
        cart_width:number('dCartWidth',D.cart_width),cart_height:number('dCartHeight',D.cart_height),cart_font:number('dCartFont',D.cart_font),cart_bottom:number('dCartBottom',D.cart_bottom),cart_horizontal:number('dCartHorizontal',D.cart_horizontal),footer_title_font:number('dFooterTitleFont',D.footer_title_font),footer_action_font:number('dFooterActionFont',D.footer_action_font),footer_phone_font:number('dFooterPhoneFont',D.footer_phone_font),
        text_primary:$('dTextPrimary')?.value||D.text_primary,text_muted:$('dTextMuted')?.value||D.text_muted,card_border_color:$('dCardBorder')?.value||D.card_border_color,button_border_color:$('dButtonBorder')?.value||D.button_border_color,card_shadow_strength:number('dCardShadow',D.card_shadow_strength),font_family:String($('dFontFamily')?.value||D.font_family).trim(),heading_font_family:String($('dHeadingFontFamily')?.value||D.heading_font_family).trim()
      });
      const effect=$('dBackgroundEffect')?.value;if(effect)ui.background_effect=effect;else delete ui.background_effect;
      if($('rbFooterOpacity'))ui.footer_glass_opacity=number('rbFooterOpacity',14);if($('rbFooterBlur'))ui.footer_glass_blur=number('rbFooterBlur',18);if($('rbFooterColor'))ui.footer_glass_color=$('rbFooterColor').value;
      const {error:saveError}=await sb.from('restaurant_settings').update({ui_design_settings:ui,updated_at:new Date().toISOString()}).eq('restaurant_id',rid);if(saveError)throw saveError;
      if(msg){msg.textContent='تم حفظ كل إعدادات التصميم ✓';msg.className='status ok';}
    }catch(error){if(msg){msg.textContent=error?.message||String(error);msg.className='status err';}}finally{if(btn)btn.disabled=false;}
  }

  function boot(){styles();inject();document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="design"],[data-go="design"]'))setTimeout(load,80);},true);document.addEventListener('click',e=>{if(e.target.closest?.('#saveDesignBtn')&&$('rbDesignControlsV3'))void saveAll(e);},true);const app=$('app');if(app)new MutationObserver(()=>{if(!app.classList.contains('hidden'))setTimeout(load,120);}).observe(app,{attributes:true,attributeFilter:['class']});if(app&&!app.classList.contains('hidden'))void load();console.log('✅ RESTBR Owner Design Controls V3.0 ready');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

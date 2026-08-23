// ============================================================
// RESTBR OWNER DESIGN ADVANCED V2.0
// Adds independent footer-card glass controls without touching menu cards.
// ============================================================
(() => {
  'use strict';
  const sb=window.RESTBR_OWNER_V2_CLIENT; if(!sb)return;
  const $=id=>document.getElementById(id);
  const state={tenantId:null,settings:null};
  const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?{...v}:{};

  async function tenantId(){
    if(state.tenantId)return state.tenantId;
    const host=location.hostname.toLowerCase().replace(/^www\./,'');
    if(host==='hamodybr.github.io'){
      const slug=String(new URLSearchParams(location.search).get('tenant')||'').trim().toLowerCase();
      const {data,error}=await sb.from('restaurants').select('id').eq('slug',slug).maybeSingle();if(error)throw error;if(!data?.id)throw new Error('restaurant not found');return state.tenantId=data.id;
    }
    const {data,error}=await sb.from('restaurant_domains').select('restaurant_id').eq('hostname',host).eq('status','active').eq('is_verified',true).maybeSingle();if(error)throw error;if(!data?.restaurant_id)throw new Error('restaurant domain not found');return state.tenantId=data.restaurant_id;
  }

  function styles(){if($('rbDesignAdvancedStyles'))return;const s=document.createElement('style');s.id='rbDesignAdvancedStyles';s.textContent=`
    .rb-design-advanced{margin-top:12px;border:1px solid var(--line);border-radius:16px;padding:12px;background:var(--panel2)}
    .rb-design-advanced h4{margin:0 0 4px;color:var(--gold);font-size:13px}.rb-design-advanced p{margin:0 0 10px;color:var(--muted);font-size:10px;line-height:1.6}
    .rb-design-adv-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.rb-design-adv-field label{display:block;color:var(--muted);font-size:10px;margin-bottom:5px}.rb-design-adv-field input[type=range]{width:100%}.rb-design-adv-field input[type=color]{width:100%;height:42px;border:1px solid var(--line);border-radius:11px;background:var(--input);padding:4px}.rb-design-adv-value{font-size:10px;color:var(--gold);text-align:center;margin-top:3px}.rb-design-adv-actions{display:flex;gap:8px;margin-top:10px}.rb-design-adv-msg{font-size:10px;min-height:17px;margin-top:6px;color:var(--muted)}.rb-design-adv-msg.ok{color:var(--ok)}.rb-design-adv-msg.err{color:var(--danger)}@media(max-width:650px){.rb-design-adv-grid{grid-template-columns:1fr}}
  `;document.head.appendChild(s);}

  function inject(){
    if($('rbDesignAdvanced'))return;
    const panel=$('view-design')?.querySelector('.panel');if(!panel)return;
    const savebar=$('saveDesignBtn')?.closest('.savebar');if(!savebar)return;
    const box=document.createElement('div');box.id='rbDesignAdvanced';box.className='rb-design-advanced';box.innerHTML=`
      <h4>🪟 زجاج الفوتر — مستقل عن كروت الأصناف</h4>
      <p>تقدر تخلي شفافية وBlur ولون كارت الفوتر مختلف تماماً عن كروت المنتجات.</p>
      <div class="rb-design-adv-grid">
        <div class="rb-design-adv-field"><label>شفافية الفوتر</label><input id="rbFooterOpacity" type="range" min="0" max="100" value="14"><div id="rbFooterOpacityValue" class="rb-design-adv-value">14%</div></div>
        <div class="rb-design-adv-field"><label>Footer Blur</label><input id="rbFooterBlur" type="range" min="0" max="40" value="18"><div id="rbFooterBlurValue" class="rb-design-adv-value">18px</div></div>
        <div class="rb-design-adv-field"><label>لون زجاج الفوتر</label><input id="rbFooterColor" type="color" value="#080604"></div>
      </div>
      <div class="rb-design-adv-actions"><button id="rbFooterDesignSave" class="btn primary" type="button">حفظ إعدادات الفوتر</button><button id="rbFooterMatchCards" class="btn" type="button">مطابقة الكروت</button></div>
      <div id="rbFooterDesignMsg" class="rb-design-adv-msg"></div>`;
    savebar.before(box);
    const sync=()=>{$('rbFooterOpacityValue').textContent=$('rbFooterOpacity').value+'%';$('rbFooterBlurValue').textContent=$('rbFooterBlur').value+'px';};
    $('rbFooterOpacity').oninput=sync;$('rbFooterBlur').oninput=sync;$('rbFooterDesignSave').onclick=()=>void save();$('rbFooterMatchCards').onclick=()=>void matchCards();sync();
  }

  function msg(t,type=''){const e=$('rbFooterDesignMsg');if(!e)return;e.textContent=t||'';e.className='rb-design-adv-msg'+(type?' '+type:'');}

  async function load(){
    try{inject();const rid=await tenantId();const {data,error}=await sb.from('restaurant_settings').select('ui_design_settings').eq('restaurant_id',rid).maybeSingle();if(error)throw error;state.settings=data||{};const ui=obj(data?.ui_design_settings);$('rbFooterOpacity').value=Number(ui.footer_glass_opacity??ui.footer_glass_transparency??ui.card_glass_opacity??ui.card_glass_transparency??14);$('rbFooterBlur').value=Number(ui.footer_glass_blur??ui.card_glass_blur??18);const color=String(ui.footer_glass_color||ui.card_glass_color||'#080604');$('rbFooterColor').value=/^#[0-9a-f]{6}$/i.test(color)?color:'#080604';$('rbFooterOpacity').dispatchEvent(new Event('input'));const can=window.RESTBR_OWNER_ACCESS?.canManageSettings!==false;document.querySelectorAll('#rbDesignAdvanced input,#rbDesignAdvanced button').forEach(el=>el.disabled=!can);}
    catch(error){msg(error?.message||String(error),'err');}
  }

  async function save(){
    if(window.RESTBR_OWNER_ACCESS && !window.RESTBR_OWNER_ACCESS.canManageSettings){msg('ليس لديك صلاحية تعديل التصميم.','err');return;}
    const btn=$('rbFooterDesignSave');btn.disabled=true;msg('جاري الحفظ...');
    try{const rid=await tenantId();const {data,error}=await sb.from('restaurant_settings').select('ui_design_settings').eq('restaurant_id',rid).maybeSingle();if(error)throw error;const ui={...obj(data?.ui_design_settings),footer_glass_opacity:Number($('rbFooterOpacity').value),footer_glass_blur:Number($('rbFooterBlur').value),footer_glass_color:$('rbFooterColor').value};const res=await sb.from('restaurant_settings').update({ui_design_settings:ui,updated_at:new Date().toISOString()}).eq('restaurant_id',rid);if(res.error)throw res.error;msg('تم حفظ شفافية الفوتر بشكل مستقل ✓','ok');}
    catch(error){msg(error?.message||String(error),'err');}finally{btn.disabled=false;}
  }

  async function matchCards(){
    try{const rid=await tenantId();const {data,error}=await sb.from('restaurant_settings').select('ui_design_settings').eq('restaurant_id',rid).maybeSingle();if(error)throw error;const ui=obj(data?.ui_design_settings);$('rbFooterOpacity').value=Number(ui.card_glass_opacity??ui.card_glass_transparency??14);$('rbFooterBlur').value=Number(ui.card_glass_blur??18);const color=String(ui.card_glass_color||'#080604');$('rbFooterColor').value=/^#[0-9a-f]{6}$/i.test(color)?color:'#080604';$('rbFooterOpacity').dispatchEvent(new Event('input'));await save();}
    catch(error){msg(error?.message||String(error),'err');}
  }

  function boot(){styles();inject();document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="design"],[data-go="design"]'))setTimeout(load,80);});const app=$('app');if(app)new MutationObserver(()=>{if(!app.classList.contains('hidden'))setTimeout(load,120);}).observe(app,{attributes:true,attributeFilter:['class']});if(app&&!app.classList.contains('hidden'))void load();console.log('✅ RESTBR Owner Design Advanced V2.0 ready');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

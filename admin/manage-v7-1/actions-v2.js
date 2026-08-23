// ============================================================
// RESTBR OWNER ACTIONS V2.1
// Tenant custom top/footer actions + arbitrary social links.
// Canonical runtime keys live in branding.custom_* and are mirrored into the
// platform JSON columns top_actions/footer_actions/social_links.
// ============================================================
(() => {
  'use strict';
  const sb=window.RESTBR_OWNER_V2_CLIENT;if(!sb)return;
  const $=id=>document.getElementById(id);
  const state={tenantId:null,top:[],footer:[],social:[]};
  const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?{...v}:{};
  const arr=v=>Array.isArray(v)?v.map(x=>obj(x)):[];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  async function tenantId(){
    if(state.tenantId)return state.tenantId;
    const host=location.hostname.toLowerCase().replace(/^www\./,'');
    if(host==='hamodybr.github.io'){
      const slug=String(new URLSearchParams(location.search).get('tenant')||'').trim().toLowerCase();
      if(!slug)throw new Error('tenant missing');
      const {data,error}=await sb.from('restaurants').select('id').eq('slug',slug).maybeSingle();if(error)throw error;if(!data?.id)throw new Error('restaurant not found');return state.tenantId=data.id;
    }
    const {data,error}=await sb.from('restaurant_domains').select('restaurant_id').eq('hostname',host).eq('status','active').eq('is_verified',true).maybeSingle();if(error)throw error;if(!data?.restaurant_id)throw new Error('restaurant domain not found');return state.tenantId=data.restaurant_id;
  }

  function styles(){if($('rbActionsStyles'))return;const s=document.createElement('style');s.id='rbActionsStyles';s.textContent=`
    .rb-actions-modal{position:fixed;z-index:166;inset:0;display:grid;place-items:end center;padding:9px;background:rgba(0,0,0,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}.rb-actions-card{width:min(790px,100%);max-height:93dvh;overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:25px;padding:15px;box-shadow:0 30px 90px rgba(0,0,0,.5)}.rb-actions-head{display:flex;justify-content:space-between;gap:8px}.rb-actions-head h3{margin:0}.rb-actions-head p{margin:4px 0 0;color:var(--muted);font-size:10px;line-height:1.6}.rb-actions-close{width:38px;height:38px;border:1px solid var(--line);border-radius:12px;background:var(--panel2);color:var(--text);font-size:20px}.rb-actions-section{margin-top:12px;border:1px solid var(--line);border-radius:16px;padding:10px;background:var(--panel2)}.rb-actions-title{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}.rb-actions-title h4{margin:0;color:var(--gold);font-size:12px}.rb-action-row{display:grid;grid-template-columns:52px repeat(3,minmax(0,1fr)) minmax(130px,1.4fr) 42px 38px;gap:6px;align-items:center;margin-bottom:7px}.rb-social-row{grid-template-columns:52px minmax(120px,.8fr) minmax(180px,1.7fr) 42px 38px}.rb-action-row input{min-width:0;width:100%;border:1px solid var(--line);border-radius:10px;background:var(--input);color:var(--text);padding:9px;font-size:12px}.rb-action-row .rb-action-icon{text-align:center;font-size:16px}.rb-action-row button{height:36px;border:1px solid var(--line);border-radius:10px;background:var(--panel);color:var(--text)}.rb-action-row .rb-action-remove{color:var(--danger)}.rb-action-enable{display:grid;place-items:center}.rb-actions-foot{display:flex;gap:8px;margin-top:12px}.rb-actions-foot button{flex:1}.rb-actions-msg{min-height:18px;margin-top:7px;font-size:10px;color:var(--muted)}.rb-actions-msg.ok{color:var(--ok)}.rb-actions-msg.err{color:var(--danger)}@media(max-width:720px){.rb-action-row,.rb-social-row{grid-template-columns:44px minmax(0,1fr) 38px}.rb-action-row .rb-ku,.rb-action-row .rb-en,.rb-action-row .rb-url,.rb-social-row .rb-url{grid-column:2/4}.rb-action-row .rb-enable{grid-column:1}.rb-actions-card{border-radius:22px 22px 12px 12px}}
  `;document.head.appendChild(s);}

  const normalizeAction=(item={})=>({icon:String(item.icon||'🔗').slice(0,8),label_ar:String(item.label_ar||''),label_ku:String(item.label_ku||''),label_en:String(item.label_en||''),url:String(item.url||''),enabled:item.enabled!==false});
  const normalizeSocial=(item={})=>({icon:String(item.icon||'🔗').slice(0,8),name:String(item.name||''),url:String(item.url||''),enabled:item.enabled!==false});

  function ensureModal(){
    let m=$('rbActionsModal');if(m)return m;
    m=document.createElement('div');m.id='rbActionsModal';m.className='rb-actions-modal';m.hidden=true;
    m.innerHTML=`<div class="rb-actions-card"><div class="rb-actions-head"><div><h3>➕ إدارة الأزرار والروابط</h3><p>كل ما تضيفه هنا خاص بهذا المطعم فقط. الأزرار تدعم 3 لغات، والسوشيال المخصص يدعم أي منصة.</p></div><button id="rbActionsClose" class="rb-actions-close" type="button">×</button></div>
      <section class="rb-actions-section"><div class="rb-actions-title"><h4>أزرار أعلى المنيو</h4><button id="rbAddTopAction" class="mini" type="button">+ زر</button></div><div id="rbTopActions"></div></section>
      <section class="rb-actions-section"><div class="rb-actions-title"><h4>أزرار الفوتر</h4><button id="rbAddFooterAction" class="mini" type="button">+ زر</button></div><div id="rbFooterActions"></div></section>
      <section class="rb-actions-section"><div class="rb-actions-title"><h4>روابط سوشيال إضافية</h4><button id="rbAddSocialAction" class="mini" type="button">+ رابط</button></div><div id="rbSocialActions"></div></section>
      <div class="rb-actions-foot"><button id="rbActionsCancel" class="btn" type="button">إلغاء</button><button id="rbActionsSave" class="btn primary" type="button">حفظ</button></div><div id="rbActionsMsg" class="rb-actions-msg"></div></div>`;
    document.body.appendChild(m);m.onclick=e=>{if(e.target===m)close();};$('rbActionsClose').onclick=close;$('rbActionsCancel').onclick=close;$('rbAddTopAction').onclick=()=>add('top');$('rbAddFooterAction').onclick=()=>add('footer');$('rbAddSocialAction').onclick=()=>add('social');$('rbActionsSave').onclick=()=>void save();return m;
  }

  function actionHtml(item,index,type){return `<div class="rb-action-row" data-action-row data-type="${type}" data-index="${index}"><input class="rb-action-icon" maxlength="8" value="${esc(item.icon)}" aria-label="Icon"><input class="rb-ar" value="${esc(item.label_ar)}" placeholder="العربي"><input class="rb-ku" value="${esc(item.label_ku)}" placeholder="کوردی"><input class="rb-en" dir="ltr" value="${esc(item.label_en)}" placeholder="English"><input class="rb-url" dir="ltr" value="${esc(item.url)}" placeholder="https://... أو tel:..."><label class="rb-action-enable"><input class="rb-enable" type="checkbox" ${item.enabled!==false?'checked':''}></label><button class="rb-action-remove" type="button">×</button></div>`;}
  function socialHtml(item,index){return `<div class="rb-action-row rb-social-row" data-social-row data-index="${index}"><input class="rb-action-icon" maxlength="8" value="${esc(item.icon)}"><input class="rb-social-name" value="${esc(item.name)}" placeholder="اسم المنصة"><input class="rb-url" dir="ltr" value="${esc(item.url)}" placeholder="https://..."><label class="rb-action-enable"><input class="rb-enable" type="checkbox" ${item.enabled!==false?'checked':''}></label><button class="rb-action-remove" type="button">×</button></div>`;}

  function render(){
    $('rbTopActions').innerHTML=state.top.map((x,i)=>actionHtml(x,i,'top')).join('')||'<div class="empty">لا توجد أزرار إضافية.</div>';
    $('rbFooterActions').innerHTML=state.footer.map((x,i)=>actionHtml(x,i,'footer')).join('')||'<div class="empty">لا توجد أزرار إضافية.</div>';
    $('rbSocialActions').innerHTML=state.social.map(socialHtml).join('')||'<div class="empty">لا توجد روابط سوشيال إضافية.</div>';
    document.querySelectorAll('#rbActionsModal [data-action-row] .rb-action-remove').forEach(btn=>btn.onclick=()=>{const row=btn.closest('[data-action-row]');state[row.dataset.type].splice(Number(row.dataset.index),1);render();});
    document.querySelectorAll('#rbActionsModal [data-social-row] .rb-action-remove').forEach(btn=>btn.onclick=()=>{const row=btn.closest('[data-social-row]');state.social.splice(Number(row.dataset.index),1);render();});
  }

  function syncFromDom(){
    const next={top:[],footer:[],social:[]};
    document.querySelectorAll('#rbActionsModal [data-action-row]').forEach(row=>{const item=normalizeAction({icon:row.querySelector('.rb-action-icon').value,label_ar:row.querySelector('.rb-ar').value.trim(),label_ku:row.querySelector('.rb-ku').value.trim(),label_en:row.querySelector('.rb-en').value.trim(),url:row.querySelector('.rb-url').value.trim(),enabled:row.querySelector('.rb-enable').checked});if(item.label_ar||item.label_ku||item.label_en||item.url)next[row.dataset.type].push(item);});
    document.querySelectorAll('#rbActionsModal [data-social-row]').forEach(row=>{const item=normalizeSocial({icon:row.querySelector('.rb-action-icon').value,name:row.querySelector('.rb-social-name').value.trim(),url:row.querySelector('.rb-url').value.trim(),enabled:row.querySelector('.rb-enable').checked});if(item.name||item.url)next.social.push(item);});
    Object.assign(state,next);
  }

  function add(type){syncFromDom();const list=state[type];if(list.length>=8){msg('الحد الأعلى 8 عناصر لكل مجموعة حتى تبقى الواجهة مرتبة.','err');return;}list.push(type==='social'?normalizeSocial({}):normalizeAction({}));render();}
  function msg(t,type=''){const e=$('rbActionsMsg');if(!e)return;e.textContent=t||'';e.className='rb-actions-msg'+(type?' '+type:'');}

  async function open(){
    ensureModal().hidden=false;document.body.style.overflow='hidden';msg('جاري التحميل...');
    try{
      const rid=await tenantId();
      const {data,error}=await sb.from('restaurant_settings').select('branding,top_actions,footer_actions,social_links').eq('restaurant_id',rid).maybeSingle();if(error)throw error;
      const b=obj(data?.branding);
      state.top=arr(b.custom_top_actions??data?.top_actions).map(normalizeAction);
      state.footer=arr(b.custom_footer_actions??data?.footer_actions).map(normalizeAction);
      state.social=arr(b.custom_social_links??data?.social_links).map(normalizeSocial);
      render();
      const can=window.RESTBR_OWNER_ACCESS?.canManageSettings!==false;
      document.querySelectorAll('#rbActionsModal input,#rbActionsModal button').forEach(el=>{if(!['rbActionsClose','rbActionsCancel'].includes(el.id))el.disabled=!can;});msg(can?'':'دورك يسمح بالمشاهدة فقط.');
    }catch(error){msg(error?.message||String(error),'err');}
  }
  function close(){const m=$('rbActionsModal');if(m)m.hidden=true;document.body.style.overflow='';}

  async function save(){
    if(window.RESTBR_OWNER_ACCESS && !window.RESTBR_OWNER_ACCESS.canManageSettings){msg('ليس لديك صلاحية تعديل الأزرار.','err');return;}
    syncFromDom();
    const actions=[...state.top,...state.footer];
    if(actions.some(x=>(x.label_ar||x.label_ku||x.label_en)&&!x.url)){msg('كل زر له اسم يجب أن يحتوي رابطًا.','err');return;}
    if(state.social.some(x=>x.name&&!x.url)){msg('كل رابط سوشيال له اسم يجب أن يحتوي رابطًا.','err');return;}
    const allUrls=[...actions,...state.social].map(x=>x.url).filter(Boolean);
    if(allUrls.some(url=>!/^(https?:\/\/|tel:|mailto:)/i.test(url))){msg('الروابط يجب أن تبدأ بـ https:// أو tel: أو mailto:.','err');return;}
    const button=$('rbActionsSave');button.disabled=true;msg('جاري الحفظ...');
    try{
      const rid=await tenantId();const {data,error}=await sb.from('restaurant_settings').select('branding').eq('restaurant_id',rid).maybeSingle();if(error)throw error;
      const branding={...obj(data?.branding),custom_top_actions:state.top,custom_footer_actions:state.footer,custom_social_links:state.social};
      const res=await sb.from('restaurant_settings').update({branding,top_actions:state.top,footer_actions:state.footer,social_links:state.social,updated_at:new Date().toISOString()}).eq('restaurant_id',rid);if(res.error)throw res.error;
      msg('تم حفظ الأزرار والروابط المخصصة ✓','ok');setTimeout(()=>$('refreshBtn')?.click(),250);
    }catch(error){msg(error?.message||String(error),'err');}finally{button.disabled=false;}
  }

  function injectButton(){if($('rbActionsOpen'))return;const bar=$('saveSettingsBtn')?.closest('.savebar');if(!bar)return;const b=document.createElement('button');b.id='rbActionsOpen';b.className='btn';b.type='button';b.textContent='➕ الأزرار والروابط';b.onclick=open;bar.appendChild(b);}
  function boot(){styles();ensureModal();injectButton();const settings=$('view-settings');if(settings)new MutationObserver(injectButton).observe(settings,{childList:true,subtree:true});console.log('✅ RESTBR Owner Actions V2.1 ready');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

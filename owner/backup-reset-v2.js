// ============================================================
// RESTBR OWNER BACKUP / RESTORE V2.0
// Full tenant JSON backup, exact menu restore, neutral UI reset and a separate
// destructive menu-content reset. Restaurant/domain/subscription are never
// deleted from Owner.
// ============================================================
(() => {
  'use strict';
  const sb=window.RESTBR_OWNER_V2_CLIENT;if(!sb)return;
  const $=id=>document.getElementById(id);
  const state={tenant:null};
  const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?{...v}:{};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  async function tenant(){
    if(state.tenant)return state.tenant;
    const host=location.hostname.toLowerCase().replace(/^www\./,'');let q;
    if(host==='hamodybr.github.io'){
      const slug=String(new URLSearchParams(location.search).get('tenant')||'').trim().toLowerCase();
      if(!slug)throw new Error('tenant missing');q=await sb.from('restaurants').select('id,name,slug,status,default_language,timezone,currency').eq('slug',slug).maybeSingle();
    }else q=await sb.from('restaurant_domains').select('restaurant_id,restaurants!inner(id,name,slug,status,default_language,timezone,currency)').eq('hostname',host).eq('status','active').eq('is_verified',true).maybeSingle();
    if(q.error)throw q.error;const r=q.data?.restaurants||q.data;if(!r?.id)throw new Error('restaurant not found');return state.tenant=r;
  }

  function styles(){if($('rbBackupStyles'))return;const s=document.createElement('style');s.id='rbBackupStyles';s.textContent=`
    .rb-backup-box{margin-top:14px;border:1px solid var(--line);border-radius:17px;padding:12px;background:var(--panel2)}.rb-backup-box h4{margin:0 0 4px;color:var(--gold);font-size:13px}.rb-backup-box p{margin:0 0 10px;color:var(--muted);font-size:10px;line-height:1.65}.rb-backup-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.rb-backup-grid button,.rb-backup-upload{min-height:43px}.rb-backup-upload{display:grid;place-items:center;border:1px solid var(--line);border-radius:13px;background:var(--panel);color:var(--text);font-size:11px;font-weight:800;cursor:pointer}.rb-backup-upload input{display:none}.rb-backup-danger{color:var(--danger)!important;border-color:color-mix(in srgb,var(--danger) 35%,transparent)!important}.rb-backup-msg{min-height:18px;margin-top:8px;font-size:10px;color:var(--muted);line-height:1.55}.rb-backup-msg.ok{color:var(--ok)}.rb-backup-msg.err{color:var(--danger)}@media(max-width:600px){.rb-backup-grid{grid-template-columns:1fr}}
  `;document.head.appendChild(s);}

  function inject(){
    if($('rbBackupBox'))return;const bar=$('saveSettingsBtn')?.closest('.savebar');if(!bar)return;const box=document.createElement('div');box.id='rbBackupBox';box.className='rb-backup-box';box.innerHTML=`<h4>💾 النسخ الاحتياطي والاستعادة</h4><p>النسخة الكاملة تشمل الإعدادات والأقسام والأصناف والخيارات. Reset الواجهة لا يحذف المنيو. حذف محتوى المنيو منفصل ويحتاج تأكيدًا واضحًا.</p><div class="rb-backup-grid"><button id="rbBackupDownload" class="btn primary" type="button">تنزيل Backup كامل</button><label class="rb-backup-upload">استعادة Backup<input id="rbBackupFile" type="file" accept="application/json,.json"></label><button id="rbResetUi" class="btn" type="button">Reset الواجهة والإعدادات</button><button id="rbResetMenu" class="btn rb-backup-danger" type="button">حذف محتوى المنيو</button></div><div id="rbBackupMsg" class="rb-backup-msg"></div>`;bar.before(box);$('rbBackupDownload').onclick=()=>void backup();$('rbBackupFile').onchange=e=>void restore(e.target.files?.[0]);$('rbResetUi').onclick=()=>void resetUi();$('rbResetMenu').onclick=()=>void resetMenu();
  }
  function msg(t,type=''){const e=$('rbBackupMsg');if(!e)return;e.textContent=t||'';e.className='rb-backup-msg'+(type?' '+type:'');}
  function canManage(){return window.RESTBR_OWNER_ACCESS?.canManageSettings!==false;}

  async function snapshot(){
    const r=await tenant();const rid=r.id;const [s,c,p,o,d]=await Promise.all([
      sb.from('restaurant_settings').select('*').eq('restaurant_id',rid).maybeSingle(),
      sb.from('categories').select('*').eq('restaurant_id',rid).order('sort_order'),
      sb.from('products').select('*').eq('restaurant_id',rid).order('sort_order'),
      sb.from('product_options').select('*').eq('restaurant_id',rid).order('sort_order'),
      sb.from('restaurant_domains').select('hostname,kind,status,is_verified,is_primary').eq('restaurant_id',rid)
    ]);for(const x of [s,c,p,o,d])if(x.error)throw x.error;
    return {restbr_backup_version:2,created_at:new Date().toISOString(),restaurant:{...r},domains:d.data||[],restaurant_settings:s.data||null,categories:c.data||[],products:p.data||[],product_options:o.data||[]};
  }

  async function saveFile(text,name,type='application/json'){
    const blob=new Blob([text],{type});const file=new File([blob],name,{type});
    if(navigator.canShare?.({files:[file]})&&navigator.share){await navigator.share({files:[file],title:'RESTBR Backup'});return 'share';}
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);return 'download';
  }

  async function backup(){
    if(!canManage()){msg('Viewer لا يستطيع إنشاء نسخة إدارية كاملة.','err');return;}const b=$('rbBackupDownload');b.disabled=true;msg('جاري إنشاء النسخة...');
    try{const data=await snapshot();const name=`restbr-${data.restaurant.slug}-backup-${new Date().toISOString().slice(0,10)}.json`;await saveFile(JSON.stringify(data,null,2),name);msg('تم تجهيز النسخة الاحتياطية ✓','ok');}
    catch(error){if(error?.name==='AbortError')msg('تم إغلاق نافذة الحفظ.');else msg(error?.message||String(error),'err');}finally{b.disabled=false;}
  }

  function validateBackup(data,current){
    if(!data||Number(data.restbr_backup_version)<1)throw new Error('هذا ليس ملف RESTBR Backup صالح.');
    if(String(data.restaurant?.id||'')!==String(current.id))throw new Error(`النسخة تخص مطعمًا آخر (${data.restaurant?.slug||'unknown'}). لن نخلط بيانات مطعمين.`);
    if(!Array.isArray(data.categories)||!Array.isArray(data.products)||!Array.isArray(data.product_options))throw new Error('ملف النسخة ناقص بيانات المنيو.');
  }

  async function restore(file){
    if(!file)return;if(!canManage()){msg('ليس لديك صلاحية الاستعادة.','err');return;}
    try{const current=await tenant();const data=JSON.parse(await file.text());validateBackup(data,current);if(!confirm(`استعادة النسخة ستستبدل إعدادات ومنيو ${current.name}. هل أنت متأكد؟`)){file.value='';return;}msg('جاري الاستعادة... لا تغلق الصفحة.');const rid=current.id;
      // Delete dependent rows first, then rebuild using the original stable ids.
      let res=await sb.from('product_options').delete().eq('restaurant_id',rid);if(res.error)throw res.error;
      res=await sb.from('products').delete().eq('restaurant_id',rid);if(res.error)throw res.error;
      res=await sb.from('categories').delete().eq('restaurant_id',rid);if(res.error)throw res.error;
      if(data.categories.length){res=await sb.from('categories').insert(data.categories.map(x=>({...x,restaurant_id:rid})));if(res.error)throw res.error;}
      if(data.products.length){res=await sb.from('products').insert(data.products.map(x=>({...x,restaurant_id:rid})));if(res.error)throw res.error;}
      if(data.product_options.length){res=await sb.from('product_options').insert(data.product_options.map(x=>({...x,restaurant_id:rid})));if(res.error)throw res.error;}
      if(data.restaurant_settings){const settings={...data.restaurant_settings,restaurant_id:rid};res=await sb.from('restaurant_settings').upsert(settings,{onConflict:'restaurant_id'});if(res.error)throw res.error;}
      msg('تمت الاستعادة ✓ اضغط تحديث لمراجعة كل شيء.','ok');setTimeout(()=>$('refreshBtn')?.click(),500);
    }catch(error){msg('فشلت الاستعادة: '+(error?.message||String(error)),'err');}finally{$('rbBackupFile').value='';}
  }

  async function resetUi(){
    if(!canManage()){msg('ليس لديك صلاحية Reset.','err');return;}const r=await tenant();if(!confirm('Reset الواجهة يعيد التصميم والأزرار وخصائص العرض للوضع المحايد، لكنه لا يحذف الأصناف أو الصور أو بيانات الاتصال. متابعة؟'))return;msg('جاري Reset الواجهة...');
    try{const rid=r.id;const {data,error}=await sb.from('restaurant_settings').select('*').eq('restaurant_id',rid).maybeSingle();if(error)throw error;const s=data||{};const branding={...obj(s.branding),show_logo:true,show_menu_title:true,show_subtitle:true,show_language_switch:true,show_category_nav:true,show_footer:true,show_footer_brand:true,show_footer_location:true,show_footer_phone:true,show_footer_socials:true,show_footer_copy:true,custom_top_actions:[],custom_footer_actions:[],custom_social_links:[]};const features={...obj(s.features),menu_enabled:true,orders_enabled:true,delivery_enabled:true,pickup_enabled:true,is_open:true,intro_enabled:true,background_video_enabled:true,top_location_enabled:Boolean(s.location_url||s.branding?.location),top_call_enabled:Boolean(s.phone),top_whatsapp_enabled:Boolean(s.whatsapp),footer_location_enabled:true,footer_call_enabled:Boolean(s.phone),footer_whatsapp_enabled:Boolean(s.whatsapp)};const ui={design_system_version:1.2,card_gap:10,logo_size:84,card_height:160,card_radius:18,image_percent:40,info_padding:10,product_name_font:13,option_font:12,price_font:12,section_title_font:22,category_font:12,category_height:41,menu_title_font:26,subtitle_font:12,top_action_height:48,top_action_font:11,cart_width:160,cart_height:43,cart_font:10,cart_bottom:16,card_glass_opacity:14,card_glass_blur:18,card_glass_color:'#080604',footer_glass_opacity:14,footer_glass_blur:18,footer_glass_color:'#080604'};const res=await sb.from('restaurant_settings').update({branding,features,ui_design_settings:ui,updated_at:new Date().toISOString()}).eq('restaurant_id',rid);if(res.error)throw res.error;msg('تم Reset الواجهة بدون حذف المنيو ✓','ok');setTimeout(()=>$('refreshBtn')?.click(),400);}
    catch(error){msg(error?.message||String(error),'err');}
  }

  async function resetMenu(){
    if(!canManage()){msg('ليس لديك صلاحية حذف المنيو.','err');return;}const r=await tenant();const typed=prompt(`هذا يحذف الأقسام والأصناف والخيارات فقط من ${r.name}.\nاكتب slug المطعم للتأكيد: ${r.slug}`);if(String(typed||'').trim().toLowerCase()!==String(r.slug).toLowerCase()){msg('تم إلغاء الحذف.');return;}msg('جاري حذف محتوى المنيو...');
    try{const rid=r.id;let res=await sb.from('product_options').delete().eq('restaurant_id',rid);if(res.error)throw res.error;res=await sb.from('products').delete().eq('restaurant_id',rid);if(res.error)throw res.error;res=await sb.from('categories').delete().eq('restaurant_id',rid);if(res.error)throw res.error;msg('تم حذف محتوى المنيو. المطعم والحساب والإعدادات ما زالت موجودة.','ok');setTimeout(()=>$('refreshBtn')?.click(),400);}
    catch(error){msg(error?.message||String(error),'err');}
  }

  function boot(){styles();inject();const view=$('view-settings');if(view)new MutationObserver(inject).observe(view,{childList:true,subtree:true});console.log('✅ RESTBR Backup/Restore V2.0 ready');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

// ============================================================
// RESTBR OWNER BACKUP / RESTORE V2.1
// Full tenant JSON backup, atomic restore, neutral UI reset and a separate
// atomic destructive menu-content reset. Restaurant/domain/subscription are
// never overwritten or deleted from Owner.
// ============================================================
(() => {
  'use strict';
  const sb=window.RESTBR_OWNER_V2_CLIENT;if(!sb)return;
  const $=id=>document.getElementById(id);
  const state={tenant:null};
  const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?{...v}:{};

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
    if($('rbBackupBox'))return;const bar=$('saveSettingsBtn')?.closest('.savebar');if(!bar)return;const box=document.createElement('div');box.id='rbBackupBox';box.className='rb-backup-box';box.innerHTML=`<h4>💾 النسخ الاحتياطي والاستعادة</h4><p>Backup يشمل إعدادات المطعم والمنيو كاملة. الاستعادة تتم داخل معاملة واحدة: إما تنجح كلها أو لا يتغير شيء. Reset الإعدادات لا يحذف الأصناف أو الصور أو بيانات الاتصال.</p><div class="rb-backup-grid"><button id="rbBackupDownload" class="btn primary" type="button">حفظ Backup كامل</button><label class="rb-backup-upload">استعادة Backup<input id="rbBackupFile" type="file" accept="application/json,.json"></label><button id="rbResetUi" class="btn" type="button">Reset الواجهة والإعدادات</button><button id="rbResetMenu" class="btn rb-backup-danger" type="button">حذف محتوى المنيو</button></div><div id="rbBackupMsg" class="rb-backup-msg"></div>`;bar.before(box);$('rbBackupDownload').onclick=()=>void backup();$('rbBackupFile').onchange=e=>void restore(e.target.files?.[0]);$('rbResetUi').onclick=()=>void resetUi();$('rbResetMenu').onclick=()=>void resetMenu();
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
    if(!s.data)throw new Error('إعدادات المطعم غير موجودة.');
    return {restbr_backup_version:2,created_at:new Date().toISOString(),restaurant:{...r},domains:d.data||[],restaurant_settings:s.data,categories:c.data||[],products:p.data||[],product_options:o.data||[]};
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
    if(!data||Number(data.restbr_backup_version)!==2)throw new Error('الملف ليس RESTBR Backup V2 صالحًا.');
    if(String(data.restaurant?.id||'')!==String(current.id))throw new Error(`النسخة تخص مطعمًا آخر (${data.restaurant?.slug||'unknown'}). لن نخلط بيانات مطعمين.`);
    if(!data.restaurant_settings||String(data.restaurant_settings.restaurant_id||'')!==String(current.id))throw new Error('Restaurant settings داخل النسخة لا تطابق المطعم الحالي.');
    if(!Array.isArray(data.categories)||!Array.isArray(data.products)||!Array.isArray(data.product_options))throw new Error('ملف النسخة ناقص بيانات المنيو.');
  }

  async function restore(file){
    if(!file)return;if(!canManage()){msg('ليس لديك صلاحية الاستعادة.','err');return;}
    try{
      const current=await tenant();const data=JSON.parse(await file.text());validateBackup(data,current);
      if(!confirm(`استعادة النسخة ستستبدل إعدادات ومنيو ${current.name}.\nالعملية Atomic: إذا فشل أي جزء لن يتغير شيء. متابعة؟`))return;
      msg('جاري الاستعادة الآمنة... لا تغلق الصفحة.');
      const {data:result,error}=await sb.rpc('owner_restore_restaurant_backup',{
        p_restaurant_id:current.id,
        p_settings:data.restaurant_settings,
        p_categories:data.categories,
        p_products:data.products,
        p_options:data.product_options
      });
      if(error)throw error;
      msg(`تمت الاستعادة كاملة ✓ ${Number(result?.categories||0)} قسم • ${Number(result?.products||0)} صنف • ${Number(result?.options||0)} خيار`,'ok');
      setTimeout(()=>$('refreshBtn')?.click(),500);
    }catch(error){msg('لم تتغير البيانات. فشلت الاستعادة: '+(error?.message||String(error)),'err');}
    finally{if($('rbBackupFile'))$('rbBackupFile').value='';}
  }

  async function resetUi(){
    if(!canManage()){msg('ليس لديك صلاحية Reset.','err');return;}
    const r=await tenant();
    if(!confirm('Reset يعيد النصوص الافتراضية المحايدة، عناصر العرض، الأزرار المخصصة والتصميم. لن يحذف المنيو أو الشعار/الخلفية المرفوعة أو الهاتف/واتساب/العنوان. متابعة؟'))return;
    msg('جاري Reset الإعدادات...');
    try{
      const rid=r.id;const {data,error}=await sb.from('restaurant_settings').select('*').eq('restaurant_id',rid).maybeSingle();if(error)throw error;const s=data||{};
      const branding={...obj(s.branding),name_ar:s.restaurant_name_ar||r.name,name_ku:s.restaurant_name_ku||r.name,name_en:s.restaurant_name_en||r.name,show_logo:true,show_menu_title:true,show_subtitle:true,show_language_switch:true,show_category_nav:true,show_footer:true,show_footer_brand:true,show_footer_location:true,show_footer_phone:true,show_footer_socials:true,show_footer_copy:true,intro_enabled:true,custom_top_actions:[],custom_footer_actions:[],custom_social_links:[]};
      const features={...obj(s.features),menu_enabled:true,orders_enabled:true,delivery_enabled:true,pickup_enabled:true,is_open:true,intro_enabled:true,background_video_enabled:Boolean(s.background_url),top_location_enabled:Boolean(s.location_url||s.branding?.location||s.address_ar||s.address_ku||s.address_en),top_call_enabled:Boolean(s.phone),top_whatsapp_enabled:Boolean(s.whatsapp),footer_location_enabled:Boolean(s.address_ar||s.address_ku||s.address_en),footer_call_enabled:Boolean(s.phone),footer_whatsapp_enabled:Boolean(s.whatsapp)};
      const ui={design_system_version:1.2,card_gap:10,logo_size:84,card_height:160,card_radius:18,image_percent:40,info_padding:10,product_name_font:13,option_font:12,price_font:12,section_title_font:22,category_font:12,category_height:41,menu_title_font:26,subtitle_font:12,top_action_height:48,top_action_font:11,cart_width:160,cart_height:43,cart_font:10,cart_bottom:16,card_glass_opacity:14,card_glass_blur:18,card_glass_color:'#080604',footer_glass_opacity:14,footer_glass_blur:18,footer_glass_color:'#080604'};
      const res=await sb.from('restaurant_settings').update({
        subtitle_ar:'اكتشف منيو {name}',subtitle_ku:'مێنیوی {name} ببینە',subtitle_en:'Discover {name} Menu',
        announcement_enabled:false,announcement_ar:null,announcement_ku:null,announcement_en:null,
        languages:['ar','ku','en'],branding,features,ui_design_settings:ui,
        social_links:[],top_actions:[],footer_actions:[],updated_at:new Date().toISOString()
      }).eq('restaurant_id',rid);
      if(res.error)throw res.error;msg('تم Reset الإعدادات إلى RESTBR Neutral بدون حذف المنيو ✓','ok');setTimeout(()=>$('refreshBtn')?.click(),400);
    }catch(error){msg(error?.message||String(error),'err');}
  }

  async function resetMenu(){
    if(!canManage()){msg('ليس لديك صلاحية حذف المنيو.','err');return;}
    const r=await tenant();const typed=prompt(`هذا يحذف الأقسام والأصناف والخيارات فقط من ${r.name}.\nاكتب slug المطعم للتأكيد: ${r.slug}`);
    if(String(typed||'').trim().toLowerCase()!==String(r.slug).toLowerCase()){msg('تم إلغاء الحذف.');return;}
    msg('جاري حذف محتوى المنيو داخل عملية واحدة...');
    try{
      const {data,error}=await sb.rpc('owner_clear_restaurant_menu',{p_restaurant_id:r.id});if(error)throw error;
      msg(`تم حذف محتوى المنيو ✓ ${Number(data?.deleted_categories||0)} قسم • ${Number(data?.deleted_products||0)} صنف • ${Number(data?.deleted_options||0)} خيار`,'ok');
      setTimeout(()=>$('refreshBtn')?.click(),400);
    }catch(error){msg('لم يكتمل الحذف: '+(error?.message||String(error)),'err');}
  }

  function boot(){styles();inject();const view=$('view-settings');if(view)new MutationObserver(inject).observe(view,{childList:true,subtree:true});console.log('✅ RESTBR Backup/Restore V2.1 ready — atomic restore');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

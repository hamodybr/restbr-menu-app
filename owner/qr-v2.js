// ============================================================
// RESTBR OWNER QR V2.1
// High-resolution tenant QR + iPhone-safe PNG save/share flow.
// ============================================================
(() => {
  'use strict';
  const cfg=window.RESTBR_OWNER_CONFIG||{};
  if(!cfg.supabaseUrl||!cfg.publishableKey||!window.supabase)return;
  const sb=window.RESTBR_OWNER_V2_CLIENT||window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const $=id=>document.getElementById(id);
  const state={tenantId:null,slug:'',urls:[],dataUrl:''};
  let qrModulePromise=null;

  async function tenant(){
    if(state.tenantId)return {id:state.tenantId,slug:state.slug};
    const host=location.hostname.toLowerCase().replace(/^www\./,'');
    if(host==='hamodybr.github.io'){
      const slug=String(new URLSearchParams(location.search).get('tenant')||'').trim().toLowerCase();
      if(!slug)throw new Error('tenant missing');
      const {data,error}=await sb.from('restaurants').select('id,slug').eq('slug',slug).maybeSingle();if(error)throw error;if(!data?.id)throw new Error('restaurant not found');state.tenantId=data.id;state.slug=data.slug||slug||'';return data;
    }
    const {data,error}=await sb.from('restaurant_domains').select('restaurant_id,restaurants!inner(slug)').eq('hostname',host).eq('status','active').eq('is_verified',true).maybeSingle();if(error)throw error;if(!data?.restaurant_id)throw new Error('restaurant domain not found');state.tenantId=data.restaurant_id;state.slug=data.restaurants?.slug||'';return {id:state.tenantId,slug:state.slug};
  }

  function styles(){
    if($('rbQrStyles'))return;const s=document.createElement('style');s.id='rbQrStyles';s.textContent=`
      .rb-qr-modal{position:fixed;z-index:168;inset:0;display:grid;place-items:center;padding:14px;background:rgba(0,0,0,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}.rb-qr-card{width:min(520px,100%);max-height:92dvh;overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:24px;padding:16px;box-shadow:0 30px 90px rgba(0,0,0,.5)}.rb-qr-head{display:flex;justify-content:space-between;gap:8px}.rb-qr-head h3{margin:0}.rb-qr-head p{margin:4px 0 0;color:var(--muted);font-size:10px;line-height:1.5}.rb-qr-close{width:38px;height:38px;border:1px solid var(--line);border-radius:12px;background:var(--panel2);color:var(--text);font-size:20px}.rb-qr-select{width:100%;margin:12px 0 8px;border:1px solid var(--line);border-radius:11px;background:var(--input);color:var(--text);padding:10px;font-size:14px;direction:ltr}.rb-qr-preview{min-height:260px;display:grid;place-items:center;padding:14px;border:1px solid var(--line);border-radius:18px;background:#fff}.rb-qr-preview img{width:min(320px,100%);height:auto;display:block}.rb-qr-url{direction:ltr;text-align:center;word-break:break-all;color:var(--muted);font-size:9px;margin-top:8px}.rb-qr-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:11px}.rb-qr-actions button{min-height:40px}.rb-qr-msg{min-height:18px;color:var(--muted);font-size:9px;margin-top:7px;line-height:1.55}.rb-qr-msg.err{color:var(--danger)}.rb-qr-msg.ok{color:var(--ok)}@media(max-width:520px){.rb-qr-actions{grid-template-columns:1fr}.rb-qr-preview{min-height:230px}}
    `;document.head.appendChild(s);
  }

  function ensureModal(){
    let modal=$('rbQrModal');if(modal)return modal;modal=document.createElement('div');modal.id='rbQrModal';modal.className='rb-qr-modal';modal.hidden=true;modal.innerHTML=`<div class="rb-qr-card"><div class="rb-qr-head"><div><h3>▦ QR المنيو</h3><p>يستخدم فقط الدومينات Active + Verified. على iPhone زر الحفظ يفتح Share Sheet حتى تختار حفظ الصورة أو الملفات.</p></div><button id="rbQrClose" class="rb-qr-close" type="button">×</button></div><select id="rbQrUrl" class="rb-qr-select"></select><div id="rbQrPreview" class="rb-qr-preview"><span style="color:#777;font-size:11px">جاري إنشاء QR...</span></div><div id="rbQrText" class="rb-qr-url"></div><div class="rb-qr-actions"><button id="rbQrDownload" class="btn primary" type="button">حفظ PNG</button><button id="rbQrCopy" class="btn" type="button">نسخ الرابط</button><button id="rbQrPrint" class="btn" type="button">طباعة</button></div><div id="rbQrMsg" class="rb-qr-msg"></div></div>`;document.body.appendChild(modal);modal.onclick=e=>{if(e.target===modal)close();};$('rbQrClose').onclick=close;$('rbQrUrl').onchange=generate;$('rbQrDownload').onclick=()=>void download();$('rbQrCopy').onclick=copy;$('rbQrPrint').onclick=printQr;return modal;
  }

  function msg(text,type=''){const el=$('rbQrMsg');if(!el)return;el.textContent=text||'';el.className='rb-qr-msg'+(type?' '+type:'');}
  function close(){const m=$('rbQrModal');if(m)m.hidden=true;document.body.style.overflow='';}
  function qrModule(){if(!qrModulePromise)qrModulePromise=import('https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm');return qrModulePromise;}

  async function loadUrls(){
    const t=await tenant();const {data,error}=await sb.from('restaurant_domains').select('hostname,is_primary,kind').eq('restaurant_id',t.id).eq('status','active').eq('is_verified',true).order('is_primary',{ascending:false});if(error)throw error;
    const domains=(data||[]).map(row=>({url:`https://${row.hostname}/`,label:`${row.hostname}${row.is_primary?' • Primary':''}`}));
    if(!domains.length&&t.slug)domains.push({url:`https://${t.slug}.restbr.com/`,label:`${t.slug}.restbr.com`});
    state.urls=domains;const select=$('rbQrUrl');select.innerHTML=domains.map((row,i)=>`<option value="${i}">${row.label}</option>`).join('');if(!domains.length)throw new Error('لا يوجد دومين Active + Verified لهذا المطعم.');
  }

  async function generate(){
    const item=state.urls[Number($('rbQrUrl').value)||0];if(!item)return;msg('جاري إنشاء QR...');$('rbQrText').textContent=item.url;
    try{const QR=await qrModule();state.dataUrl=await QR.toDataURL(item.url,{width:1024,margin:3,errorCorrectionLevel:'H',color:{dark:'#080604',light:'#ffffff'}});$('rbQrPreview').innerHTML=`<img src="${state.dataUrl}" alt="QR Menu">`;msg('QR جاهز بدقة 1024px ✓','ok');}
    catch(error){state.dataUrl='';$('rbQrPreview').innerHTML='<span style="color:#b33;font-size:11px">تعذر إنشاء QR.</span>';msg(error?.message||'تعذر تحميل QR library.','err');}
  }

  async function open(){ensureModal().hidden=false;document.body.style.overflow='hidden';state.dataUrl='';$('rbQrPreview').innerHTML='<span style="color:#777;font-size:11px">جاري إنشاء QR...</span>';msg('');try{await loadUrls();await generate();}catch(error){msg(error?.message||String(error),'err');}}

  async function download(){
    if(!state.dataUrl){msg('أنشئ QR أولاً.','err');return;}
    const host=state.urls[Number($('rbQrUrl').value)||0]?.label?.split(' • ')[0]||'restbr-menu';
    const filename=`${host.replace(/[^a-z0-9.-]+/gi,'-')}-qr.png`;
    try{
      const blob=await (await fetch(state.dataUrl)).blob();
      const file=new File([blob],filename,{type:'image/png'});

      // iOS Safari does not reliably honor <a download> for data/blob URLs.
      // Web Share with a file opens the native sheet where Save Image / Save
      // to Files works consistently. Desktop browsers keep normal download.
      if(navigator.canShare?.({files:[file]}) && navigator.share){
        await navigator.share({files:[file],title:'RESTBR Menu QR'});
        msg('تم فتح خيارات الحفظ/المشاركة ✓','ok');
        return;
      }

      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download=filename;a.rel='noopener';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);msg('تم تجهيز ملف PNG ✓','ok');
    }catch(error){
      if(error?.name==='AbortError'){msg('تم إغلاق نافذة الحفظ.');return;}
      // Last-resort Safari fallback: open the rendered PNG itself so the user
      // can use the native image save gesture.
      try{const w=window.open(state.dataUrl,'_blank','noopener');if(w){msg('فتحنا صورة QR في تبويب جديد؛ استخدم حفظ الصورة.','ok');return;}}catch(_){}
      msg(error?.message||'تعذر حفظ PNG.','err');
    }
  }

  async function copy(){const item=state.urls[Number($('rbQrUrl').value)||0];if(!item)return;try{await navigator.clipboard.writeText(item.url);msg('تم نسخ الرابط ✓','ok');}catch(_){msg('تعذر النسخ التلقائي.','err');}}
  function printQr(){if(!state.dataUrl)return;const item=state.urls[Number($('rbQrUrl').value)||0];const w=window.open('','_blank','noopener');if(!w){msg('المتصفح منع نافذة الطباعة.','err');return;}w.document.write(`<!doctype html><title>RESTBR QR</title><style>body{font-family:Arial;text-align:center;padding:40px}img{width:420px;max-width:90vw}p{font-size:14px;word-break:break-all}</style><img src="${state.dataUrl}"><p>${item?.url||''}</p><script>onload=()=>print()<\/script>`);w.document.close();}

  function injectButton(){if($('rbQrOpen'))return;const grid=$('view-home')?.querySelector('.grid2');if(!grid)return;const button=document.createElement('button');button.id='rbQrOpen';button.className='btn';button.type='button';button.textContent='▦ QR المنيو';button.onclick=open;grid.appendChild(button);}
  function boot(){styles();ensureModal();injectButton();const home=$('view-home');if(home)new MutationObserver(injectButton).observe(home,{childList:true,subtree:true});console.log('✅ RESTBR Owner QR V2.1 ready');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

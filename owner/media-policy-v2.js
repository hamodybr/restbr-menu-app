// ============================================================
// RESTBR OWNER MEDIA POLICY V2.0
// Client-side image optimization + upload limits.
// Product images: target WebP <= 2 MB, max 1600px.
// Logo: target WebP <= 1 MB, max 1200px.
// Background video: <= 12 MB, <= 20 seconds, <= 1920px long edge.
// ============================================================
(() => {
  'use strict';

  const MB=1024*1024;
  const specs={
    mpImageFile:{kind:'image',label:'صورة الصنف',maxBytes:2*MB,maxSourceBytes:14*MB,maxDim:1600,quality:.82},
    logoFile:{kind:'image',label:'الشعار',maxBytes:1*MB,maxSourceBytes:8*MB,maxDim:1200,quality:.90},
    backgroundFile:{kind:'video',label:'فيديو الخلفية',maxBytes:12*MB,maxDuration:20,maxLongEdge:1920}
  };

  function noteFor(input){
    const id=`rbMediaNote-${input.id}`;
    let note=document.getElementById(id);
    if(!note){
      note=document.createElement('div');
      note.id=id;
      note.style.cssText='font-size:10px;line-height:1.5;margin-top:5px;color:var(--muted)';
      input.insertAdjacentElement('afterend',note);
    }
    return note;
  }

  function setNote(input,text,type=''){
    const note=noteFor(input);
    note.textContent=text||'';
    note.style.color=type==='err'?'var(--danger)':type==='ok'?'var(--ok)':'var(--muted)';
  }

  function format(bytes){return `${(bytes/MB).toFixed(bytes>=MB?2:3)} MB`;}

  function dataTransferFile(input,file){
    try{
      const dt=new DataTransfer();
      dt.items.add(file);
      input.files=dt.files;
      return true;
    }catch(_){return false;}
  }

  function loadImage(file){
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file);
      const img=new Image();
      img.onload=()=>{URL.revokeObjectURL(url);resolve(img);};
      img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('تعذر قراءة الصورة.'));};
      img.src=url;
    });
  }

  function canvasBlob(canvas,type,quality){
    return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('تعذر ضغط الصورة.')),type,quality));
  }

  async function optimizeImage(input,file,spec){
    if(file.size>spec.maxSourceBytes){
      input.value='';
      throw new Error(`${spec.label}: الملف الأصلي أكبر من ${format(spec.maxSourceBytes)}.`);
    }

    const img=await loadImage(file);
    const scale=Math.min(1,spec.maxDim/Math.max(img.naturalWidth,img.naturalHeight));
    const width=Math.max(1,Math.round(img.naturalWidth*scale));
    const height=Math.max(1,Math.round(img.naturalHeight*scale));
    const canvas=document.createElement('canvas');
    canvas.width=width; canvas.height=height;
    const ctx=canvas.getContext('2d',{alpha:true});
    ctx.drawImage(img,0,0,width,height);

    let quality=spec.quality;
    let blob=await canvasBlob(canvas,'image/webp',quality);
    while(blob.size>spec.maxBytes && quality>.55){
      quality-=.07;
      blob=await canvasBlob(canvas,'image/webp',quality);
    }
    if(blob.size>spec.maxBytes){
      input.value='';
      throw new Error(`${spec.label}: حتى بعد الضغط بقي الحجم أكبر من ${format(spec.maxBytes)}.`);
    }

    const base=String(file.name||'image').replace(/\.[^.]+$/,'').replace(/[^a-zA-Z0-9_-]+/g,'-')||'image';
    const optimized=new File([blob],`${base}.webp`,{type:'image/webp',lastModified:Date.now()});
    if(!dataTransferFile(input,optimized)){
      if(file.size>spec.maxBytes){
        input.value='';
        throw new Error('هذا المتصفح لا يسمح باستبدال الملف المضغوط تلقائياً. اختر صورة أصغر من الحد المسموح.');
      }
      setNote(input,`الصورة صالحة (${format(file.size)}). الضغط التلقائي غير مدعوم في هذا المتصفح.`,'ok');
      return;
    }
    setNote(input,`تم تحسين ${spec.label}: ${img.naturalWidth}×${img.naturalHeight} → ${width}×${height} • ${format(file.size)} → ${format(optimized.size)}`,'ok');
  }

  function readVideo(file){
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file);
      const video=document.createElement('video');
      video.preload='metadata';
      video.onloadedmetadata=()=>{
        const out={duration:Number(video.duration||0),width:video.videoWidth||0,height:video.videoHeight||0};
        URL.revokeObjectURL(url); resolve(out);
      };
      video.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('تعذر قراءة معلومات الفيديو.'));};
      video.src=url;
    });
  }

  async function validateVideo(input,file,spec){
    if(file.size>spec.maxBytes){input.value='';throw new Error(`${spec.label}: الحد الأعلى ${format(spec.maxBytes)}.`);}
    const meta=await readVideo(file);
    if(meta.duration>spec.maxDuration+.1){input.value='';throw new Error(`${spec.label}: الحد الأعلى ${spec.maxDuration} ثانية.`);}
    if(Math.max(meta.width,meta.height)>spec.maxLongEdge){input.value='';throw new Error(`${spec.label}: استخدم فيديو 1080p أو أقل (أطول ضلع ≤ ${spec.maxLongEdge}px).`);}
    setNote(input,`الفيديو صالح: ${format(file.size)} • ${meta.duration.toFixed(1)} ثانية • ${meta.width}×${meta.height}`,'ok');
  }

  async function onChange(input,spec){
    const file=input.files?.[0];
    if(!file){setNote(input,'');return;}
    setNote(input,'جاري فحص الملف...');
    try{
      if(spec.kind==='image') await optimizeImage(input,file,spec);
      else await validateVideo(input,file,spec);
    }catch(error){
      setNote(input,error?.message||String(error),'err');
      alert(error?.message||String(error));
    }
  }

  function bind(input){
    if(!input||input.dataset.rbMediaBound==='1')return;
    const spec=specs[input.id]; if(!spec)return;
    input.dataset.rbMediaBound='1';
    input.addEventListener('change',()=>void onChange(input,spec));
    if(spec.kind==='image') setNote(input,`${spec.label}: ضغط تلقائي WebP • الحد النهائي ${format(spec.maxBytes)}.`);
    else setNote(input,`${spec.label}: حد ${format(spec.maxBytes)} • ${spec.maxDuration} ثانية • 1080p أو أقل.`);
  }

  function scan(){Object.keys(specs).forEach(id=>bind(document.getElementById(id)));}
  function boot(){scan();new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});console.log('✅ RESTBR Owner Media Policy V2.0 ready');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

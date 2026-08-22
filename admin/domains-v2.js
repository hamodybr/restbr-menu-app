// ============================================================
// RESTBR SUPER ADMIN DOMAINS V2.0
// Manages platform/custom domain records through existing RLS.
// Custom domains are created PENDING and never auto-verified without DNS/
// Cloudflare verification.
// ============================================================
(() => {
  'use strict';

  let sb=null;
  const $=id=>document.getElementById(id);
  const state={restaurantId:null,name:'',rows:[]};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  async function client(){
    if(sb)return sb;
    const response=await fetch('/_restbr/platform-config',{headers:{Accept:'application/json'},cache:'no-store'});
    const config=await response.json().catch(()=>({}));
    if(!response.ok||!config?.ok)throw new Error(config?.message||'تعذر تحميل إعدادات RESTBR.');
    sb=window.supabase.createClient(config.supabase_url,config.publishable_key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return sb;
  }

  function normalizeHostname(value){
    let text=String(value||'').trim().toLowerCase();
    if(!text)return '';
    try{if(text.includes('://'))text=new URL(text).hostname.toLowerCase();}catch(_){}
    text=text.replace(/^https?:\/\//,'').split('/')[0].split(':')[0].replace(/^\.+|\.+$/g,'');
    return text;
  }

  function validHostname(host){
    if(!host||host.length>253||host.endsWith('.restbr.com')||host==='restbr.com')return false;
    return host.split('.').length>=2 && host.split('.').every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
  }

  function styles(){
    if($('rbDomainsStyles'))return;
    const s=document.createElement('style');s.id='rbDomainsStyles';s.textContent=`
      .rb-dom-modal{position:fixed;z-index:127;inset:0;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.7);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
      .rb-dom-card{width:min(650px,100%);max-height:90dvh;overflow:auto;border:1px solid rgba(255,255,255,.12);border-radius:23px;background:#11100e;color:#f8f4ed;padding:16px;box-shadow:0 30px 90px rgba(0,0,0,.5)}html[data-theme="light"] .rb-dom-card{background:#fff;color:#191713}.rb-dom-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.rb-dom-head h3{margin:0}.rb-dom-head p{margin:4px 0 0;color:#9b9389;font-size:10px;line-height:1.5}.rb-dom-close{width:38px;height:38px;border:1px solid rgba(255,255,255,.12);border-radius:11px;background:transparent;color:inherit;font-size:20px}
      .rb-dom-add{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;margin:12px 0}.rb-dom-add input{width:100%;border:1px solid rgba(255,255,255,.12);border-radius:11px;background:rgba(0,0,0,.18);color:inherit;padding:11px;font-size:16px}.rb-dom-add button,.rb-dom-row button{border:1px solid rgba(216,169,88,.3);border-radius:10px;background:rgba(216,169,88,.08);color:#d8a958;padding:8px 10px;font-weight:800}.rb-dom-note{padding:9px;border:1px solid rgba(216,169,88,.22);border-radius:11px;background:rgba(216,169,88,.05);font-size:9px;color:#9b9389;line-height:1.65;margin-bottom:10px}.rb-dom-list{display:grid;gap:7px}.rb-dom-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;align-items:center;border:1px solid rgba(255,255,255,.1);border-radius:13px;padding:10px;background:rgba(255,255,255,.035)}.rb-dom-row strong{display:block;direction:ltr;text-align:left;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rb-dom-row small{color:#9b9389;font-size:9px}.rb-dom-state{font-size:9px;padding:4px 7px;border:1px solid rgba(255,255,255,.12);border-radius:999px;color:#9b9389}.rb-dom-state.active{color:#4ade80}.rb-dom-state.pending{color:#d8a958}.rb-dom-msg{min-height:18px;font-size:10px;color:#9b9389;margin-top:8px}.rb-dom-msg.err{color:#ef6b6b}.rb-dom-msg.ok{color:#4ade80}
      @media(max-width:600px){.rb-dom-add{grid-template-columns:1fr}.rb-dom-row{grid-template-columns:minmax(0,1fr) auto}.rb-dom-row .rb-dom-state{grid-column:2}.rb-dom-row button{grid-column:1/-1}}
    `;document.head.appendChild(s);
  }

  function ensureModal(){
    let modal=$('rbDomainsModal');if(modal)return modal;
    modal=document.createElement('div');modal.id='rbDomainsModal';modal.className='rb-dom-modal';modal.hidden=true;
    modal.innerHTML=`<div class="rb-dom-card"><div class="rb-dom-head"><div><h3 id="rbDomainsTitle">دومينات المطعم</h3><p>Platform subdomain يُنشأ تلقائيًا. Custom domain يبدأ Pending إلى أن يتم إعداد DNS/Cloudflare والتحقق منه فعليًا.</p></div><button id="rbDomainsClose" class="rb-dom-close" type="button">×</button></div><div class="rb-dom-add"><input id="rbDomainInput" dir="ltr" placeholder="menu.restaurant.com"><button id="rbDomainAdd" type="button">+ إضافة Custom Domain</button></div><div class="rb-dom-note">RESTBR لن يضع <b>is_verified=true</b> تلقائيًا من هذه الشاشة. هذا يمنع تفعيل دومين لم يمر بتحقق DNS/Cloudflare بعد.</div><div id="rbDomainsList" class="rb-dom-list"></div><div id="rbDomainsMsg" class="rb-dom-msg"></div></div>`;
    document.body.appendChild(modal);modal.onclick=e=>{if(e.target===modal)close();};$('rbDomainsClose').onclick=close;$('rbDomainAdd').onclick=addDomain;return modal;
  }

  function msg(text,type=''){const el=$('rbDomainsMsg');if(!el)return;el.textContent=text||'';el.className='rb-dom-msg'+(type?' '+type:'');}
  function close(){const modal=$('rbDomainsModal');if(modal)modal.hidden=true;document.body.style.overflow='';}

  function render(){
    const list=$('rbDomainsList');
    if(!state.rows.length){list.innerHTML='<div class="rb-dom-note">لا توجد دومينات مسجلة.</div>';return;}
    list.innerHTML=state.rows.map(row=>`<div class="rb-dom-row"><div><strong>${esc(row.hostname)}</strong><small>${row.kind==='platform_subdomain'?'RESTBR subdomain':'Custom domain'}${row.is_primary?' • Primary':''}${row.is_verified?' • Verified':''}</small></div><span class="rb-dom-state ${esc(row.status)}">${esc(row.status)}</span>${row.kind==='custom_domain'?`<button type="button" data-domain-delete="${row.id}" data-domain-host="${esc(row.hostname)}">حذف</button>`:'<span></span>'}</div>`).join('');
    list.querySelectorAll('[data-domain-delete]').forEach(button=>button.onclick=()=>deleteDomain(button.dataset.domainDelete,button.dataset.domainHost));
  }

  async function load(){
    msg('جاري تحميل الدومينات...');
    try{
      const c=await client();const {data,error}=await c.from('restaurant_domains').select('id,restaurant_id,hostname,kind,status,is_verified,is_primary,verified_at,created_at').eq('restaurant_id',state.restaurantId).order('is_primary',{ascending:false}).order('created_at',{ascending:true});if(error)throw error;state.rows=data||[];render();msg('');
    }catch(error){state.rows=[];render();msg(error?.message||String(error),'err');}
  }

  async function open(id,name){state.restaurantId=id;state.name=name||'المطعم';ensureModal().hidden=false;document.body.style.overflow='hidden';$('rbDomainsTitle').textContent=`دومينات ${state.name}`;$('rbDomainInput').value='';await load();}

  async function addDomain(){
    const host=normalizeHostname($('rbDomainInput').value);if(!validHostname(host)){msg('اكتب Custom Domain صالح مثل menu.restaurant.com، وليس subdomain من restbr.com.','err');return;}
    const button=$('rbDomainAdd');button.disabled=true;msg('جاري إضافة الدومين كـ Pending...');
    try{
      const c=await client();const {error}=await c.from('restaurant_domains').insert({restaurant_id:state.restaurantId,hostname:host,kind:'custom_domain',status:'pending',is_verified:false,is_primary:false});if(error)throw error;$('rbDomainInput').value='';msg('تم تسجيل الدومين كـ Pending. بقي إعداد DNS/Cloudflare والتحقق.','ok');await load();
    }catch(error){msg(error?.message||String(error),'err');}
    finally{button.disabled=false;}
  }

  async function deleteDomain(id,host){
    const row=state.rows.find(x=>x.id===id);if(!row||row.kind!=='custom_domain')return;
    if(!confirm(`حذف ${host} من RESTBR؟${row.status==='active'||row.is_verified?'\nهذا الدومين يبدو مفعلاً؛ تأكد أنك تريد فصل الرابط.':''}`))return;
    try{const c=await client();const {error}=await c.from('restaurant_domains').delete().eq('id',id).eq('restaurant_id',state.restaurantId);if(error)throw error;msg('تم حذف سجل الدومين ✓','ok');await load();}catch(error){msg(error?.message||String(error),'err');}
  }

  function inject(){
    document.querySelectorAll('.restaurant-card').forEach(card=>{
      if(card.querySelector('[data-rb-domains]'))return;const id=card.dataset.id;const actions=card.querySelector('.card-actions');if(!id||!actions)return;
      const button=document.createElement('button');button.className='mini-btn';button.type='button';button.dataset.rbDomains='1';button.textContent='الدومينات';button.onclick=()=>open(id,card.querySelector('h4')?.textContent||'');actions.appendChild(button);
    });
  }

  function boot(){styles();ensureModal();inject();const list=$('restaurantList');if(list)new MutationObserver(inject).observe(list,{childList:true,subtree:true});console.log('✅ RESTBR Super Admin Domains V2.0 ready');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

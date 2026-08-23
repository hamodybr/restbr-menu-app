// ============================================================
// RESTBR OWNER AUDIT V2.0
// Read-only tenant change history backed by audit_logs RLS.
// ============================================================
(() => {
  'use strict';

  const cfg=window.RESTBR_OWNER_CONFIG||{};
  if(!cfg.supabaseUrl||!cfg.publishableKey||!window.supabase)return;
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const $=id=>document.getElementById(id);
  const state={tenantId:null,rows:[],currentUserId:null,table:'',action:''};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const tableLabels={restaurants:'المطعم',restaurant_settings:'إعدادات المطعم',categories:'قسم',products:'صنف',product_options:'خيار',restaurant_domains:'دومين',restaurant_members:'عضو',subscriptions:'اشتراك'};
  const actionLabels={INSERT:'إضافة',UPDATE:'تعديل',DELETE:'حذف'};

  async function tenantId(){
    if(state.tenantId)return state.tenantId;
    const host=location.hostname.toLowerCase().replace(/^www\./,'');
    if(host==='hamodybr.github.io'){
      const slug=new URLSearchParams(location.search).get('tenant');
      const {data,error}=await sb.from('restaurants').select('id').eq('slug',slug).maybeSingle();
      if(error)throw error;if(!data?.id)throw new Error('restaurant not found');return state.tenantId=data.id;
    }
    const {data,error}=await sb.from('restaurant_domains').select('restaurant_id').eq('hostname',host).eq('status','active').eq('is_verified',true).maybeSingle();
    if(error)throw error;if(!data?.restaurant_id)throw new Error('restaurant domain not found');return state.tenantId=data.restaurant_id;
  }

  function styles(){
    if($('rbAuditStyles'))return;
    const s=document.createElement('style');s.id='rbAuditStyles';s.textContent=`
      .rb-audit-modal{position:fixed;z-index:172;inset:0;display:grid;place-items:end center;padding:9px;background:rgba(0,0,0,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
      .rb-audit-card{width:min(900px,100%);max-height:93dvh;overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:25px;padding:15px;box-shadow:0 30px 90px rgba(0,0,0,.5)}
      .rb-audit-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.rb-audit-head h3{margin:0}.rb-audit-head p{margin:4px 0 0;color:var(--muted);font-size:10px}.rb-audit-close{width:38px;height:38px;border:1px solid var(--line);border-radius:12px;background:var(--panel2);color:var(--text);font-size:20px}
      .rb-audit-tools{display:grid;grid-template-columns:1fr 1fr auto;gap:7px;margin:11px 0}.rb-audit-tools select,.rb-audit-tools button{border:1px solid var(--line);border-radius:11px;background:var(--panel2);color:var(--text);padding:9px;font-size:11px}.rb-audit-list{display:grid;gap:7px}.rb-audit-row{border:1px solid var(--line);border-radius:14px;background:var(--panel2);padding:10px}.rb-audit-top{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:center}.rb-audit-action{padding:4px 7px;border-radius:999px;border:1px solid rgba(216,169,88,.25);color:var(--gold);font-size:9px;font-weight:900}.rb-audit-title{font-weight:900;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rb-audit-time{font-size:9px;color:var(--muted);direction:ltr}.rb-audit-sub{font-size:9px;color:var(--muted);margin-top:6px;line-height:1.6}.rb-audit-row details{margin-top:7px}.rb-audit-row summary{cursor:pointer;color:var(--gold);font-size:9px}.rb-audit-json{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:7px}.rb-audit-json pre{margin:0;max-height:260px;overflow:auto;direction:ltr;text-align:left;white-space:pre-wrap;word-break:break-word;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:8px;font-size:8px;color:var(--muted)}.rb-audit-empty{text-align:center;color:var(--muted);padding:24px;font-size:11px}.rb-audit-msg{min-height:18px;color:var(--muted);font-size:9px;margin-top:7px}.rb-audit-msg.err{color:var(--danger)}
      @media(max-width:650px){.rb-audit-tools{grid-template-columns:1fr 1fr}.rb-audit-tools button{grid-column:1/-1}.rb-audit-json{grid-template-columns:1fr}.rb-audit-card{border-radius:22px 22px 12px 12px}.rb-audit-top{grid-template-columns:auto minmax(0,1fr)}.rb-audit-time{grid-column:1/-1}}
    `;document.head.appendChild(s);
  }

  function ensureModal(){
    let modal=$('rbAuditModal');if(modal)return modal;
    modal=document.createElement('div');modal.id='rbAuditModal';modal.className='rb-audit-modal';modal.hidden=true;
    modal.innerHTML=`<div class="rb-audit-card"><div class="rb-audit-head"><div><h3>🧾 سجل التغييرات</h3><p>سجل قراءة فقط. Owner/Manager يشوفان تغييرات مطعمهما، وPlatform Admin يشوف عند دخوله للمطعم.</p></div><button id="rbAuditClose" class="rb-audit-close" type="button">×</button></div><div class="rb-audit-tools"><select id="rbAuditTable"><option value="">كل الأجزاء</option>${Object.entries(tableLabels).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select><select id="rbAuditAction"><option value="">كل العمليات</option><option value="INSERT">إضافة</option><option value="UPDATE">تعديل</option><option value="DELETE">حذف</option></select><button id="rbAuditRefresh" type="button">↻ تحديث</button></div><div id="rbAuditList" class="rb-audit-list"></div><div id="rbAuditMsg" class="rb-audit-msg"></div></div>`;
    document.body.appendChild(modal);modal.onclick=e=>{if(e.target===modal)close();};$('rbAuditClose').onclick=close;$('rbAuditRefresh').onclick=load;$('rbAuditTable').onchange=()=>{state.table=$('rbAuditTable').value;render();};$('rbAuditAction').onchange=()=>{state.action=$('rbAuditAction').value;render();};return modal;
  }

  function msg(text,type=''){const el=$('rbAuditMsg');if(!el)return;el.textContent=text||'';el.className='rb-audit-msg'+(type?' '+type:'');}
  function close(){const modal=$('rbAuditModal');if(modal)modal.hidden=true;document.body.style.overflow='';}
  function cleanJson(value){if(!value||typeof value!=='object')return value;const next={...value};delete next.updated_at;return next;}
  function changedKeys(row){
    if(row.action!=='UPDATE')return [];
    const before=cleanJson(row.old_data)||{},after=cleanJson(row.new_data)||{};const keys=new Set([...Object.keys(before),...Object.keys(after)]);return [...keys].filter(key=>JSON.stringify(before[key])!==JSON.stringify(after[key]));
  }
  function actorLabel(row){if(!row.actor_user_id)return 'System';if(row.actor_user_id===state.currentUserId)return 'أنت';return `User ${String(row.actor_user_id).slice(0,8)}…`;}
  function timeLabel(value){try{return new Date(value).toLocaleString('ar-IQ',{dateStyle:'short',timeStyle:'short'});}catch(_){return value||'';}}

  function render(){
    const rows=state.rows.filter(row=>(!state.table||row.table_name===state.table)&&(!state.action||row.action===state.action));const list=$('rbAuditList');
    if(!rows.length){list.innerHTML='<div class="rb-audit-empty">لا توجد تغييرات مطابقة بعد.</div>';return;}
    list.innerHTML=rows.map(row=>{
      const keys=changedKeys(row);const before=row.old_data?JSON.stringify(row.old_data,null,2):'—';const after=row.new_data?JSON.stringify(row.new_data,null,2):'—';
      return `<article class="rb-audit-row"><div class="rb-audit-top"><span class="rb-audit-action">${actionLabels[row.action]||esc(row.action)}</span><div class="rb-audit-title">${tableLabels[row.table_name]||esc(row.table_name)} • ${esc(row.record_id||'')}</div><time class="rb-audit-time">${esc(timeLabel(row.created_at))}</time></div><div class="rb-audit-sub">بواسطة: ${esc(actorLabel(row))}${keys.length?` • الحقول: ${keys.slice(0,8).map(esc).join('، ')}${keys.length>8?'…':''}`:''}</div><details><summary>عرض التفاصيل قبل / بعد</summary><div class="rb-audit-json"><pre>${esc(before)}</pre><pre>${esc(after)}</pre></div></details></article>`;
    }).join('');
  }

  async function load(){
    msg('جاري تحميل آخر 150 تغيير...');
    try{
      const access=window.RESTBR_OWNER_ACCESS;if(access && !access.canManageSettings){throw new Error('سجل التغييرات متاح للـ Owner وManager فقط.');}
      const rid=await tenantId();const {data:{session}}=await sb.auth.getSession();state.currentUserId=session?.user?.id||null;
      const {data,error}=await sb.from('audit_logs').select('id,restaurant_id,actor_user_id,table_name,record_id,action,old_data,new_data,created_at').eq('restaurant_id',rid).order('created_at',{ascending:false}).limit(150);if(error)throw error;state.rows=data||[];render();msg(`${state.rows.length} سجل • آخر تحديث ${new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}`);
    }catch(error){state.rows=[];render();msg(error?.message||String(error),'err');}
  }

  function open(){ensureModal().hidden=false;document.body.style.overflow='hidden';void load();}
  function injectButton(){
    if($('rbAuditOpen'))return;const grid=$('view-home')?.querySelector('.grid2');if(!grid)return;const button=document.createElement('button');button.id='rbAuditOpen';button.className='btn';button.type='button';button.textContent='🧾 سجل التغييرات';button.onclick=open;grid.appendChild(button);
    const access=window.RESTBR_OWNER_ACCESS;if(access)button.disabled=!access.canManageSettings;
  }

  function boot(){styles();ensureModal();injectButton();window.addEventListener('restbr:owner-access',event=>{injectButton();if($('rbAuditOpen'))$('rbAuditOpen').disabled=!event.detail?.canManageSettings;});const home=$('view-home');if(home)new MutationObserver(injectButton).observe(home,{childList:true,subtree:true});console.log('✅ RESTBR Owner Audit V2.0 ready');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

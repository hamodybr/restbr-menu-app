// ============================================================
// RESTBR OWNER TENANT RECOVERY V2.0
// Repairs direct GitHub Pages Owner access when ?tenant= is missing.
// ============================================================
(() => {
  'use strict';

  if(location.hostname.toLowerCase().replace(/^www\./,'')!=='hamodybr.github.io')return;
  const params=new URLSearchParams(location.search);
  const existing=String(params.get('tenant')||'').trim().toLowerCase();
  if(existing){
    try{localStorage.setItem('RESTBR_OWNER_LAST_TENANT',existing);}catch(_){}
    return;
  }

  const sb=window.RESTBR_OWNER_V2_CLIENT;
  if(!sb)return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function go(slug){
    const clean=String(slug||'').trim().toLowerCase();
    if(!clean)return;
    try{localStorage.setItem('RESTBR_OWNER_LAST_TENANT',clean);}catch(_){}
    const url=new URL(location.href);url.searchParams.set('tenant',clean);location.replace(url.toString());
  }

  function styles(){
    if(document.getElementById('rbTenantRecoveryStyles'))return;
    const s=document.createElement('style');s.id='rbTenantRecoveryStyles';s.textContent=`
      .rb-tenant-recovery{position:fixed;z-index:240;inset:0;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.86);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
      .rb-tenant-recovery-card{width:min(470px,100%);max-height:86dvh;overflow:auto;background:var(--panel,#11100e);color:var(--text,#f8f4ed);border:1px solid var(--line,rgba(255,255,255,.12));border-radius:24px;padding:17px;box-shadow:0 30px 90px rgba(0,0,0,.55)}
      .rb-tenant-recovery-card h3{margin:0 0 5px}.rb-tenant-recovery-card p{margin:0 0 12px;color:var(--muted,#9b9389);font-size:11px;line-height:1.7}
      .rb-tenant-list{display:grid;gap:8px}.rb-tenant-choice{width:100%;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;text-align:start;border:1px solid var(--line,rgba(255,255,255,.12));border-radius:14px;background:var(--panel2,#171512);color:inherit;padding:11px 12px}
      .rb-tenant-choice strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rb-tenant-choice small{color:var(--gold,#d8a958);direction:ltr}.rb-tenant-msg{color:var(--muted,#9b9389);font-size:11px;padding:12px;text-align:center}
    `;document.head.appendChild(s);
  }

  function chooser(rows){
    styles();
    let root=document.getElementById('rbTenantRecovery');
    if(!root){root=document.createElement('div');root.id='rbTenantRecovery';root.className='rb-tenant-recovery';document.body.appendChild(root);}
    root.innerHTML=`<div class="rb-tenant-recovery-card"><h3>اختر المطعم</h3><p>فتحت Owner Dashboard بدون تحديد مطعم. اختر المطعم الذي تريد إدارته.</p><div class="rb-tenant-list">${rows.map(r=>`<button class="rb-tenant-choice" type="button" data-rb-tenant="${esc(r.slug)}"><strong>${esc(r.name||r.slug)}</strong><small>${esc(r.slug)}.restbr.com</small></button>`).join('')}</div></div>`;
    root.querySelectorAll('[data-rb-tenant]').forEach(button=>button.onclick=()=>go(button.dataset.rbTenant));
  }

  async function recover(){
    try{
      const {data:{session}}=await sb.auth.getSession();
      const user=session?.user;if(!user)return;

      const adminRes=await sb.from('platform_admins').select('user_id').eq('user_id',user.id).eq('is_active',true).maybeSingle();
      let rows=[];
      if(adminRes.data?.user_id){
        const {data,error}=await sb.from('restaurants').select('id,name,slug,status').in('status',['active','draft','suspended']).order('name',{ascending:true});
        if(error)throw error;rows=data||[];
      }else{
        const {data,error}=await sb.from('restaurant_members').select('restaurant_id,restaurants!inner(id,name,slug,status)').eq('user_id',user.id).eq('is_active',true);
        if(error)throw error;rows=(data||[]).map(x=>x.restaurants).filter(Boolean);
      }

      const last=String(localStorage.getItem('RESTBR_OWNER_LAST_TENANT')||'').trim().toLowerCase();
      if(last&&rows.some(r=>r.slug===last)){go(last);return;}
      if(rows.length===1){go(rows[0].slug);return;}
      if(rows.length>1){chooser(rows);return;}

      const loginMsg=document.getElementById('loginMsg');
      if(loginMsg){loginMsg.textContent='لا يوجد مطعم مربوط بهذا الحساب بعد.';loginMsg.className='status err';}
    }catch(error){
      console.warn('RESTBR tenant recovery:',error);
    }
  }

  void recover();
})();

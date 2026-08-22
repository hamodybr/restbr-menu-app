// ============================================================
// RESTBR SUPER ADMIN V2.0
// Tenant owner/member management + direct Owner Dashboard links.
// Requires RESTBR-MEMBERS-V1.sql in restbr-platform.
// ============================================================
(() => {
  'use strict';

  const state={client:null,restaurantId:null,restaurantName:'',hostname:''};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  async function client(){
    if(state.client)return state.client;
    const response=await fetch('/_restbr/platform-config',{headers:{Accept:'application/json'},cache:'no-store'});
    const config=await response.json().catch(()=>({}));
    if(!response.ok||!config?.ok)throw new Error(config?.message||'تعذر تحميل إعدادات RESTBR.');
    state.client=window.supabase.createClient(config.supabase_url,config.publishable_key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return state.client;
  }

  function styles(){
    if(document.getElementById('restbrAdminV2Styles'))return;
    const s=document.createElement('style');s.id='restbrAdminV2Styles';s.textContent=`
      .rb-admin-v2-modal{position:fixed;z-index:120;inset:0;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.68);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
      .rb-admin-v2-card{width:min(620px,100%);max-height:90dvh;overflow:auto;border:1px solid rgba(255,255,255,.12);border-radius:24px;background:#11100e;color:#f8f4ed;padding:16px;box-shadow:0 30px 90px rgba(0,0,0,.5)}
      html[data-theme="light"] .rb-admin-v2-card{background:#fff;color:#191713}
      .rb-admin-v2-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:12px}.rb-admin-v2-head h3{margin:0}.rb-admin-v2-head p{margin:4px 0 0;color:#9b9389;font-size:11px}
      .rb-admin-v2-close{border:1px solid rgba(255,255,255,.12);border-radius:11px;width:38px;height:38px;background:transparent;color:inherit;font-size:20px}
      .rb-admin-v2-form{display:grid;grid-template-columns:1fr 140px auto;gap:8px;margin:12px 0}.rb-admin-v2-form input,.rb-admin-v2-form select{width:100%;border:1px solid rgba(255,255,255,.12);border-radius:11px;background:rgba(0,0,0,.2);color:inherit;padding:10px;font-size:16px}
      .rb-admin-v2-form button,.rb-admin-v2-row button{border:1px solid rgba(216,169,88,.35);border-radius:11px;background:rgba(216,169,88,.12);color:#d8a958;padding:8px 10px;font-weight:800}
      .rb-admin-v2-list{display:grid;gap:7px}.rb-admin-v2-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:8px;padding:10px;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:rgba(255,255,255,.035)}
      .rb-admin-v2-row strong{display:block;font-size:12px;overflow:hidden;text-overflow:ellipsis}.rb-admin-v2-row small{color:#9b9389}.rb-admin-v2-note{font-size:11px;line-height:1.65;color:#9b9389;padding:9px 10px;border:1px solid rgba(216,169,88,.22);border-radius:12px;background:rgba(216,169,88,.05)}
      .rb-admin-v2-msg{min-height:18px;font-size:11px;margin-top:8px}.rb-admin-v2-msg.err{color:#ef6b6b}.rb-admin-v2-msg.ok{color:#4ade80}
      @media(max-width:650px){.rb-admin-v2-form{grid-template-columns:1fr}.rb-admin-v2-row{grid-template-columns:minmax(0,1fr) auto}.rb-admin-v2-row .role{grid-column:1/-1}}
    `;document.head.appendChild(s);
  }

  function injectButtons(){
    document.querySelectorAll('.restaurant-card').forEach(card=>{
      if(card.dataset.rbAdminV2==='1')return;card.dataset.rbAdminV2='1';
      const id=card.dataset.id;const actions=card.querySelector('.card-actions');if(!id||!actions)return;
      const menuLink=actions.querySelector('[data-action="open"]')?.dataset.url||'';
      let hostname='';try{hostname=new URL(menuLink).hostname}catch(_){}

      const owner=document.createElement('button');owner.className='mini-btn';owner.type='button';owner.textContent='Owner ↗';owner.onclick=()=>window.open(`https://${hostname}/owner/`,'_blank','noopener');
      const members=document.createElement('button');members.className='mini-btn';members.type='button';members.textContent='المالك/الفريق';members.onclick=()=>openMembers(id,card.querySelector('h4')?.textContent||'',hostname);
      actions.append(owner,members);
    });
  }

  function ensureModal(){
    let modal=document.getElementById('rbAdminMembersModal');if(modal)return modal;
    modal=document.createElement('div');modal.id='rbAdminMembersModal';modal.className='rb-admin-v2-modal';modal.hidden=true;
    modal.innerHTML=`<div class="rb-admin-v2-card"><div class="rb-admin-v2-head"><div><h3 id="rbAdminMemberTitle">إدارة الفريق</h3><p id="rbAdminMemberDomain"></p></div><button id="rbAdminMemberClose" class="rb-admin-v2-close" type="button">×</button></div>
      <div class="rb-admin-v2-note">لأسباب أمنية، RESTBR لا ينشئ كلمات مرور من لوحة المتصفح. الحساب يجب أن يكون موجودًا في Supabase Auth أولاً، بعدها اربطه بالمطعم هنا.</div>
      <div class="rb-admin-v2-form"><input id="rbAdminMemberEmail" type="email" dir="ltr" placeholder="owner@example.com"><select id="rbAdminMemberRole"><option value="owner">Owner</option><option value="manager">Manager</option><option value="editor">Editor</option><option value="viewer">Viewer</option></select><button id="rbAdminMemberAssign" type="button">ربط الحساب</button></div>
      <div id="rbAdminMemberList" class="rb-admin-v2-list"></div><div id="rbAdminMemberMsg" class="rb-admin-v2-msg"></div></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)closeMembers();});
    document.getElementById('rbAdminMemberClose').onclick=closeMembers;
    document.getElementById('rbAdminMemberAssign').onclick=assignMember;
    return modal;
  }

  function msg(text,type=''){const el=document.getElementById('rbAdminMemberMsg');if(!el)return;el.textContent=text||'';el.className='rb-admin-v2-msg'+(type?' '+type:'');}
  function closeMembers(){const m=document.getElementById('rbAdminMembersModal');if(m)m.hidden=true;document.body.style.overflow='';}

  async function openMembers(id,name,hostname){
    state.restaurantId=id;state.restaurantName=name;state.hostname=hostname;
    const modal=ensureModal();modal.hidden=false;document.body.style.overflow='hidden';
    document.getElementById('rbAdminMemberTitle').textContent=`فريق ${name||'المطعم'}`;
    document.getElementById('rbAdminMemberDomain').textContent=hostname||'';msg('جاري تحميل الفريق...');
    await loadMembers();
  }

  async function loadMembers(){
    try{
      const c=await client();
      const {data,error}=await c.rpc('admin_list_restaurant_members',{p_restaurant_id:state.restaurantId});
      if(error)throw error;
      const list=document.getElementById('rbAdminMemberList');const rows=data||[];
      list.innerHTML=rows.length?rows.map(row=>`<div class="rb-admin-v2-row"><div><strong dir="ltr">${esc(row.email||row.user_id)}</strong><small>${row.is_active?'نشط':'موقوف'}</small></div><span class="role">${esc(row.role)}</span><button type="button" data-member-user="${esc(row.user_id)}" data-member-active="${row.is_active?'true':'false'}">${row.is_active?'إيقاف':'تفعيل'}</button></div>`).join(''):'<div class="rb-admin-v2-note">لا يوجد مالك أو فريق مربوط بهذا المطعم بعد.</div>';
      list.querySelectorAll('[data-member-user]').forEach(button=>button.onclick=()=>setActive(button));msg('');
    }catch(error){const text=String(error?.message||error);msg(/admin_list_restaurant_members.*does not exist/i.test(text)?'شغّل RESTBR-MEMBERS-V1.sql في Supabase أولاً.':text,'err');}
  }

  async function assignMember(){
    const email=String(document.getElementById('rbAdminMemberEmail').value||'').trim();const role=document.getElementById('rbAdminMemberRole').value;
    if(!email){msg('اكتب بريد الحساب.','err');return;}
    const button=document.getElementById('rbAdminMemberAssign');button.disabled=true;msg('جاري ربط الحساب...');
    try{
      const c=await client();const {error}=await c.rpc('admin_assign_restaurant_member',{p_restaurant_id:state.restaurantId,p_user_email:email,p_role:role});if(error)throw error;
      document.getElementById('rbAdminMemberEmail').value='';msg('تم ربط الحساب بالمطعم ✓','ok');await loadMembers();
    }catch(error){const text=String(error?.message||error);msg(/auth user not found/i.test(text)?'هذا البريد ليس لديه حساب Auth بعد. أنشئ الحساب أولاً ثم أعد الربط.':text,'err');}
    finally{button.disabled=false;}
  }

  async function setActive(button){
    button.disabled=true;try{const c=await client();const next=button.dataset.memberActive!=='true';const {error}=await c.rpc('admin_set_restaurant_member_active',{p_restaurant_id:state.restaurantId,p_user_id:button.dataset.memberUser,p_is_active:next});if(error)throw error;await loadMembers();}catch(error){msg(error?.message||String(error),'err');}finally{button.disabled=false;}
  }

  function boot(){styles();ensureModal();injectButtons();const list=document.getElementById('restaurantList');if(list)new MutationObserver(injectButtons).observe(list,{childList:true,subtree:true});console.log('✅ RESTBR Super Admin V2.0 ready');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

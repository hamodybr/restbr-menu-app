// ============================================================
// RESTBR OWNER AUTH V2.0 — self registration for restaurant staff
// Creates an Auth account only. Super Admin still controls tenant membership.
// ============================================================
(() => {
  'use strict';
  const cfg=window.RESTBR_OWNER_CONFIG||{};
  if(!cfg.supabaseUrl||!cfg.publishableKey||!window.supabase)return;
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const $=id=>document.getElementById(id);

  function injectStyles(){
    if($('rbOwnerAuthV2Styles'))return;
    const s=document.createElement('style');s.id='rbOwnerAuthV2Styles';s.textContent=`
      .rb-auth-create{width:100%;margin-top:8px;min-height:45px;border:1px solid rgba(216,169,88,.3);border-radius:13px;background:rgba(216,169,88,.06);color:var(--gold);font-weight:900}
      .rb-auth-modal{position:fixed;z-index:150;inset:0;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
      .rb-auth-card{width:min(430px,100%);background:var(--panel);border:1px solid var(--line);border-radius:24px;padding:18px;box-shadow:var(--shadow)}
      .rb-auth-card h3{margin:0 0 5px}.rb-auth-card p{color:var(--muted);font-size:11px;line-height:1.65;margin:0 0 12px}
      .rb-auth-card label{display:block;color:var(--muted);font-size:11px;margin-top:9px}.rb-auth-card input{width:100%;margin-top:5px;border:1px solid var(--line);background:var(--input);color:var(--text);border-radius:12px;padding:11px;font-size:16px}
      .rb-auth-actions{display:flex;gap:8px;margin-top:13px}.rb-auth-actions button{flex:1}.rb-auth-msg{min-height:18px;margin-top:9px;font-size:11px}.rb-auth-msg.ok{color:var(--ok)}.rb-auth-msg.err{color:var(--danger)}
    `;document.head.appendChild(s);
  }

  function ensureModal(){
    let modal=$('rbOwnerSignupModal');if(modal)return modal;
    modal=document.createElement('div');modal.id='rbOwnerSignupModal';modal.className='rb-auth-modal';modal.hidden=true;
    modal.innerHTML=`<div class="rb-auth-card"><h3>إنشاء حساب RESTBR</h3><p>أنشئ حسابك بالبريد وكلمة المرور. بعد ذلك يحتاج Super Admin لربط بريدك بالمطعم وتحديد صلاحيتك.</p><label>البريد الإلكتروني<input id="rbSignupEmail" type="email" autocomplete="email" dir="ltr"></label><label>كلمة المرور<input id="rbSignupPassword" type="password" autocomplete="new-password" minlength="8"></label><label>تأكيد كلمة المرور<input id="rbSignupConfirm" type="password" autocomplete="new-password" minlength="8"></label><div class="rb-auth-actions"><button id="rbSignupCancel" type="button" class="btn">إلغاء</button><button id="rbSignupSubmit" type="button" class="btn primary">إنشاء الحساب</button></div><div id="rbSignupMsg" class="rb-auth-msg"></div></div>`;
    document.body.appendChild(modal);
    modal.onclick=e=>{if(e.target===modal)close();};
    $('rbSignupCancel').onclick=close;$('rbSignupSubmit').onclick=signup;
    return modal;
  }

  function setMsg(text,type=''){const el=$('rbSignupMsg');if(!el)return;el.textContent=text||'';el.className='rb-auth-msg'+(type?' '+type:'');}
  function open(){ensureModal().hidden=false;document.body.style.overflow='hidden';setMsg('');setTimeout(()=>$('rbSignupEmail')?.focus(),50);}
  function close(){const m=$('rbOwnerSignupModal');if(m)m.hidden=true;document.body.style.overflow='';}

  async function signup(){
    const email=String($('rbSignupEmail')?.value||'').trim();const password=String($('rbSignupPassword')?.value||'');const confirm=String($('rbSignupConfirm')?.value||'');
    if(!email){setMsg('اكتب البريد الإلكتروني.','err');return;}if(password.length<8){setMsg('كلمة المرور يجب أن تكون 8 أحرف على الأقل.','err');return;}if(password!==confirm){setMsg('كلمتا المرور غير متطابقتين.','err');return;}
    const btn=$('rbSignupSubmit');btn.disabled=true;setMsg('جاري إنشاء الحساب...');
    try{
      const {data,error}=await sb.auth.signUp({email,password});if(error)throw error;
      // Do not keep a newly registered, unassigned account signed in on this
      // tenant. Membership remains explicitly controlled by Super Admin.
      if(data?.session)await sb.auth.signOut();
      setMsg('تم إنشاء الحساب ✓ الآن أعطِ هذا البريد إلى Super Admin لربطه بالمطعم، ثم سجل الدخول.','ok');
      $('rbSignupPassword').value='';$('rbSignupConfirm').value='';
    }catch(error){setMsg(error?.message||String(error),'err');}
    finally{btn.disabled=false;}
  }

  function boot(){
    injectStyles();ensureModal();
    const form=$('loginForm');if(!form||$('rbOwnerCreateAccount'))return;
    const button=document.createElement('button');button.id='rbOwnerCreateAccount';button.type='button';button.className='rb-auth-create';button.textContent='إنشاء حساب جديد';button.onclick=open;form.after(button);
    console.log('✅ RESTBR Owner Auth V2.0 ready');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

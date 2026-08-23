// ============================================================
// RESTBR OWNER AUTH V2.2 — self registration + confirmation resend
// Tenant-aware confirmation redirects. Membership remains controlled by Super Admin.
// ============================================================
(() => {
  'use strict';
  const cfg=window.RESTBR_OWNER_CONFIG||{};
  if(!cfg.supabaseUrl||!cfg.publishableKey||!window.supabase)return;

  const nativeCreateClient=window.supabase.createClient.bind(window.supabase);
  const sb=window.RESTBR_OWNER_V2_CLIENT || nativeCreateClient(
    cfg.supabaseUrl,
    cfg.publishableKey,
    {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
  );
  window.RESTBR_OWNER_V2_CLIENT=sb;

  if(!window.__RESTBR_OWNER_CREATE_CLIENT_WRAPPED){
    window.__RESTBR_OWNER_CREATE_CLIENT_WRAPPED=true;
    window.supabase.createClient=(url,key,options)=>{
      if(
        String(url||'')===String(cfg.supabaseUrl||'') &&
        String(key||'')===String(cfg.publishableKey||'') &&
        window.RESTBR_OWNER_V2_CLIENT
      ) return window.RESTBR_OWNER_V2_CLIENT;
      return nativeCreateClient(url,key,options);
    };
  }

  const $=id=>document.getElementById(id);

  function tenantRedirectUrl(){
    const url=new URL(location.href);
    url.hash='';
    url.search='';
    const slug=String(window.RESTBR_OWNER_TENANT_SLUG||new URLSearchParams(location.search).get('tenant')||'').trim().toLowerCase();
    if(slug)url.searchParams.set('tenant',slug);
    url.searchParams.set('auth','confirmed');
    return url.toString();
  }

  function injectStyles(){
    if($('rbOwnerAuthV2Styles'))return;
    const s=document.createElement('style');s.id='rbOwnerAuthV2Styles';s.textContent=`
      .rb-auth-create{width:100%;margin-top:8px;min-height:45px;border:1px solid rgba(216,169,88,.3);border-radius:13px;background:rgba(216,169,88,.06);color:var(--gold);font-weight:900}
      .rb-auth-modal{position:fixed;z-index:150;inset:0;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
      .rb-auth-card{width:min(430px,100%);background:var(--panel);border:1px solid var(--line);border-radius:24px;padding:18px;box-shadow:var(--shadow)}
      .rb-auth-card h3{margin:0 0 5px}.rb-auth-card p{color:var(--muted);font-size:11px;line-height:1.65;margin:0 0 12px}
      .rb-auth-card label{display:block;color:var(--muted);font-size:11px;margin-top:9px}.rb-auth-card input{width:100%;margin-top:5px;border:1px solid var(--line);background:var(--input);color:var(--text);border-radius:12px;padding:11px;font-size:16px}
      .rb-auth-actions{display:flex;gap:8px;margin-top:13px;flex-wrap:wrap}.rb-auth-actions button{flex:1;min-width:120px}.rb-auth-msg{min-height:18px;margin-top:9px;font-size:11px;line-height:1.6}.rb-auth-msg.ok{color:var(--ok)}.rb-auth-msg.err{color:var(--danger)}
    `;document.head.appendChild(s);
  }

  function ensureModal(){
    let modal=$('rbOwnerSignupModal');if(modal)return modal;
    modal=document.createElement('div');modal.id='rbOwnerSignupModal';modal.className='rb-auth-modal';modal.hidden=true;
    modal.innerHTML=`<div class="rb-auth-card"><h3>إنشاء حساب RESTBR</h3><p>أنشئ الحساب ثم أكّد البريد. رابط التأكيد يرجع إلى لوحة هذا المطعم، وبعدها يربط Super Admin البريد بالمطعم.</p><label>البريد الإلكتروني<input id="rbSignupEmail" type="email" autocomplete="email" dir="ltr"></label><label>كلمة المرور<input id="rbSignupPassword" type="password" autocomplete="new-password" minlength="8"></label><label>تأكيد كلمة المرور<input id="rbSignupConfirm" type="password" autocomplete="new-password" minlength="8"></label><div class="rb-auth-actions"><button id="rbSignupCancel" type="button" class="btn">إلغاء</button><button id="rbSignupResend" type="button" class="btn">إعادة إرسال التأكيد</button><button id="rbSignupSubmit" type="button" class="btn primary">إنشاء الحساب</button></div><div id="rbSignupMsg" class="rb-auth-msg"></div></div>`;
    document.body.appendChild(modal);
    modal.onclick=e=>{if(e.target===modal)close();};
    $('rbSignupCancel').onclick=close;$('rbSignupSubmit').onclick=signup;$('rbSignupResend').onclick=resend;
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
      const {data,error}=await sb.auth.signUp({email,password,options:{emailRedirectTo:tenantRedirectUrl()}});if(error)throw error;
      if(data?.session)await sb.auth.signOut();
      setMsg('تم إنشاء الحساب ✓ افتح رسالة التأكيد الجديدة. إذا انتهى الرابط استخدم «إعادة إرسال التأكيد».','ok');
      $('rbSignupPassword').value='';$('rbSignupConfirm').value='';
    }catch(error){setMsg(error?.message||String(error),'err');}
    finally{btn.disabled=false;}
  }

  async function resend(){
    const email=String($('rbSignupEmail')?.value||'').trim();
    if(!email){setMsg('اكتب البريد الإلكتروني أولًا.','err');return;}
    const btn=$('rbSignupResend');btn.disabled=true;setMsg('جاري إرسال رابط تأكيد جديد...');
    try{
      const {error}=await sb.auth.resend({type:'signup',email,options:{emailRedirectTo:tenantRedirectUrl()}});if(error)throw error;
      setMsg('تم إرسال رابط تأكيد جديد ✓ استخدم أحدث رسالة فقط.','ok');
    }catch(error){setMsg(error?.message||String(error),'err');}
    finally{btn.disabled=false;}
  }

  function surfaceAuthError(){
    const params=new URLSearchParams(String(location.hash||'').replace(/^#/,''));
    const code=params.get('error_code');
    if(!code)return;
    const msg=$('loginMsg');
    if(msg){msg.textContent=code==='otp_expired'?'رابط التأكيد غير صالح أو منتهي. اضغط «إنشاء حساب جديد» ثم «إعادة إرسال التأكيد».':(params.get('error_description')||'تعذر تأكيد البريد.');msg.className='status err';}
  }

  function boot(){
    injectStyles();ensureModal();surfaceAuthError();
    const form=$('loginForm');if(!form||$('rbOwnerCreateAccount'))return;
    const button=document.createElement('button');button.id='rbOwnerCreateAccount';button.type='button';button.className='rb-auth-create';button.textContent='إنشاء حساب جديد';button.onclick=open;form.after(button);
    console.log('✅ RESTBR Owner Auth V2.2 ready — tenant confirmation redirect + resend');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;
  if (window.__RESTBR_ADMIN_USER_DELETE_V1__) return;
  window.__RESTBR_ADMIN_USER_DELETE_V1__ = true;

  const q = (sel, root = document) => root.querySelector(sel);
  const qa = (sel, root = document) => [...root.querySelectorAll(sel)];

  function allowedRole(){
    return ['super_admin','owner'].includes(document.body?.dataset?.adminRole || '');
  }

  function installStyles(){
    if (q('#restbrUserDeleteStyles')) return;
    const style = document.createElement('style');
    style.id = 'restbrUserDeleteStyles';
    style.textContent = `
      .restbr-user-delete-btn{
        border:1px solid rgba(248,113,113,.30);
        background:rgba(248,113,113,.08);
        color:#fecaca;
        border-radius:9px;
        padding:9px 12px;
        font:inherit;
        font-size:10px;
        font-weight:900;
      }
      .restbr-user-delete-btn:disabled{opacity:.55;cursor:not-allowed}
      body.admin-light-theme .restbr-user-delete-btn,
      #viewTools.admin-settings-light .restbr-user-delete-btn{
        background:#fff7f7;
        color:#b91c1c;
        border-color:rgba(185,28,28,.22);
      }
    `;
    document.head.appendChild(style);
  }

  function setStatus(message, state = 'normal'){
    const el = q('#restbrUsersStatus');
    if (!el) return;
    el.textContent = message || '';
    el.style.color = state === 'error' ? '#fecaca' : state === 'success' ? '#86efac' : '#9d958c';
  }

  async function functionErrorMessage(error){
    try {
      const response = error?.context;
      if (response && typeof response.clone === 'function') {
        const payload = await response.clone().json();
        if (payload?.error) return String(payload.error);
      }
    } catch (_) {}
    return String(error?.message || error || 'تعذر تنفيذ العملية.');
  }

  function cardName(card){
    return q('.restbr-user-name', card)?.textContent?.trim() || q('.restbr-user-email', card)?.textContent?.trim() || 'هذا المستخدم';
  }

  function cardRole(card){
    return q('.restbr-user-role', card)?.textContent?.trim() || '';
  }

  function isProtected(card){
    return !!q('.restbr-user-protected', card);
  }

  async function deleteUser(card){
    const userId = card?.dataset?.userId || '';
    if (!userId) return;

    const name = cardName(card);
    const first = window.confirm(`حذف ${name} نهائيًا؟\n\nراح ينحذف حساب تسجيل الدخول وصلاحياته، وما راح يقدر يدخل للداشبورد بعد الحذف.`);
    if (!first) return;

    const typed = window.prompt('للتأكيد النهائي اكتب كلمة: حذف');
    if (typed?.trim() !== 'حذف') {
      setStatus('تم إلغاء الحذف لأن كلمة التأكيد غير صحيحة.');
      return;
    }

    card.querySelectorAll('button,select').forEach(el => { el.disabled = true; });
    setStatus(`جاري حذف ${name}...`);

    try {
      if (typeof supabaseClient === 'undefined' || !supabaseClient?.functions) throw new Error('Supabase غير جاهز.');
      const { data, error } = await supabaseClient.functions.invoke('admin-users', {
        method: 'DELETE',
        body: { user_id: userId }
      });
      if (error) throw new Error(await functionErrorMessage(error));
      if (!data?.ok) throw new Error(data?.error || 'تعذر حذف المستخدم.');

      setStatus(`تم حذف ${name} نهائيًا.`, 'success');
      q('#restbrUsersRefresh')?.click();
    } catch (error) {
      console.error('RESTBR USER DELETE ERROR:', error);
      setStatus('فشل حذف المستخدم: ' + String(error?.message || error || ''), 'error');
      card.querySelectorAll('button,select').forEach(el => { el.disabled = false; });
    }
  }

  function enhanceCard(card){
    if (!(card instanceof HTMLElement)) return;
    if (!card.dataset.userId) return;
    if (card.dataset.deleteEnhanced === '1') return;
    card.dataset.deleteEnhanced = '1';

    if (!allowedRole() || isProtected(card)) return;

    const callerRole = document.body?.dataset?.adminRole || '';
    if (callerRole === 'owner' && cardRole(card) === 'صاحب المطعم') return;

    const controls = q('.restbr-user-controls', card);
    if (!controls) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'restbr-user-delete-btn';
    btn.textContent = 'حذف المستخدم';
    btn.addEventListener('click', () => void deleteUser(card));
    controls.appendChild(btn);
  }

  function enhanceAll(){
    if (!allowedRole()) return;
    qa('#restbrUsersList .restbr-user-card').forEach(enhanceCard);
  }

  function initWhenReady(){
    installStyles();
    const list = q('#restbrUsersList');
    const role = document.body?.dataset?.adminRole || '';
    if (!list || !role) {
      setTimeout(initWhenReady, 150);
      return;
    }

    enhanceAll();
    const observer = new MutationObserver(() => enhanceAll());
    observer.observe(list, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initWhenReady, { once:true });
  else initWhenReady();
})();

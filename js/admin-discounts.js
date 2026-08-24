(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;

  const state = { categories: [], products: [], discounts: [] };
  const q = s => document.querySelector(s);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const nameOf = row => row?.name_ar || row?.name_ku || row?.name_en || 'بدون اسم';

  function installStyles(){
    if (q('#smAdminDiscountStyles')) return;
    const style = document.createElement('style');
    style.id = 'smAdminDiscountStyles';
    style.textContent = `
      #discountsSettingsPanel .sm-discount-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      #discountsSettingsPanel .sm-discount-field{display:flex;flex-direction:column;gap:6px}
      #discountsSettingsPanel .sm-discount-field.full{grid-column:1/-1}
      #discountsSettingsPanel label{font-size:11px;color:#b8afa4;font-weight:800}
      #discountsSettingsPanel input,#discountsSettingsPanel select{width:100%;height:42px;border:1px solid rgba(216,169,88,.28);border-radius:11px;background:#0d0b09;color:#fff;padding:0 11px;outline:none}
      #discountsSettingsPanel input:focus,#discountsSettingsPanel select:focus{border-color:#d8a958}
      #smDiscountCreateBtn{width:100%;height:44px;margin-top:12px;border:0;border-radius:12px;background:linear-gradient(135deg,#e2b55e,#ad7426);color:#100b05;font-weight:900}
      #smDiscountStatus{min-height:18px;margin-top:8px;font-size:11px}
      #smDiscountList{display:flex;flex-direction:column;gap:8px;margin-top:14px}
      .sm-discount-row{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:11px;border:1px solid rgba(255,255,255,.07);border-radius:12px;background:rgba(255,255,255,.025)}
      .sm-discount-row.off{opacity:.55}
      .sm-discount-row strong{display:block;color:#efbd62;font-size:14px;margin-bottom:4px}
      .sm-discount-row small{display:block;color:#a79d90;font-size:10px;line-height:1.6}
      .sm-discount-actions{display:flex;gap:6px}
      .sm-discount-actions button{height:31px;padding:0 9px;border-radius:9px;border:1px solid rgba(216,169,88,.24);background:#17130f;color:#ddd;font-size:10px;font-weight:800}
      .sm-discount-actions .danger{color:#ffaaa4;border-color:rgba(248,113,113,.25)}
      .sm-discount-empty{padding:18px;text-align:center;color:#8f867a;border:1px dashed rgba(255,255,255,.08);border-radius:12px}
      @media(max-width:640px){#discountsSettingsPanel .sm-discount-grid{grid-template-columns:1fr}.sm-discount-row{grid-template-columns:1fr}.sm-discount-actions{justify-content:flex-start}}
    `;
    document.head.appendChild(style);
  }

  function panelHtml(){
    return `
      <details id="discountsSettingsPanel" class="settings-accordion">
        <summary>
          <span class="settings-accordion-icon">🏷️</span>
          <span class="settings-accordion-title">
            <strong>الخصومات</strong>
            <small>خصم بالنسبة المئوية على المطعم أو قسم أو صنف — داخل، سفري أو الاثنين</small>
          </span>
          <span class="settings-chevron">⌄</span>
        </summary>
        <div class="settings-accordion-body">
          <div class="settings-element" style="margin-top:10px">
            <div class="settings-element-head"><div><strong>إنشاء خصم</strong><small>الأسعار الأصلية تبقى محفوظة ولن يتم تعديلها.</small></div></div>
            <div class="sm-discount-grid">
              <div class="sm-discount-field">
                <label for="smDiscountPercent">نسبة الخصم %</label>
                <input id="smDiscountPercent" type="number" min="1" max="100" step="1" inputmode="decimal" placeholder="مثال: 20">
              </div>
              <div class="sm-discount-field">
                <label for="smDiscountPriceMode">يطبق على</label>
                <select id="smDiscountPriceMode">
                  <option value="both">داخل + سفري</option>
                  <option value="dinein">داخل المطعم فقط</option>
                  <option value="takeaway">سفري فقط</option>
                </select>
              </div>
              <div class="sm-discount-field">
                <label for="smDiscountScope">مكان الخصم</label>
                <select id="smDiscountScope">
                  <option value="restaurant">المطعم كامل</option>
                  <option value="category">قسم كامل</option>
                  <option value="product">صنف واحد</option>
                </select>
              </div>
              <div class="sm-discount-field" id="smDiscountTargetWrap" hidden>
                <label for="smDiscountTarget">اختيار الهدف</label>
                <select id="smDiscountTarget"></select>
              </div>
            </div>
            <button id="smDiscountCreateBtn" type="button">إضافة الخصم</button>
            <div id="smDiscountStatus"></div>
          </div>
          <div class="settings-element">
            <div class="settings-element-head"><div><strong>الخصومات الحالية</strong><small>تقدر توقف الخصم مؤقتًا أو تحذفه.</small></div></div>
            <div id="smDiscountList"><div class="sm-discount-empty">جاري التحميل...</div></div>
          </div>
        </div>
      </details>`;
  }

  function insertPanel(){
    if (q('#discountsSettingsPanel')) return q('#discountsSettingsPanel');
    const wrap = q('#viewTools .settings-clean-wrap');
    if (!wrap) return null;
    const t = document.createElement('template');
    t.innerHTML = panelHtml().trim();
    const panel = t.content.firstElementChild;
    const gate = q('#diningGateSettingsPanel');
    if (gate) gate.after(panel); else wrap.appendChild(panel);
    return panel;
  }

  function status(message='', ok=true){
    const el = q('#smDiscountStatus');
    if (!el) return;
    el.textContent = message;
    el.style.color = ok ? '#baf3d7' : '#fecaca';
  }

  function scopeLabel(d){
    if (d.scope_type === 'restaurant') return 'المطعم كامل';
    const source = d.scope_type === 'category' ? state.categories : state.products;
    const row = source.find(x => String(x.id) === String(d.target_id));
    return d.scope_type === 'category' ? `قسم: ${nameOf(row)}` : `صنف: ${nameOf(row)}`;
  }

  function priceLabel(mode){
    return mode === 'dinein' ? 'داخل المطعم' : mode === 'takeaway' ? 'سفري' : 'داخل + سفري';
  }

  function renderTargets(){
    const scope = q('#smDiscountScope')?.value || 'restaurant';
    const wrap = q('#smDiscountTargetWrap');
    const select = q('#smDiscountTarget');
    if (!wrap || !select) return;
    wrap.hidden = scope === 'restaurant';
    if (scope === 'restaurant') { select.innerHTML = ''; return; }
    const rows = scope === 'category' ? state.categories : state.products;
    select.innerHTML = rows.map(row => `<option value="${esc(row.id)}">${esc(nameOf(row))}</option>`).join('');
  }

  function renderList(){
    const box = q('#smDiscountList');
    if (!box) return;
    if (!state.discounts.length){
      box.innerHTML = '<div class="sm-discount-empty">لا توجد خصومات حاليًا.</div>';
      return;
    }
    box.innerHTML = state.discounts.map(d => `
      <div class="sm-discount-row ${d.is_active ? '' : 'off'}" data-discount-id="${esc(d.id)}">
        <div>
          <strong>${Number(d.discount_percent)}% خصم</strong>
          <small>${esc(priceLabel(d.price_mode))} • ${esc(scopeLabel(d))} • ${d.is_active ? 'مفعّل' : 'متوقف'}</small>
        </div>
        <div class="sm-discount-actions">
          <button type="button" data-discount-toggle="${esc(d.id)}">${d.is_active ? 'إيقاف' : 'تفعيل'}</button>
          <button type="button" class="danger" data-discount-delete="${esc(d.id)}">حذف</button>
        </div>
      </div>`).join('');
  }

  async function loadReferenceData(){
    const [{data: categories, error: cErr},{data: products, error: pErr}] = await Promise.all([
      supabaseClient.from('categories').select('id,name_ar,name_ku,name_en,sort_order').order('sort_order',{ascending:true}),
      supabaseClient.from('products').select('id,category_id,name_ar,name_ku,name_en,sort_order').order('sort_order',{ascending:true})
    ]);
    if (cErr) throw cErr;
    if (pErr) throw pErr;
    state.categories = categories || [];
    state.products = products || [];
  }

  async function loadDiscounts(){
    const {data, error} = await supabaseClient.from('discounts').select('*').order('created_at',{ascending:false});
    if (error) throw error;
    state.discounts = data || [];
    renderList();
  }

  async function createDiscount(){
    const percent = Number(q('#smDiscountPercent')?.value);
    const priceMode = q('#smDiscountPriceMode')?.value || 'both';
    const scope = q('#smDiscountScope')?.value || 'restaurant';
    const targetId = scope === 'restaurant' ? null : (q('#smDiscountTarget')?.value || null);
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100){ status('اكتب نسبة صحيحة من 1 إلى 100.', false); return; }
    if (scope !== 'restaurant' && !targetId){ status('اختر القسم أو الصنف.', false); return; }
    status('جاري حفظ الخصم...');
    const {error} = await supabaseClient.from('discounts').insert({discount_percent:percent,price_mode:priceMode,scope_type:scope,target_id:targetId,is_active:true});
    if (error){ console.error('DISCOUNT CREATE ERROR', error); status('فشل حفظ الخصم: ' + (error.message || error), false); return; }
    q('#smDiscountPercent').value = '';
    await loadDiscounts();
    status('تم حفظ الخصم ✓');
  }

  async function toggleDiscount(id){
    const row = state.discounts.find(x => String(x.id) === String(id));
    if (!row) return;
    const {error} = await supabaseClient.from('discounts').update({is_active:!row.is_active,updated_at:new Date().toISOString()}).eq('id',id);
    if (error){ status('فشل تغيير حالة الخصم: ' + (error.message || error), false); return; }
    await loadDiscounts();
    status(row.is_active ? 'تم إيقاف الخصم.' : 'تم تفعيل الخصم ✓');
  }

  async function deleteDiscount(id){
    if (!confirm('حذف هذا الخصم نهائيًا؟')) return;
    const {error} = await supabaseClient.from('discounts').delete().eq('id',id);
    if (error){ status('فشل حذف الخصم: ' + (error.message || error), false); return; }
    await loadDiscounts();
    status('تم حذف الخصم.');
  }

  function bind(){
    q('#smDiscountScope')?.addEventListener('change', renderTargets);
    q('#smDiscountCreateBtn')?.addEventListener('click', () => void createDiscount());
    q('#discountsSettingsPanel')?.addEventListener('click', e => {
      const toggle = e.target.closest('[data-discount-toggle]');
      if (toggle){ void toggleDiscount(toggle.dataset.discountToggle); return; }
      const del = e.target.closest('[data-discount-delete]');
      if (del) void deleteDiscount(del.dataset.discountDelete);
    });
  }

  async function start(){
    installStyles();
    const panel = insertPanel();
    if (!panel) return;
    bind();
    try{
      if (typeof supabaseClient === 'undefined' || !supabaseClient) throw new Error('Supabase غير جاهز.');
      await loadReferenceData();
      renderTargets();
      await loadDiscounts();
      status('');
    }catch(error){
      console.error('DISCOUNTS PANEL LOAD ERROR', error);
      status('تعذر تحميل نظام الخصومات: ' + (error.message || error), false);
      const box = q('#smDiscountList');
      if (box) box.innerHTML = '<div class="sm-discount-empty">تعذر تحميل الخصومات.</div>';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => void start(), {once:true});
  else void start();
})();

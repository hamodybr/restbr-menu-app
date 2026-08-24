(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;

  let patched = false;
  let activeNewSnapshot = [];

  function installStyles() {
    if (document.getElementById('smTakeawayAdminStyles')) return;
    const style = document.createElement('style');
    style.id = 'smTakeawayAdminStyles';
    style.textContent = `
      .option-editor-grid{grid-template-columns:1.25fr .72fr .82fr auto!important}
      .sm-takeaway-price-wrap{display:flex;gap:6px;align-items:center}
      .sm-takeaway-price-wrap input{min-width:0;flex:1}
      .sm-same-price-btn{
        flex:0 0 auto;min-height:38px;padding:0 9px;border:1px solid rgba(216,169,88,.28);
        border-radius:9px;background:#17130f;color:#e3c58e;font-size:10px;font-weight:800;white-space:nowrap
      }
      @media(max-width:650px){
        .option-editor-grid{grid-template-columns:1fr 1fr!important}
        .option-editor-grid .field:first-child{grid-column:1/-1}
        .option-editor-grid .danger-mini{grid-column:1/-1!important}
      }
    `;
    document.head.appendChild(style);
  }

  function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function takeawayField(inputClass, value) {
    return `<div class="field sm-takeaway-field"><label>سعر السفري</label><div class="sm-takeaway-price-wrap"><input class="${inputClass}" type="number" min="0" value="${String(value)}"><button class="sm-same-price-btn" type="button" data-sm-copy-same>نفس السعر</button></div></div>`;
  }

  function injectField(html, inputClass, value) {
    if (html.includes(inputClass)) return html;
    return html.replace(
      '<button class="danger-mini"',
      `${takeawayField(inputClass, value)}<button class="danger-mini"`
    );
  }

  function captureRows(selector, nameClass, priceClass, takeawayClass) {
    return [...document.querySelectorAll(selector)]
      .filter(row => row.dataset.deleted !== '1' && row.style.display !== 'none')
      .map(row => {
        const name = row.querySelector(nameClass)?.value.trim() || '';
        const inside = safeNumber(row.querySelector(priceClass)?.value, 0);
        const raw = row.querySelector(takeawayClass)?.value;
        const takeaway = raw === '' || raw === null || raw === undefined ? inside : safeNumber(raw, inside);
        return {
          id: row.dataset.optionId || '',
          name,
          inside,
          takeaway
        };
      })
      .filter(row => row.name || row.id);
  }

  async function syncProductTakeawayPrices(productId, snapshot) {
    if (!productId || typeof supabaseClient === 'undefined' || !supabaseClient) return;

    const { data, error } = await supabaseClient
      .from('product_options')
      .select('id,name_ar,price,takeaway_price,sort_order')
      .eq('product_id', productId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    const serverRows = data || [];
    const used = new Set();

    for (const item of snapshot) {
      let target = item.id
        ? serverRows.find(row => String(row.id) === String(item.id))
        : null;

      if (!target && item.name) {
        target = serverRows.find(row => !used.has(String(row.id)) && String(row.name_ar || '').trim() === item.name);
      }
      if (!target) continue;

      used.add(String(target.id));
      const { error: updateError } = await supabaseClient
        .from('product_options')
        .update({ takeaway_price: item.takeaway })
        .eq('id', target.id);
      if (updateError) throw updateError;
    }

    for (const row of serverRows) {
      if (row.takeaway_price !== null && row.takeaway_price !== undefined) continue;
      const { error: fallbackError } = await supabaseClient
        .from('product_options')
        .update({ takeaway_price: row.price })
        .eq('id', row.id);
      if (fallbackError) throw fallbackError;
    }
  }

  async function productIdsByName(nameAr, categoryId) {
    if (!nameAr) return [];
    let query = supabaseClient.from('products').select('id').eq('name_ar', nameAr);
    if (categoryId) query = query.eq('category_id', categoryId);
    const { data, error } = await query;
    if (error) return [];
    return (data || []).map(row => String(row.id));
  }

  function patchFunctions() {
    if (patched) return true;
    if (
      typeof window.optionEditorHtml !== 'function' ||
      typeof window.newOptionEditorHtml !== 'function' ||
      typeof window.buildNewOptionPayload !== 'function' ||
      typeof window.saveAdminProduct !== 'function' ||
      typeof window.createAdminProduct !== 'function'
    ) return false;

    installStyles();

    const oldOptionEditorHtml = window.optionEditorHtml;
    window.optionEditorHtml = function(o = {}) {
      const html = oldOptionEditorHtml.apply(this, arguments);
      const inside = safeNumber(o.price ?? o.base_price, 0);
      const takeaway = o.takeaway_price === null || o.takeaway_price === undefined
        ? inside
        : safeNumber(o.takeaway_price, inside);
      return injectField(html, 'oe-takeaway-price', takeaway);
    };

    const oldNewOptionEditorHtml = window.newOptionEditorHtml;
    window.newOptionEditorHtml = function() {
      const html = oldNewOptionEditorHtml.apply(this, arguments);
      return injectField(html, 'noe-takeaway-price', 0);
    };

    // Save the takeaway value in the SAME insert that creates a new option.
    // This prevents the admin reload from briefly reading the inside price as takeaway.
    const oldBuildNewOptionPayload = window.buildNewOptionPayload;
    window.buildNewOptionPayload = function(productId, name, price, index) {
      const payload = oldBuildNewOptionPayload.apply(this, arguments);
      const item = activeNewSnapshot[Number(index)] || null;
      payload.takeaway_price = item ? safeNumber(item.takeaway, safeNumber(price, 0)) : safeNumber(price, 0);
      return payload;
    };

    const oldSaveAdminProduct = window.saveAdminProduct;
    window.saveAdminProduct = async function(productId) {
      const snapshot = captureRows('#optionsEditor .option-editor', '.oe-name', '.oe-price', '.oe-takeaway-price');
      const result = await oldSaveAdminProduct.apply(this, arguments);
      try {
        await syncProductTakeawayPrices(productId, snapshot);
      } catch (error) {
        console.error('Takeaway price save failed:', error);
        if (typeof window.showEditorMsg === 'function') {
          window.showEditorMsg('تم حفظ الصنف لكن تعذر حفظ سعر السفري', false);
        }
      }
      return result;
    };

    const oldCreateAdminProduct = window.createAdminProduct;
    window.createAdminProduct = async function() {
      const nameAr = document.getElementById('np_name_ar')?.value.trim() || '';
      const categoryId = document.getElementById('np_category_id')?.value || '';
      const snapshot = captureRows('#newOptionsEditor .option-editor', '.noe-name', '.noe-price', '.noe-takeaway-price');
      const beforeIds = new Set(await productIdsByName(nameAr, categoryId));

      activeNewSnapshot = snapshot;
      let result;
      try {
        result = await oldCreateAdminProduct.apply(this, arguments);
      } finally {
        activeNewSnapshot = [];
      }

      // Keep this as a safety sync for any legacy/default option path.
      try {
        const afterIds = await productIdsByName(nameAr, categoryId);
        const newId = afterIds.find(id => !beforeIds.has(id));
        if (newId) await syncProductTakeawayPrices(newId, snapshot);
      } catch (error) {
        console.error('New product takeaway price save failed:', error);
      }
      return result;
    };

    patched = true;
    return true;
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-sm-copy-same]');
    if (!button) return;
    const row = button.closest('.option-editor');
    if (!row) return;
    const inside = row.querySelector('.oe-price,.noe-price');
    const takeaway = row.querySelector('.oe-takeaway-price,.noe-takeaway-price');
    if (!inside || !takeaway) return;
    takeaway.value = inside.value || '0';
    takeaway.dispatchEvent(new Event('input', { bubbles: true }));
  });

  const timer = setInterval(() => {
    if (patchFunctions()) clearInterval(timer);
  }, 120);

  window.addEventListener('load', patchFunctions, { once: true });
  setTimeout(() => clearInterval(timer), 12000);
})();

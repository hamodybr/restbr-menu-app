(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;

  let patched = false;
  let sortable = null;

  function installStyles() {
    if (document.getElementById('smAdminOptionOrderStyles')) return;

    const style = document.createElement('style');
    style.id = 'smAdminOptionOrderStyles';
    style.textContent = `
      #optionsEditor .option-editor{
        position:relative;
      }

      .sm-option-order-bar{
        display:flex;
        align-items:center;
        gap:8px;
        margin:-2px 0 10px;
        padding:7px 8px;
        border:1px dashed rgba(216,169,88,.25);
        border-radius:10px;
        background:rgba(216,169,88,.045);
        color:#9d9388;
        font-size:10px;
        line-height:1;
        user-select:none;
        -webkit-user-select:none;
      }

      .sm-option-drag{
        width:34px;
        height:30px;
        display:grid;
        place-items:center;
        flex:0 0 auto;
        padding:0;
        border:1px solid rgba(216,169,88,.28);
        border-radius:9px;
        background:#17130f;
        color:#e3c58e;
        font-size:16px;
        cursor:grab;
        touch-action:none;
        -webkit-tap-highlight-color:transparent;
      }

      .sm-option-drag:active{cursor:grabbing}

      .sm-option-order-number{
        min-width:58px;
        color:#e3c58e;
        font-weight:800;
        font-size:10px;
      }

      .sm-option-order-hint{
        flex:1;
        min-width:0;
      }

      #optionsEditor .sm-option-sort-ghost{
        opacity:.42;
        outline:1px dashed rgba(216,169,88,.55);
      }

      #optionsEditor .sm-option-sort-chosen{
        box-shadow:0 10px 30px rgba(0,0,0,.28);
      }

      body.admin-light-mode .sm-option-order-bar,
      body.sm-admin-light .sm-option-order-bar,
      html[data-admin-theme="light"] .sm-option-order-bar{
        background:#fff8ed;
        border-color:rgba(139,94,30,.25);
        color:#776b5f;
      }

      body.admin-light-mode .sm-option-drag,
      body.sm-admin-light .sm-option-drag,
      html[data-admin-theme="light"] .sm-option-drag{
        background:#fff;
        color:#9b691f;
        border-color:rgba(139,94,30,.25);
      }

      @media(max-width:650px){
        .sm-option-order-bar{
          margin-bottom:9px;
          padding:6px 7px;
        }
        .sm-option-order-hint{font-size:9px}
      }
    `;

    document.head.appendChild(style);
  }

  function activeRows() {
    const holder = document.getElementById('optionsEditor');
    if (!holder) return [];

    return [...holder.querySelectorAll(':scope > .option-editor')]
      .filter(row => row.dataset.deleted !== '1' && row.style.display !== 'none');
  }

  function updatePositionLabels() {
    activeRows().forEach((row, index) => {
      const label = row.querySelector('.sm-option-order-number');
      if (label) label.textContent = `الخيار ${index + 1}`;
    });
  }

  function enhanceRow(row) {
    if (!(row instanceof Element)) return;
    if (!row.matches('.option-editor')) return;
    if (row.querySelector(':scope > .sm-option-order-bar')) return;

    const bar = document.createElement('div');
    bar.className = 'sm-option-order-bar';
    bar.innerHTML = `
      <button class="sm-option-drag" type="button" aria-label="اسحب لتغيير ترتيب الخيار" title="اسحب لتغيير الترتيب">☰</button>
      <span class="sm-option-order-number"></span>
      <span class="sm-option-order-hint">اسحب لتغيير ترتيب الظهور في المنيو</span>
    `;

    row.insertBefore(bar, row.firstChild);
  }

  function enhanceEditor() {
    const holder = document.getElementById('optionsEditor');
    if (!holder) return false;

    [...holder.querySelectorAll(':scope > .option-editor')].forEach(enhanceRow);
    updatePositionLabels();

    if (sortable) {
      try { sortable.destroy(); } catch (_) {}
      sortable = null;
    }

    if (window.Sortable) {
      sortable = new Sortable(holder, {
        animation: 180,
        handle: '.sm-option-drag',
        ghostClass: 'sm-option-sort-ghost',
        chosenClass: 'sm-option-sort-chosen',
        delay: 90,
        delayOnTouchOnly: true,
        touchStartThreshold: 4,
        onEnd: updatePositionLabels
      });
    }

    return true;
  }

  function captureOrder() {
    return activeRows()
      .map((row, index) => ({
        position: index + 1,
        id: row.dataset.optionId || '',
        name: row.querySelector('.oe-name')?.value.trim() || '',
        price: Number(row.querySelector('.oe-price')?.value || 0)
      }))
      .filter(item => item.id || item.name);
  }

  function sameNumber(a, b) {
    const x = Number(a);
    const y = Number(b);
    return Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - y) < 0.0001;
  }

  async function persistOrder(productId, snapshot) {
    if (!productId || !snapshot.length) return;
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return;

    const { data, error } = await supabaseClient
      .from('product_options')
      .select('id,name_ar,price,sort_order,created_at')
      .eq('product_id', productId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;

    const serverRows = Array.isArray(data) ? data : [];
    const used = new Set();
    const resolved = [];

    for (const item of snapshot) {
      let target = item.id
        ? serverRows.find(row => String(row.id) === String(item.id))
        : null;

      if (!target && item.name) {
        target = serverRows.find(row =>
          !used.has(String(row.id)) &&
          String(row.name_ar || '').trim() === item.name &&
          sameNumber(row.price, item.price)
        );
      }

      if (!target && item.name) {
        target = serverRows.find(row =>
          !used.has(String(row.id)) &&
          String(row.name_ar || '').trim() === item.name
        );
      }

      if (!target) continue;

      used.add(String(target.id));
      resolved.push({ id: target.id, position: item.position });
    }

    if (resolved.length !== snapshot.length) {
      throw new Error('تعذر مطابقة بعض الخيارات بعد الحفظ. حاول فتح الصنف وحفظ الترتيب مرة ثانية.');
    }

    for (const item of resolved) {
      const { error: updateError } = await supabaseClient
        .from('product_options')
        .update({
          sort_order: item.position,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);

      if (updateError) throw updateError;
    }
  }

  function patchSaveFunction() {
    if (patched) return true;
    if (typeof window.saveAdminProduct !== 'function') return false;

    const oldSaveAdminProduct = window.saveAdminProduct;

    window.saveAdminProduct = async function(productId) {
      const snapshot = captureOrder();
      const result = await oldSaveAdminProduct.apply(this, arguments);

      const msg = document.getElementById('editorMsg');
      if (msg?.classList.contains('err')) return result;

      try {
        await persistOrder(productId, snapshot);

        if (typeof window.loadAdminDashboard === 'function') {
          await window.loadAdminDashboard();
        }

        if (typeof window.showEditorMsg === 'function') {
          window.showEditorMsg('تم حفظ الصنف وترتيب الخيارات بنجاح ✓', true);
        }
      } catch (error) {
        console.error('OPTION ORDER SAVE ERROR:', error);
        if (typeof window.showEditorMsg === 'function') {
          window.showEditorMsg('تم حفظ الصنف لكن فشل حفظ ترتيب الخيارات: ' + (error.message || error), false);
        }
      }

      return result;
    };

    patched = true;
    return true;
  }

  installStyles();

  const observer = new MutationObserver(records => {
    let needsEnhance = false;

    for (const record of records) {
      if (!(record.target instanceof Element)) continue;
      if (
        record.target.id === 'optionsEditor' ||
        record.target.closest?.('#optionsEditor') ||
        [...record.addedNodes].some(node => node instanceof Element && (node.id === 'optionsEditor' || node.querySelector?.('#optionsEditor')))
      ) {
        needsEnhance = true;
        break;
      }
    }

    if (needsEnhance) requestAnimationFrame(enhanceEditor);
  });

  function start() {
    observer.observe(document.body, { childList: true, subtree: true });
    enhanceEditor();
    patchSaveFunction();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  const patchTimer = setInterval(() => {
    if (patchSaveFunction()) clearInterval(patchTimer);
  }, 120);

  setTimeout(() => clearInterval(patchTimer), 12000);
})();

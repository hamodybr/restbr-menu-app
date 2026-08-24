(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;

  console.log('✅ ADMIN OPTION ORDER V1.1 LOADED');

  let patched = false;
  let sortable = null;

  function installStyles() {
    if (document.getElementById('smAdminOptionOrderStyles')) return;

    const style = document.createElement('style');
    style.id = 'smAdminOptionOrderStyles';
    style.textContent = `
      #optionsEditor .option-editor{position:relative}
      .sm-option-order-bar{display:flex;align-items:center;gap:8px;margin:-2px 0 10px;padding:8px;border:1px dashed rgba(216,169,88,.34);border-radius:11px;background:rgba(216,169,88,.08);color:#9d9388;font-size:10px;line-height:1;user-select:none;-webkit-user-select:none}
      .sm-option-drag{width:38px;height:34px;display:grid;place-items:center;flex:0 0 auto;padding:0;border:1px solid rgba(216,169,88,.45);border-radius:9px;background:#17130f;color:#e3c58e;font-size:18px;cursor:grab;touch-action:none;-webkit-tap-highlight-color:transparent}
      .sm-option-drag:active{cursor:grabbing}
      .sm-option-order-number{min-width:62px;color:#e3c58e;font-weight:900;font-size:11px}
      .sm-option-order-hint{flex:1;min-width:0}
      #optionsEditor .sm-option-sort-ghost{opacity:.38;outline:2px dashed rgba(216,169,88,.65)}
      #optionsEditor .sm-option-sort-chosen{box-shadow:0 12px 32px rgba(0,0,0,.34)}
      body.admin-light-mode .sm-option-order-bar,body.sm-admin-light .sm-option-order-bar,html[data-admin-theme="light"] .sm-option-order-bar{background:#fff8ed;border-color:rgba(139,94,30,.28);color:#776b5f}
      body.admin-light-mode .sm-option-drag,body.sm-admin-light .sm-option-drag,html[data-admin-theme="light"] .sm-option-drag{background:#fff;color:#9b691f;border-color:rgba(139,94,30,.3)}
      @media(max-width:650px){.sm-option-order-bar{padding:7px}.sm-option-order-hint{font-size:9px}.sm-option-drag{width:40px;height:36px}}
    `;

    document.head.appendChild(style);
  }

  function activeRows() {
    const holder = document.getElementById('optionsEditor');
    if (!holder) return [];

    return [...holder.children]
      .filter(row => row instanceof Element && row.classList.contains('option-editor'))
      .filter(row => row.dataset.deleted !== '1' && row.style.display !== 'none');
  }

  function updatePositionLabels() {
    activeRows().forEach((row, index) => {
      const label = row.querySelector('.sm-option-order-number');
      if (label) label.textContent = `الخيار ${index + 1}`;
    });
  }

  function enhanceRow(row) {
    if (!(row instanceof Element) || !row.classList.contains('option-editor')) return;
    if (row.querySelector('.sm-option-order-bar')) return;

    const bar = document.createElement('div');
    bar.className = 'sm-option-order-bar';
    bar.innerHTML = `
      <button class="sm-option-drag" type="button" aria-label="اسحب لتغيير ترتيب الخيار" title="اسحب لتغيير الترتيب">☰</button>
      <span class="sm-option-order-number"></span>
      <span class="sm-option-order-hint">اسحب هذا الخيار للأعلى أو للأسفل</span>
    `;

    row.insertBefore(bar, row.firstChild);
  }

  function enhanceEditor() {
    const holder = document.getElementById('optionsEditor');
    if (!holder) return false;

    [...holder.children].forEach(enhanceRow);
    updatePositionLabels();

    if (sortable) {
      try { sortable.destroy(); } catch (_) {}
      sortable = null;
    }

    if (window.Sortable) {
      sortable = new window.Sortable(holder, {
        animation: 180,
        handle: '.sm-option-drag',
        draggable: '.option-editor:not([data-deleted="1"])',
        ghostClass: 'sm-option-sort-ghost',
        chosenClass: 'sm-option-sort-chosen',
        delay: 70,
        delayOnTouchOnly: true,
        touchStartThreshold: 3,
        onEnd: updatePositionLabels
      });
    } else {
      console.warn('Sortable is not ready yet for option ordering');
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
    const x = Number(a), y = Number(b);
    return Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - y) < 0.0001;
  }

  async function persistOrder(productId, snapshot) {
    if (!productId || !snapshot.length || typeof supabaseClient === 'undefined' || !supabaseClient) return;

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
      let target = item.id ? serverRows.find(row => String(row.id) === String(item.id)) : null;

      if (!target && item.name) {
        target = serverRows.find(row => !used.has(String(row.id)) && String(row.name_ar || '').trim() === item.name && sameNumber(row.price, item.price));
      }
      if (!target && item.name) {
        target = serverRows.find(row => !used.has(String(row.id)) && String(row.name_ar || '').trim() === item.name);
      }
      if (!target) continue;

      used.add(String(target.id));
      resolved.push({ id: target.id, position: item.position });
    }

    if (resolved.length !== snapshot.length) {
      throw new Error('تعذر مطابقة بعض الخيارات بعد الحفظ. افتح الصنف وحاول مرة ثانية.');
    }

    for (const item of resolved) {
      const { error: updateError } = await supabaseClient
        .from('product_options')
        .update({ sort_order: item.position, updated_at: new Date().toISOString() })
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
        if (typeof window.loadAdminDashboard === 'function') await window.loadAdminDashboard();
        if (typeof window.showEditorMsg === 'function') window.showEditorMsg('تم حفظ الصنف وترتيب الخيارات بنجاح ✓', true);
      } catch (error) {
        console.error('OPTION ORDER SAVE ERROR:', error);
        if (typeof window.showEditorMsg === 'function') window.showEditorMsg('تم حفظ الصنف لكن فشل حفظ ترتيب الخيارات: ' + (error.message || error), false);
      }

      return result;
    };

    patched = true;
    return true;
  }

  function boot() {
    installStyles();
    patchSaveFunction();
    enhanceEditor();

    const observer = new MutationObserver(() => {
      if (document.getElementById('optionsEditor')) requestAnimationFrame(enhanceEditor);
      patchSaveFunction();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    const timer = setInterval(() => {
      patchSaveFunction();
      if (document.getElementById('optionsEditor')) enhanceEditor();
      if (patched && window.Sortable) clearInterval(timer);
    }, 250);

    setTimeout(() => clearInterval(timer), 30000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();

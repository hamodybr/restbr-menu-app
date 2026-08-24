(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;

  console.log('✅ ADMIN OPTION ORDER V1.4 LOADED');

  let savePatched = false;
  let lockedScrollY = 0;
  let modalIsLocked = false;

  function installStyles() {
    let style = document.getElementById('smAdminOptionOrderStyles');
    if (!style) {
      style = document.createElement('style');
      style.id = 'smAdminOptionOrderStyles';
      document.head.appendChild(style);
    }

    style.textContent = `
      #optionsEditor .option-editor{position:relative}

      /* Compact native-looking order row: label + two arrows only. */
      .sm-option-order-bar{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        margin:0 0 10px;
        padding:2px 1px 8px;
        border:0;
        border-bottom:1px solid rgba(216,169,88,.12);
        border-radius:0;
        background:transparent;
        color:#9d9388;
        line-height:1;
        user-select:none;
        -webkit-user-select:none;
      }

      /* Hide leftovers from older cached versions. */
      .sm-option-order-bar .sm-option-drag,
      .sm-option-order-bar .sm-option-order-hint{
        display:none!important;
      }

      .sm-option-order-number{
        color:#d9c196;
        font-weight:800;
        font-size:12px;
        white-space:nowrap;
      }

      .sm-option-order-actions{
        display:inline-flex;
        align-items:center;
        gap:5px;
        direction:ltr;
        flex:0 0 auto;
      }

      .sm-option-move{
        width:34px;
        height:32px;
        display:grid;
        place-items:center;
        padding:0;
        border:1px solid rgba(216,169,88,.28);
        border-radius:9px;
        background:rgba(216,169,88,.055);
        color:#e3c58e;
        font-size:17px;
        line-height:1;
        font-weight:900;
        cursor:pointer;
        touch-action:manipulation;
        -webkit-tap-highlight-color:transparent;
      }

      .sm-option-move:active{
        transform:scale(.93);
        background:rgba(216,169,88,.13);
      }

      .sm-option-move:disabled{
        opacity:.2;
        cursor:not-allowed;
        transform:none;
      }

      .admin-modal{overscroll-behavior:none!important}
      .admin-modal-card{
        overscroll-behavior:contain!important;
        -webkit-overflow-scrolling:touch!important;
        touch-action:pan-y!important;
      }
      body.sm-admin-modal-locked{overflow:hidden!important}

      body.admin-light-mode .sm-option-order-bar,
      body.sm-admin-light .sm-option-order-bar,
      html[data-admin-theme="light"] .sm-option-order-bar{
        background:transparent;
        border-bottom-color:rgba(139,94,30,.12);
      }

      body.admin-light-mode .sm-option-order-number,
      body.sm-admin-light .sm-option-order-number,
      html[data-admin-theme="light"] .sm-option-order-number{
        color:#77541f;
      }

      body.admin-light-mode .sm-option-move,
      body.sm-admin-light .sm-option-move,
      html[data-admin-theme="light"] .sm-option-move{
        background:#fffaf2;
        color:#8d5d18;
        border-color:rgba(139,94,30,.2);
      }

      @media(max-width:650px){
        .sm-option-order-bar{
          margin-bottom:9px;
          padding:1px 0 7px;
        }
        .sm-option-order-number{font-size:11px}
        .sm-option-move{
          width:36px;
          height:34px;
          font-size:18px;
        }
      }
    `;
  }

  function activeRows() {
    const holder = document.getElementById('optionsEditor');
    if (!holder) return [];
    return [...holder.children]
      .filter(row => row instanceof Element && row.classList.contains('option-editor'))
      .filter(row => row.dataset.deleted !== '1' && row.style.display !== 'none');
  }

  function updatePositionLabels() {
    const rows = activeRows();
    rows.forEach((row, index) => {
      const label = row.querySelector('.sm-option-order-number');
      if (label) label.textContent = `الخيار ${index + 1}`;

      const up = row.querySelector('[data-sm-option-move="up"]');
      const down = row.querySelector('[data-sm-option-move="down"]');
      if (up) up.disabled = index === 0;
      if (down) down.disabled = index === rows.length - 1;
    });
  }

  function installRowControls(row) {
    if (!(row instanceof Element) || !row.classList.contains('option-editor')) return;

    // Remove every toolbar from older versions, including the drag handle/hint.
    row.querySelectorAll(':scope > .sm-option-order-bar').forEach(old => old.remove());

    const bar = document.createElement('div');
    bar.className = 'sm-option-order-bar';
    bar.dataset.smOptionOrderVersion = '1.4';
    bar.innerHTML = `
      <span class="sm-option-order-number"></span>
      <span class="sm-option-order-actions">
        <button class="sm-option-move" type="button" data-sm-option-move="up" aria-label="نقل الخيار للأعلى" title="نقل للأعلى">↑</button>
        <button class="sm-option-move" type="button" data-sm-option-move="down" aria-label="نقل الخيار للأسفل" title="نقل للأسفل">↓</button>
      </span>
    `;

    row.insertBefore(bar, row.firstChild);
  }

  function enhanceEditor() {
    const holder = document.getElementById('optionsEditor');
    if (!holder) return false;

    [...holder.children].forEach(row => {
      if (!(row instanceof Element) || !row.classList.contains('option-editor')) return;
      const current = row.querySelector(':scope > .sm-option-order-bar');
      if (!current || current.dataset.smOptionOrderVersion !== '1.4') {
        installRowControls(row);
      }
    });

    updatePositionLabels();
    return true;
  }

  function moveRow(row, direction) {
    const holder = document.getElementById('optionsEditor');
    if (!holder || !row) return;

    const rows = activeRows();
    const index = rows.indexOf(row);
    if (index < 0) return;

    if (direction === 'up' && index > 0) {
      holder.insertBefore(row, rows[index - 1]);
    } else if (direction === 'down' && index < rows.length - 1) {
      const afterNext = rows[index + 2] || null;
      holder.insertBefore(row, afterNext);
    } else {
      return;
    }

    updatePositionLabels();

    try {
      row.animate(
        [{ transform:'scale(.99)', opacity:.78 }, { transform:'scale(1)', opacity:1 }],
        { duration:150, easing:'ease-out' }
      );
    } catch (_) {}
  }

  function captureOrder() {
    return activeRows()
      .map((row, index) => ({
        position:index + 1,
        id:row.dataset.optionId || '',
        name:row.querySelector('.oe-name')?.value.trim() || '',
        price:Number(row.querySelector('.oe-price')?.value || 0)
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
      .order('sort_order', { ascending:true })
      .order('created_at', { ascending:true });

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
      resolved.push({ id:target.id, position:item.position });
    }

    if (resolved.length !== snapshot.length) {
      throw new Error('تعذر مطابقة بعض الخيارات بعد الحفظ. افتح الصنف وحاول مرة ثانية.');
    }

    for (const item of resolved) {
      const { error:updateError } = await supabaseClient
        .from('product_options')
        .update({ sort_order:item.position, updated_at:new Date().toISOString() })
        .eq('id', item.id);
      if (updateError) throw updateError;
    }
  }

  function patchSaveFunction() {
    if (savePatched) return true;
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

    savePatched = true;
    return true;
  }

  function lockBackgroundScroll() {
    if (modalIsLocked) return;
    modalIsLocked = true;
    lockedScrollY = window.scrollY || document.documentElement.scrollTop || 0;

    document.body.classList.add('sm-admin-modal-locked');
    document.body.style.position = 'fixed';
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }

  function unlockBackgroundScroll() {
    if (!modalIsLocked) return;
    modalIsLocked = false;

    document.body.classList.remove('sm-admin-modal-locked');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.overflow = '';

    window.scrollTo(0, lockedScrollY);
  }

  function syncModalScrollLock() {
    const modal = document.getElementById('editorModal');
    if (!modal) return;
    if (modal.classList.contains('open')) lockBackgroundScroll();
    else unlockBackgroundScroll();
  }

  function bindModalScrollLock() {
    const modal = document.getElementById('editorModal');
    if (!modal || modal.dataset.smScrollLockBound === '1') return;
    modal.dataset.smScrollLockBound = '1';

    new MutationObserver(syncModalScrollLock)
      .observe(modal, { attributes:true, attributeFilter:['class','aria-hidden'] });

    modal.addEventListener('touchmove', event => {
      if (event.target === modal) event.preventDefault();
    }, { passive:false });

    syncModalScrollLock();
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-sm-option-move]');
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();
    if (button.disabled) return;

    const row = button.closest('.option-editor');
    if (!row) return;
    moveRow(row, button.dataset.smOptionMove);
  }, true);

  function boot() {
    installStyles();
    patchSaveFunction();
    bindModalScrollLock();
    enhanceEditor();

    const observer = new MutationObserver(() => {
      patchSaveFunction();
      bindModalScrollLock();
      if (document.getElementById('optionsEditor')) requestAnimationFrame(enhanceEditor);
    });

    observer.observe(document.body, { childList:true, subtree:true });

    const timer = setInterval(() => {
      patchSaveFunction();
      bindModalScrollLock();
      enhanceEditor();
    }, 300);

    setTimeout(() => clearInterval(timer), 30000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once:true });
  } else {
    boot();
  }
})();

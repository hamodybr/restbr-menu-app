(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__RESTBR_ADMIN_PRODUCT_COLORS_V1__) return;
  window.__RESTBR_ADMIN_PRODUCT_COLORS_V1__ = true;

  const TABLE = 'product_colors';
  let tableAvailable = true;
  let currentContext = '';
  let editorObserver = null;
  let injectSequence = 0;

  const client = () => {
    try {
      if (typeof supabaseClient !== 'undefined' && supabaseClient) return supabaseClient;
    } catch (_) {}
    return window.supabaseClient || null;
  };

  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const uuid = () => {
    try {
      if (crypto?.randomUUID) return crypto.randomUUID();
    } catch (_) {}
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  function installStyles() {
    if (document.getElementById('restbrAdminProductColorsStyles')) return;
    const style = document.createElement('style');
    style.id = 'restbrAdminProductColorsStyles';
    style.textContent = `
      .restbr-color-editor{margin-top:14px;padding:13px;border:1px solid rgba(216,169,88,.18);border-radius:14px;background:rgba(216,169,88,.035)}
      .restbr-color-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px}
      .restbr-color-head b{color:#e0b364;font-size:13px}.restbr-color-head small{display:block;color:#8f8981;font-size:10px;margin-top:3px}
      .restbr-color-add{border:1px solid rgba(216,169,88,.28);background:#17130f;color:#e3c58e;border-radius:10px;padding:8px 10px;font-size:11px;font-weight:800}
      .restbr-color-rows{display:grid;gap:9px}
      .restbr-color-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) 105px;gap:8px;padding:10px;border:1px solid rgba(255,255,255,.07);border-radius:12px;background:rgba(0,0,0,.16)}
      .restbr-color-row label{display:flex;flex-direction:column;gap:5px;color:#a9a39a;font-size:10px;min-width:0}
      .restbr-color-row input[type=text],.restbr-color-row input[type=url]{width:100%;min-width:0;border:1px solid rgba(255,255,255,.1);background:#050403;color:#fff;border-radius:9px;padding:9px;outline:0;font:inherit;font-size:12px}
      .restbr-color-row input:focus{border-color:#c99545}
      .restbr-color-visual{display:grid;grid-template-columns:42px minmax(0,1fr);gap:7px;align-items:end}
      .restbr-color-visual input[type=color]{width:42px;height:38px;padding:2px;border:1px solid rgba(255,255,255,.12);border-radius:9px;background:#050403}
      .restbr-color-image{grid-column:1/-1;display:grid;grid-template-columns:48px minmax(0,1fr);gap:8px;align-items:center}
      .restbr-color-preview{width:48px;height:48px;border-radius:10px;object-fit:cover;background:#111;border:1px solid rgba(255,255,255,.1)}
      .restbr-color-image-tools{display:grid;gap:6px}.restbr-color-image-tools input[type=file]{max-width:100%;font-size:10px;color:#a9a39a}
      .restbr-color-switches{display:flex;gap:10px;align-items:center;flex-wrap:wrap;grid-column:1/-1}.restbr-color-switches label{display:flex;flex-direction:row;align-items:center;gap:6px;font-size:10px;color:#b9b0a5}
      .restbr-color-delete{margin-inline-start:auto;border:1px solid rgba(248,113,113,.32);background:rgba(95,20,20,.25);color:#fecaca;border-radius:9px;padding:7px 9px;font-size:10px;font-weight:800}
      .restbr-color-empty{padding:12px;text-align:center;color:#8f8981;font-size:11px;border:1px dashed rgba(255,255,255,.09);border-radius:10px}
      .restbr-color-install-note{padding:10px;border:1px solid rgba(245,158,11,.25);border-radius:10px;color:#f5d89c;background:rgba(245,158,11,.06);font-size:11px;line-height:1.7}
      @media(max-width:720px){.restbr-color-row{grid-template-columns:1fr 1fr}.restbr-color-visual{grid-column:1/-1}.restbr-color-row .restbr-color-en{grid-column:1/-1}}
      @media(max-width:480px){.restbr-color-row{grid-template-columns:1fr}.restbr-color-row .restbr-color-en,.restbr-color-visual{grid-column:auto}.restbr-color-image{grid-column:auto}.restbr-color-switches{grid-column:auto}}
    `;
    document.head.appendChild(style);
  }

  function rowHtml(color = {}) {
    const id = String(color.id || uuid());
    const image = String(color.image_url || color.image || '');
    const hex = /^#[0-9a-f]{6}$/i.test(String(color.hex_color || color.hex || ''))
      ? String(color.hex_color || color.hex)
      : '#d7d1cb';
    return `
      <div class="restbr-color-row" data-color-id="${esc(id)}" data-existing="${color.id ? '1' : '0'}">
        <label>الاسم العربي<input class="restbr-color-ar" type="text" maxlength="80" value="${esc(color.name_ar || color.ar || '')}" placeholder="مثلاً: وردي"></label>
        <label>الكوردي<input class="restbr-color-ku" type="text" maxlength="80" value="${esc(color.name_ku || color.ku || '')}" placeholder="اختياري"></label>
        <label class="restbr-color-en">English<input class="restbr-color-en-input" type="text" maxlength="80" value="${esc(color.name_en || color.en || '')}" placeholder="Optional"></label>
        <div class="restbr-color-visual">
          <label>اللون<input class="restbr-color-hex-picker" type="color" value="${esc(hex)}"></label>
          <label>HEX<input class="restbr-color-hex" type="text" maxlength="7" dir="ltr" value="${esc(hex)}"></label>
        </div>
        <div class="restbr-color-image">
          <img class="restbr-color-preview" src="${esc(image)}" alt="" ${image ? '' : 'hidden'}>
          <div class="restbr-color-image-tools">
            <input class="restbr-color-image-url" type="url" value="${esc(image)}" placeholder="رابط صورة اللون (اختياري)">
            <input class="restbr-color-image-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif">
          </div>
        </div>
        <div class="restbr-color-switches">
          <label><input class="restbr-color-active" type="checkbox" ${color.is_active === false ? '' : 'checked'}> إظهار اللون</label>
          <label><input class="restbr-color-available" type="checkbox" ${color.is_available === false ? '' : 'checked'}> متوفر</label>
          <button class="restbr-color-delete" type="button">حذف اللون</button>
        </div>
      </div>`;
  }

  function editorShellHtml() {
    return `
      <div class="restbr-color-editor" id="restbrColorEditor">
        <div class="restbr-color-head">
          <div><b>ألوان الصنف</b><small>يمكن ربط صورة مستقلة بكل لون. اللون المختار ينتقل إلى السلة والطلب.</small></div>
          <button class="restbr-color-add" id="restbrAddColorBtn" type="button">+ لون</button>
        </div>
        <div class="restbr-color-rows" id="restbrColorRows"><div class="restbr-color-empty">جاري تحميل الألوان...</div></div>
      </div>`;
  }

  function parseExistingProductId() {
    const btn = document.getElementById('saveProductBtn');
    const onclick = String(btn?.getAttribute('onclick') || '');
    const match = onclick.match(/saveAdminProduct\(['"]([^'"]+)['"]\)/);
    return match?.[1] || '';
  }

  async function loadRows(productId) {
    const c = client();
    if (!c || !productId) return [];
    const { data, error } = await c
      .from(TABLE)
      .select('*')
      .eq('product_id', productId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      const code = String(error.code || '');
      const message = String(error.message || '');
      if (code === '42P01' || code === 'PGRST205' || /product_colors/i.test(message)) {
        tableAvailable = false;
        return [];
      }
      throw error;
    }
    tableAvailable = true;
    return Array.isArray(data) ? data : [];
  }

  function renderRows(rows) {
    const holder = document.getElementById('restbrColorRows');
    if (!holder) return;
    if (!tableAvailable) {
      holder.innerHTML = '<div class="restbr-color-install-note">نظام الألوان موجود في الكود لكن جدول product_colors غير مثبت على قاعدة البيانات الحالية. شغّل migration الخاصة بنظام الألوان أولاً.</div>';
      return;
    }
    holder.innerHTML = rows.length
      ? rows.map(rowHtml).join('')
      : '<div class="restbr-color-empty">لا توجد ألوان لهذا الصنف. اضغط + لون لإضافة أول لون.</div>';
  }

  async function injectEditor(mode, productId = '') {
    installStyles();
    const body = document.getElementById('editorBody');
    if (!body) return;
    const context = `${mode}:${productId}`;
    if (currentContext === context && document.getElementById('restbrColorEditor')) return;
    currentContext = context;
    const seq = ++injectSequence;

    body.insertAdjacentHTML('beforeend', editorShellHtml());
    if (mode === 'new') {
      tableAvailable = true;
      renderRows([]);
      return;
    }

    try {
      const rows = await loadRows(productId);
      if (seq !== injectSequence || currentContext !== context) return;
      renderRows(rows);
    } catch (error) {
      console.warn('RESTBR color editor load failed:', error);
      const holder = document.getElementById('restbrColorRows');
      if (holder) holder.innerHTML = `<div class="restbr-color-install-note">تعذر تحميل الألوان: ${esc(error.message || error)}</div>`;
    }
  }

  function maybeInject() {
    const modal = document.getElementById('editorModal');
    if (!modal?.classList.contains('open')) {
      currentContext = '';
      return;
    }
    const save = document.getElementById('saveProductBtn');
    if (save) {
      const productId = parseExistingProductId();
      if (productId) void injectEditor('existing', productId);
      return;
    }
    const create = document.getElementById('createProductBtn');
    if (create) void injectEditor('new');
  }

  function addEmptyRow() {
    if (!tableAvailable) return;
    const holder = document.getElementById('restbrColorRows');
    if (!holder) return;
    holder.querySelector('.restbr-color-empty')?.remove();
    holder.insertAdjacentHTML('beforeend', rowHtml({}));
    holder.lastElementChild?.querySelector('.restbr-color-ar')?.focus();
  }

  function normalizeHex(value) {
    const clean = String(value || '').trim();
    if (/^#[0-9a-f]{6}$/i.test(clean)) return clean.toUpperCase();
    return null;
  }

  function snapshotRows() {
    const root = document.getElementById('restbrColorRows');
    if (!root) return [];
    return [...root.querySelectorAll('.restbr-color-row')]
      .filter(row => row.dataset.deleted !== '1')
      .map((row, index) => ({
        id: String(row.dataset.colorId || uuid()),
        existing: row.dataset.existing === '1',
        name_ar: row.querySelector('.restbr-color-ar')?.value.trim() || '',
        name_ku: row.querySelector('.restbr-color-ku')?.value.trim() || '',
        name_en: row.querySelector('.restbr-color-en-input')?.value.trim() || '',
        hex_color: normalizeHex(row.querySelector('.restbr-color-hex')?.value) || normalizeHex(row.querySelector('.restbr-color-hex-picker')?.value),
        image_url: row.querySelector('.restbr-color-image-url')?.value.trim() || '',
        file: row.querySelector('.restbr-color-image-file')?.files?.[0] || null,
        is_active: row.querySelector('.restbr-color-active')?.checked !== false,
        is_available: row.querySelector('.restbr-color-available')?.checked !== false,
        sort_order: index + 1
      }));
  }

  function deletedIds() {
    const root = document.getElementById('restbrColorRows');
    if (!root) return [];
    return [...root.querySelectorAll('.restbr-color-row[data-deleted="1"][data-existing="1"]')]
      .map(row => String(row.dataset.colorId || ''))
      .filter(Boolean);
  }

  async function uploadColorImage(productId, row) {
    if (!row.file) return row.image_url || null;
    if (!row.file.type.startsWith('image/')) throw new Error('ملف صورة اللون غير صالح');
    if (row.file.size > 10 * 1024 * 1024) throw new Error('صورة اللون أكبر من 10MB');

    const ext = ({
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/avif': 'avif'
    })[row.file.type] || 'jpg';

    const path = `colors/${String(productId).replace(/[^a-zA-Z0-9_-]/g, '_')}/${row.id}-${Date.now()}.${ext}`;
    const c = client();
    const uploaded = await c.storage.from('menu-images').upload(path, row.file, {
      cacheControl: '31536000',
      upsert: false,
      contentType: row.file.type
    });
    if (uploaded.error) throw uploaded.error;
    const publicUrl = c.storage.from('menu-images').getPublicUrl(path)?.data?.publicUrl;
    if (!publicUrl) throw new Error('تعذر إنشاء رابط صورة اللون');
    return publicUrl;
  }

  async function persistSnapshot(productId, rows, removals = []) {
    if (!tableAvailable || !rows) return;
    const c = client();
    if (!c) throw new Error('Supabase غير متصل');

    for (const row of rows) {
      if (!row.name_ar) throw new Error('كل لون يحتاج اسماً عربياً');
      if (!row.hex_color) throw new Error(`قيمة HEX غير صحيحة للون: ${row.name_ar}`);
      const imageUrl = await uploadColorImage(productId, row);
      const payload = {
        id: row.id,
        product_id: productId,
        name_ar: row.name_ar,
        name_ku: row.name_ku || null,
        name_en: row.name_en || null,
        hex_color: row.hex_color,
        image_url: imageUrl || null,
        sort_order: row.sort_order,
        is_active: row.is_active,
        is_available: row.is_available
      };
      const result = await c.from(TABLE).upsert(payload, { onConflict: 'id' });
      if (result.error) throw result.error;
    }

    if (removals.length) {
      const result = await c.from(TABLE).delete().in('id', removals);
      if (result.error) throw result.error;
    }
  }

  function showError(message) {
    try {
      if (typeof showEditorMsg === 'function') {
        showEditorMsg(message, false);
        return;
      }
    } catch (_) {}
    alert(message);
  }

  async function saveExistingProduct(button) {
    const productId = parseExistingProductId();
    if (!productId || !tableAvailable) {
      if (typeof saveAdminProduct === 'function') return saveAdminProduct(productId);
      return;
    }
    const rows = snapshotRows();
    const removals = deletedIds();
    const previousText = button.textContent;
    button.disabled = true;
    button.textContent = 'جاري حفظ الألوان...';
    try {
      await persistSnapshot(productId, rows, removals);
      button.disabled = false;
      button.textContent = previousText;
      if (typeof saveAdminProduct !== 'function') throw new Error('تعذر الوصول إلى حفظ الصنف');
      await saveAdminProduct(productId);
    } catch (error) {
      console.error('RESTBR SAVE PRODUCT COLORS ERROR:', error);
      button.disabled = false;
      button.textContent = previousText;
      showError('فشل حفظ ألوان الصنف: ' + (error.message || error));
    }
  }

  async function createProductWithColors(button) {
    if (!tableAvailable || typeof createAdminProduct !== 'function') {
      if (typeof createAdminProduct === 'function') await createAdminProduct();
      return;
    }

    const rows = snapshotRows();
    const before = new Set();
    try {
      if (typeof adminProducts !== 'undefined' && Array.isArray(adminProducts)) {
        adminProducts.forEach(product => before.add(String(product.id)));
      }
    } catch (_) {}

    const previousText = button.textContent;
    try {
      await createAdminProduct();
      let created = null;
      try {
        if (typeof adminProducts !== 'undefined' && Array.isArray(adminProducts)) {
          created = adminProducts.find(product => !before.has(String(product.id))) || null;
        }
      } catch (_) {}

      if (!created?.id || !rows.length) return;
      button.disabled = true;
      button.textContent = 'جاري حفظ الألوان...';
      await persistSnapshot(String(created.id), rows, []);
    } catch (error) {
      console.error('RESTBR CREATE PRODUCT COLORS ERROR:', error);
      showError('تمت محاولة إضافة الصنف لكن تعذر إكمال الألوان: ' + (error.message || error));
    } finally {
      button.disabled = false;
      button.textContent = previousText;
    }
  }

  document.addEventListener('click', event => {
    const add = event.target.closest?.('#restbrAddColorBtn');
    if (add) {
      event.preventDefault();
      addEmptyRow();
      return;
    }

    const del = event.target.closest?.('.restbr-color-delete');
    if (del) {
      event.preventDefault();
      const row = del.closest('.restbr-color-row');
      if (!row) return;
      if (row.dataset.existing === '1') {
        row.dataset.deleted = '1';
        row.hidden = true;
      } else {
        row.remove();
      }
      const holder = document.getElementById('restbrColorRows');
      if (holder && !holder.querySelector('.restbr-color-row:not([data-deleted="1"])')) {
        holder.insertAdjacentHTML('beforeend', '<div class="restbr-color-empty">لا توجد ألوان لهذا الصنف. اضغط + لون لإضافة أول لون.</div>');
      }
      return;
    }

    const save = event.target.closest?.('#saveProductBtn');
    if (save && document.getElementById('restbrColorEditor')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      void saveExistingProduct(save);
      return;
    }

    const create = event.target.closest?.('#createProductBtn');
    if (create && document.getElementById('restbrColorEditor')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      void createProductWithColors(create);
    }
  }, true);

  document.addEventListener('input', event => {
    const picker = event.target.closest?.('.restbr-color-hex-picker');
    if (picker) {
      const row = picker.closest('.restbr-color-row');
      const text = row?.querySelector('.restbr-color-hex');
      if (text) text.value = String(picker.value || '').toUpperCase();
      return;
    }
    const hex = event.target.closest?.('.restbr-color-hex');
    if (hex) {
      const normalized = normalizeHex(hex.value);
      const pickerInput = hex.closest('.restbr-color-row')?.querySelector('.restbr-color-hex-picker');
      if (normalized && pickerInput) pickerInput.value = normalized;
      return;
    }
    const url = event.target.closest?.('.restbr-color-image-url');
    if (url) {
      const preview = url.closest('.restbr-color-row')?.querySelector('.restbr-color-preview');
      if (preview) {
        preview.src = url.value.trim();
        preview.hidden = !url.value.trim();
      }
    }
  }, true);

  document.addEventListener('change', event => {
    const fileInput = event.target.closest?.('.restbr-color-image-file');
    if (!fileInput) return;
    const file = fileInput.files?.[0];
    const row = fileInput.closest('.restbr-color-row');
    const preview = row?.querySelector('.restbr-color-preview');
    if (!preview || !file) return;
    preview.src = URL.createObjectURL(file);
    preview.hidden = false;
  }, true);

  function boot() {
    installStyles();
    const modal = document.getElementById('editorModal');
    const body = document.getElementById('editorBody');
    if (!modal || !body) return;
    if (!editorObserver) {
      let raf = 0;
      editorObserver = new MutationObserver(() => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(maybeInject);
      });
      editorObserver.observe(body, { childList: true, subtree: false });
      editorObserver.observe(modal, { attributes: true, attributeFilter: ['class'] });
    }
    maybeInject();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();

(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;

  let patched = false;

  function normalizeMode(value) {
    const mode = String(value || '').trim();
    return ['both', 'dinein', 'takeaway'].includes(mode) ? mode : 'both';
  }

  function installStyles() {
    if (document.getElementById('smAdminServiceModeStyles')) return;

    const style = document.createElement('style');
    style.id = 'smAdminServiceModeStyles';
    style.textContent = `
      .sm-service-mode-field{
        grid-column:1/-1;
        margin-top:2px;
        padding:13px;
        border:1px solid rgba(216,169,88,.16);
        border-radius:13px;
        background:rgba(216,169,88,.045);
      }
      .sm-service-mode-field select{width:100%}
      .sm-service-mode-help{
        display:block;
        margin-top:7px;
        color:#8f8981;
        font-size:11px;
        line-height:1.6;
      }
    `;
    document.head.appendChild(style);
  }

  function fieldMarkup(selectId, mode) {
    const value = normalizeMode(mode);
    return `
      <label>مكان ظهور الصنف</label>
      <select id="${selectId}">
        <option value="both" ${value === 'both' ? 'selected' : ''}>داخل المطعم والسفري</option>
        <option value="dinein" ${value === 'dinein' ? 'selected' : ''}>داخل المطعم فقط</option>
        <option value="takeaway" ${value === 'takeaway' ? 'selected' : ''}>سفري فقط</option>
      </select>
      <small class="sm-service-mode-help">
        هذا الخيار يتحكم بظهور الصنف بعد أن يختار الزبون «داخل المطعم» أو «سفري».
      </small>
    `;
  }

  function injectField(selectId, mode = 'both') {
    installStyles();

    const form = document.querySelector('#editorModal .form-grid');
    if (!form) return null;

    let field = form.querySelector(`.sm-service-mode-field[data-select-id="${selectId}"]`);
    if (!field) {
      field = document.createElement('div');
      field.className = 'field full sm-service-mode-field';
      field.dataset.selectId = selectId;
      form.appendChild(field);
    }

    field.innerHTML = fieldMarkup(selectId, mode);
    return field.querySelector(`#${selectId}`);
  }

  function readMode(selectId) {
    return normalizeMode(document.getElementById(selectId)?.value || 'both');
  }

  async function fetchProductMode(productId) {
    if (!productId || typeof supabaseClient === 'undefined' || !supabaseClient) return 'both';

    const { data, error } = await supabaseClient
      .from('products')
      .select('service_mode')
      .eq('id', productId)
      .maybeSingle();

    if (error) throw error;
    return normalizeMode(data?.service_mode);
  }

  async function syncProductMode(productId, mode) {
    if (!productId || typeof supabaseClient === 'undefined' || !supabaseClient) return;

    const expected = normalizeMode(mode);

    const { error } = await supabaseClient
      .from('products')
      .update({ service_mode: expected })
      .eq('id', productId);

    if (error) throw error;

    const actual = await fetchProductMode(productId);
    if (actual !== expected) {
      throw new Error(`service_mode verification failed: expected ${expected}, got ${actual}`);
    }
  }

  async function productIdsByName(nameAr, categoryId) {
    if (!nameAr || typeof supabaseClient === 'undefined' || !supabaseClient) return [];

    let query = supabaseClient
      .from('products')
      .select('id')
      .eq('name_ar', nameAr);

    if (categoryId) query = query.eq('category_id', categoryId);

    const { data, error } = await query;
    if (error) return [];
    return (data || []).map(row => String(row.id));
  }

  function showModeSaveError(error) {
    console.error('Service mode save failed:', error);
    if (typeof window.showEditorMsg === 'function') {
      window.showEditorMsg(
        'تعذر حفظ مكان ظهور الصنف. حاول مرة ثانية.',
        false
      );
    }
  }

  function patchFunctions() {
    if (patched) return true;

    if (
      typeof window.editAdminProduct !== 'function' ||
      typeof window.openAddProductEditor !== 'function' ||
      typeof window.saveAdminProduct !== 'function' ||
      typeof window.createAdminProduct !== 'function'
    ) return false;

    installStyles();

    const oldEditAdminProduct = window.editAdminProduct;
    window.editAdminProduct = function(productId) {
      const result = oldEditAdminProduct.apply(this, arguments);

      const cached = Array.isArray(window.adminProducts)
        ? window.adminProducts.find(row => String(row?.id) === String(productId))
        : null;

      injectField('p_service_mode', cached?.service_mode || 'both');

      void fetchProductMode(productId)
        .then(mode => {
          const select = document.getElementById('p_service_mode');
          if (select) select.value = mode;
        })
        .catch(error => console.debug('Service mode read fallback:', error?.message || error));

      return result;
    };

    const oldOpenAddProductEditor = window.openAddProductEditor;
    window.openAddProductEditor = function() {
      const result = oldOpenAddProductEditor.apply(this, arguments);
      injectField('np_service_mode', 'both');
      return result;
    };

    const oldSaveAdminProduct = window.saveAdminProduct;
    window.saveAdminProduct = async function(productId) {
      const mode = readMode('p_service_mode');

      try {
        await syncProductMode(productId, mode);
      } catch (error) {
        showModeSaveError(error);
        return;
      }

      const result = await oldSaveAdminProduct.apply(this, arguments);

      try {
        await syncProductMode(productId, mode);
      } catch (error) {
        showModeSaveError(error);
      }

      return result;
    };

    const oldCreateAdminProduct = window.createAdminProduct;
    window.createAdminProduct = async function() {
      const nameAr = document.getElementById('np_name_ar')?.value.trim() || '';
      const categoryId = document.getElementById('np_category_id')?.value || '';
      const mode = readMode('np_service_mode');
      const beforeIds = new Set(await productIdsByName(nameAr, categoryId));

      const result = await oldCreateAdminProduct.apply(this, arguments);

      try {
        const afterIds = await productIdsByName(nameAr, categoryId);
        const newId = afterIds.find(id => !beforeIds.has(id));
        if (newId) await syncProductMode(newId, mode);
      } catch (error) {
        showModeSaveError(error);
      }

      return result;
    };

    patched = true;
    return true;
  }

  const timer = setInterval(() => {
    if (patchFunctions()) clearInterval(timer);
  }, 120);

  window.addEventListener('load', patchFunctions, { once: true });
  setTimeout(() => clearInterval(timer), 12000);
})();

(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;
  if (window.__SHORASH_FULL_RESTORE_DISCOUNTS_V1__) return;
  window.__SHORASH_FULL_RESTORE_DISCOUNTS_V1__ = true;

  function setStatus(message = '', ok = true) {
    try {
      if (typeof setBackupStatus === 'function') {
        setBackupStatus(message, ok);
        return;
      }
    } catch (_) {}

    const el = document.getElementById('backupStatus');
    if (!el) return;
    el.textContent = message;
    el.style.color = ok ? '#baf3d7' : '#fecaca';
  }

  async function upsertInChunks(table, rows) {
    if (!Array.isArray(rows) || !rows.length) return;
    for (let i = 0; i < rows.length; i += 100) {
      const { error } = await supabaseClient
        .from(table)
        .upsert(rows.slice(i, i + 100), { onConflict: 'id' });
      if (error) throw error;
    }
  }

  async function restorePrices(productPrices, optionPrices) {
    const pp = Array.isArray(productPrices) ? productPrices : [];
    const po = Array.isArray(optionPrices) ? optionPrices : [];

    for (let i = 0; i < pp.length; i += 40) {
      await Promise.all(pp.slice(i, i + 40).map(async row => {
        if (!row?.id) return;
        const patch = {};
        if (Object.prototype.hasOwnProperty.call(row, 'base_price')) patch.base_price = row.base_price;
        if (!Object.keys(patch).length) return;
        const { error } = await supabaseClient.from('products').update(patch).eq('id', row.id);
        if (error) throw error;
      }));
    }

    for (let i = 0; i < po.length; i += 60) {
      await Promise.all(po.slice(i, i + 60).map(async row => {
        if (!row?.id) return;
        const patch = {};
        if (Object.prototype.hasOwnProperty.call(row, 'price')) patch.price = row.price;
        if (Object.prototype.hasOwnProperty.call(row, 'takeaway_price')) patch.takeaway_price = row.takeaway_price;
        if (!Object.keys(patch).length) return;
        const { error } = await supabaseClient.from('product_options').update(patch).eq('id', row.id);
        if (error) throw error;
      }));
    }

    return { price_products: pp.length, price_options: po.length };
  }

  function readBackupData(payload) {
    if (!payload || payload.format !== 'SHORASH_MENU_BACKUP') {
      throw new Error('هذا الملف ليس Backup مدعوم.');
    }

    const d = payload.data || {};
    return {
      categories: Array.isArray(d.categories) ? d.categories : [],
      products: Array.isArray(d.products) ? d.products : [],
      options: Array.isArray(d.product_options) ? d.product_options : [],
      settings: Array.isArray(d.restaurant_settings) ? d.restaurant_settings : [],
      discounts: Array.isArray(d.discounts) ? d.discounts : [],
      priceProducts: Array.isArray(d.price_products) ? d.price_products : [],
      priceOptions: Array.isArray(d.price_options) ? d.price_options : []
    };
  }

  function hasRestorableData(data) {
    return data.categories.length ||
      data.products.length ||
      data.options.length ||
      data.settings.length ||
      data.discounts.length ||
      data.priceProducts.length ||
      data.priceOptions.length;
  }

  async function restoreBackupObjectEnhanced(payload) {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) {
      throw new Error('Supabase غير جاهز.');
    }

    const data = readBackupData(payload);
    if (!hasRestorableData(data)) {
      throw new Error('النسخة لا تحتوي بيانات قابلة للاسترجاع.');
    }

    // Keep the same non-destructive restore policy used by the original admin:
    // matching IDs are updated and missing IDs are inserted; unrelated current
    // rows are never deleted.
    await upsertInChunks('restaurant_settings', data.settings);
    await upsertInChunks('categories', data.categories);
    await upsertInChunks('products', data.products);
    await upsertInChunks('product_options', data.options);
    await upsertInChunks('discounts', data.discounts);

    const priceResult = await restorePrices(data.priceProducts, data.priceOptions);

    try {
      if (typeof loadAdminDashboard === 'function') await loadAdminDashboard();
    } catch (error) {
      console.warn('Dashboard refresh after restore failed:', error);
    }

    return {
      categories: data.categories.length,
      products: data.products.length,
      options: data.options.length,
      settings: data.settings.length,
      discounts: data.discounts.length,
      price_products: priceResult.price_products,
      price_options: priceResult.price_options
    };
  }

  async function handleRestoreFileEnhanced(file) {
    if (!file) return;

    let payload;
    let data;
    try {
      payload = JSON.parse(await file.text());
      data = readBackupData(payload);
      if (!hasRestorableData(data)) throw new Error('النسخة لا تحتوي بيانات قابلة للاسترجاع.');
    } catch (error) {
      setStatus('فشل قراءة النسخة: ' + (error?.message || error), false);
      alert('فشل قراءة النسخة: ' + (error?.message || error));
      return;
    }

    const summary = [
      data.settings.length ? `إعدادات ${data.settings.length}` : '',
      data.categories.length ? `أقسام ${data.categories.length}` : '',
      data.products.length ? `أصناف ${data.products.length}` : '',
      data.options.length ? `خيارات ${data.options.length}` : '',
      data.discounts.length ? `خصومات ${data.discounts.length}` : '',
      (data.priceProducts.length || data.priceOptions.length)
        ? `أسعار ${data.priceProducts.length + data.priceOptions.length}`
        : ''
    ].filter(Boolean).join('، ');

    const proceed = confirm(
      `سيتم استرجاع البيانات الموجودة داخل النسخة الاحتياطية.\n\n` +
      `${summary || 'بيانات Backup'}\n\n` +
      `السجلات المتطابقة سيتم تحديثها، والجديدة ستتم إضافتها، ولن نحذف أي بيانات أخرى غير موجودة في النسخة.\n\n` +
      `هل تريد المتابعة؟`
    );
    if (!proceed) return;

    setStatus('جاري استرجاع النسخة والخصومات...');

    try {
      const result = await restoreBackupObjectEnhanced(payload);
      const parts = [];
      if (result.settings) parts.push(`إعدادات: ${result.settings}`);
      if (result.categories) parts.push(`أقسام: ${result.categories}`);
      if (result.products) parts.push(`أصناف: ${result.products}`);
      if (result.options) parts.push(`خيارات: ${result.options}`);
      if (result.discounts) parts.push(`خصومات: ${result.discounts}`);
      if (result.price_products || result.price_options) {
        parts.push(`أسعار: ${result.price_products + result.price_options}`);
      }

      setStatus('تم الاسترجاع بنجاح ✓' + (parts.length ? ' — ' + parts.join('، ') : ''));
      alert('تم استرجاع النسخة الاحتياطية بنجاح ✓');

      // A reload makes every admin module (including the discounts panel)
      // re-read the restored database state.
      setTimeout(() => location.reload(), 250);
    } catch (error) {
      console.error('ENHANCED RESTORE ERROR:', error);
      setStatus('فشل الاسترجاع: ' + (error?.message || error), false);
      alert('فشل الاسترجاع: ' + (error?.message || error));
    } finally {
      const input = document.getElementById('restoreBackupInput');
      if (input) input.value = '';
    }
  }

  // Capture the file-input change before the original inline restore handler,
  // so only this enhanced implementation runs.
  document.addEventListener('change', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.id !== 'restoreBackupInput') return;

    event.preventDefault();
    event.stopImmediatePropagation();
    void handleRestoreFileEnhanced(input.files?.[0]);
  }, true);
})();

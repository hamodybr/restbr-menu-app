(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;
  if (window.__SHORASH_EXCEL_EXPORT_TAKEAWAY_V1__) return;
  window.__SHORASH_EXCEL_EXPORT_TAKEAWAY_V1__ = true;

  const byId = id => document.getElementById(id);

  function setStatus(message = '', ok = true) {
    try {
      if (typeof setExcelStatus === 'function') {
        setExcelStatus(message, ok);
        return;
      }
    } catch (_) {}

    const el = byId('excelStatus');
    if (!el) return;
    el.textContent = message;
    el.style.color = ok ? '#baf3d7' : '#fecaca';
  }

  function fileDate() {
    return new Date().toISOString().replace(/[:.]/g, '-');
  }

  function prefix() {
    try {
      if (typeof backupPrefix === 'function') return backupPrefix();
    } catch (_) {}
    return 'shorash';
  }

  async function fetchRows() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) {
      throw new Error('Supabase غير جاهز.');
    }

    const [categoriesRes, productsRes, optionsRes] = await Promise.all([
      supabaseClient.from('categories').select('*').order('sort_order', { ascending: true }),
      supabaseClient.from('products').select('*').order('sort_order', { ascending: true }),
      supabaseClient.from('product_options').select('*').order('sort_order', { ascending: true })
    ]);

    const error = [categoriesRes, productsRes, optionsRes].find(r => r?.error)?.error;
    if (error) throw error;

    return {
      categories: categoriesRes.data || [],
      products: productsRes.data || [],
      options: optionsRes.data || []
    };
  }

  async function exportEnhancedExcel(button) {
    if (typeof XLSX === 'undefined') {
      setStatus('مكتبة Excel لم تتحمل. سوِّ Refresh وحاول مرة ثانية.', false);
      return;
    }

    const oldText = button?.textContent || '';
    if (button) {
      button.disabled = true;
      button.textContent = 'جاري إنشاء Excel...';
    }

    setStatus('جاري قراءة بيانات المنيو وأسعار الداخل والسفري...');

    try {
      const source = await fetchRows();
      const wb = XLSX.utils.book_new();

      const instructions = [
        ['SHORASH MENU — Excel'],
        ['طريقة الاستخدام'],
        ['1', 'لا تغيّر عمود id للسجلات الموجودة.'],
        ['2', 'يمكن تعديل الأسماء، الأسعار، الحالات، الترتيب وأوقات التوفر.'],
        ['3', 'في Sheet Options: price = سعر داخل المطعم، takeaway_price = سعر السفري.'],
        ['4', 'الاستيراد يحدّث السجلات الموجودة فقط ولا يحذف سجلات.'],
        ['5', 'قبل الاستيراد يحفظ Admin Backup كامل تلقائياً.'],
        ['6', 'حقول الوقت بصيغة HH:MM مثل 11:00 أو 00:00.']
      ];

      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(instructions), 'README');

      const categories = source.categories.map(c => ({
        id: c.id,
        name_ar: c.name_ar ?? '',
        name_ku: c.name_ku ?? '',
        name_en: c.name_en ?? '',
        is_active: c.is_active !== false,
        is_visible: c.is_visible !== false,
        sort_order: c.sort_order ?? '',
        availability_schedule_enabled: c.availability_schedule_enabled === true,
        available_from: String(c.available_from || '').slice(0, 5),
        available_to: String(c.available_to || '').slice(0, 5)
      }));

      const categoriesById = new Map(source.categories.map(c => [String(c.id), c]));
      const products = source.products.map(p => {
        const category = categoriesById.get(String(p.category_id));
        return {
          id: p.id,
          category_id: p.category_id ?? '',
          category_ar: category?.name_ar ?? '',
          name_ar: p.name_ar ?? '',
          name_ku: p.name_ku ?? '',
          name_en: p.name_en ?? '',
          base_price: p.base_price ?? '',
          image_url: p.image_url ?? '',
          is_active: p.is_active !== false,
          is_visible: p.is_visible !== false,
          is_available: p.is_available !== false,
          sort_order: p.sort_order ?? '',
          availability_schedule_enabled: p.availability_schedule_enabled === true,
          available_from: String(p.available_from || '').slice(0, 5),
          available_to: String(p.available_to || '').slice(0, 5)
        };
      });

      const options = source.options.map(o => ({
        id: o.id,
        product_id: o.product_id ?? '',
        name_ar: o.name_ar ?? '',
        name_ku: o.name_ku ?? '',
        name_en: o.name_en ?? '',
        price: o.price ?? '',
        takeaway_price: o.takeaway_price ?? '',
        sort_order: o.sort_order ?? ''
      }));

      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(categories), 'Categories');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(products), 'Products');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(options), 'Options');

      XLSX.writeFile(wb, `${prefix()}-menu-${fileDate()}.xlsx`);
      setStatus(`تم تنزيل Excel الحالي ✓ (${categories.length} قسم، ${products.length} صنف، ${options.length} خيار — داخل + سفري)`);
    } catch (error) {
      console.error('ENHANCED EXCEL EXPORT ERROR:', error);
      setStatus('فشل تصدير Excel: ' + (error?.message || error), false);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = oldText || 'تنزيل Excel الحالي';
      }
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('#exportExcelBtn');
    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    void exportEnhancedExcel(button);
  }, true);
})();

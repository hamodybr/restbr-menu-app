(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;
  if (window.__SHORASH_FULL_BACKUP_DISCOUNTS_V1__) return;
  window.__SHORASH_FULL_BACKUP_DISCOUNTS_V1__ = true;

  function safeName(value) {
    return String(value || 'restaurant')
      .trim()
      .replace(/[^\p{L}\p{N}_-]+/gu, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50) || 'restaurant';
  }

  function fileDate() {
    return new Date().toISOString().replace(/[:.]/g, '-');
  }

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

  function downloadJson(filename, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  async function fetchAll() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) {
      throw new Error('Supabase غير جاهز.');
    }

    const [categoriesRes, productsRes, optionsRes, settingsRes, discountsRes] = await Promise.all([
      supabaseClient.from('categories').select('*').order('sort_order', { ascending: true }),
      supabaseClient.from('products').select('*').order('sort_order', { ascending: true }),
      supabaseClient.from('product_options').select('*').order('sort_order', { ascending: true }),
      supabaseClient.from('restaurant_settings').select('*').limit(1),
      supabaseClient.from('discounts').select('*').order('created_at', { ascending: false })
    ]);

    const responses = [categoriesRes, productsRes, optionsRes, settingsRes, discountsRes];
    const error = responses.find(r => r?.error)?.error;
    if (error) throw error;

    return {
      categories: categoriesRes.data || [],
      products: productsRes.data || [],
      product_options: optionsRes.data || [],
      restaurant_settings: settingsRes.data || [],
      discounts: discountsRes.data || []
    };
  }

  async function createEnhancedFullBackup(button) {
    const oldText = button?.textContent || '';
    if (button) {
      button.disabled = true;
      button.textContent = 'جاري إنشاء النسخة...';
    }
    setStatus('جاري قراءة كل بيانات المنيو والخصومات...', true);

    try {
      const data = await fetchAll();
      const restaurant = String(
        data.restaurant_settings?.[0]?.name_ar ||
        data.restaurant_settings?.[0]?.restaurant_name ||
        ''
      ).trim();

      const payload = {
        format: 'SHORASH_MENU_BACKUP',
        version: 3,
        created_at: new Date().toISOString(),
        scope: 'full',
        restaurant,
        note: 'Menu backup generated from the restaurant admin dashboard.',
        data
      };

      downloadJson(`${safeName(restaurant)}-full-${fileDate()}.json`, payload);
      setStatus(
        `تم إنشاء نسخة كاملة ✓ (${data.categories.length} قسم، ${data.products.length} صنف، ${data.product_options.length} خيار، ${data.discounts.length} خصم)`,
        true
      );
      return payload;
    } catch (error) {
      console.error('ENHANCED FULL BACKUP ERROR:', error);
      setStatus('فشل إنشاء النسخة الكاملة: ' + (error?.message || error), false);
      return null;
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = oldText || 'إنشاء النسخة';
      }
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('#backupFullBtn, #backupSelectedTypeBtn');
    if (!button) return;

    if (button.id === 'backupSelectedTypeBtn') {
      const type = document.getElementById('backupTypeSelect')?.value || 'full';
      if (type !== 'full') return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    void createEnhancedFullBackup(button);
  }, true);
})();

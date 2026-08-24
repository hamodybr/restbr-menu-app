(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;
  if (window.__SHORASH_BULK_PRICE_TARGET_UI_V2__) return;
  window.__SHORASH_BULK_PRICE_TARGET_UI_V2__ = true;

  const LABELS = {
    dinein: 'داخل المطعم فقط',
    takeaway: 'سفري فقط',
    both: 'داخل + سفري'
  };

  function install() {
    let target = document.getElementById('bulkPriceTargetMode');

    if (!target) {
      const scope = document.getElementById('bulkPriceCategorySelect');
      const scopeField = scope?.closest('.bulk-price-field');
      if (!scope || !scopeField) return false;

      const field = document.createElement('div');
      field.className = 'bulk-price-field full';
      field.id = 'bulkPriceTargetField';
      field.innerHTML = `
        <label for="bulkPriceTargetMode">نوع السعر المراد تغييره</label>
        <select id="bulkPriceTargetMode">
          <option value="dinein">داخل المطعم فقط</option>
          <option value="takeaway">سفري فقط</option>
          <option value="both">داخل + سفري</option>
        </select>
      `;

      scopeField.insertAdjacentElement('beforebegin', field);
      target = document.getElementById('bulkPriceTargetMode');
    }

    if (!target) return false;

    if (target.dataset.smBound !== '1') {
      target.dataset.smBound = '1';
      target.addEventListener('change', () => {
        try {
          if (typeof window.updateBulkPricePreview === 'function') {
            window.updateBulkPricePreview();
          }
        } catch (_) {}
        requestAnimationFrame(decoratePreview);
      });
    }

    bindPreviewRefresh();
    requestAnimationFrame(decoratePreview);
    return true;
  }

  function selectedMode() {
    const value = document.getElementById('bulkPriceTargetMode')?.value || 'dinein';
    return ['dinein', 'takeaway', 'both'].includes(value) ? value : 'dinein';
  }

  function decoratePreview() {
    const preview = document.getElementById('bulkPricePreview');
    if (!preview) return;

    let line = document.getElementById('smBulkPriceTargetPreview');
    if (!line) {
      line = document.createElement('div');
      line.id = 'smBulkPriceTargetPreview';
      line.style.marginTop = '5px';
      preview.appendChild(line);
    }

    const mode = selectedMode();
    line.innerHTML = `نوع السعر: <strong>${LABELS[mode]}</strong>`;
  }

  function bindPreviewRefresh() {
    ['bulkPriceCategorySelect', 'bulkPriceOperation', 'bulkPriceAmount'].forEach(id => {
      const el = document.getElementById(id);
      if (!el || el.dataset.smTargetPreviewBound === '1') return;
      el.dataset.smTargetPreviewBound = '1';
      const eventName = id === 'bulkPriceAmount' ? 'input' : 'change';
      el.addEventListener(eventName, () => requestAnimationFrame(decoratePreview));
    });
  }

  function setMessage(message, ok = true) {
    if (typeof window.setBulkPriceMsg === 'function') {
      window.setBulkPriceMsg(message, ok);
      return;
    }
    const el = document.getElementById('bulkPriceMsg');
    if (!el) return;
    el.textContent = message;
    el.style.color = ok ? '#baf3d7' : '#fecaca';
  }

  function deltaValue() {
    if (typeof window.getBulkPriceDelta === 'function') {
      return Number(window.getBulkPriceDelta() || 0);
    }

    const amount = Math.trunc(Number(document.getElementById('bulkPriceAmount')?.value || 0));
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    return document.getElementById('bulkPriceOperation')?.value === 'decrease' ? -amount : amount;
  }

  function scopeProducts() {
    if (typeof window.getBulkPriceScopeProducts === 'function') {
      try { return window.getBulkPriceScopeProducts() || []; } catch (_) {}
    }
    return [1];
  }

  function resultText(result, mode) {
    const base = Number(result?.products_inside_updated || 0);
    const inside = Number(result?.options_inside_updated || 0);
    const takeaway = Number(result?.options_takeaway_updated || 0);

    if (mode === 'takeaway') {
      return `تم التعديل ✓ (${takeaway} سعر سفري)`;
    }
    if (mode === 'both') {
      return `تم التعديل ✓ (${base} سعر أساسي، ${inside} سعر داخل، ${takeaway} سعر سفري)`;
    }
    return `تم التعديل ✓ (${base} سعر أساسي، ${inside} سعر داخل)`;
  }

  async function applyModeAwareAdjustment(button) {
    const delta = deltaValue();
    if (!delta) {
      setMessage('اكتب مقدار صحيح أكبر من صفر.', false);
      return;
    }

    const products = scopeProducts();
    if (!products.length) {
      setMessage('لا توجد أصناف معروضة ضمن هذا النطاق.', false);
      return;
    }

    if (typeof supabaseClient === 'undefined' || !supabaseClient) {
      setMessage('تعذر الاتصال بقاعدة البيانات.', false);
      return;
    }

    const categorySelect = document.getElementById('bulkPriceCategorySelect');
    const categoryId = categorySelect?.value === '__all__'
      ? null
      : categorySelect?.value || null;
    const scopeLabel = categorySelect?.selectedOptions?.[0]?.textContent?.trim() || 'كل المنيو';
    const mode = selectedMode();
    const operationText = delta > 0
      ? `زيادة ${Number(delta).toLocaleString('en-US')} د.ع`
      : `تنزيل ${Number(Math.abs(delta)).toLocaleString('en-US')} د.ع`;

    const confirmed = confirm(
      `${operationText}\n\n` +
      `نوع السعر: ${LABELS[mode]}\n` +
      `النطاق: ${scopeLabel}\n\n` +
      `متأكد من التنفيذ؟`
    );
    if (!confirmed) return;

    button.disabled = true;
    const oldText = button.textContent;
    button.textContent = 'جاري تعديل الأسعار...';
    setMessage('جاري حفظ نسخة أمان ثم تنفيذ التغيير...', true);

    try {
      if (typeof window.savePriceSafetyBackup === 'function') {
        window.savePriceSafetyBackup();
      }

      const { data, error } = await supabaseClient.rpc('adjust_menu_prices_mode', {
        p_category_id: categoryId,
        p_delta: delta,
        p_price_mode: mode
      });

      if (error) throw error;

      if (typeof window.loadAdminDashboard === 'function') {
        await window.loadAdminDashboard();
      }

      setMessage(resultText(data || {}, mode), true);
    } catch (error) {
      console.error('MODE-AWARE BULK PRICE ERROR:', error);
      setMessage('فشل تغيير الأسعار: ' + (error?.message || error), false);
    } finally {
      button.disabled = false;
      button.textContent = oldText || 'تنفيذ تغيير الأسعار';
      try {
        if (typeof window.updateBulkPricePreview === 'function') {
          window.updateBulkPricePreview();
        }
      } catch (_) {}
      requestAnimationFrame(decoratePreview);
    }
  }

  // Capture before the legacy button listener. This prevents the old dine-in-only
  // adjustment from running in parallel with the new mode-aware adjustment.
  document.addEventListener('click', event => {
    const button = event.target.closest?.('#applyBulkPriceBtn');
    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    applyModeAwareAdjustment(button);
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }

  const timer = setInterval(() => {
    install();
  }, 500);

  setTimeout(() => clearInterval(timer), 15000);
})();

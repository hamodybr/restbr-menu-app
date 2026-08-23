// ============================================================
// RESTBR OWNER V2.0 — advanced menu editor extension
// Enhances the existing Owner Dashboard without replacing its stable shell.
// Schema-aware for restbr-platform JSONB metadata.
// ============================================================
(() => {
  'use strict';

  const cfg = window.RESTBR_OWNER_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.publishableKey || !window.supabase) return;

  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const state = {
    tenantId: null,
    productId: null,
    categoryId: null,
    product: null,
    category: null,
    options: [],
    enhancing: false
  };

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[c]));

  const obj = value => {
    if (value && typeof value === 'object' && !Array.isArray(value)) return { ...value };
    if (typeof value === 'string' && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? { ...parsed } : {};
      } catch (_) {}
    }
    return {};
  };

  const num = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  const cleanTime = value => {
    const s = String(value || '').trim();
    return /^\d{2}:\d{2}/.test(s) ? s.slice(0,5) : '';
  };

  function status(id, message, type = '') {
    const el = $(id);
    if (!el) return;
    el.textContent = message || '';
    el.className = 'status' + (type ? ' ' + type : '');
  }

  function installStyles() {
    if ($('restbrOwnerV2Styles')) return;
    const style = document.createElement('style');
    style.id = 'restbrOwnerV2Styles';
    style.textContent = `
      .rbv2-box{border:1px solid var(--line);border-radius:16px;padding:12px;background:var(--panel2);margin-top:10px}
      .rbv2-title{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;font-weight:900;font-size:13px;color:var(--gold)}
      .rbv2-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      .rbv2-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}
      .rbv2-field label{display:block;color:var(--muted);font-size:10px;margin:0 2px 5px}
      .rbv2-field input,.rbv2-field textarea,.rbv2-field select{width:100%;border:1px solid var(--line);background:var(--input);color:var(--text);border-radius:11px;padding:10px;font-size:16px;outline:none}
      .rbv2-field textarea{min-height:72px;resize:vertical}
      .rbv2-switch{display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid var(--line);border-radius:11px;padding:9px 10px;background:var(--panel)}
      .rbv2-switch span{font-size:11px;color:var(--text)}
      .rbv2-option{border:1px solid var(--line);border-radius:14px;padding:9px;margin-bottom:8px;background:var(--panel)}
      .rbv2-option-main{display:grid;grid-template-columns:1fr 1fr 1fr 110px;gap:7px}
      .rbv2-option-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:7px}
      .rbv2-option-controls label{display:flex;align-items:center;gap:5px;font-size:10px;color:var(--muted)}
      .rbv2-remove{margin-inline-start:auto;color:var(--danger)!important}
      .rbv2-hint{font-size:10px;line-height:1.6;color:var(--muted);margin-top:7px}
      .rbv2-badge{display:inline-flex;align-items:center;gap:5px;padding:5px 8px;border:1px solid rgba(216,169,88,.25);border-radius:999px;color:var(--gold);font-size:10px}
      @media(max-width:700px){.rbv2-grid,.rbv2-grid.two,.rbv2-option-main{grid-template-columns:1fr}.rbv2-option-main{gap:6px}}
    `;
    document.head.appendChild(style);
  }

  async function tenantId() {
    if (state.tenantId) return state.tenantId;

    const hostname = location.hostname.toLowerCase().replace(/^www\./, '');
    if (hostname === 'hamodybr.github.io') {
      const slug = new URLSearchParams(location.search).get('tenant');
      if (!slug) throw new Error('tenant slug missing');
      const { data, error } = await sb.from('restaurants').select('id').eq('slug', slug).maybeSingle();
      if (error) throw error;
      if (!data?.id) throw new Error('restaurant not found');
      state.tenantId = data.id;
      return data.id;
    }

    const { data, error } = await sb
      .from('restaurant_domains')
      .select('restaurant_id')
      .eq('hostname', hostname)
      .eq('status', 'active')
      .eq('is_verified', true)
      .maybeSingle();

    if (error) throw error;
    if (!data?.restaurant_id) throw new Error('restaurant domain not found');
    state.tenantId = data.restaurant_id;
    return data.restaurant_id;
  }

  async function uploadProductImage(file, productId) {
    if (!file) return null;
    const rid = await tenantId();
    const ext = String(file.name || 'image.jpg').split('.').pop().toLowerCase().replace(/[^a-z0-9]/g,'') || 'jpg';
    const path = `${rid}/products/${productId}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
    const { error } = await sb.storage.from('menu-images').upload(path, file, {
      cacheControl:'3600', upsert:false, contentType:file.type
    });
    if (error) throw error;
    return sb.storage.from('menu-images').getPublicUrl(path).data.publicUrl;
  }

  function addAdvancedOption(data = {}) {
    const wrap = $('mpOptions');
    if (!wrap) return;
    const metadata = obj(data.metadata);
    const row = document.createElement('div');
    row.className = 'rbv2-option';
    row.dataset.optionId = data.id || '';
    row.dataset.metadata = JSON.stringify(metadata);
    row.innerHTML = `
      <div class="rbv2-option-main">
        <input class="rbv2-op-ar" placeholder="الخيار عربي" value="${esc(data.name_ar || data.name || '')}">
        <input class="rbv2-op-ku" placeholder="الخيار كوردي" value="${esc(data.name_ku || '')}">
        <input class="rbv2-op-en" dir="ltr" placeholder="Option English" value="${esc(data.name_en || '')}">
        <input class="rbv2-op-price" type="number" min="0" step="0.001" placeholder="السعر" value="${esc(data.price ?? 0)}">
      </div>
      <div class="rbv2-option-controls">
        <label><input class="rbv2-op-available" type="checkbox" ${metadata.is_available === false ? '' : 'checked'}> متوفر</label>
        <label><input class="rbv2-op-active" type="checkbox" ${data.is_active === false ? '' : 'checked'}> نشط</label>
        <button type="button" class="mini rbv2-remove">حذف الخيار</button>
      </div>`;
    row.querySelector('.rbv2-remove').onclick = () => row.remove();
    wrap.appendChild(row);
  }

  async function enhanceProductModal() {
    if (state.enhancing || !$('mpPrice') || !$('mpOptions') || $('rbv2ProductAdvanced')) return;
    state.enhancing = true;
    try {
      const rid = await tenantId();
      let product = null;
      let options = [];

      if (state.productId) {
        const [pRes, oRes] = await Promise.all([
          sb.from('products').select('*').eq('restaurant_id', rid).eq('id', state.productId).maybeSingle(),
          sb.from('product_options').select('*').eq('restaurant_id', rid).eq('product_id', state.productId).order('sort_order',{ascending:true})
        ]);
        if (pRes.error) throw pRes.error;
        if (oRes.error) throw oRes.error;
        product = pRes.data || null;
        options = oRes.data || [];
      }

      state.product = product;
      state.options = options;
      const metadata = obj(product?.metadata);

      const descAr = $('mpDescAr');
      const advanced = document.createElement('div');
      advanced.id = 'rbv2ProductAdvanced';
      advanced.innerHTML = `
        <div class="rbv2-box">
          <div class="rbv2-title"><span>🌐 الوصف متعدد اللغات</span><span class="rbv2-badge">Owner V2</span></div>
          <div class="rbv2-grid two">
            <div class="rbv2-field"><label>الوصف كوردي</label><textarea id="rbv2DescKu">${esc(product?.description_ku || '')}</textarea></div>
            <div class="rbv2-field"><label>Description English</label><textarea id="rbv2DescEn" dir="ltr">${esc(product?.description_en || '')}</textarea></div>
          </div>
        </div>
        <div class="rbv2-box">
          <div class="rbv2-title">⏰ التوفر حسب الوقت</div>
          <div class="rbv2-grid">
            <div class="rbv2-switch"><span>تشغيل الجدولة</span><input id="rbv2Schedule" type="checkbox" ${product?.availability_schedule_enabled ? 'checked' : ''}></div>
            <div class="rbv2-field"><label>من</label><input id="rbv2From" type="time" value="${esc(cleanTime(product?.available_from))}"></div>
            <div class="rbv2-field"><label>إلى</label><input id="rbv2To" type="time" value="${esc(cleanTime(product?.available_to))}"></div>
          </div>
        </div>
        <div class="rbv2-box">
          <div class="rbv2-title">🏷 حالة الصنف والشارات</div>
          <div class="rbv2-grid">
            <div class="rbv2-switch"><span>الصنف نشط</span><input id="rbv2Active" type="checkbox" ${metadata.legacy_is_active === false ? '' : 'checked'}></div>
            <div class="rbv2-switch"><span>⭐ الأكثر طلباً</span><input id="rbv2Popular" type="checkbox" ${metadata.is_popular ? 'checked' : ''}></div>
            <div class="rbv2-switch"><span>✨ جديد</span><input id="rbv2New" type="checkbox" ${metadata.is_new ? 'checked' : ''}></div>
            <div class="rbv2-switch"><span>🔥 حار</span><input id="rbv2Hot" type="checkbox" ${metadata.is_hot ? 'checked' : ''}></div>
            <div class="rbv2-switch"><span>🏷 عرض</span><input id="rbv2Offer" type="checkbox" ${metadata.is_offer ? 'checked' : ''}></div>
          </div>
          <div class="rbv2-hint">الشارات وحالة Active تُحفظ داخل metadata حتى تبقى متوافقة مع مخطط RESTBR الحالي.</div>
        </div>`;

      const optionsPanel = $('mpOptions').closest('.panel');
      if (optionsPanel) optionsPanel.before(advanced);
      else descAr?.parentElement?.after(advanced);

      $('mpOptions').innerHTML = '';
      options.forEach(addAdvancedOption);

      const addBtn = $('mpAddOption');
      if (addBtn) addBtn.textContent = '+ خيار متقدم';

      const existingHint = document.createElement('div');
      existingHint.className = 'rbv2-hint';
      existingHint.textContent = 'الخيار غير المتوفر أو غير النشط لا يظهر للزبون ولا يدخل السلة.';
      $('mpOptions').after(existingHint);

      if (descAr && product) descAr.value = product.description_ar || '';
    } catch (error) {
      console.error('RESTBR Owner V2 product enhancement:', error);
      status('mpMsg', 'تعذر تحميل أدوات Owner V2: ' + (error?.message || error), 'err');
    } finally {
      state.enhancing = false;
    }
  }

  async function saveProductV2(event) {
    if (!$('rbv2ProductAdvanced')) return false;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    status('mpMsg','جاري الحفظ عبر Owner V2...');

    try {
      const rid = await tenantId();
      const productId = state.productId || crypto.randomUUID();
      const nameAr = String($('mpAr')?.value || '').trim();
      if (!nameAr) throw new Error('اسم الصنف بالعربي مطلوب.');
      if (!$('mpCategory')?.value) throw new Error('اختر القسم.');

      let imageUrl = String($('mpImageUrl')?.value || '').trim() || null;
      const imageFile = $('mpImageFile')?.files?.[0];
      if (imageFile) imageUrl = await uploadProductImage(imageFile, productId);

      const rows = [...document.querySelectorAll('#mpOptions .rbv2-option')];
      const usableOptionCount = rows.filter(row => {
        const hasName = ['.rbv2-op-ar','.rbv2-op-ku','.rbv2-op-en'].some(sel => String(row.querySelector(sel)?.value || '').trim());
        return hasName && row.querySelector('.rbv2-op-active')?.checked && row.querySelector('.rbv2-op-available')?.checked;
      }).length;

      const metadata = {
        ...obj(state.product?.metadata),
        legacy_is_active: $('rbv2Active')?.checked !== false,
        is_popular: Boolean($('rbv2Popular')?.checked),
        is_new: Boolean($('rbv2New')?.checked),
        is_hot: Boolean($('rbv2Hot')?.checked),
        is_offer: Boolean($('rbv2Offer')?.checked),
        has_options: usableOptionCount > 0
      };

      const scheduled = Boolean($('rbv2Schedule')?.checked);
      const from = cleanTime($('rbv2From')?.value);
      const to = cleanTime($('rbv2To')?.value);
      if (scheduled && (!from || !to)) throw new Error('حدد وقت البداية والنهاية للجدولة.');

      const payload = {
        id: productId,
        restaurant_id: rid,
        category_id: $('mpCategory').value,
        name_ar: nameAr,
        name_ku: String($('mpKu')?.value || '').trim() || null,
        name_en: String($('mpEn')?.value || '').trim() || null,
        description_ar: String($('mpDescAr')?.value || '').trim() || null,
        description_ku: String($('rbv2DescKu')?.value || '').trim() || null,
        description_en: String($('rbv2DescEn')?.value || '').trim() || null,
        image_url: imageUrl,
        base_price: Math.max(0, num($('mpPrice')?.value, 0)),
        sort_order: Math.max(0, Math.floor(num($('mpSort')?.value, 0))),
        is_visible: Boolean($('mpVisible')?.checked),
        is_available: Boolean($('mpAvailable')?.checked),
        availability_schedule_enabled: scheduled,
        available_from: scheduled ? from : null,
        available_to: scheduled ? to : null,
        metadata
      };

      const pRes = state.productId
        ? await sb.from('products').update(payload).eq('id', productId).eq('restaurant_id', rid)
        : await sb.from('products').insert(payload);
      if (pRes.error) throw pRes.error;

      const originalIds = new Set((state.options || []).map(option => option.id));
      const keptIds = new Set();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const ar = String(row.querySelector('.rbv2-op-ar')?.value || '').trim();
        const ku = String(row.querySelector('.rbv2-op-ku')?.value || '').trim();
        const en = String(row.querySelector('.rbv2-op-en')?.value || '').trim();
        if (!ar && !ku && !en) continue;

        const oid = row.dataset.optionId || crypto.randomUUID();
        keptIds.add(oid);
        const oldMetadata = obj(row.dataset.metadata ? JSON.parse(row.dataset.metadata) : {});
        const optionPayload = {
          id: oid,
          restaurant_id: rid,
          product_id: productId,
          name_ar: ar || ku || en,
          name_ku: ku || ar || null,
          name_en: en || ar || null,
          price: Math.max(0, num(row.querySelector('.rbv2-op-price')?.value, 0)),
          sort_order: i,
          is_active: Boolean(row.querySelector('.rbv2-op-active')?.checked),
          metadata: {
            ...oldMetadata,
            is_available: Boolean(row.querySelector('.rbv2-op-available')?.checked)
          }
        };

        const res = originalIds.has(oid)
          ? await sb.from('product_options').update(optionPayload).eq('id', oid).eq('restaurant_id', rid)
          : await sb.from('product_options').insert(optionPayload);
        if (res.error) throw res.error;
      }

      const removed = [...originalIds].filter(id => !keptIds.has(id));
      if (removed.length) {
        const del = await sb.from('product_options').delete().in('id', removed).eq('restaurant_id', rid);
        if (del.error) throw del.error;
      }

      status('mpMsg','تم حفظ الصنف والخيارات بنجاح ✓','ok');
      setTimeout(() => {
        $('closeModal')?.click();
        $('refreshBtn')?.click();
      }, 180);
    } catch (error) {
      console.error('RESTBR Owner V2 save product:', error);
      status('mpMsg', error?.message || String(error), 'err');
    }
    return true;
  }

  async function enhanceCategoryModal() {
    if (!$('mcSave') || $('rbv2CategoryAdvanced')) return;
    try {
      const rid = await tenantId();
      let category = null;
      if (state.categoryId) {
        const { data, error } = await sb.from('categories').select('*').eq('restaurant_id', rid).eq('id', state.categoryId).maybeSingle();
        if (error) throw error;
        category = data || null;
      }
      state.category = category;

      const box = document.createElement('div');
      box.id = 'rbv2CategoryAdvanced';
      box.className = 'rbv2-box';
      box.innerHTML = `
        <div class="rbv2-title"><span>⏰ جدولة القسم</span><span class="rbv2-badge">Owner V2</span></div>
        <div class="rbv2-grid">
          <div class="rbv2-switch"><span>تشغيل الجدولة</span><input id="rbv2CatSchedule" type="checkbox" ${category?.availability_schedule_enabled ? 'checked' : ''}></div>
          <div class="rbv2-field"><label>من</label><input id="rbv2CatFrom" type="time" value="${esc(cleanTime(category?.available_from))}"></div>
          <div class="rbv2-field"><label>إلى</label><input id="rbv2CatTo" type="time" value="${esc(cleanTime(category?.available_to))}"></div>
        </div>
        <div class="rbv2-hint">إذا كان القسم خارج وقته، كل أصنافه تصبح غير متاحة للطلب تلقائياً.</div>`;
      $('mcSave').closest('.savebar')?.before(box);
    } catch (error) {
      status('mcMsg','تعذر تحميل جدولة القسم: '+(error?.message||error),'err');
    }
  }

  async function saveCategoryV2(event) {
    if (!$('rbv2CategoryAdvanced')) return false;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    status('mcMsg','جاري الحفظ عبر Owner V2...');

    try {
      const rid = await tenantId();
      const nameAr = String($('mcAr')?.value || '').trim();
      if (!nameAr) throw new Error('الاسم العربي مطلوب.');
      const scheduled = Boolean($('rbv2CatSchedule')?.checked);
      const from = cleanTime($('rbv2CatFrom')?.value);
      const to = cleanTime($('rbv2CatTo')?.value);
      if (scheduled && (!from || !to)) throw new Error('حدد وقت البداية والنهاية.');

      const payload = {
        restaurant_id: rid,
        name_ar: nameAr,
        name_ku: String($('mcKu')?.value || '').trim() || null,
        name_en: String($('mcEn')?.value || '').trim() || null,
        slug: String($('mcSlug')?.value || '').trim().toLowerCase() || null,
        sort_order: Math.max(0, Math.floor(num($('mcSort')?.value, 0))),
        is_visible: Boolean($('mcVisible')?.checked),
        is_active: Boolean($('mcActive')?.checked),
        availability_schedule_enabled: scheduled,
        available_from: scheduled ? from : null,
        available_to: scheduled ? to : null
      };

      const res = state.categoryId
        ? await sb.from('categories').update(payload).eq('id', state.categoryId).eq('restaurant_id', rid)
        : await sb.from('categories').insert(payload);
      if (res.error) throw res.error;

      status('mcMsg','تم حفظ القسم ✓','ok');
      setTimeout(() => {
        $('closeModal')?.click();
        $('refreshBtn')?.click();
      }, 180);
    } catch (error) {
      status('mcMsg', error?.message || String(error), 'err');
    }
    return true;
  }

  function rememberTargets(event) {
    const product = event.target.closest?.('[data-edit-product]');
    if (product) {
      state.productId = product.dataset.editProduct || null;
      state.categoryId = null;
      setTimeout(enhanceProductModal, 0);
      return;
    }

    if (event.target.closest?.('#addProductBtn')) {
      state.productId = null;
      state.product = null;
      state.options = [];
      setTimeout(enhanceProductModal, 0);
      return;
    }

    const category = event.target.closest?.('[data-edit-cat]');
    if (category) {
      state.categoryId = category.dataset.editCat || null;
      state.productId = null;
      setTimeout(enhanceCategoryModal, 0);
      return;
    }

    if (event.target.closest?.('#addCategoryBtn')) {
      state.categoryId = null;
      state.category = null;
      setTimeout(enhanceCategoryModal, 0);
    }
  }

  document.addEventListener('click', event => {
    rememberTargets(event);

    if (event.target.closest?.('#mpAddOption') && $('rbv2ProductAdvanced')) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      addAdvancedOption();
      return;
    }

    if (event.target.closest?.('#mpSave') && $('rbv2ProductAdvanced')) {
      void saveProductV2(event);
      return;
    }

    if (event.target.closest?.('#mcSave') && $('rbv2CategoryAdvanced')) {
      void saveCategoryV2(event);
    }
  }, true);

  const observer = new MutationObserver(() => {
    if ($('mpPrice') && $('mpOptions') && !$('rbv2ProductAdvanced')) void enhanceProductModal();
    if ($('mcSave') && $('mcAr') && !$('rbv2CategoryAdvanced') && !$('mpPrice')) void enhanceCategoryModal();
  });

  function boot() {
    installStyles();
    const modal = $('modalBody');
    if (modal) observer.observe(modal, { childList:true, subtree:true });
    console.log('✅ RESTBR Owner V2.0 extension ready');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();

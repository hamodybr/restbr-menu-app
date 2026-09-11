(() => {
  if (/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__RESTBR_ORDER_SUBMIT_V1__) return;
  window.__RESTBR_ORDER_SUBMIT_V1__ = true;

  const CART_KEY = 'RESTBR_CART_V1';
  const COLOR_META_KEY = 'RESTBR_CART_COLOR_META_V1';
  const PENDING_KEY = 'RESTBR_PENDING_ORDER_V1';
  const LOCATION_KEY = 'RESTBR_CHECKOUT_LOCATION_V1';

  const T = {
    ar: {
      confirm: 'تثبيت الطلب',
      saving: 'جاري تثبيت الطلب...',
      saved: 'تم تثبيت الطلب ✓',
      failed: 'تعذر تسجيل الطلب، حاول مرة ثانية',
      required: 'يرجى إكمال الحقول المطلوبة',
      phoneInvalid: 'يرجى إدخال رقم هاتف صحيح',
      empty: 'السلة فارغة',
      locationOk: 'تم تحديد الموقع',
      locationFail: 'تعذر تحديد الموقع',
      details: 'تفاصيل الطلب',
      total: 'الإجمالي',
      subtotal: 'المجموع',
      deliveryFee: 'أجرة التوصيل',
      notes: 'ملاحظات الطلب',
      delivery: 'توصيل',
      pickup: 'استلام من المطعم',
      color: 'اللون'
    },
    ku: {
      confirm: 'داواکاری پشتڕاست بکە',
      saving: 'داواکاری تۆمار دەکرێت...',
      saved: 'داواکاری تۆمار کرا ✓',
      failed: 'تۆمارکردنی داواکاری سەرکەوتوو نەبوو، دووبارە هەوڵ بدە',
      required: 'تکایە خانە پێویستەکان پڕ بکەرەوە',
      phoneInvalid: 'تکایە ژمارەی مۆبایلێکی دروست بنووسە',
      empty: 'سەبەتە بەتاڵە',
      locationOk: 'شوێن دیاری کرا',
      locationFail: 'نەتوانرا شوێن دیاری بکرێت',
      details: 'وردەکاری داواکاری',
      total: 'کۆی گشتی',
      subtotal: 'کۆ',
      deliveryFee: 'کرێی گەیاندن',
      notes: 'تێبینی داواکاری',
      delivery: 'گەیاندن',
      pickup: 'وەرگرتن لە چێشتخانە',
      color: 'ڕەنگ'
    },
    en: {
      confirm: 'Confirm order',
      saving: 'Confirming order...',
      saved: 'Order confirmed ✓',
      failed: 'Could not record the order. Please try again.',
      required: 'Please complete the required fields',
      phoneInvalid: 'Please enter a valid phone number',
      empty: 'Your cart is empty',
      locationOk: 'Location captured',
      locationFail: 'Could not get location',
      details: 'Order details',
      total: 'Total',
      subtotal: 'Subtotal',
      deliveryFee: 'Delivery fee',
      notes: 'Order notes',
      delivery: 'Delivery',
      pickup: 'Pickup',
      color: 'Color'
    }
  };

  let deliveryFee = 0;
  let settingsLoaded = false;
  let inFlight = false;
  let checkoutLocation = readSession(LOCATION_KEY) || '';

  function lang() {
    const value = window.RESTBR_LANG
      ? window.RESTBR_LANG()
      : (localStorage.getItem('RESTBR_LANG_V1') || 'ar');
    return ['ar', 'ku', 'en'].includes(value) ? value : 'ar';
  }

  function tr(key) {
    return T[lang()]?.[key] || T.ar[key] || key;
  }

  function client() {
    return window.RESTBR_SUPABASE_CLIENT ||
      (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
  }

  function readSession(key) {
    try { return sessionStorage.getItem(key) || ''; }
    catch (_) { return ''; }
  }

  function writeSession(key, value) {
    try {
      if (value) sessionStorage.setItem(key, value);
      else sessionStorage.removeItem(key);
    } catch (_) {}
  }

  function readJson(storage, key, fallback) {
    try {
      const parsed = JSON.parse(storage.getItem(key) || '');
      return parsed ?? fallback;
    } catch (_) {
      return fallback;
    }
  }

  function cartRows() {
    const rows = readJson(localStorage, CART_KEY, []);
    const meta = readJson(localStorage, COLOR_META_KEY, {});
    if (!Array.isArray(rows)) return [];

    return rows.map(row => {
      const color = row?.selectedColor || meta?.[String(row?.key || '')] || null;
      return color ? { ...row, selectedColor: color } : { ...row };
    });
  }

  function normalizeDigits(value) {
    return String(value ?? '')
      .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))
      .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776));
  }

  function money(value) {
    return Number(value || 0).toLocaleString('en-US') + ' ' + (lang() === 'en' ? 'IQD' : 'د.ع');
  }

  function toast(message, duration = 2200) {
    const el = document.getElementById('smCartToast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(window.__restbrOrderSubmitToastTimer);
    window.__restbrOrderSubmitToastTimer = setTimeout(
      () => el.classList.remove('show'),
      duration
    );
  }

  function currentOrderType() {
    const active = document.querySelector('[data-order-type].active');
    const value = String(active?.dataset.orderType || 'delivery');
    return value === 'pickup' ? 'pickup' : 'delivery';
  }

  function currentPriceMode() {
    const value = String(window.RESTBR_ORDER_MODE || '').toLowerCase();
    return value === 'dinein' ? 'dinein' : 'takeaway';
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(String(value || ''));
  }

  function uuid() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }

  function shortHash(value) {
    let hash = 2166136261;
    const text = String(value || '');
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  function formData() {
    const name = String(document.getElementById('smCustomerName')?.value || '').trim().slice(0, 80);
    let phone = normalizeDigits(document.getElementById('smCustomerPhone')?.value || '').trim().slice(0, 20);
    const orderType = currentOrderType();
    const address = String(document.getElementById('smCustomerAddress')?.value || '').trim().slice(0, 300);
    const notes = String(document.getElementById('smCustomerNotes')?.value || '').trim().slice(0, 500);

    phone = phone.replace(/\s+/g, '');
    if (/^7\d{9}$/.test(phone)) phone = '0' + phone;
    if (/^9647\d{9}$/.test(phone)) phone = '+' + phone;

    return { name, phone, orderType, address, notes };
  }

  function validPhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    return /^[+\d().-]+$/.test(String(phone || '')) && digits.length >= 7 && digits.length <= 15;
  }

  function buildPayload(form, rows) {
    const payload = {
      order_prefix: String(window.RESTBR_CONFIG?.orderIdPrefix || 'ORD')
        .toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'ORD',
      customer_name: form.name,
      customer_phone: form.phone,
      order_type: form.orderType,
      price_mode: currentPriceMode(),
      language: lang(),
      address: form.orderType === 'delivery' ? form.address : null,
      location_url: form.orderType === 'delivery' ? (checkoutLocation || null) : null,
      notes: form.notes || null,
      items: rows.map(row => {
        const color = row?.selectedColor || null;
        return {
          product_id: String(row?.productId || ''),
          option_id: isUuid(row?.optionId) ? String(row.optionId) : null,
          selected_color_id: isUuid(color?.id || row?.colorId)
            ? String(color?.id || row?.colorId)
            : null,
          quantity: Math.max(1, Math.min(99, Math.trunc(Number(row?.qty) || 1)))
        };
      })
    };

    const fingerprint = shortHash(JSON.stringify(payload));
    const pending = readJson(sessionStorage, PENDING_KEY, {});
    const token = pending?.fingerprint === fingerprint && isUuid(pending?.token)
      ? pending.token
      : uuid();

    try {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify({ fingerprint, token }));
    } catch (_) {}

    payload.client_token = token;
    return payload;
  }

  function whatsappNumber() {
    const restaurant = window.RESTBR_DB?.restaurant || {};
    let digits = String(restaurant.whatsappNumber || restaurant.whatsapp || '').replace(/\D/g, '');
    if (digits.startsWith('00')) digits = digits.slice(2);
    if (/^07\d{9}$/.test(digits)) digits = '964' + digits.slice(1);
    if (/^7\d{9}$/.test(digits)) digits = '964' + digits;
    return digits;
  }

  function restaurantName() {
    const r = window.RESTBR_DB?.restaurant || {};
    return String(
      lang() === 'en'
        ? (r.nameEn || r.nameAr || r.name || 'Restaurant')
        : lang() === 'ku'
          ? (r.nameKu || r.nameAr || r.nameEn || r.name || 'Restaurant')
          : (r.nameAr || r.nameKu || r.nameEn || r.name || 'Restaurant')
    );
  }

  function buildWhatsApp(result, form) {
    const mono = value => '```' + value + '```';
    const bold = value => '*' + value + '*';
    const items = Array.isArray(result?.items) ? result.items : [];

    const lines = [
      `🍽️ ${bold(restaurantName())}`,
      `🧾 ${lang() === 'en' ? 'Order' : lang() === 'ku' ? 'داواکاری' : 'رقم الطلب'}: ${mono(result.order_number || '')}`,
      '',
      `👤 ${bold(form.name)}`,
      `📞 ${form.phone}`,
      `${form.orderType === 'delivery' ? '🚚' : '🥡'} ${bold(tr(form.orderType))}`
    ];

    if (form.orderType === 'delivery') {
      lines.push(`📍 ${form.address}`);
      if (checkoutLocation) lines.push(`🗺️ ${checkoutLocation}`);
    }

    lines.push('', '━━━━━━━━━━━━', `🛒 ${bold(tr('details'))}`, '');

    items.forEach((item, index) => {
      const option = String(item?.option_name || '').trim();
      const color = String(item?.color_name || '').trim();
      const detail = [option, color ? `${tr('color')}: ${color}` : ''].filter(Boolean).join(' • ');
      lines.push(`• ${bold(String(item?.product_name || ''))}`);
      lines.push(detail ? `   └ ${detail} × ${item.quantity}` : `   └ × ${item.quantity}`);
      lines.push(`   ${mono(money(item.line_total))}`);
      if (index < items.length - 1) lines.push('');
    });

    lines.push('', '━━━━━━━━━━━━');

    if (Number(result?.delivery_fee || 0) > 0) {
      lines.push(`💵 ${tr('subtotal')}: ${mono(money(result.subtotal))}`);
      lines.push(`🚚 ${tr('deliveryFee')}: ${mono(money(result.delivery_fee))}`);
    }

    lines.push(`💰 ${bold(tr('total'))}: ${mono(money(result.total))}`);

    if (form.notes) {
      lines.push('', `📝 ${bold(tr('notes'))}`, form.notes);
    }

    return lines.join('\n');
  }

  function clearCartAfterSuccess() {
    try {
      localStorage.setItem(CART_KEY, '[]');
      localStorage.setItem(COLOR_META_KEY, '{}');
      sessionStorage.removeItem(PENDING_KEY);
      sessionStorage.removeItem(LOCATION_KEY);
    } catch (_) {}
    checkoutLocation = '';
  }

  function setButtonState(state = 'idle') {
    const button = document.getElementById('smSendWhatsApp');
    if (!button) return;
    button.disabled = state === 'saving';
    button.textContent = state === 'saving' ? tr('saving') : tr('confirm');
  }

  function cartSubtotal() {
    return cartRows().reduce((sum, row) => {
      const price = Number(row?.price || 0);
      const qty = Math.max(1, Math.trunc(Number(row?.qty) || 1));
      return sum + Math.max(0, price) * qty;
    }, 0);
  }

  function ensureDeliveryFeeRow() {
    const totalRow = document.querySelector('.sm-checkout-review-total');
    if (!totalRow) return null;

    let row = document.getElementById('smCheckoutDeliveryFeeRow');
    if (row) return row;

    row = document.createElement('div');
    row.id = 'smCheckoutDeliveryFeeRow';
    row.style.cssText = 'display:none;align-items:center;justify-content:space-between;gap:12px;margin:8px 0 2px;font-size:12px;color:#b8afa4';
    row.innerHTML = '<span id="smCheckoutDeliveryFeeLabel"></span><b id="smCheckoutDeliveryFeeValue"></b>';
    totalRow.parentNode.insertBefore(row, totalRow);
    return row;
  }

  function updateCheckoutPresentation() {
    setButtonState(inFlight ? 'saving' : 'idle');

    const row = ensureDeliveryFeeRow();
    const total = document.getElementById('smCheckoutTotal');
    if (!row || !total) return;

    const isDelivery = currentOrderType() === 'delivery';
    const fee = isDelivery ? Math.max(0, Number(deliveryFee || 0)) : 0;
    const subtotal = cartSubtotal();

    row.style.display = fee > 0 ? 'flex' : 'none';
    const label = document.getElementById('smCheckoutDeliveryFeeLabel');
    const value = document.getElementById('smCheckoutDeliveryFeeValue');
    if (label) label.textContent = tr('deliveryFee');
    if (value) value.textContent = money(fee);
    total.textContent = money(subtotal + fee);
  }

  async function loadDeliveryFee() {
    const db = client();
    if (!db || settingsLoaded) return;
    settingsLoaded = true;

    try {
      const { data, error } = await db
        .from('restaurant_settings')
        .select('delivery_fee,updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      const fee = Number(data?.delivery_fee || 0);
      deliveryFee = Number.isFinite(fee) && fee >= 0 ? fee : 0;
    } catch (error) {
      // Older copies that have not run the P0-C migration keep a zero-fee UI;
      // submit_order itself will still fail clearly until setup is completed.
      console.debug('RESTBR delivery fee unavailable:', error?.message || error);
      deliveryFee = 0;
    }

    updateCheckoutPresentation();
  }

  function captureLocation(event) {
    const button = event.target.closest?.('#smGetLocation');
    if (!button) return false;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (!navigator.geolocation) {
      toast(tr('locationFail'));
      return true;
    }

    button.disabled = true;
    navigator.geolocation.getCurrentPosition(
      position => {
        checkoutLocation = `https://maps.google.com/?q=${position.coords.latitude},${position.coords.longitude}`;
        writeSession(LOCATION_KEY, checkoutLocation);
        const status = document.getElementById('smLocationStatus');
        if (status) status.textContent = '✓ ' + tr('locationOk');
        button.disabled = false;
      },
      () => {
        toast(tr('locationFail'));
        button.disabled = false;
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );

    return true;
  }

  async function submitOrder() {
    if (inFlight) return;

    const rows = cartRows();
    if (!rows.length) {
      toast(tr('empty'));
      return;
    }

    const form = formData();
    if (!form.name || !form.phone || (form.orderType === 'delivery' && !form.address)) {
      toast(tr('required'));
      return;
    }

    if (!validPhone(form.phone)) {
      toast(tr('phoneInvalid'));
      return;
    }

    const db = client();
    if (!db) {
      toast(tr('failed'));
      return;
    }

    const payload = buildPayload(form, rows);
    inFlight = true;
    setButtonState('saving');

    try {
      const { data, error } = await db.rpc('submit_order', { p_payload: payload });
      if (error) throw error;
      if (!data?.ok || !data?.order_number) throw new Error('Invalid order response');

      const number = whatsappNumber();
      if (!number) throw new Error('WhatsApp number is unavailable');

      const message = buildWhatsApp(data, form);
      const whatsappUrl = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

      clearCartAfterSuccess();
      window.dispatchEvent(new CustomEvent('restbr:order-created', { detail: data }));
      toast(tr('saved'), 1000);

      setTimeout(() => {
        window.location.href = whatsappUrl;
      }, 220);
    } catch (error) {
      console.error('RESTBR ORDER SUBMIT ERROR:', error);
      toast(tr('failed'), 2600);
      inFlight = false;
      setButtonState('idle');
    }
  }

  document.addEventListener('click', event => {
    if (captureLocation(event)) return;

    const send = event.target.closest?.('#smSendWhatsApp');
    if (send) {
      event.preventDefault();
      event.stopImmediatePropagation();
      void submitOrder();
      return;
    }

    if (event.target.closest?.('#smCartContinue,[data-order-type],[data-lang]')) {
      setTimeout(updateCheckoutPresentation, 0);
      setTimeout(updateCheckoutPresentation, 80);
    }
  }, true);

  window.addEventListener('restbr:ready', () => {
    void loadDeliveryFee();
    setTimeout(updateCheckoutPresentation, 0);
  });

  window.addEventListener('restbr:prices-updated', () => {
    setTimeout(updateCheckoutPresentation, 0);
  });

  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    const rows = cartRows();
    if (!rows.length) location.reload();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setButtonState('idle');
      void loadDeliveryFee();
    }, { once: true });
  } else {
    setButtonState('idle');
    void loadDeliveryFee();
  }
})();

(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__RESTBR_ADMIN_ORDER_PRINT_V1__) return;
  window.__RESTBR_ADMIN_ORDER_PRINT_V1__ = true;

  const STATUS_LABELS = {
    new:'جديد', confirmed:'مؤكد', preparing:'قيد التحضير', ready:'جاهز',
    delivering:'قيد التوصيل', completed:'مكتمل', cancelled:'ملغي'
  };

  let activeOrderId = '';
  let modalObserver = null;

  const db = () => window.RESTBR_SUPABASE_CLIENT || window.supabaseClient || null;
  const esc = value => String(value ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#39;');

  const englishDigits = value => String(value ?? '')
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776));

  function firstText(...values) {
    for (const value of values) {
      const text = String(value ?? '').trim();
      if (text) return text;
    }
    return '';
  }

  function formatDate(value) {
    if (!value) return '—';
    try {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone:'Asia/Baghdad', year:'numeric', month:'2-digit', day:'2-digit',
        hour:'2-digit', minute:'2-digit', hourCycle:'h23'
      }).format(new Date(value)).replace(',', '');
    } catch (_) {
      return englishDigits(value);
    }
  }

  function safeImageUrl(value) {
    const raw = String(value || '').trim();
    if (!raw || /restaurant-placeholder/i.test(raw)) return '';
    if (/^data:image\//i.test(raw)) return raw;
    try {
      const url = new URL(raw, location.href);
      if (!['https:','http:','blob:'].includes(url.protocol)) return '';
      return url.href;
    } catch (_) {
      return '';
    }
  }

  function orderTypeLabel(order) {
    return order?.order_type === 'delivery' ? 'توصيل' : 'استلام';
  }

  function priceModeLabel(order) {
    return order?.price_mode === 'dinein' ? 'داخل المطعم' : 'سفري';
  }

  function money(value, currency = 'د.ع') {
    const number = Number(value || 0);
    return `${Number.isFinite(number) ? number.toLocaleString('en-US') : '0'} ${currency}`;
  }

  function restaurantIdentity(settings = {}) {
    const fallbackLogo = document.querySelector('.admin-logo')?.src || '';
    return {
      name:firstText(
        settings.name_ar,
        settings.restaurant_name_ar,
        settings.name_en,
        settings.restaurant_name_en,
        window.RESTBR_CONFIG?.restaurantName,
        'Restaurant'
      ),
      phone:englishDigits(firstText(settings.phone, settings.whatsapp, settings.whatsapp_number)),
      address:firstText(settings.address_ar, settings.footer_location_ar, settings.address_en, settings.location),
      logo:safeImageUrl(firstText(settings.logo_url, fallbackLogo)),
      currency:firstText(settings.currency, 'د.ع')
    };
  }

  function injectAdminStyles() {
    if (document.getElementById('restbrAdminOrderPrintStyles')) return;
    const style = document.createElement('style');
    style.id = 'restbrAdminOrderPrintStyles';
    style.textContent = `
      .sm-order-print-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}
      .sm-order-print-btn{border:1px solid rgba(216,169,88,.2);background:#17120e;color:#e8d2ad;border-radius:11px;padding:10px 8px;font:800 10px/1.2 inherit}
      .sm-order-print-btn:disabled{opacity:.55;cursor:wait}
      body.admin-light-mode .sm-order-print-btn,body.sm-admin-light .sm-order-print-btn{background:#fff;color:#443522;border-color:rgba(104,74,34,.16)}
    `;
    document.head.appendChild(style);
  }

  function injectPrintActions() {
    const card = document.getElementById('smOrderModalCard');
    if (!card || !activeOrderId || !card.querySelector('.sm-order-totals')) return;

    const existing = card.querySelector('[data-restbr-print-actions]');
    if (existing) {
      existing.querySelectorAll('[data-order-print]').forEach(button => {
        button.dataset.orderId = activeOrderId;
      });
      return;
    }

    const host = document.createElement('div');
    host.className = 'sm-order-print-actions';
    host.dataset.restbrPrintActions = '1';
    host.innerHTML = `
      <button class="sm-order-print-btn" data-order-print="label" data-order-id="${esc(activeOrderId)}" type="button">🖨 100×150</button>
      <button class="sm-order-print-btn" data-order-print="a4" data-order-id="${esc(activeOrderId)}" type="button">🖨 A4</button>
    `;

    const anchor = card.querySelector('.sm-order-status-actions,.sm-order-danger');
    if (anchor) card.insertBefore(host, anchor);
    else card.appendChild(host);
  }

  function installModalObserver() {
    if (modalObserver) return;
    const card = document.getElementById('smOrderModalCard');
    if (!card) return;
    modalObserver = new MutationObserver(() => injectPrintActions());
    modalObserver.observe(card, { childList:true });
    injectPrintActions();
  }

  async function loadPrintData(orderId) {
    const client = db();
    if (!client) throw new Error('Supabase client is unavailable');

    const [orderResult, itemsResult, settingsResult] = await Promise.all([
      client.from('orders').select('*').eq('id', orderId).maybeSingle(),
      client.from('order_items').select('*').eq('order_id', orderId).order('created_at', { ascending:true }),
      client.from('restaurant_settings')
        .select('restaurant_name_ar,restaurant_name_en,name_ar,name_en,phone,whatsapp,whatsapp_number,address_ar,address_en,footer_location_ar,location,logo_url,currency,updated_at')
        .order('updated_at', { ascending:false }).limit(1).maybeSingle()
    ]);

    if (orderResult.error) throw orderResult.error;
    if (itemsResult.error) throw itemsResult.error;
    if (settingsResult.error) throw settingsResult.error;
    if (!orderResult.data) throw new Error('Order not found');

    return {
      order:orderResult.data,
      items:Array.isArray(itemsResult.data) ? itemsResult.data : [],
      settings:settingsResult.data || {}
    };
  }

  function itemDetail(item) {
    const option = String(item?.option_name || '').trim();
    const color = String(item?.selected_color_name || '').trim();
    return [option, color ? `اللون: ${color}` : ''].filter(Boolean).join(' — ');
  }

  function buildDocument(order, items, settings, format) {
    const compact = format === 'label';
    const restaurant = restaurantIdentity(settings);
    const currency = restaurant.currency;
    const pageRule = compact
      ? '@page{size:100mm 150mm;margin:5mm}'
      : '@page{size:A4 portrait;margin:12mm}';
    const bodyClass = compact ? 'compact' : 'a4';
    const logo = restaurant.logo
      ? `<img class="logo" src="${esc(restaurant.logo)}" alt="${esc(restaurant.name)}">`
      : '';
    const locationLine = order.location_url
      ? (compact ? 'موقع GPS: محفوظ مع الطلب' : `موقع GPS: ${esc(order.location_url)}`)
      : '';

    const rows = items.map(item => {
      const detail = itemDetail(item);
      const qty = Math.max(1, Number(item.quantity || 1));
      return `
        <tr>
          <td class="item-name"><strong>${esc(item.product_name || '')}</strong>${detail ? `<small>${esc(detail)}</small>` : ''}<small>سعر الوحدة: ${esc(money(item.unit_price, currency))}</small></td>
          <td class="qty">${qty.toLocaleString('en-US')}</td>
          <td class="line-total">${esc(money(item.line_total, currency))}</td>
        </tr>`;
    }).join('');

    const notes = String(order.notes || '').trim();
    const address = String(order.address || '').trim();
    const deliveryFee = Number(order.delivery_fee || 0);
    const restaurantMeta = [restaurant.phone, restaurant.address].filter(Boolean).map(esc).join(' • ');

    return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(order.order_number || 'Order')}</title>
<style>
${pageRule}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff;color:#000}
body{font-family:Tahoma,Arial,"Segoe UI",sans-serif;font-weight:700;line-height:1.45}
.screen-toolbar{position:sticky;top:0;z-index:10;display:flex;gap:8px;justify-content:center;padding:10px;background:#eee;border-bottom:1px solid #bbb;direction:rtl}
.screen-toolbar button{border:1px solid #111;background:#fff;color:#000;border-radius:8px;padding:9px 16px;font:800 14px Tahoma,Arial,sans-serif;cursor:pointer}
.sheet{margin:0 auto;background:#fff}
.compact .sheet{width:90mm;font-size:10.5px}
.a4 .sheet{width:100%;max-width:186mm;font-size:13px}
.logo{display:block;margin:0 auto 4mm;max-width:34mm;max-height:22mm;object-fit:contain;filter:grayscale(1) contrast(1.45)}
.a4 .logo{max-width:42mm;max-height:28mm}
.restaurant{text-align:center;border-bottom:2px solid #000;padding-bottom:3mm;margin-bottom:3mm}
.restaurant h1{margin:0;font-size:19px;font-weight:900}.a4 .restaurant h1{font-size:24px}
.restaurant p{margin:1.5mm 0 0;font-size:9px;font-weight:700}.a4 .restaurant p{font-size:11px}
.order-title{display:flex;justify-content:space-between;gap:8px;align-items:flex-end;border-bottom:1px solid #000;padding-bottom:2mm;margin-bottom:2.5mm}
.order-title strong{font-size:17px;font-weight:900;direction:ltr}.a4 .order-title strong{font-size:22px}
.order-title span{font-size:9px;direction:ltr}.a4 .order-title span{font-size:11px}
.info{display:grid;grid-template-columns:1fr 1fr;border:1px solid #000;margin-bottom:3mm}
.info div{padding:1.5mm 2mm;border-bottom:1px solid #000;min-width:0}.info div:nth-child(odd){border-inline-end:1px solid #000}.info div:nth-last-child(-n+2){border-bottom:0}
.info small{display:block;font-size:8px;font-weight:700;margin-bottom:.6mm}.info b{display:block;font-size:10.5px;font-weight:900;word-break:break-word}.a4 .info small{font-size:10px}.a4 .info b{font-size:13px}
.extra{border:1px solid #000;padding:2mm;margin-bottom:3mm;font-size:9px;word-break:break-word}.a4 .extra{font-size:11px}
table{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:1mm}
th,td{border:1px solid #000;padding:1.5mm;vertical-align:top}
th{font-size:9px;font-weight:900;text-align:center}.a4 th{font-size:11px}
th:first-child{width:auto}th.qty,td.qty{width:12mm;text-align:center}th.line-total,td.line-total{width:27mm;text-align:center;direction:ltr;white-space:nowrap}
.item-name strong{display:block;font-size:10.5px;font-weight:900}.a4 .item-name strong{font-size:13px}.item-name small{display:block;margin-top:.8mm;font-size:8px;font-weight:700}.a4 .item-name small{font-size:10px}
.qty,.line-total{font-weight:900;font-size:9.5px}.a4 .qty,.a4 .line-total{font-size:12px}
tr{break-inside:avoid;page-break-inside:avoid}
.totals{margin-top:3mm;border-top:2px solid #000;padding-top:2mm}.total-row{display:flex;justify-content:space-between;gap:10px;margin:.8mm 0;font-size:10px}.a4 .total-row{font-size:13px}.total-row.final{border-top:1px solid #000;padding-top:1.5mm;margin-top:1.5mm;font-size:16px;font-weight:900}.a4 .total-row.final{font-size:20px}
.notes{margin-top:3mm;border:1px solid #000;padding:2mm;font-size:9px;white-space:pre-wrap}.a4 .notes{font-size:11px}
.footer{margin-top:3mm;padding-top:2mm;border-top:1px dashed #000;text-align:center;font-size:8px;font-weight:700}.a4 .footer{font-size:10px}
@media print{.screen-toolbar{display:none!important}.sheet{width:auto!important;max-width:none!important;margin:0!important}.logo{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
</style>
</head>
<body class="${bodyClass}">
<div class="screen-toolbar"><button type="button" onclick="window.print()">طباعة</button><button type="button" onclick="window.close()">إغلاق</button></div>
<main class="sheet">
  <header class="restaurant">${logo}<h1>${esc(restaurant.name)}</h1>${restaurantMeta ? `<p>${restaurantMeta}</p>` : ''}</header>
  <section class="order-title"><div><div>رقم الطلب</div><strong>${esc(order.order_number || '')}</strong></div><span>${esc(formatDate(order.created_at))}</span></section>
  <section class="info">
    <div><small>الزبون</small><b>${esc(order.customer_name || '—')}</b></div>
    <div><small>الهاتف</small><b dir="ltr">${esc(englishDigits(order.customer_phone || '—'))}</b></div>
    <div><small>نوع الطلب</small><b>${esc(orderTypeLabel(order))}</b></div>
    <div><small>الحالة</small><b>${esc(STATUS_LABELS[order.status] || order.status || '—')}</b></div>
    <div><small>نوع السعر</small><b>${esc(priceModeLabel(order))}</b></div>
    <div><small>التاريخ / الوقت</small><b dir="ltr">${esc(formatDate(order.created_at))}</b></div>
  </section>
  ${(address || locationLine) ? `<section class="extra">${address ? `<div><strong>العنوان:</strong> ${esc(address)}</div>` : ''}${locationLine ? `<div><strong>${locationLine}</strong></div>` : ''}</section>` : ''}
  <table>
    <thead><tr><th>الصنف / الخيار</th><th class="qty">الكمية</th><th class="line-total">الإجمالي</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="3">لا توجد تفاصيل أصناف.</td></tr>'}</tbody>
  </table>
  <section class="totals">
    <div class="total-row"><span>المجموع</span><b>${esc(money(order.subtotal, currency))}</b></div>
    ${deliveryFee > 0 ? `<div class="total-row"><span>أجرة التوصيل</span><b>${esc(money(deliveryFee, currency))}</b></div>` : ''}
    <div class="total-row final"><span>الإجمالي</span><b>${esc(money(order.total, currency))}</b></div>
  </section>
  ${notes ? `<section class="notes"><strong>ملاحظات:</strong> ${esc(notes)}</section>` : ''}
  <footer class="footer">نسخة مطبوعة من الطلب المحفوظ</footer>
</main>
</body>
</html>`;
  }

  function writeLoading(printWindow) {
    printWindow.document.open();
    printWindow.document.write('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>طباعة الطلب</title></head><body style="font-family:Tahoma,Arial,sans-serif;text-align:center;padding:40px">جاري تجهيز الفاتورة...</body></html>');
    printWindow.document.close();
  }

  function writeError(printWindow, error) {
    const message = esc(error?.message || error || 'تعذر تجهيز الفاتورة');
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>خطأ</title></head><body style="font-family:Tahoma,Arial,sans-serif;text-align:center;padding:40px"><h2>تعذر تجهيز الفاتورة</h2><p>${message}</p><button onclick="window.close()">إغلاق</button></body></html>`);
    printWindow.document.close();
  }

  function triggerPrintWhenReady(printWindow) {
    let fired = false;
    const printOnce = () => {
      if (fired || printWindow.closed) return;
      fired = true;
      setTimeout(() => {
        try { printWindow.focus(); printWindow.print(); }
        catch (_) {}
      }, 120);
    };

    const image = printWindow.document.querySelector('.logo');
    if (image && !image.complete) {
      image.addEventListener('load', printOnce, { once:true });
      image.addEventListener('error', printOnce, { once:true });
      setTimeout(printOnce, 900);
    } else {
      printOnce();
    }
  }

  async function printOrder(orderId, format, printWindow) {
    try {
      const data = await loadPrintData(orderId);
      const html = buildDocument(data.order, data.items, data.settings, format);
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      triggerPrintWhenReady(printWindow);
    } catch (error) {
      console.error('RESTBR ORDER PRINT ERROR:', error);
      writeError(printWindow, error);
    }
  }

  function openPrintWindow() {
    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) {
      alert('تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة لهذا الموقع ثم حاول مرة ثانية.');
      return null;
    }
    try { printWindow.opener = null; } catch (_) {}
    writeLoading(printWindow);
    return printWindow;
  }

  function bind() {
    document.addEventListener('click', event => {
      const details = event.target.closest?.('[data-order-details]');
      if (details?.dataset.orderDetails) {
        activeOrderId = String(details.dataset.orderDetails);
        installModalObserver();
        setTimeout(injectPrintActions, 0);
        setTimeout(injectPrintActions, 160);
      }

      const status = event.target.closest?.('[data-order-set-status]');
      if (status?.dataset.orderId) activeOrderId = String(status.dataset.orderId);

      const button = event.target.closest?.('[data-order-print]');
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();

      const orderId = String(button.dataset.orderId || activeOrderId || '');
      const format = button.dataset.orderPrint === 'a4' ? 'a4' : 'label';
      if (!orderId) return;

      const printWindow = openPrintWindow();
      if (!printWindow) return;
      void printOrder(orderId, format, printWindow);
    }, true);
  }

  function boot() {
    injectAdminStyles();
    installModalObserver();
    bind();
  }

  window.RESTBR_PRINT_ORDER = (orderId, format = 'label') => {
    const printWindow = openPrintWindow();
    if (!printWindow) return;
    void printOrder(String(orderId || ''), format === 'a4' ? 'a4' : 'label', printWindow);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once:true });
  } else {
    boot();
  }
})();

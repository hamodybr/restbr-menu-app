(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__RESTBR_ADMIN_ORDERS_V1__) return;
  window.__RESTBR_ADMIN_ORDERS_V1__ = true;

  const STATUSES = [
    ['new','جديد'],
    ['confirmed','مؤكد'],
    ['preparing','قيد التحضير'],
    ['ready','جاهز'],
    ['delivering','قيد التوصيل'],
    ['completed','مكتمل'],
    ['cancelled','ملغي'],
    ['all','كل الحالات']
  ];
  const MANAGE_ROLES = new Set(['super_admin','owner','manager']);
  const VIEW_ROLES = new Set(['super_admin','owner','manager','viewer']);
  const SETTINGS_ROLES = new Set(['super_admin','owner']);

  let currentStatus = 'new';
  let currentRole = '';
  let orders = [];
  let loading = false;
  let realtimeChannel = null;
  let refreshTimer = null;
  let deliveryFee = 0;
  let settingsId = '';

  const db = () => window.RESTBR_SUPABASE_CLIENT || window.supabaseClient || null;
  const esc = value => String(value ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#39;');
  const englishDigits = value => String(value ?? '')
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776));
  const money = value => `${Number(value || 0).toLocaleString('en-US')} د.ع`;
  const statusLabel = value => STATUSES.find(([key]) => key === value)?.[1] || value || '—';

  function formatDate(value) {
    if (!value) return '—';
    try {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone:'Asia/Baghdad', year:'numeric', month:'2-digit', day:'2-digit',
        hour:'2-digit', minute:'2-digit', hourCycle:'h23'
      }).format(new Date(value)).replace(',', '');
    } catch (_) { return englishDigits(value); }
  }

  function injectStyles() {
    if (document.getElementById('restbrAdminOrdersStyles')) return;
    const style = document.createElement('style');
    style.id = 'restbrAdminOrdersStyles';
    style.textContent = `
      .bottom-nav{grid-template-columns:repeat(6,minmax(0,1fr))!important}
      .sm-orders-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px}
      .sm-orders-head h2{margin:0;color:#e2b55e;font-size:20px}.sm-orders-sub{color:#8f8981;font-size:11px;margin-top:4px}
      .sm-orders-tools{display:flex;gap:8px;align-items:center}.sm-orders-refresh{min-width:44px}
      .sm-orders-statuses{display:flex;gap:7px;overflow-x:auto;padding:2px 1px 10px;scrollbar-width:none;overscroll-behavior-inline:contain}
      .sm-orders-statuses::-webkit-scrollbar{display:none}
      .sm-order-filter{flex:0 0 auto;border:1px solid rgba(255,255,255,.09);background:#15110e;color:#bdb5ab;border-radius:999px;padding:9px 12px;font-size:11px;font-weight:800;white-space:nowrap}
      .sm-order-filter.active{color:#150d04;background:linear-gradient(135deg,#e5b860,#b77b2c);border-color:transparent}
      .sm-orders-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:12px}
      .sm-orders-stat{padding:11px;border-radius:12px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);text-align:center}
      .sm-orders-stat small{display:block;color:#8f8981;font-size:9px;margin-bottom:5px}.sm-orders-stat b{color:#e2b55e;font-size:17px}
      .sm-orders-list{display:grid;gap:9px}
      .sm-order-card{border:1px solid rgba(255,255,255,.075);background:rgba(255,255,255,.028);border-radius:15px;padding:12px;display:grid;gap:9px}
      .sm-order-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.sm-order-number{font-weight:950;color:#f3e3c8;font-size:14px}.sm-order-time{font-size:10px;color:#827b73;margin-top:3px;direction:ltr;text-align:start}
      .sm-order-status{font-size:10px;font-weight:900;border-radius:999px;padding:6px 9px;background:rgba(216,169,88,.08);border:1px solid rgba(216,169,88,.16);color:#e0b96f;white-space:nowrap}
      .sm-order-customer{display:grid;grid-template-columns:1fr auto;gap:6px 12px;align-items:center}.sm-order-customer strong{font-size:13px}.sm-order-phone{direction:ltr;color:#a9a198;font-size:11px}.sm-order-total{color:#e2b55e;font-weight:950;white-space:nowrap}
      .sm-order-meta{display:flex;gap:7px;flex-wrap:wrap}.sm-order-pill{padding:5px 7px;border-radius:8px;background:#0d0a08;border:1px solid rgba(255,255,255,.06);font-size:9px;color:#9d958b}
      .sm-order-actions{display:flex;gap:7px}.sm-order-actions button{flex:1}
      .sm-orders-empty,.sm-orders-loading,.sm-orders-denied{text-align:center;padding:34px 12px;color:#8f8981}
      .sm-delivery-fee-box{display:flex;align-items:end;gap:8px;flex-wrap:wrap;margin:0 0 12px;padding:10px;border:1px solid rgba(216,169,88,.12);border-radius:13px;background:rgba(216,169,88,.035)}
      .sm-delivery-fee-box label{display:grid;gap:5px;flex:1;min-width:150px;color:#9b9288;font-size:10px}.sm-delivery-fee-box input{width:100%;border:1px solid rgba(255,255,255,.09);background:#070503;color:#fff;border-radius:10px;padding:10px;direction:ltr}
      .sm-order-modal{position:fixed;inset:0;z-index:12000;display:none;align-items:flex-end;justify-content:center;padding:12px;background:rgba(0,0,0,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
      .sm-order-modal.open{display:flex}.sm-order-modal-card{width:min(720px,100%);max-height:92vh;overflow:auto;background:#0b0806;border:1px solid rgba(216,169,88,.28);border-radius:22px 22px 14px 14px;padding:16px;box-shadow:0 24px 75px rgba(0,0,0,.6)}
      .sm-order-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;position:sticky;top:-16px;background:#0b0806;padding:4px 0 10px;z-index:2}.sm-order-modal-head h3{margin:0;color:#e2b55e}.sm-order-close{width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.1);background:#17120e;color:#fff;font-size:21px}
      .sm-order-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0 12px}.sm-order-detail-cell{padding:9px;border-radius:10px;background:#100c09;border:1px solid rgba(255,255,255,.055)}.sm-order-detail-cell small{display:block;color:#7f776f;font-size:9px;margin-bottom:4px}.sm-order-detail-cell b,.sm-order-detail-cell span{font-size:11px;word-break:break-word}.sm-order-ltr{direction:ltr;text-align:start}
      .sm-order-items{display:grid;gap:7px}.sm-order-item{padding:10px;border-radius:11px;background:#100c09;border:1px solid rgba(255,255,255,.055)}.sm-order-item-main{display:flex;justify-content:space-between;gap:10px}.sm-order-item-name{font-weight:900;font-size:12px}.sm-order-item-price{direction:ltr;color:#dfb468;font-weight:900;font-size:11px;white-space:nowrap}.sm-order-item-sub{margin-top:4px;color:#988f85;font-size:10px}.sm-order-color-dot{display:inline-block;width:9px;height:9px;border-radius:50%;vertical-align:-1px;margin-inline:3px;border:1px solid rgba(255,255,255,.25)}
      .sm-order-totals{margin-top:10px;padding-top:10px;border-top:1px dashed rgba(255,255,255,.1);display:grid;gap:5px}.sm-order-total-row{display:flex;justify-content:space-between;gap:12px;font-size:11px}.sm-order-total-row.final{font-size:14px;color:#e2b55e;font-weight:950}
      .sm-order-status-actions{display:flex;gap:6px;overflow-x:auto;margin-top:12px;padding-bottom:3px;scrollbar-width:none}.sm-order-status-actions::-webkit-scrollbar{display:none}.sm-order-status-btn{flex:0 0 auto;border:1px solid rgba(255,255,255,.08);background:#15110e;color:#bcb4aa;border-radius:10px;padding:8px 10px;font-size:10px}.sm-order-status-btn.active{color:#160e05;background:#d9aa57}.sm-order-danger{margin-top:12px;width:100%;border:1px solid rgba(248,113,113,.28);background:rgba(127,29,29,.2);color:#fecaca;border-radius:11px;padding:10px;font-weight:900}
      body.admin-light-mode .sm-order-card,body.admin-light-mode .sm-orders-stat,body.admin-light-mode .sm-order-detail-cell,body.admin-light-mode .sm-order-item,body.admin-light-mode .sm-order-modal-card,body.sm-admin-light .sm-order-card,body.sm-admin-light .sm-orders-stat,body.sm-admin-light .sm-order-detail-cell,body.sm-admin-light .sm-order-item,body.sm-admin-light .sm-order-modal-card{background:#fff;color:#2c251e;border-color:rgba(104,74,34,.14)}
      body.admin-light-mode .sm-order-modal-head,body.sm-admin-light .sm-order-modal-head{background:#fff}
      @media(max-width:650px){.bottom-nav{left:6px!important;right:6px!important;gap:3px!important;padding:5px!important}.bottom-nav .nav-btn{min-width:0;padding-inline:2px!important}.bottom-nav .nav-btn span:last-child{font-size:8px!important}.sm-order-detail-grid{grid-template-columns:1fr}.sm-order-customer{grid-template-columns:1fr auto}}
    `;
    document.head.appendChild(style);
  }

  function injectUi() {
    if (document.getElementById('viewOrders')) return;
    const main = document.querySelector('.admin-main');
    const nav = document.querySelector('.bottom-nav');
    if (!main || !nav) return;

    const section = document.createElement('section');
    section.id = 'viewOrders';
    section.className = 'admin-view';
    section.dataset.view = 'orders';
    section.innerHTML = `
      <div class="sm-orders-head">
        <div><h2>الطلبات</h2><div class="sm-orders-sub">الطلبات المثبتة من المنيو</div></div>
        <div class="sm-orders-tools"><button id="smOrdersRefresh" class="btn btn-dark sm-orders-refresh" type="button">↻</button></div>
      </div>
      <div id="smDeliveryFeeBox"></div>
      <div id="smOrderStatuses" class="sm-orders-statuses"></div>
      <div id="smOrdersSummary" class="sm-orders-summary"></div>
      <div id="smOrdersList" class="sm-orders-list"><div class="sm-orders-loading">جاري تحميل الطلبات...</div></div>
    `;
    main.appendChild(section);

    const navBtn = document.createElement('button');
    navBtn.className = 'nav-btn';
    navBtn.type = 'button';
    navBtn.dataset.adminNav = 'orders';
    navBtn.innerHTML = '<span class="nav-icon">🧾</span><span>الطلبات</span>';
    const toolsBtn = nav.querySelector('[data-admin-nav="tools"]');
    nav.insertBefore(navBtn, toolsBtn || null);

    const quickGrid = document.querySelector('#viewHome .quick-actions, #viewHome .home-quick-actions, #viewHome .home-actions');
    if (quickGrid) {
      const quick = document.createElement('button');
      quick.className = 'quick-action';
      quick.type = 'button';
      quick.dataset.goView = 'orders';
      quick.innerHTML = '<strong>🧾 الطلبات</strong><span>الجديدة، الحالات والتفاصيل</span>';
      quickGrid.appendChild(quick);
    }

    const modal = document.createElement('div');
    modal.id = 'smOrderModal';
    modal.className = 'sm-order-modal';
    modal.setAttribute('aria-hidden','true');
    modal.innerHTML = '<div class="sm-order-modal-card" id="smOrderModalCard"></div>';
    document.body.appendChild(modal);
  }

  function activateOrdersView() {
    document.querySelectorAll('.admin-view').forEach(section => {
      section.classList.toggle('active', section.dataset.view === 'orders');
    });
    document.querySelectorAll('[data-admin-nav]').forEach(button => {
      button.classList.toggle('active', button.dataset.adminNav === 'orders');
    });
    const title = document.getElementById('adminPageTitle');
    const subtitle = document.getElementById('adminPageSubtitle');
    if (title) title.textContent = 'الطلبات';
    if (subtitle) subtitle.textContent = 'إدارة الطلبات والحالات';
    window.scrollTo({ top:0, behavior:'smooth' });
    void loadOrders(true);
  }

  function renderFilters() {
    const host = document.getElementById('smOrderStatuses');
    if (!host) return;
    host.innerHTML = STATUSES.map(([key,label]) => `
      <button class="sm-order-filter ${currentStatus === key ? 'active' : ''}" data-order-filter="${key}" type="button">${label}</button>
    `).join('');
  }

  function renderSummary() {
    const host = document.getElementById('smOrdersSummary');
    if (!host) return;
    const visible = currentStatus === 'all' ? orders : orders.filter(o => o.status === currentStatus);
    const total = visible.reduce((sum,o) => sum + Number(o.total || 0), 0);
    const newCount = orders.filter(o => o.status === 'new').length;
    host.innerHTML = `
      <div class="sm-orders-stat"><small>المعروض</small><b>${visible.length.toLocaleString('en-US')}</b></div>
      <div class="sm-orders-stat"><small>جديد</small><b>${newCount.toLocaleString('en-US')}</b></div>
      <div class="sm-orders-stat"><small>إجمالي المعروض</small><b>${money(total)}</b></div>
    `;
  }

  function orderTypeLabel(order) {
    return order.order_type === 'delivery' ? 'توصيل' : 'استلام';
  }

  function renderOrders() {
    renderFilters();
    renderSummary();
    const host = document.getElementById('smOrdersList');
    if (!host) return;

    if (!VIEW_ROLES.has(currentRole)) {
      host.innerHTML = '<div class="sm-orders-denied">هذا الحساب لا يملك صلاحية عرض الطلبات.</div>';
      return;
    }

    const visible = currentStatus === 'all'
      ? orders
      : orders.filter(order => order.status === currentStatus);

    if (!visible.length) {
      host.innerHTML = '<div class="sm-orders-empty">لا توجد طلبات ضمن هذه الحالة.</div>';
      return;
    }

    host.innerHTML = visible.map(order => `
      <article class="sm-order-card" data-order-id="${esc(order.id)}">
        <div class="sm-order-top">
          <div><div class="sm-order-number">${esc(order.order_number)}</div><div class="sm-order-time">${esc(formatDate(order.created_at))}</div></div>
          <span class="sm-order-status">${esc(statusLabel(order.status))}</span>
        </div>
        <div class="sm-order-customer">
          <strong>${esc(order.customer_name)}</strong><b class="sm-order-total">${esc(money(order.total))}</b>
          <span class="sm-order-phone">${esc(englishDigits(order.customer_phone))}</span><span></span>
        </div>
        <div class="sm-order-meta">
          <span class="sm-order-pill">${orderTypeLabel(order)}</span>
          <span class="sm-order-pill">${order.price_mode === 'dinein' ? 'داخل المطعم' : 'سفري'}</span>
          ${Number(order.delivery_fee || 0) > 0 ? `<span class="sm-order-pill">توصيل ${esc(money(order.delivery_fee))}</span>` : ''}
        </div>
        <div class="sm-order-actions"><button class="btn btn-dark" data-order-details="${esc(order.id)}" type="button">التفاصيل</button></div>
      </article>
    `).join('');
  }

  async function loadRole() {
    const client = db();
    if (!client) return '';
    try {
      const { data, error } = await client.rpc('current_admin_role');
      if (error) throw error;
      currentRole = String(data || '');
    } catch (error) {
      console.warn('RESTBR ORDERS ROLE ERROR:', error);
      currentRole = '';
    }
    return currentRole;
  }

  async function loadSettings() {
    const client = db();
    if (!client || !currentRole) return;
    try {
      const { data, error } = await client
        .from('restaurant_settings')
        .select('id,delivery_fee,updated_at')
        .order('updated_at',{ascending:false})
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      settingsId = String(data?.id || '');
      deliveryFee = Number(data?.delivery_fee || 0);
    } catch (error) {
      console.warn('RESTBR DELIVERY FEE LOAD ERROR:', error);
      settingsId = '';
      deliveryFee = 0;
    }
    renderDeliveryFee();
  }

  function renderDeliveryFee() {
    const host = document.getElementById('smDeliveryFeeBox');
    if (!host) return;
    if (!SETTINGS_ROLES.has(currentRole)) {
      host.innerHTML = Number(deliveryFee || 0) > 0
        ? `<div class="sm-delivery-fee-box"><span style="font-size:10px;color:#9b9288">أجرة التوصيل الحالية</span><b>${esc(money(deliveryFee))}</b></div>`
        : '';
      return;
    }
    host.innerHTML = `
      <div class="sm-delivery-fee-box">
        <label><span>أجرة التوصيل الثابتة (د.ع)</span><input id="smDeliveryFeeInput" inputmode="numeric" value="${esc(englishDigits(deliveryFee))}"></label>
        <button id="smDeliveryFeeSave" class="btn btn-gold" type="button">حفظ</button>
      </div>
    `;
  }

  async function saveDeliveryFee() {
    if (!SETTINGS_ROLES.has(currentRole) || !settingsId) return;
    const input = document.getElementById('smDeliveryFeeInput');
    const button = document.getElementById('smDeliveryFeeSave');
    const normalized = englishDigits(input?.value || '').replace(/[^0-9]/g,'');
    const value = Number(normalized || 0);
    if (!Number.isFinite(value) || value < 0 || value > 1000000000) return;
    if (button) { button.disabled = true; button.textContent = 'جاري الحفظ...'; }
    try {
      const { error } = await db().from('restaurant_settings').update({delivery_fee:value}).eq('id',settingsId);
      if (error) throw error;
      deliveryFee = value;
      renderDeliveryFee();
    } catch (error) {
      console.error('RESTBR DELIVERY FEE SAVE ERROR:', error);
      if (button) { button.disabled = false; button.textContent = 'حفظ'; }
    }
  }

  async function loadOrders(force = false) {
    if (loading && !force) return;
    const client = db();
    if (!client) return;
    loading = true;
    const host = document.getElementById('smOrdersList');
    if (host && !orders.length) host.innerHTML = '<div class="sm-orders-loading">جاري تحميل الطلبات...</div>';

    try {
      if (!currentRole) await loadRole();
      if (!VIEW_ROLES.has(currentRole)) {
        orders = [];
        renderOrders();
        return;
      }

      const { data, error } = await client
        .from('orders')
        .select('*')
        .order('created_at',{ascending:false})
        .limit(300);
      if (error) throw error;
      orders = Array.isArray(data) ? data : [];
      renderOrders();
      if (!settingsId) await loadSettings();
    } catch (error) {
      console.error('RESTBR ADMIN ORDERS LOAD ERROR:', error);
      if (host) host.innerHTML = `<div class="sm-orders-empty">تعذر تحميل الطلبات: ${esc(error?.message || error)}</div>`;
    } finally {
      loading = false;
    }
  }

  async function openOrder(orderId) {
    const order = orders.find(item => String(item.id) === String(orderId));
    if (!order) return;
    const modal = document.getElementById('smOrderModal');
    const card = document.getElementById('smOrderModalCard');
    if (!modal || !card) return;
    card.innerHTML = '<div class="sm-orders-loading">جاري تحميل التفاصيل...</div>';
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');

    try {
      const { data, error } = await db()
        .from('order_items')
        .select('*')
        .eq('order_id',order.id)
        .order('created_at',{ascending:true});
      if (error) throw error;
      renderOrderModal(order, Array.isArray(data) ? data : []);
    } catch (error) {
      card.innerHTML = `<button class="sm-order-close" data-order-close type="button">×</button><div class="sm-orders-empty">تعذر تحميل التفاصيل: ${esc(error?.message || error)}</div>`;
    }
  }

  function renderOrderModal(order, items) {
    const card = document.getElementById('smOrderModalCard');
    if (!card) return;
    const canManage = MANAGE_ROLES.has(currentRole);
    const detailCell = (label,value,extra='') => `<div class="sm-order-detail-cell ${extra}"><small>${label}</small><span>${value || '—'}</span></div>`;
    const location = String(order.location_url || '').startsWith('https://')
      ? `<a href="${esc(order.location_url)}" target="_blank" rel="noopener noreferrer" style="color:#d8a958">فتح الموقع</a>`
      : '—';

    card.innerHTML = `
      <div class="sm-order-modal-head"><div><h3>${esc(order.order_number)}</h3><div class="sm-order-time">${esc(formatDate(order.created_at))}</div></div><button class="sm-order-close" data-order-close type="button">×</button></div>
      <div class="sm-order-detail-grid">
        ${detailCell('الزبون',esc(order.customer_name))}
        ${detailCell('الهاتف',esc(englishDigits(order.customer_phone)),'sm-order-ltr')}
        ${detailCell('نوع الطلب',esc(orderTypeLabel(order)))}
        ${detailCell('الحالة',esc(statusLabel(order.status)))}
        ${detailCell('العنوان',esc(order.address || '—'))}
        ${detailCell('الموقع',location)}
        ${detailCell('ملاحظات',esc(order.notes || '—'))}
        ${detailCell('تاريخ الطلب',esc(formatDate(order.created_at)),'sm-order-ltr')}
      </div>
      <div class="sm-order-items">
        ${items.map(item => {
          const color = String(item.selected_color_name || '').trim();
          const option = String(item.option_name || '').trim();
          const dot = color && item.selected_color_hex
            ? `<i class="sm-order-color-dot" style="background:${esc(item.selected_color_hex)}"></i>` : '';
          const sub = [option, color ? `${dot}اللون: ${esc(color)}` : '', `الكمية: ${Number(item.quantity || 0).toLocaleString('en-US')}`, `سعر الوحدة: ${esc(money(item.unit_price))}`].filter(Boolean).join(' • ');
          return `<div class="sm-order-item"><div class="sm-order-item-main"><span class="sm-order-item-name">${esc(item.product_name)}</span><b class="sm-order-item-price">${esc(money(item.line_total))}</b></div><div class="sm-order-item-sub">${sub}</div></div>`;
        }).join('') || '<div class="sm-orders-empty">لا توجد تفاصيل أصناف.</div>'}
      </div>
      <div class="sm-order-totals">
        <div class="sm-order-total-row"><span>المجموع</span><b>${esc(money(order.subtotal))}</b></div>
        <div class="sm-order-total-row"><span>أجرة التوصيل</span><b>${esc(money(order.delivery_fee))}</b></div>
        <div class="sm-order-total-row final"><span>الإجمالي</span><b>${esc(money(order.total))}</b></div>
      </div>
      ${canManage ? `<div class="sm-order-status-actions">${STATUSES.filter(([key]) => key !== 'all').map(([key,label]) => `<button class="sm-order-status-btn ${order.status === key ? 'active' : ''}" data-order-set-status="${key}" data-order-id="${esc(order.id)}" type="button">${label}</button>`).join('')}</div><button class="sm-order-danger" data-order-delete="${esc(order.id)}" type="button">حذف الطلب</button>` : ''}
    `;
  }

  function closeModal() {
    const modal = document.getElementById('smOrderModal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
  }

  async function setStatus(orderId,status) {
    if (!MANAGE_ROLES.has(currentRole)) return;
    try {
      const { data, error } = await db().rpc('set_order_status',{p_order_id:orderId,p_status:status});
      if (error) throw error;
      const order = orders.find(item => String(item.id) === String(orderId));
      if (order) order.status = data?.status || status;
      renderOrders();
      await openOrder(orderId);
    } catch (error) {
      console.error('RESTBR ORDER STATUS ERROR:', error);
      alert('تعذر تحديث حالة الطلب: ' + (error?.message || error));
    }
  }

  async function deleteOrder(orderId) {
    if (!MANAGE_ROLES.has(currentRole)) return;
    const order = orders.find(item => String(item.id) === String(orderId));
    if (!confirm(`حذف الطلب ${order?.order_number || ''} نهائياً؟`)) return;
    try {
      const { error } = await db().rpc('delete_order',{p_order_id:orderId});
      if (error) throw error;
      orders = orders.filter(item => String(item.id) !== String(orderId));
      closeModal();
      renderOrders();
    } catch (error) {
      console.error('RESTBR ORDER DELETE ERROR:', error);
      alert('تعذر حذف الطلب: ' + (error?.message || error));
    }
  }

  function scheduleRefresh() {
    clearTimeout(window.__restbrAdminOrdersRefreshTimer);
    window.__restbrAdminOrdersRefreshTimer = setTimeout(() => {
      if (document.visibilityState === 'visible') void loadOrders(true);
    }, 180);
  }

  function startRealtime() {
    if (realtimeChannel || !db()?.channel) return;
    try {
      realtimeChannel = db()
        .channel('restbr-admin-orders-v1')
        .on('postgres_changes',{event:'*',schema:'public',table:'orders'},scheduleRefresh)
        .subscribe();
    } catch (error) {
      console.debug('RESTBR orders realtime unavailable:', error?.message || error);
    }

    if (!refreshTimer) {
      refreshTimer = setInterval(() => {
        const active = document.getElementById('viewOrders')?.classList.contains('active');
        if (active && document.visibilityState === 'visible') void loadOrders();
      }, 60000);
    }
  }

  function bind() {
    document.addEventListener('click', event => {
      const goOrders = event.target.closest?.('[data-admin-nav="orders"],[data-go-view="orders"]');
      if (goOrders) {
        event.preventDefault();
        event.stopImmediatePropagation();
        activateOrdersView();
        return;
      }

      const filter = event.target.closest?.('[data-order-filter]');
      if (filter) {
        currentStatus = filter.dataset.orderFilter || 'new';
        renderOrders();
        return;
      }

      if (event.target.closest?.('#smOrdersRefresh')) { void loadOrders(true); return; }
      if (event.target.closest?.('#smDeliveryFeeSave')) { void saveDeliveryFee(); return; }

      const details = event.target.closest?.('[data-order-details]');
      if (details) { void openOrder(details.dataset.orderDetails); return; }

      if (event.target.closest?.('[data-order-close]') || event.target.id === 'smOrderModal') {
        closeModal(); return;
      }

      const status = event.target.closest?.('[data-order-set-status]');
      if (status) { void setStatus(status.dataset.orderId,status.dataset.orderSetStatus); return; }

      const del = event.target.closest?.('[data-order-delete]');
      if (del) { void deleteOrder(del.dataset.orderDelete); }
    }, true);
  }

  async function boot() {
    injectStyles();
    injectUi();
    bind();
    renderFilters();
    renderSummary();
    await loadRole();
    await loadSettings();
    startRealtime();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { void boot(); }, { once:true });
  } else {
    void boot();
  }
})();

(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;
  if (window.__RESTBR_RESTAURANT_RESET_PREVIEW_V1__) return;
  window.__RESTBR_RESTAURANT_RESET_PREVIEW_V1__ = true;

  const q = (s, r = document) => r.querySelector(s);
  const nf = new Intl.NumberFormat('ar-IQ');

  const labels = [
    ['categories', 'الأقسام'],
    ['products', 'الأصناف'],
    ['product_options', 'خيارات الأصناف'],
    ['discounts', 'الخصومات'],
    ['orders', 'الطلبات'],
    ['order_items', 'عناصر الطلبات'],
    ['menu_analytics_daily', 'سجلات الإحصائيات'],
    ['storage_files', 'ملفات الصور'],
  ];

  function allowed(){
    return document.body?.dataset?.adminRole === 'super_admin';
  }

  function installStyles(){
    if (q('#restbrResetPreviewStyles')) return;
    const style = document.createElement('style');
    style.id = 'restbrResetPreviewStyles';
    style.textContent = `
      #restbrResetPreviewPanel .restbr-reset-wrap{display:grid;gap:12px}
      #restbrResetPreviewPanel .restbr-reset-warning{padding:11px;border:1px solid rgba(248,113,113,.18);border-radius:12px;background:rgba(248,113,113,.045);color:#fecaca;font-size:10px;line-height:1.8}
      #restbrResetPreviewPanel .restbr-reset-warning strong{display:block;font-size:11px;margin-bottom:2px}
      #restbrResetPreviewPanel .restbr-reset-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
      #restbrResetPreviewPanel .restbr-reset-head p{margin:0;color:#918980;font-size:10px;line-height:1.7}
      #restbrResetPreviewRefresh{border:1px solid rgba(216,169,88,.28);background:rgba(216,169,88,.08);color:#edbd60;border-radius:9px;padding:8px 11px;font:inherit;font-size:10px;font-weight:900;white-space:nowrap}
      #restbrResetPreviewRefresh:disabled{opacity:.55}
      #restbrResetPreviewStatus{min-height:18px;color:#9d958c;font-size:10px;line-height:1.7}
      .restbr-reset-restaurant{padding:11px;border:1px solid rgba(255,255,255,.07);border-radius:12px;background:rgba(255,255,255,.025);display:grid;gap:4px}
      .restbr-reset-restaurant strong{color:#f1ece5;font-size:12px}
      .restbr-reset-restaurant span{color:#aaa198;font-size:9px;overflow-wrap:anywhere}
      .restbr-reset-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      .restbr-reset-card{padding:10px;border:1px solid rgba(255,255,255,.07);border-radius:11px;background:rgba(255,255,255,.025);display:grid;gap:3px}
      .restbr-reset-card b{font-size:15px;color:#f1ece5}
      .restbr-reset-card span{font-size:9px;color:#918980}
      .restbr-reset-card.protected{border-color:rgba(134,239,172,.14);background:rgba(34,197,94,.035)}
      .restbr-reset-card.protected b{color:#86efac}
      .restbr-reset-total{padding:12px;border-radius:12px;border:1px solid rgba(216,169,88,.2);background:rgba(216,169,88,.05);display:flex;align-items:center;justify-content:space-between;gap:10px}
      .restbr-reset-total span{font-size:10px;color:#b8afa6}
      .restbr-reset-total b{font-size:17px;color:#efc46e}
      .restbr-reset-note{margin:0;color:#8f877e;font-size:9px;line-height:1.8}
      body.admin-light-theme #restbrResetPreviewPanel .restbr-reset-restaurant,
      body.admin-light-theme #restbrResetPreviewPanel .restbr-reset-card,
      #viewTools.admin-settings-light #restbrResetPreviewPanel .restbr-reset-restaurant,
      #viewTools.admin-settings-light #restbrResetPreviewPanel .restbr-reset-card{background:#fff;border-color:rgba(104,74,34,.12)}
      body.admin-light-theme #restbrResetPreviewPanel .restbr-reset-restaurant strong,
      body.admin-light-theme #restbrResetPreviewPanel .restbr-reset-card b,
      #viewTools.admin-settings-light #restbrResetPreviewPanel .restbr-reset-restaurant strong,
      #viewTools.admin-settings-light #restbrResetPreviewPanel .restbr-reset-card b{color:#2c251e}
      @media(max-width:680px){.restbr-reset-grid{grid-template-columns:1fr 1fr}.restbr-reset-head{align-items:flex-start!important}}
    `;
    document.head.appendChild(style);
  }

  function ensurePanel(){
    if (q('#restbrResetPreviewPanel')) return true;
    const tools = q('#viewTools');
    if (!tools) return false;

    const panel = document.createElement('details');
    panel.id = 'restbrResetPreviewPanel';
    panel.className = 'settings-accordion';
    panel.innerHTML = `
      <summary>
        <span class="settings-accordion-title"><strong>تهيئة النظام لمطعم جديد</strong><small>معاينة آمنة قبل الحذف</small></span>
        <span class="settings-accordion-chevron">⌄</span>
      </summary>
      <div class="settings-accordion-body">
        <div class="restbr-reset-wrap">
          <div class="restbr-reset-warning"><strong>⚠️ معاينة فقط — لا يوجد حذف في هذه المرحلة</strong>هذا القسم يحسب البيانات التي ستدخل ضمن التهيئة لاحقًا. الضغط على تحديث لا يغيّر ولا يحذف أي شيء.</div>
          <div class="restbr-reset-head"><p>التهيئة المستقبلية ستفرّغ بيانات المطعم والصور وتعيد إعدادات الهوية إلى قالب فارغ، بينما حسابات الإدارة والنظام تبقى محمية.</p><button id="restbrResetPreviewRefresh" type="button">تحديث المعاينة</button></div>
          <div id="restbrResetPreviewStatus">جاري تحميل المعاينة...</div>
          <div id="restbrResetRestaurant"></div>
          <div id="restbrResetCounts" class="restbr-reset-grid"></div>
          <div id="restbrResetSummary"></div>
        </div>
      </div>`;

    tools.appendChild(panel);
    q('#restbrResetPreviewRefresh')?.addEventListener('click', () => void loadPreview());
    return true;
  }

  function setStatus(message, error = false){
    const el = q('#restbrResetPreviewStatus');
    if (!el) return;
    el.textContent = message || '';
    el.style.color = error ? '#fecaca' : '#9d958c';
  }

  function render(data){
    const restaurant = data?.restaurant || {};
    const name = restaurant.name_ar || restaurant.name_ku || restaurant.name_en || 'بدون اسم';
    const contact = [restaurant.phone, restaurant.whatsapp].filter(Boolean).join(' • ');
    const restaurantBox = q('#restbrResetRestaurant');
    if (restaurantBox) {
      restaurantBox.className = 'restbr-reset-restaurant';
      restaurantBox.innerHTML = '';
      const strong = document.createElement('strong'); strong.textContent = `المطعم الحالي: ${name}`;
      const span = document.createElement('span'); span.textContent = contact || 'لا توجد معلومات اتصال';
      restaurantBox.append(strong, span);
    }

    const counts = data?.counts || {};
    const grid = q('#restbrResetCounts');
    if (grid) {
      grid.innerHTML = '';
      labels.forEach(([key, label]) => {
        const card = document.createElement('div');
        card.className = 'restbr-reset-card';
        const b = document.createElement('b'); b.textContent = nf.format(Number(counts[key] || 0));
        const s = document.createElement('span'); s.textContent = label;
        card.append(b, s); grid.appendChild(card);
      });

      const settings = document.createElement('div');
      settings.className = 'restbr-reset-card';
      settings.innerHTML = `<b>${nf.format(Number(counts.restaurant_settings || 0))}</b><span>إعدادات مطعم ستُعاد للقالب الفارغ</span>`;
      grid.appendChild(settings);

      const admins = document.createElement('div');
      admins.className = 'restbr-reset-card protected';
      admins.innerHTML = `<b>${nf.format(Number(counts.admin_users || 0))}</b><span>حسابات إدارة محمية — لن تُحذف</span>`;
      grid.appendChild(admins);
    }

    const summary = q('#restbrResetSummary');
    if (summary) {
      summary.innerHTML = '';
      const total = document.createElement('div');
      total.className = 'restbr-reset-total';
      const label = document.createElement('span'); label.textContent = 'إجمالي السجلات والملفات التي ستُحذف عند تنفيذ التهيئة لاحقًا';
      const value = document.createElement('b'); value.textContent = nf.format(Number(data?.plan?.delete_total || 0));
      total.append(label, value);
      const note = document.createElement('p');
      note.className = 'restbr-reset-note';
      note.textContent = 'المرحلة الحالية Dry Run فقط. قبل إضافة زر التهيئة الفعلي سنربطه أولًا بإنشاء Full Backup إجباري وبأكثر من خطوة تأكيد.';
      summary.append(total, note);
    }
  }

  async function loadPreview(){
    if (!allowed()) return;
    const btn = q('#restbrResetPreviewRefresh');
    if (btn) btn.disabled = true;
    setStatus('جاري حساب بيانات المطعم...');
    try {
      if (typeof supabaseClient === 'undefined' || !supabaseClient?.rpc) throw new Error('Supabase غير جاهز.');
      const { data, error } = await supabaseClient.rpc('restaurant_reset_preview');
      if (error) throw error;
      if (!data?.ok || data?.dry_run !== true) throw new Error(data?.error || 'تعذر تحميل المعاينة.');
      render(data);
      setStatus('تم تحديث المعاينة. لم يتم تغيير أو حذف أي بيانات.');
    } catch (error) {
      console.error('RESTBR RESET PREVIEW ERROR:', error);
      setStatus('فشل تحميل معاينة التهيئة: ' + String(error?.message || error || ''), true);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function init(){
    installStyles();
    if (!ensurePanel()) { setTimeout(init, 120); return; }
    const role = document.body?.dataset?.adminRole || '';
    if (!role) { setTimeout(init, 120); return; }
    const panel = q('#restbrResetPreviewPanel');
    if (!allowed()) { if (panel) panel.style.display = 'none'; return; }
    if (panel) panel.style.display = '';
    void loadPreview();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

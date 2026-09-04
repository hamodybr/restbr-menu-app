(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__RESTBR_ADMIN_I18N_SUPPLEMENT_V1__) return;
  window.__RESTBR_ADMIN_I18N_SUPPLEMENT_V1__ = true;

  const EXACT = new Map(Object.entries({
    'ابحث عن صنف...':'Search products...',
    'ابحث عن صنف…':'Search products...',
    'رسالة الإغلاق بالعربي':'Closed message in Arabic',
    'رسالة الإغلاق بالكوردي':'Closed message in Kurdish',
    'رسالة الإغلاق بالإنجليزي':'Closed message in English',
    'يمكن استخدام {name} ليأخذ اسم المطعم تلقائياً.':'You can use {name} to insert the restaurant name automatically.',
    'مشاركة صنف':'Product share',
    'مشاركة قسم':'Section share',
    'العربي':'Arabic',
    'الكوردي':'Kurdish',
    'الكوردية':'Kurdish',
    'نوع السعر المراد تغييره':'Price Type to Change',
    'داخل المطعم فقط':'Dine-In Only',
    'سفري فقط':'Takeaway Only',
    'داخل + سفري':'Dine-In + Takeaway',
    'نوع السعر:':'Price type:',
    'التغيير:':'Change:',
    'الأصناف ضمن النطاق:':'Products in scope:',
    'أسعار أساسية:':'Base prices:',
    'أسعار خيارات:':'Option prices:',
    'النطاق:':'Scope:',
    'متأكد من التنفيذ؟':'Are you sure you want to apply this change?',
    'تعذر الاتصال بقاعدة البيانات.':'Could not connect to the database.',
    'سعر السفري':'Takeaway Price',
    'نفس السعر':'Same Price',
    'تم حفظ الصنف لكن تعذر حفظ سعر السفري':'Product saved, but the takeaway price could not be saved',
    'نوع السعر المراد تغييره:':'Price Type to Change:',
    'نوع السعر: داخل المطعم فقط':'Price type: Dine-In Only',
    'نوع السعر: سفري فقط':'Price type: Takeaway Only',
    'نوع السعر: داخل + سفري':'Price type: Dine-In + Takeaway',
    'فشل تغيير الأسعار:':'Failed to change prices:',
    'سعر أساسي':'Base price',
    'سعر داخل':'Dine-in price',
    'سعر سفري':'Takeaway price'
  }));

  const USER_DATA_SELECTORS = [
    '.product-name', '.category-name', '.sort-item-name', '.admin-account-email',
    '.dynamic-item-title', '.option-chip', '[data-admin-i18n-ignore]'
  ];

  const originals = new WeakMap();
  const translated = new WeakMap();
  const attrOriginals = new WeakMap();
  let queued = false;

  const isEnglish = () => document.documentElement.dataset.adminLang === 'en';

  function protectedContext(element) {
    if (!element) return false;
    return USER_DATA_SELECTORS.some(selector => element.closest?.(selector));
  }

  function preserveWhitespace(raw, value) {
    const prefix = String(raw).match(/^\s*/u)?.[0] || '';
    const suffix = String(raw).match(/\s*$/u)?.[0] || '';
    return prefix + value + suffix;
  }

  function translateValue(value) {
    const raw = String(value ?? '');
    const trimmed = raw.trim();
    if (!trimmed) return raw;
    if (EXACT.has(trimmed)) return preserveWhitespace(raw, EXACT.get(trimmed));

    let result = trimmed
      .replace(/التغيير:\s*/gu, 'Change: ')
      .replace(/الأصناف ضمن النطاق:\s*/gu, 'Products in scope: ')
      .replace(/أسعار أساسية:\s*/gu, 'Base prices: ')
      .replace(/أسعار خيارات:\s*/gu, 'Option prices: ')
      .replace(/نوع السعر:\s*/gu, 'Price type: ')
      .replace(/النطاق:\s*/gu, 'Scope: ')
      .replace(/داخل المطعم فقط/gu, 'Dine-In Only')
      .replace(/سفري فقط/gu, 'Takeaway Only')
      .replace(/داخل \+ سفري/gu, 'Dine-In + Takeaway')
      .replace(/سعر أساسي/gu, 'base price')
      .replace(/سعر داخل/gu, 'dine-in price')
      .replace(/سعر سفري/gu, 'takeaway price')
      .replace(/تم التعديل ✓/gu, 'Updated ✓')
      .replace(/د\.ع/gu, 'IQD');

    return result === trimmed ? raw : preserveWhitespace(raw, result);
  }

  function applyText(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    const parent = node.parentElement;
    if (!parent || protectedContext(parent) || ['SCRIPT','STYLE','TEXTAREA'].includes(parent.tagName)) return;

    const live = String(node.nodeValue ?? '');
    const last = translated.get(node);
    if (!originals.has(node) || (last !== undefined && live !== last)) originals.set(node, live);
    const source = originals.get(node) ?? live;

    if (isEnglish()) {
      const next = translateValue(source);
      translated.set(node, next);
      if (node.nodeValue !== next) node.nodeValue = next;
    } else {
      translated.delete(node);
      if (node.nodeValue !== source) node.nodeValue = source;
    }
  }

  function applyAttributes(element) {
    if (!(element instanceof Element) || protectedContext(element)) return;
    let cache = attrOriginals.get(element);
    if (!cache) {
      cache = {};
      attrOriginals.set(element, cache);
    }

    ['placeholder','title','aria-label'].forEach(attr => {
      if (!element.hasAttribute(attr)) return;
      const live = element.getAttribute(attr) || '';
      if (!(attr in cache) || !isEnglish()) cache[attr] = live;
      const source = cache[attr];
      const next = isEnglish() ? translateValue(source) : source;
      if (live !== next) element.setAttribute(attr, next);
    });
  }

  function applyTree(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) applyText(node);
    if (root instanceof Element) applyAttributes(root);
    root.querySelectorAll?.('*').forEach(applyAttributes);
  }

  function refresh() {
    queued = false;
    applyTree(document.body);
  }

  function queueRefresh() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(refresh);
  }

  function start() {
    refresh();
    document.addEventListener('restbr:admin-language-change', queueRefresh);
    const observer = new MutationObserver(queueRefresh);
    observer.observe(document.body, { subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['placeholder','title','aria-label'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();

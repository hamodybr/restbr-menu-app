(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__PASHA_BABY_ADMIN_COPY_V1__) return;
  window.__PASHA_BABY_ADMIN_COPY_V1__ = true;

  const EXACT = new Map([
    ['إعدادات المطعم', 'إعدادات المحل'],
    ['اسم المطعم', 'اسم المحل'],
    ['اسم المطعم بالعربي', 'اسم المحل بالعربي'],
    ['اسم المطعم بالكوردي', 'اسم المحل بالكوردي'],
    ['اسم المطعم بالإنجليزي', 'اسم المحل بالإنجليزي'],
    ['شعار المطعم', 'شعار المحل'],
    ['موقع المطعم', 'موقع المحل'],
    ['المطعم مفتوح', 'المحل مفتوح'],
    ['المطعم مغلق', 'المحل مغلق'],
    ['أوقات المطعم', 'أوقات المحل'],
    ['ساعات المطعم', 'ساعات المحل'],
    ['وقت فتح المطعم', 'وقت فتح المحل'],
    ['وقت إغلاق المطعم', 'وقت إغلاق المحل'],
    ['حفظ إعدادات المطعم', 'حفظ إعدادات المحل'],
    ['لم يتم العثور على سجل إعدادات المطعم', 'لم يتم العثور على سجل إعدادات المحل'],
    ['استلام من المطعم', 'استلام من المحل'],
    ['لغات المنيو', 'لغات المتجر'],
    ['عنوان المنيو', 'عنوان المتجر'],
    ['إظهار عنوان المنيو', 'إظهار عنوان المتجر'],
    ['إحصائيات المنيو', 'إحصائيات المتجر'],
    ['رابط المنيو', 'رابط المتجر'],
    ['واتساب منيو', 'واتساب'],
    ['Restaurant Settings', 'Store Settings'],
    ['Restaurant Name', 'Store Name'],
    ['Restaurant Name (Arabic)', 'Store Name (Arabic)'],
    ['Restaurant Name (Kurdish)', 'Store Name (Kurdish)'],
    ['Restaurant Name (English)', 'Store Name (English)'],
    ['Restaurant Logo', 'Store Logo'],
    ['Restaurant Location', 'Store Location'],
    ['Restaurant Hours', 'Store Hours'],
    ['Restaurant Open', 'Store Open'],
    ['Restaurant Closed', 'Store Closed'],
    ['Save Restaurant Settings', 'Save Store Settings'],
    ['Pickup from Restaurant', 'Pick up from Store'],
    ['Menu Languages', 'Store Languages'],
    ['Menu Title', 'Store Title'],
    ['Menu Analytics', 'Store Analytics'],
    ['Menu Link', 'Store Link'],
    ['WhatsApp Menu', 'WhatsApp']
  ]);

  const PHRASES = [
    [/إعدادات المطعم/g, 'إعدادات المحل'],
    [/اسم المطعم/g, 'اسم المحل'],
    [/شعار المطعم/g, 'شعار المحل'],
    [/موقع المطعم/g, 'موقع المحل'],
    [/أوقات المطعم/g, 'أوقات المحل'],
    [/ساعات المطعم/g, 'ساعات المحل'],
    [/المطعم مغلق/g, 'المحل مغلق'],
    [/المطعم مفتوح/g, 'المحل مفتوح'],
    [/استلام من المطعم/g, 'استلام من المحل'],
    [/لغات المنيو/g, 'لغات المتجر'],
    [/إحصائيات المنيو/g, 'إحصائيات المتجر'],
    [/Restaurant Settings/gi, 'Store Settings'],
    [/Restaurant Name/gi, 'Store Name'],
    [/Restaurant Logo/gi, 'Store Logo'],
    [/Restaurant Location/gi, 'Store Location'],
    [/Restaurant Hours/gi, 'Store Hours'],
    [/Pickup from Restaurant/gi, 'Pick up from Store'],
    [/Menu Languages/gi, 'Store Languages'],
    [/Menu Analytics/gi, 'Store Analytics']
  ];

  const PROTECTED = [
    '.product-name',
    '.category-name',
    '.sort-item-name',
    '.analytics-label',
    '.admin-account-email',
    '.dynamic-item-title',
    '.option-chip',
    '[data-admin-i18n-ignore]'
  ].join(',');

  function isProtected(node) {
    const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    return !!element?.closest?.(PROTECTED);
  }

  function replaceText(value) {
    const source = String(value ?? '');
    const trimmed = source.trim();
    if (!trimmed) return source;

    if (EXACT.has(trimmed)) {
      const replacement = EXACT.get(trimmed);
      const start = source.indexOf(trimmed);
      return start >= 0
        ? source.slice(0, start) + replacement + source.slice(start + trimmed.length)
        : replacement;
    }

    let next = source;
    PHRASES.forEach(([pattern, replacement]) => {
      next = next.replace(pattern, replacement);
    });
    return next;
  }

  function translateTextNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE || isProtected(node)) return;
    const next = replaceText(node.nodeValue);
    if (next !== node.nodeValue) node.nodeValue = next;
  }

  function translateAttributes(element) {
    if (!(element instanceof Element) || isProtected(element)) return;
    ['placeholder', 'title', 'aria-label'].forEach(name => {
      const value = element.getAttribute(name);
      if (!value) return;
      const next = replaceText(value);
      if (next !== value) element.setAttribute(name, next);
    });
  }

  function scan(root = document.body) {
    if (!root) return;

    if (root instanceof Element) translateAttributes(root);

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT
    );

    let current;
    while ((current = walker.nextNode())) {
      if (current.nodeType === Node.TEXT_NODE) translateTextNode(current);
      else translateAttributes(current);
    }
  }

  let queued = false;
  function scheduleScan() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      scan(document.body);
    });
  }

  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'characterData') {
        translateTextNode(record.target);
        continue;
      }

      if (record.type === 'attributes') {
        translateAttributes(record.target);
        continue;
      }

      record.addedNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
        else if (node instanceof Element) scan(node);
      });
    }
    scheduleScan();
  });

  function start() {
    scan(document.body);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label']
    });
    [150, 500, 1200, 2500, 5000].forEach(delay => setTimeout(scheduleScan, delay));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

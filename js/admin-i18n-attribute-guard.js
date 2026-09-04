(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__RESTBR_ADMIN_I18N_ATTRIBUTE_GUARD_V1__) return;
  window.__RESTBR_ADMIN_I18N_ATTRIBUTE_GUARD_V1__ = true;

  const ATTRS = ['placeholder', 'title', 'aria-label'];
  const originals = new WeakMap();
  const tracked = new Set();
  let restoring = false;

  function cacheFor(element) {
    let cache = originals.get(element);
    if (!cache) {
      cache = {};
      originals.set(element, cache);
      tracked.add(element);
    }
    return cache;
  }

  function captureElement(element) {
    if (!(element instanceof Element)) return;
    const cache = cacheFor(element);
    ATTRS.forEach(attribute => {
      if (!element.hasAttribute(attribute)) return;
      if (!(attribute in cache)) cache[attribute] = element.getAttribute(attribute) || '';
    });
  }

  function captureTree(root) {
    if (!root) return;
    if (root instanceof Element) captureElement(root);
    if (!(root instanceof Element) && root !== document) return;
    root.querySelectorAll?.('*').forEach(captureElement);
  }

  function restoreArabicAttributes() {
    if (document.documentElement.dataset.adminLang !== 'ar') return;
    restoring = true;
    try {
      tracked.forEach(element => {
        if (!element?.isConnected) {
          tracked.delete(element);
          return;
        }
        const cache = originals.get(element);
        if (!cache) return;
        ATTRS.forEach(attribute => {
          if (!(attribute in cache) || !element.hasAttribute(attribute)) return;
          const original = cache[attribute];
          if ((element.getAttribute(attribute) || '') !== original) {
            element.setAttribute(attribute, original);
          }
        });
      });
    } finally {
      restoring = false;
    }
  }

  function start() {
    captureTree(document.body);

    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node instanceof Element) captureTree(node);
          });
          return;
        }

        if (mutation.type !== 'attributes' || restoring) return;
        const element = mutation.target;
        const attribute = mutation.attributeName;
        if (!(element instanceof Element) || !ATTRS.includes(attribute)) return;

        const cache = cacheFor(element);
        const lang = document.documentElement.dataset.adminLang;
        if (!(attribute in cache)) {
          cache[attribute] = element.getAttribute(attribute) || '';
        } else if (!lang || lang === 'ar') {
          cache[attribute] = element.getAttribute(attribute) || '';
        }
      });
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ATTRS
    });

    document.addEventListener('restbr:admin-language-change', event => {
      if (event?.detail?.language === 'ar') {
        requestAnimationFrame(restoreArabicAttributes);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

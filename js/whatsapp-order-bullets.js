(() => {
  if (/(?:^|\/)admin\.html$/i.test(location.pathname)) return;
  if (window.__SHORASH_WHATSAPP_ORDER_BULLETS_V1__) return;
  window.__SHORASH_WHATSAPP_ORDER_BULLETS_V1__ = true;

  function transformOrderMessage(value) {
    if (typeof value !== 'string') return value;
    if (!value.includes('🛒 *تفاصيل الطلب*')) return value;

    return value.replace(/^\d+\.\s+(?=\*)/gm, '• ');
  }

  function patchSendButton() {
    const button = document.getElementById('smSendWhatsApp');
    if (!button || typeof button.onclick !== 'function') return false;
    if (button.__shorashWhatsappBulletsPatched) return true;

    const originalHandler = button.onclick;

    button.onclick = function (event) {
      const originalEncodeURIComponent = window.encodeURIComponent;

      window.encodeURIComponent = function (value) {
        return originalEncodeURIComponent(transformOrderMessage(value));
      };

      try {
        return originalHandler.call(this, event);
      } finally {
        window.encodeURIComponent = originalEncodeURIComponent;
      }
    };

    button.__shorashWhatsappBulletsPatched = true;
    return true;
  }

  if (patchSendButton()) return;

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (patchSendButton() || attempts >= 150) {
      clearInterval(timer);
    }
  }, 100);
})();

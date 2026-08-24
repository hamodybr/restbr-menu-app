(() => {
  const KEY = 'shorashCartV1';

  const TEXT = {
    ar: 'تمت إزالة صنف لم يعد متوفراً من السلة',
    ku: 'بەرهەمێک کە چیتر بەردەست نەبوو لە سەبەتە لابرا',
    en: 'An item that is no longer available was removed from your cart'
  };

  function currentLang(){
    const value = window.SHORASH_LANG
      ? window.SHORASH_LANG()
      : (localStorage.getItem('shorashLang') || 'ar');
    return ['ar','ku','en'].includes(value) ? value : 'ar';
  }

  function readCart(){
    try{
      const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    }catch(_){
      return [];
    }
  }

  function optionStillExists(product, item){
    const options = Array.isArray(product?.options) ? product.options : [];

    if (item.optionId !== undefined && item.optionId !== null) {
      return options.some(option => String(option.id) === String(item.optionId));
    }

    const index = Number(item.optionIndex);
    return Number.isInteger(index) && index >= 0 && !!options[index];
  }

  function itemMustBeRemoved(product, item){
    if (!product) return true;

    // A product can still be visible in the menu while being temporarily
    // unavailable. It must not remain in an existing cart in that state.
    if (product.badges?.unavailable === true) return true;
    if (product.manualUnavailable === true) return true;

    return !optionStillExists(product, item);
  }

  function staleKeys(){
    const DB = window.SHORASH_DB;
    if (!DB || !Array.isArray(DB.products)) return [];

    return readCart()
      .filter(item => {
        const product = DB.products.find(
          p => String(p.id) === String(item.productId)
        );

        return itemMustBeRemoved(product, item);
      })
      .map(item => String(item.key));
  }

  function showNotice(){
    const toast = document.getElementById('smCartToast');
    if (!toast) return;

    toast.textContent = TEXT[currentLang()] || TEXT.ar;
    toast.classList.add('show');
    clearTimeout(window.__smStaleCartToastTimer);
    window.__smStaleCartToastTimer = setTimeout(
      () => toast.classList.remove('show'),
      2400
    );
  }

  function removeThroughCart(key){
    const button = [...document.querySelectorAll('[data-cart-remove]')]
      .find(btn => String(btn.dataset.cartRemove) === String(key));

    if (!button) return false;
    button.click();
    return true;
  }

  function sanitize(){
    const keys = staleKeys();
    if (!keys.length) return false;

    let removed = 0;

    keys.forEach(key => {
      if (removeThroughCart(key)) removed += 1;
    });

    if (!removed) {
      const stale = new Set(keys);
      const clean = readCart().filter(item => !stale.has(String(item.key)));
      localStorage.setItem(KEY, JSON.stringify(clean));

      // Cart UI may not be open yet, so ask the existing cart code to refresh
      // on the next menu event and still show the notice when possible.
      showNotice();
      return true;
    }

    showNotice();
    return true;
  }

  function schedule(){
    setTimeout(sanitize, 0);
    setTimeout(sanitize, 120);
    setTimeout(sanitize, 450);
  }

  window.addEventListener('shorash:ready', schedule);
  window.addEventListener('shorash:prices-updated', schedule);

  document.addEventListener('click', event => {
    if (
      event.target.closest('#smCartContinue') ||
      event.target.closest('#smSendWhatsApp') ||
      event.target.closest('#smCartFab')
    ) {
      sanitize();
    }
  }, true);
})();

(() => {
  if (/(?:^|\/)admin\.html$/i.test(location.pathname)) return;

  const TEXT = {
    ar: 'السعر غير متوفر',
    ku: 'نرخ بەردەست نییە',
    en: 'Price unavailable'
  };

  function lang(){
    const value = window.SHORASH_LANG
      ? window.SHORASH_LANG()
      : (localStorage.getItem('shorashLang') || 'ar');
    return ['ar','ku','en'].includes(value) ? value : 'ar';
  }

  function label(){
    return TEXT[lang()] || TEXT.ar;
  }

  function validPrice(value){
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && !value.trim()) return false;
    const number = Number(value);
    return Number.isFinite(number) && number > 0;
  }

  function productById(id){
    return window.SHORASH_DB?.products?.find(
      product => String(product.id) === String(id)
    ) || null;
  }

  function optionFor(product,index,optionId){
    if (!product) return null;
    const options = product.options || [];

    if (optionId !== undefined && optionId !== null && optionId !== '') {
      const byId = options.find(option => String(option.id) === String(optionId));
      if (byId) return byId;
    }

    const numericIndex = Number(index);
    return Number.isInteger(numericIndex) ? (options[numericIndex] || null) : null;
  }

  function toast(message){
    const target = document.getElementById('smCartToast');
    if (!target) return;
    target.textContent = message;
    target.classList.add('show');
    clearTimeout(target.__smPriceSafetyTimer);
    target.__smPriceSafetyTimer = setTimeout(
      () => target.classList.remove('show'),
      1600
    );
  }

  function installStyles(){
    if (document.getElementById('smPriceSafetyStyles')) return;
    const style = document.createElement('style');
    style.id = 'smPriceSafetyStyles';
    style.textContent = `
      .sm-price.sm-price-unavailable,
      .sm-choice-option .sm-price-unavailable{
        color:#9b9186 !important;
        font-size:.82em !important;
        font-weight:700 !important;
        white-space:normal !important;
      }
      .sm-price-disabled,
      .sm-choice-option:disabled{
        opacity:.48 !important;
        cursor:not-allowed !important;
      }
      .sm-choice-option:disabled i{
        display:none !important;
      }
    `;
    document.head.appendChild(style);
  }

  function patchCard(card){
    const product = productById(card.dataset.productCard);
    if (!product) return;

    const options = product.options || [];
    const rows = [...card.querySelectorAll('.sm-option')];

    rows.forEach((row,index) => {
      const priceNode = row.querySelector('.sm-price');
      if (!priceNode) return;
      const option = options[index];
      const invalid = !option || !validPrice(option.price);
      priceNode.classList.toggle('sm-price-unavailable', invalid);
      if (invalid) priceNode.textContent = label();
    });

    const direct = card.querySelector('.sm-direct-add');
    if (direct) {
      const option = optionFor(product,direct.dataset.optionIndex);
      const invalid = !option || !validPrice(option.price);
      direct.disabled = invalid;
      direct.classList.toggle('sm-price-disabled', invalid);
      direct.title = invalid ? label() : '';
    }

    const choose = card.querySelector('.sm-choose-options');
    if (choose) {
      const anyValid = options.some(option => validPrice(option.price));
      choose.disabled = !anyValid;
      choose.classList.toggle('sm-price-disabled', !anyValid);
      choose.title = anyValid ? '' : label();
    }
  }

  function patchChoices(root = document){
    root.querySelectorAll?.('[data-choice-product][data-choice-index]').forEach(button => {
      const product = productById(button.dataset.choiceProduct);
      const option = optionFor(product,button.dataset.choiceIndex);
      const invalid = !option || !validPrice(option.price);
      button.disabled = invalid;
      button.classList.toggle('sm-price-disabled', invalid);
      const priceNode = button.querySelector('b');
      if (priceNode && invalid) {
        priceNode.textContent = label();
        priceNode.classList.add('sm-price-unavailable');
      }
    });
  }

  function patchAll(root = document){
    root.querySelectorAll?.('[data-product-card]').forEach(patchCard);
    patchChoices(root);
  }

  function invalidTarget(target){
    const direct = target.closest?.('.sm-direct-add');
    if (direct) {
      const product = productById(direct.dataset.productId);
      const option = optionFor(product,direct.dataset.optionIndex);
      return !option || !validPrice(option.price);
    }

    const choice = target.closest?.('[data-choice-product][data-choice-index]');
    if (choice) {
      const product = productById(choice.dataset.choiceProduct);
      const option = optionFor(product,choice.dataset.choiceIndex);
      return !option || !validPrice(option.price);
    }

    return false;
  }

  function cartHasInvalidCurrentPrice(){
    let cart = [];
    try {
      cart = JSON.parse(localStorage.getItem('shorashCartV1') || '[]');
    } catch (_) {
      return false;
    }

    return cart.some(item => {
      const product = productById(item.productId);
      const option = optionFor(product,item.optionIndex,item.optionId);
      return !product || !option || !validPrice(option.price);
    });
  }

  installStyles();

  document.addEventListener('click', event => {
    if (invalidTarget(event.target)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      toast(label());
      return;
    }

    if (event.target.closest?.('#smCartContinue,#smSendWhatsApp') && cartHasInvalidCurrentPrice()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      toast(label());
    }
  }, true);

  const observer = new MutationObserver(records => {
    records.forEach(record => {
      record.addedNodes.forEach(node => {
        if (!(node instanceof Element)) return;
        if (node.matches?.('[data-product-card]')) patchCard(node);
        patchAll(node);
      });
    });
  });

  function start(){
    patchAll();
    observer.observe(document.body,{childList:true,subtree:true});

    window.addEventListener('shorash:ready',() => setTimeout(patchAll,0));
    window.addEventListener('shorash:prices-updated',() => setTimeout(patchAll,0));

    document.addEventListener('click',event => {
      if (event.target.closest('[data-lang],[data-sm-gate-lang]')) {
        setTimeout(patchAll,40);
      }
      if (event.target.closest('.sm-choose-options')) {
        setTimeout(() => patchChoices(),0);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded',start,{once:true});
  } else {
    start();
  }
})();

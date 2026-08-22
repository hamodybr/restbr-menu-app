// ==========================================
// RESTBR ORDER ANALYTICS V1.0
// Adds checkout funnel events without modifying legacy cart.js.
// ==========================================
(() => {
  'use strict';

  function track(type,refId=''){
    if(typeof window.SHORASH_TRACK!=='function')return;
    try{window.SHORASH_TRACK(type,refId);}catch(_){}
  }

  function currentOrderType(){
    const active=document.querySelector('[data-order-type].active');
    return String(active?.dataset?.orderType||'').trim();
  }

  document.addEventListener('click',event=>{
    const checkout=event.target.closest?.('#smCartContinue');
    if(checkout && !checkout.disabled){
      track('checkout_start');
      return;
    }

    const send=event.target.closest?.('#smSendWhatsApp');
    if(send && !send.disabled){
      track('order_attempt',currentOrderType());
    }
  });

  console.log('✅ RESTBR order analytics V1.0 ready');
})();

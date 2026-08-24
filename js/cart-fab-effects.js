(() => {
  const STYLE_ID = "smCartFabEffectsStyle";

  function installStyles(){
    if(document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      /* Floating cart: icon-only while empty, compact summary when it has items. */
      #smCartFab{
        transition:
          width .28s cubic-bezier(.2,.8,.2,1),
          min-width .28s cubic-bezier(.2,.8,.2,1),
          max-width .28s cubic-bezier(.2,.8,.2,1),
          padding .28s cubic-bezier(.2,.8,.2,1),
          background .24s ease,
          border-color .24s ease,
          box-shadow .24s ease !important;
        overflow:visible !important;
      }

      #smCartFab:not(.has-items){
        width:56px !important;
        min-width:56px !important;
        max-width:56px !important;
        height:56px !important;
        min-height:56px !important;
        padding:0 !important;
        border-radius:50% !important;
        gap:0 !important;
        background:rgba(10,8,6,.94) !important;
        box-shadow:
          0 12px 34px rgba(0,0,0,.5),
          0 0 0 1px rgba(226,177,92,.08) inset !important;
      }

      #smCartFab:not(.has-items) #smCartFabText{
        display:none !important;
      }

      #smCartFab.has-items{
        width:auto !important;
        min-width:158px !important;
        max-width:min(88vw,260px) !important;
        padding:0 15px !important;
        border-radius:999px !important;
        gap:8px !important;
      }

      #smCartFab.has-items #smCartFabText{
        display:inline-block !important;
        white-space:nowrap;
      }

      #smCartFab > span:first-child{
        display:grid;
        place-items:center;
        flex:0 0 auto;
        font-size:23px !important;
        line-height:1 !important;
        transform-origin:center;
      }

      .sm-cart-fly{
        position:fixed;
        z-index:9999;
        width:30px;
        height:30px;
        margin:-15px 0 0 -15px;
        border-radius:50%;
        display:grid;
        place-items:center;
        pointer-events:none;
        color:#160e05;
        background:linear-gradient(135deg,#ffd888,#d59638);
        border:1px solid rgba(255,232,181,.88);
        box-shadow:
          0 0 0 5px rgba(224,173,85,.11),
          0 7px 22px rgba(0,0,0,.38),
          0 0 24px rgba(233,178,81,.72);
        font-size:11px;
        font-weight:1000;
        will-change:transform,opacity;
      }

      .sm-cart-add-burst{
        position:fixed;
        z-index:9998;
        width:24px;
        height:24px;
        margin:-12px 0 0 -12px;
        border-radius:50%;
        border:2px solid rgba(246,195,103,.9);
        box-shadow:0 0 20px rgba(232,177,79,.62);
        pointer-events:none;
        will-change:transform,opacity;
      }

      @media (max-width:768px){
        #smCartFab:not(.has-items){
          width:54px !important;
          min-width:54px !important;
          max-width:54px !important;
          height:54px !important;
          min-height:54px !important;
        }
        #smCartFab.has-items{
          min-width:146px !important;
          padding:0 13px !important;
        }
      }

      @media (prefers-reduced-motion:reduce){
        #smCartFab{transition:none !important}
        .sm-cart-fly,.sm-cart-add-burst{display:none !important}
      }
    `;

    document.head.appendChild(style);
  }

  function pulseCart(){
    const fab = document.getElementById("smCartFab");
    if(!fab) return;

    const icon = fab.querySelector(":scope > span:first-child");
    if(icon && icon.animate){
      icon.animate([
        {transform:"scale(1) rotate(0deg)"},
        {transform:"scale(1.34) rotate(-10deg)",offset:.38},
        {transform:"scale(.94) rotate(6deg)",offset:.7},
        {transform:"scale(1) rotate(0deg)"}
      ],{
        duration:560,
        easing:"cubic-bezier(.2,.85,.25,1)"
      });
    }

    if(fab.animate){
      fab.animate([
        {filter:"brightness(1)",boxShadow:"0 12px 34px rgba(0,0,0,.45)"},
        {filter:"brightness(1.28)",boxShadow:"0 0 0 7px rgba(226,177,92,.22), 0 14px 38px rgba(0,0,0,.48)",offset:.42},
        {filter:"brightness(1)",boxShadow:"0 12px 34px rgba(0,0,0,.45)"}
      ],{
        duration:680,
        easing:"ease-out"
      });
    }
  }

  function burstAt(x,y){
    const burst = document.createElement("span");
    burst.className = "sm-cart-add-burst";
    burst.style.left = `${x}px`;
    burst.style.top = `${y}px`;
    document.body.appendChild(burst);

    if(!burst.animate){
      burst.remove();
      return;
    }

    const animation = burst.animate([
      {transform:"scale(.25)",opacity:1},
      {transform:"scale(1.85)",opacity:.72,offset:.55},
      {transform:"scale(2.5)",opacity:0}
    ],{
      duration:540,
      easing:"cubic-bezier(.2,.75,.2,1)"
    });

    animation.finished.catch(()=>{}).then(()=>burst.remove());
  }

  function flyToCart(source){
    const fab = document.getElementById("smCartFab");
    if(!source || !fab || !document.body) return;
    if(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const from = source.getBoundingClientRect();
    const to = fab.getBoundingClientRect();

    const sx = from.left + from.width / 2;
    const sy = from.top + from.height / 2;
    const tx = to.left + to.width / 2;
    const ty = to.top + to.height / 2;

    if(!Number.isFinite(sx+sy+tx+ty)) return;

    burstAt(sx,sy);

    const fly = document.createElement("span");
    fly.className = "sm-cart-fly";
    fly.textContent = "+1";
    fly.style.left = `${sx}px`;
    fly.style.top = `${sy}px`;
    document.body.appendChild(fly);

    if(!fly.animate){
      fly.remove();
      pulseCart();
      return;
    }

    const dx = tx - sx;
    const dy = ty - sy;
    const arc = Math.max(42,Math.min(105,Math.abs(dy)*.18));

    const animation = fly.animate([
      {
        transform:"translate3d(0,0,0) scale(.72)",
        opacity:.95
      },
      {
        transform:`translate3d(${(dx*.5).toFixed(1)}px,${(dy*.5-arc).toFixed(1)}px,0) scale(1.08)`,
        opacity:1,
        offset:.52
      },
      {
        transform:`translate3d(${dx.toFixed(1)}px,${dy.toFixed(1)}px,0) scale(.34)`,
        opacity:.15
      }
    ],{
      duration:960,
      easing:"cubic-bezier(.22,.72,.24,1)"
    });

    animation.finished.catch(()=>{}).then(()=>{
      fly.remove();
      pulseCart();
    });
  }

  function isRealAddControl(el){
    return !!el?.closest?.(".sm-add-cart,.sm-direct-add,[data-choice-product]");
  }

  installStyles();

  // Capture the exact source before the original cart handler updates/closes its UI.
  document.addEventListener("click",event=>{
    const source = event.target.closest?.(".sm-add-cart,.sm-direct-add,[data-choice-product]");
    if(!source || source.disabled || !isRealAddControl(source)) return;

    const rect = source.getBoundingClientRect();
    if(!rect.width || !rect.height) return;

    // Let the existing cart code perform the actual add; this is visual feedback only.
    requestAnimationFrame(()=>flyToCart(source));
  },true);
})();
(() => {
  const STYLE_ID = 'smCardLifeEffectsStyle';
  const MENU_ID = 'smMenu';

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* SHORASH — subtle living-card effects */
      #smMenu .sm-card.sm-life-ready{
        will-change:translate,filter;
      }

      /* Keep the existing reveal, but make the entrance feel softer/alive. */
      #smMenu .sm-card.sm-life-ready.sm-reveal:not(.sm-visible){
        filter:blur(2px) brightness(.92);
      }

      #smMenu .sm-card.sm-life-ready.sm-reveal.sm-visible{
        filter:none;
        transition:
          opacity .62s ease,
          transform .62s cubic-bezier(.2,.78,.2,1),
          filter .62s ease,
          outline-color .24s ease;
        animation:smCardMicroFloat 7.4s ease-in-out infinite;
        animation-delay:var(--sm-life-float-delay,.75s);
      }

      #smMenu .sm-grid .sm-card:nth-child(3n+1){
        --sm-life-float-delay:.75s;
        --sm-life-breathe-delay:.2s;
        --sm-life-sheen-delay:1.4s;
      }
      #smMenu .sm-grid .sm-card:nth-child(3n+2){
        --sm-life-float-delay:1.35s;
        --sm-life-breathe-delay:1.1s;
        --sm-life-sheen-delay:4.2s;
      }
      #smMenu .sm-grid .sm-card:nth-child(3n+3){
        --sm-life-float-delay:1.9s;
        --sm-life-breathe-delay:2s;
        --sm-life-sheen-delay:6.8s;
      }

      @keyframes smCardMicroFloat{
        0%,100%{translate:0 0}
        50%{translate:0 -2px}
      }

      /* Food-image breathing. Uses individual scale so it does not fight
         the existing mobile transform rules. */
      #smMenu .sm-card.sm-life-ready .sm-product-image{
        scale:1;
        transform-origin:50% 50%;
        will-change:scale,filter;
        animation:smFoodBreathing 7.8s ease-in-out infinite;
        animation-delay:var(--sm-life-breathe-delay,.2s);
      }

      @keyframes smFoodBreathing{
        0%,100%{scale:1;filter:brightness(1) saturate(1)}
        50%{scale:1.026;filter:brightness(1.025) saturate(1.025)}
      }

      /* Real overlay element, so it works even where the old card
         pseudo-elements are intentionally disabled on mobile. */
      #smMenu .sm-card .sm-live-sheen{
        position:absolute;
        z-index:18;
        top:-38%;
        bottom:-38%;
        left:-58%;
        width:28%;
        pointer-events:none;
        opacity:0;
        transform:skewX(-18deg) translateX(-180%);
        background:linear-gradient(
          90deg,
          transparent 0%,
          rgba(255,226,166,.025) 22%,
          rgba(255,244,220,.16) 50%,
          rgba(232,184,98,.055) 76%,
          transparent 100%
        );
        filter:blur(1.4px);
        mix-blend-mode:screen;
        will-change:transform,opacity;
        animation:smCardLightSweep 9.6s ease-in-out infinite;
        animation-delay:var(--sm-life-sheen-delay,1.4s);
      }

      @keyframes smCardLightSweep{
        0%,56%{
          transform:skewX(-18deg) translateX(-180%);
          opacity:0;
        }
        62%{opacity:.22}
        74%{opacity:.72}
        88%{
          transform:skewX(-18deg) translateX(680%);
          opacity:.28;
        }
        93%,100%{
          transform:skewX(-18deg) translateX(680%);
          opacity:0;
        }
      }

      /* Touch response. Existing scale feedback stays intact. */
      #smMenu .sm-card.sm-life-ready:active{
        animation-play-state:paused;
        translate:0 -1px;
      }
      #smMenu .sm-card.sm-life-ready:active .sm-product-image{
        animation-play-state:paused;
        scale:1.02;
      }

      /* Mouse/trackpad lift only, so mobile never gets sticky :hover. */
      @media (hover:hover) and (pointer:fine){
        #smMenu .sm-card.sm-life-ready.sm-visible:hover{
          animation-play-state:paused;
          translate:0 -5px;
          filter:brightness(1.025) drop-shadow(0 12px 18px rgba(0,0,0,.24));
          outline:1px solid rgba(232,184,98,.24);
          outline-offset:-1px;
        }
        #smMenu .sm-card.sm-life-ready.sm-visible:hover .sm-product-image{
          animation-play-state:paused;
          scale:1.045;
          filter:brightness(1.04) saturate(1.035);
        }
      }

      /* Respect the device accessibility preference and save GPU work. */
      @media (prefers-reduced-motion:reduce){
        #smMenu .sm-card.sm-life-ready,
        #smMenu .sm-card.sm-life-ready.sm-visible,
        #smMenu .sm-card.sm-life-ready .sm-product-image,
        #smMenu .sm-card .sm-live-sheen{
          animation:none!important;
          translate:0!important;
          scale:1!important;
        }
        #smMenu .sm-card.sm-life-ready.sm-reveal{
          filter:none!important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function decorateCards(root = document) {
    const cards = root.matches?.('.sm-card')
      ? [root]
      : [...root.querySelectorAll?.('.sm-card') || []];

    cards.forEach(card => {
      if (!card.classList.contains('sm-life-ready')) {
        card.classList.add('sm-life-ready');
      }

      if (!card.querySelector(':scope > .sm-live-sheen')) {
        const sheen = document.createElement('span');
        sheen.className = 'sm-live-sheen';
        sheen.setAttribute('aria-hidden', 'true');
        card.appendChild(sheen);
      }
    });
  }

  function start() {
    installStyles();

    const menu = document.getElementById(MENU_ID);
    if (!menu) return;

    decorateCards(menu);

    const observer = new MutationObserver(mutations => {
      let needsDecorate = false;

      for (const mutation of mutations) {
        if (mutation.type !== 'childList' || !mutation.addedNodes.length) continue;
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches('.sm-card') || node.querySelector('.sm-card')) {
            needsDecorate = true;
            break;
          }
        }
        if (needsDecorate) break;
      }

      if (needsDecorate) requestAnimationFrame(() => decorateCards(menu));
    });

    observer.observe(menu, { childList: true, subtree: true });

    window.addEventListener('shorash:ready', () => {
      requestAnimationFrame(() => decorateCards(menu));
      setTimeout(() => decorateCards(menu), 120);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

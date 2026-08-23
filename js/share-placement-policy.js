// ============================================================
// RESTBR SHARE PLACEMENT POLICY V1.0
// Product share belongs to the image itself, never to the text column.
// This is DOM-based so language direction / mobile CSS cannot move it back
// over the product title.
// ============================================================
(() => {
  'use strict';

  function installStyle(){
    if(document.getElementById('restbrSharePlacementStyle')) return;
    const style=document.createElement('style');
    style.id='restbrSharePlacementStyle';
    style.textContent=`
      .sm-card .sm-img{position:relative!important}
      .sm-card .sm-img>.sm-share-product{
        position:absolute!important;
        z-index:45!important;
        top:7px!important;
        right:7px!important;
        left:auto!important;
        inset-inline-start:auto!important;
        inset-inline-end:7px!important;
        margin:0!important;
      }
    `;
    document.head.appendChild(style);
  }

  function fixCard(card){
    if(!card) return;
    const image=card.querySelector('.sm-img');
    const share=card.querySelector('.sm-share-product');
    if(!image || !share) return;
    if(share.parentElement!==image) image.appendChild(share);
  }

  function fixAll(root=document){
    root.querySelectorAll?.('.sm-card').forEach(fixCard);
  }

  function boot(){
    installStyle();
    const menu=document.getElementById('smMenu');
    fixAll(menu||document);
    if(menu){
      const observer=new MutationObserver(()=>fixAll(menu));
      observer.observe(menu,{childList:true,subtree:true});
    }
    window.addEventListener('restbr:design-applied',()=>fixAll(menu||document));
    console.log('✅ RESTBR Share Placement Policy V1.0 ready');
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();

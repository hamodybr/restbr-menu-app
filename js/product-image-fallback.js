(() => {
  if (/(?:^|\/)admin\.html$/i.test(location.pathname)) return;

  const FALLBACK = 'assets/shorash-logo.jpeg';

  function installStyles(){
    if (document.getElementById('smProductImageFallbackStyles')) return;
    const style = document.createElement('style');
    style.id = 'smProductImageFallbackStyles';
    style.textContent = `
      .sm-product-image.sm-image-fallback{
        object-fit:contain !important;
        object-position:center center !important;
        padding:18px !important;
        box-sizing:border-box !important;
        background:rgba(8,6,4,.72) !important;
        filter:none !important;
      }
    `;
    document.head.appendChild(style);
  }

  function applyFallback(img){
    if (!(img instanceof HTMLImageElement)) return;
    if (!img.classList.contains('sm-product-image')) return;
    if (img.dataset.smFallbackApplied === '1') return;

    img.dataset.smFallbackApplied = '1';
    img.classList.add('sm-image-fallback');
    img.dataset.fullImage = FALLBACK;
    img.src = FALLBACK;
  }

  function inspect(img){
    if (!(img instanceof HTMLImageElement)) return;
    if (!img.classList.contains('sm-product-image')) return;

    const raw = String(img.getAttribute('src') || '').trim();
    if (!raw) {
      applyFallback(img);
      return;
    }

    if (img.complete && img.naturalWidth === 0) {
      applyFallback(img);
    }
  }

  function scan(root = document){
    root.querySelectorAll?.('.sm-product-image').forEach(inspect);
  }

  installStyles();

  document.addEventListener('error', event => {
    const img = event.target;
    if (img instanceof HTMLImageElement && img.classList.contains('sm-product-image')) {
      applyFallback(img);
    }
  }, true);

  const observer = new MutationObserver(records => {
    records.forEach(record => {
      record.addedNodes.forEach(node => {
        if (!(node instanceof Element)) return;
        if (node.matches?.('.sm-product-image')) inspect(node);
        scan(node);
      });
    });
  });

  function start(){
    scan();
    observer.observe(document.body, { childList:true, subtree:true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once:true });
  } else {
    start();
  }
})();

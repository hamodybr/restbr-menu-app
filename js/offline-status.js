(() => {
  if (/(?:^|\/)admin\.html$/i.test(location.pathname)) return;

  const TEXT = {
    ar: 'أنت الآن بدون إنترنت — نعرض آخر نسخة محفوظة',
    ku: 'ئێستا ئینتەرنێت نییە — دوایین وەشانی پاشەکەوتکراو پیشان دەدرێت',
    en: 'You are offline — showing the last saved menu'
  };

  function currentLang(){
    const value = localStorage.getItem('shorashLang') || 'ar';
    return ['ar','ku','en'].includes(value) ? value : 'ar';
  }

  function ensureStyle(){
    if (document.getElementById('smOfflineStatusStyle')) return;

    const style = document.createElement('style');
    style.id = 'smOfflineStatusStyle';
    style.textContent = `
      /* The old temporary fallback notice is replaced by this single persistent status. */
      #smOfflineBanner{display:none!important}

      #smOfflineStatus{
        position:fixed;
        z-index:12050;
        top:calc(10px + env(safe-area-inset-top));
        left:50%;
        transform:translate(-50%,-10px);
        width:max-content;
        max-width:min(92vw,460px);
        box-sizing:border-box;
        padding:9px 13px;
        border:1px solid rgba(226,181,94,.34);
        border-radius:999px;
        background:rgba(15,11,7,.94);
        color:#edc879;
        box-shadow:0 12px 34px rgba(0,0,0,.34);
        backdrop-filter:blur(14px);
        -webkit-backdrop-filter:blur(14px);
        text-align:center;
        font:700 11px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Tahoma,Arial,sans-serif;
        opacity:0;
        visibility:hidden;
        pointer-events:none;
        transition:opacity .2s ease,transform .2s ease,visibility .2s ease;
      }
      #smOfflineStatus.show{
        opacity:1;
        visibility:visible;
        transform:translate(-50%,0);
      }
      @media(max-width:520px){
        #smOfflineStatus{
          width:calc(100% - 24px);
          max-width:420px;
          border-radius:14px;
          font-size:10.5px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureBanner(){
    ensureStyle();
    let banner = document.getElementById('smOfflineStatus');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'smOfflineStatus';
      banner.setAttribute('role','status');
      banner.setAttribute('aria-live','polite');
      document.body.appendChild(banner);
    }
    return banner;
  }

  function sync(){
    const banner = ensureBanner();
    const offline = navigator.onLine === false;
    banner.textContent = `⚠️ ${TEXT[currentLang()] || TEXT.ar}`;
    banner.classList.toggle('show', offline);
  }

  function start(){
    sync();
    window.addEventListener('offline', sync);
    window.addEventListener('online', sync);

    document.addEventListener('click', event => {
      if (event.target.closest('[data-lang],[data-sm-gate-lang]')) {
        setTimeout(sync, 30);
      }
    });

    // Register as early as possible so the offline shell is ready before the user leaves the page.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('./sw.js', { updateViaCache: 'none' })
        .catch(error => console.debug('Offline SW:', error?.message || error));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once:true });
  } else {
    start();
  }
})();

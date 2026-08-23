(() => {
  const STYLE_ID = 'smEnglishNewsTickerStyle';

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      html[dir="ltr"] .sm-news-ticker.sm-news-ticker-en{
        direction:ltr !important;
      }

      html[dir="ltr"] .sm-news-ticker.sm-news-ticker-en .sm-news-label{
        order:0 !important;
        direction:ltr !important;
        flex:0 0 auto !important;
        position:relative !important;
        z-index:3 !important;
      }

      html[dir="ltr"] .sm-news-ticker.sm-news-ticker-en .sm-news-window{
        order:1 !important;
        direction:ltr !important;
        position:relative !important;
        overflow:hidden !important;
        justify-content:flex-start !important;
        -webkit-mask-image:linear-gradient(to right,transparent 0,#000 7%,#000 93%,transparent 100%);
        mask-image:linear-gradient(to right,transparent 0,#000 7%,#000 93%,transparent 100%);
      }

      html[dir="ltr"] .sm-news-ticker.sm-news-ticker-en .sm-news-track{
        position:absolute !important;
        left:0 !important;
        top:0 !important;
        bottom:0 !important;
        width:max-content !important;
        min-width:max-content !important;
        height:100% !important;
        display:flex !important;
        align-items:center !important;
        direction:ltr !important;
        white-space:nowrap !important;
        animation:smNewsTickerEnglish var(--sm-news-duration,16s) linear infinite !important;
        will-change:transform,opacity !important;
      }

      html[dir="ltr"] .sm-news-ticker.sm-news-ticker-en .sm-news-copy{
        direction:ltr !important;
        text-align:left !important;
      }

      html[dir="ltr"] .sm-news-ticker.sm-news-ticker-en .sm-news-copy[aria-hidden="true"]{
        display:none !important;
      }

      @keyframes smNewsTickerEnglish{
        0%{
          transform:translateX(calc(-100% - 10px));
          opacity:0;
        }
        7%{
          opacity:1;
        }
        91%{
          opacity:1;
        }
        100%{
          transform:translateX(var(--sm-news-english-travel,360px));
          opacity:0;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function restartTrack(track) {
    if (!track) return;
    track.style.animation = 'none';
    void track.offsetWidth;
    track.style.removeProperty('animation');
  }

  function syncEnglishTicker({ restart = false } = {}) {
    installStyle();

    const ticker = document.getElementById('smAnnouncement');
    if (!ticker) return;

    const english =
      document.documentElement.dir === 'ltr' &&
      (localStorage.getItem('shorashLang') || 'ar') === 'en';

    ticker.classList.toggle('sm-news-ticker-en', english);

    if (!english) return;

    const windowEl = ticker.querySelector('.sm-news-window');
    const track = ticker.querySelector('.sm-news-track');
    if (!windowEl || !track) return;

    const travel = Math.ceil(windowEl.getBoundingClientRect().width) + 12;
    ticker.style.setProperty('--sm-news-english-travel', `${travel}px`);

    if (restart) restartTrack(track);
  }

  window.addEventListener('shorash:ready', () => {
    requestAnimationFrame(() => syncEnglishTicker({ restart: true }));
    setTimeout(() => syncEnglishTicker({ restart: true }), 120);
  });

  document.addEventListener('click', event => {
    if (!event.target.closest('[data-lang]')) return;
    setTimeout(() => syncEnglishTicker({ restart: true }), 0);
    setTimeout(() => syncEnglishTicker({ restart: true }), 80);
  });

  window.addEventListener('resize', () => {
    syncEnglishTicker({ restart: false });
  }, { passive: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => syncEnglishTicker({ restart: true }), 250);
    }, { once: true });
  } else {
    setTimeout(() => syncEnglishTicker({ restart: true }), 250);
  }
})();

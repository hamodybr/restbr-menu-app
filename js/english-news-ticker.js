(() => {
  const STYLE_ID = 'smUnifiedNewsTickerStyle';

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .sm-news-ticker.sm-news-motion{
        overflow:hidden !important;
      }

      .sm-news-ticker.sm-news-motion .sm-news-label{
        position:relative !important;
        z-index:4 !important;
        flex:0 0 auto !important;
      }

      .sm-news-ticker.sm-news-motion .sm-news-window{
        position:relative !important;
        overflow:hidden !important;
        flex:1 1 auto !important;
        min-width:0 !important;
        -webkit-mask-image:linear-gradient(to right,transparent 0,#000 8%,#000 92%,transparent 100%) !important;
        mask-image:linear-gradient(to right,transparent 0,#000 8%,#000 92%,transparent 100%) !important;
      }

      .sm-news-ticker.sm-news-motion .sm-news-track{
        position:absolute !important;
        top:0 !important;
        bottom:0 !important;
        left:0 !important;
        width:max-content !important;
        min-width:max-content !important;
        height:100% !important;
        display:flex !important;
        align-items:center !important;
        white-space:nowrap !important;
        animation:smUnifiedTickerMotion var(--sm-news-motion-duration,14s) linear infinite !important;
        will-change:transform,opacity !important;
      }

      .sm-news-ticker.sm-news-motion .sm-news-copy[aria-hidden="true"]{
        display:none !important;
      }

      .sm-news-ticker.sm-news-motion-ltr{
        direction:ltr !important;
      }

      .sm-news-ticker.sm-news-motion-ltr .sm-news-label{
        order:0 !important;
        direction:ltr !important;
      }

      .sm-news-ticker.sm-news-motion-ltr .sm-news-window{
        order:1 !important;
        direction:ltr !important;
      }

      .sm-news-ticker.sm-news-motion-ltr .sm-news-track,
      .sm-news-ticker.sm-news-motion-ltr .sm-news-copy{
        direction:ltr !important;
        text-align:left !important;
      }

      .sm-news-ticker.sm-news-motion-rtl{
        direction:rtl !important;
      }

      .sm-news-ticker.sm-news-motion-rtl .sm-news-label{
        order:0 !important;
        direction:rtl !important;
      }

      .sm-news-ticker.sm-news-motion-rtl .sm-news-window{
        order:1 !important;
        direction:rtl !important;
      }

      .sm-news-ticker.sm-news-motion-rtl .sm-news-track,
      .sm-news-ticker.sm-news-motion-rtl .sm-news-copy{
        direction:rtl !important;
        text-align:right !important;
      }

      @keyframes smUnifiedTickerMotion{
        0%{
          transform:translateX(var(--sm-news-motion-start,0px));
          opacity:0;
        }
        8%{
          opacity:1;
        }
        92%{
          opacity:1;
        }
        100%{
          transform:translateX(var(--sm-news-motion-end,0px));
          opacity:0;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function currentLanguage() {
    return localStorage.getItem('shorashLang') ||
      document.documentElement.lang ||
      'ar';
  }

  function baseDurationSeconds(ticker) {
    const raw = getComputedStyle(ticker)
      .getPropertyValue('--sm-news-duration')
      .trim();

    const parsed = parseFloat(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 12;
  }

  function restart(track) {
    if (!track) return;
    track.style.animation = 'none';
    void track.offsetWidth;
    track.style.removeProperty('animation');
  }

  function syncTicker({ restartAnimation = false } = {}) {
    installStyle();

    const ticker = document.getElementById('smAnnouncement');
    if (!ticker || ticker.style.display === 'none') return;

    const windowEl = ticker.querySelector('.sm-news-window');
    const track = ticker.querySelector('.sm-news-track');
    if (!windowEl || !track) return;

    const lang = currentLanguage();
    const isEnglish = lang === 'en';

    ticker.classList.add('sm-news-motion');
    ticker.classList.toggle('sm-news-motion-ltr', isEnglish);
    ticker.classList.toggle('sm-news-motion-rtl', !isEnglish);

    const windowWidth = Math.max(1, Math.ceil(windowEl.getBoundingClientRect().width));
    const trackWidth = Math.max(1, Math.ceil(track.scrollWidth));
    const edge = 12;

    const start = isEnglish
      ? -(trackWidth + edge)
      : windowWidth + edge;

    const end = isEnglish
      ? windowWidth + edge
      : -(trackWidth + edge);

    ticker.style.setProperty('--sm-news-motion-start', `${start}px`);
    ticker.style.setProperty('--sm-news-motion-end', `${end}px`);

    const base = baseDurationSeconds(ticker);
    const duration = isEnglish
      ? Math.max(14, base * 1.8)
      : Math.max(10, base);

    ticker.style.setProperty('--sm-news-motion-duration', `${duration.toFixed(1)}s`);

    if (restartAnimation) restart(track);
  }

  function syncSoon() {
    requestAnimationFrame(() => syncTicker({ restartAnimation: true }));
    setTimeout(() => syncTicker({ restartAnimation: true }), 80);
    setTimeout(() => syncTicker({ restartAnimation: true }), 220);
  }

  window.addEventListener('shorash:ready', syncSoon);

  document.addEventListener('click', event => {
    if (event.target.closest('[data-lang]')) syncSoon();
  });

  window.addEventListener('resize', () => {
    syncTicker({ restartAnimation: false });
  }, { passive: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(syncSoon, 250);
    }, { once: true });
  } else {
    setTimeout(syncSoon, 250);
  }
})();

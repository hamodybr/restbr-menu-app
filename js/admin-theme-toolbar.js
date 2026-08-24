(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;

  const THEME_KEY = 'SHORASH_ADMIN_THEME_V2';
  const LEGACY_THEME_KEY = 'SHORASH_ADMIN_SETTINGS_THEME_V1';

  function installStyles(){
    if (document.getElementById('smAdminGlobalThemeToolbarStyles')) return;

    const style = document.createElement('style');
    style.id = 'smAdminGlobalThemeToolbarStyles';
    style.textContent = `
      /* Sticky admin header */
      .admin-header{
        position:sticky !important;
        top:0 !important;
        z-index:650 !important;
        display:grid !important;
        grid-template-columns:auto minmax(0,1fr) auto !important;
        align-items:center !important;
        gap:11px !important;
        padding-top:max(10px,env(safe-area-inset-top)) !important;
        padding-bottom:10px !important;
        box-shadow:0 10px 30px rgba(0,0,0,.18) !important;
      }

      .admin-header-actions{
        display:flex;
        align-items:center;
        justify-content:flex-end;
        gap:7px;
        min-width:0;
        direction:rtl;
      }

      .admin-header-actions .header-refresh,
      .admin-global-theme-btn{
        flex:0 0 42px;
        width:42px !important;
        height:42px !important;
        min-width:42px !important;
        padding:0 !important;
        display:grid !important;
        place-items:center !important;
        border-radius:12px !important;
        transition:transform .16s ease,background .2s ease,border-color .2s ease,color .2s ease !important;
        -webkit-tap-highlight-color:transparent;
      }

      .admin-global-theme-btn{
        border:1px solid rgba(216,169,88,.25);
        background:#17130f;
        color:#e8b862;
        font-size:18px;
        box-shadow:0 7px 18px rgba(0,0,0,.16);
      }

      .admin-header-actions button:active{transform:scale(.94)}

      #saveRestaurantSettingsBtn.admin-top-save-btn{
        min-height:42px !important;
        height:42px !important;
        margin:0 !important;
        padding:0 14px !important;
        border-radius:12px !important;
        white-space:nowrap;
        box-shadow:0 7px 20px rgba(173,116,38,.2);
      }

      #saveRestaurantSettingsBtn.admin-top-save-btn:disabled{
        opacity:.62;
        cursor:wait;
      }

      .admin-settings-top-hidden{display:none !important}
      #adminSettingsThemeBtn{display:none !important}

      #viewTools .settings-save-bar{min-height:auto !important}

      body,
      .admin-header,
      .admin-main,
      .admin-view,
      .bottom-nav,
      .panel,
      .stat-card,
      .category-row,
      .product-row,
      .connection-box,
      .search-box,
      .admin-modal-card,
      .modal-head,
      .modal-actions,
      .field input,
      .field textarea,
      .field select,
      .check-card,
      .option-editor,
      #viewTools .settings-accordion,
      #viewTools .settings-element,
      #viewTools input,
      #viewTools textarea,
      #viewTools select{
        transition:background-color .2s ease,border-color .2s ease,color .2s ease,box-shadow .2s ease !important;
      }

      /* =========================================================
         GLOBAL LIGHT THEME — WHOLE ADMIN DASHBOARD
         ========================================================= */
      body.admin-global-light{
        background:
          radial-gradient(circle at top,#fff8ed 0%,#f5ede2 44%,#eee4d7 100%) !important;
        color:#30281f !important;
      }

      body.admin-global-light .admin-main,
      body.admin-global-light .admin-view{
        color:#30281f !important;
      }

      body.admin-global-light .admin-header{
        background:rgba(255,250,243,.96) !important;
        border-bottom-color:rgba(117,80,31,.16) !important;
        box-shadow:0 10px 28px rgba(86,57,19,.09) !important;
      }

      body.admin-global-light .admin-header h1{color:#8d5e1b !important}
      body.admin-global-light .admin-header p{color:#75695d !important}

      body.admin-global-light .admin-header-actions .header-refresh,
      body.admin-global-light .admin-global-theme-btn{
        background:#fffdf8 !important;
        color:#7a5319 !important;
        border-color:rgba(99,69,27,.18) !important;
        box-shadow:0 5px 16px rgba(86,57,19,.07) !important;
      }

      body.admin-global-light .bottom-nav{
        background:rgba(255,250,243,.96) !important;
        border-color:rgba(117,80,31,.15) !important;
        box-shadow:0 16px 38px rgba(86,57,19,.12) !important;
      }

      body.admin-global-light .bottom-nav .nav-btn{
        color:#786b5d !important;
      }

      body.admin-global-light .bottom-nav .nav-btn.active{
        color:#8d5e1b !important;
        background:rgba(182,126,45,.1) !important;
      }

      body.admin-global-light .panel,
      body.admin-global-light .stat-card,
      body.admin-global-light .category-row,
      body.admin-global-light .product-row,
      body.admin-global-light .connection-box,
      body.admin-global-light .tools-card,
      body.admin-global-light .analytics-card,
      body.admin-global-light .metric-card,
      body.admin-global-light .chart-card,
      body.admin-global-light .backup-card,
      body.admin-global-light .bulk-price-card,
      body.admin-global-light .dynamic-manager,
      body.admin-global-light .dynamic-item,
      body.admin-global-light .admin-card,
      body.admin-global-light .home-card,
      body.admin-global-light .quick-card,
      body.admin-global-light .activity-card{
        background:#fffaf3 !important;
        border-color:rgba(112,79,34,.16) !important;
        color:#30281f !important;
        box-shadow:0 8px 24px rgba(83,58,26,.05) !important;
      }

      body.admin-global-light .panel-header{
        border-bottom-color:rgba(112,79,34,.11) !important;
      }

      body.admin-global-light .panel-header h2,
      body.admin-global-light .stat-card strong,
      body.admin-global-light .product-price,
      body.admin-global-light .view-title,
      body.admin-global-light .admin-view h2,
      body.admin-global-light .admin-view h3,
      body.admin-global-light .admin-view h4{
        color:#8d5e1b !important;
      }

      body.admin-global-light .category-name,
      body.admin-global-light .product-name,
      body.admin-global-light .admin-view strong,
      body.admin-global-light .admin-view label{
        color:#33291f !important;
      }

      body.admin-global-light .category-meta,
      body.admin-global-light .product-meta,
      body.admin-global-light .stat-card span,
      body.admin-global-light .view-subtitle,
      body.admin-global-light .loading,
      body.admin-global-light .empty,
      body.admin-global-light .admin-view small,
      body.admin-global-light .admin-view p{
        color:#776b5f !important;
      }

      body.admin-global-light .search-box,
      body.admin-global-light .admin-view input:not([type="checkbox"]):not([type="radio"]),
      body.admin-global-light .admin-view textarea,
      body.admin-global-light .admin-view select{
        background:#fffdf9 !important;
        color:#30281f !important;
        border-color:rgba(112,79,34,.2) !important;
        box-shadow:inset 0 1px 0 rgba(255,255,255,.8) !important;
      }

      body.admin-global-light .search-box::placeholder,
      body.admin-global-light .admin-view input::placeholder,
      body.admin-global-light .admin-view textarea::placeholder{
        color:#9b9187 !important;
      }

      body.admin-global-light .btn-dark,
      body.admin-global-light .mini-btn,
      body.admin-global-light .edit-product-btn,
      body.admin-global-light .admin-view button:not(.btn-gold):not(.danger-action-btn):not(.danger-mini):not(.danger):not(.nav-btn){
        background:#fffaf2 !important;
        color:#6f4b1b !important;
        border-color:rgba(112,79,34,.18) !important;
      }

      body.admin-global-light .danger,
      body.admin-global-light .danger-mini,
      body.admin-global-light .danger-action-btn{
        background:#fff2f0 !important;
        color:#a63c34 !important;
        border-color:rgba(166,60,52,.22) !important;
      }

      body.admin-global-light .admin-modal{
        background:rgba(77,59,39,.34) !important;
      }

      body.admin-global-light .admin-modal-card,
      body.admin-global-light .modal-head,
      body.admin-global-light .modal-actions,
      body.admin-global-light .check-card,
      body.admin-global-light .option-editor{
        background:#fffaf3 !important;
        color:#30281f !important;
        border-color:rgba(112,79,34,.16) !important;
      }

      body.admin-global-light .modal-close{
        background:#fffdf8 !important;
        color:#6f4b1b !important;
        border-color:rgba(112,79,34,.18) !important;
      }

      /* Settings-specific surfaces, including dynamic plugins. */
      body.admin-global-light #viewTools,
      body.admin-global-light #viewTools .settings-clean-wrap,
      body.admin-global-light #viewTools .settings-accordion-body{
        color:#30281f !important;
      }

      body.admin-global-light #viewTools .settings-save-bar,
      body.admin-global-light #viewTools .settings-accordion,
      body.admin-global-light #viewTools .settings-element,
      body.admin-global-light #viewTools .settings-toggle-card,
      body.admin-global-light #viewTools .settings-field-clean,
      body.admin-global-light #viewTools .tri-box,
      body.admin-global-light #viewTools .dynamic-manager,
      body.admin-global-light #viewTools .dynamic-item,
      body.admin-global-light #viewTools .ui-design-topbar,
      body.admin-global-light #viewTools .ui-design-group,
      body.admin-global-light #viewTools .tools-card,
      body.admin-global-light #viewTools .backup-card,
      body.admin-global-light #viewTools .bulk-price-card,
      body.admin-global-light #viewTools .sm-discount-row,
      body.admin-global-light #viewTools .sm-discount-empty,
      body.admin-global-light #viewTools .option-editor{
        background:#fffaf3 !important;
        border-color:rgba(112,79,34,.16) !important;
        color:#30281f !important;
        box-shadow:0 8px 24px rgba(83,58,26,.05) !important;
      }

      body.admin-global-light #viewTools .settings-accordion[open]{
        border-color:rgba(169,119,43,.34) !important;
      }

      body.admin-global-light #viewTools .settings-accordion > summary{
        background:linear-gradient(180deg,#fffdf8,#fff8ee) !important;
        border-color:rgba(112,79,34,.12) !important;
      }

      body.admin-global-light #viewTools .tri-tabs,
      body.admin-global-light #viewTools .settings-tabs{
        background:#eee5d9 !important;
        border-color:rgba(104,74,34,.12) !important;
      }

      body.admin-global-light #viewTools .tri-tabs button,
      body.admin-global-light #viewTools .settings-tabs button{
        color:#71675c !important;
      }

      body.admin-global-light #viewTools .tri-tabs button.active,
      body.admin-global-light #viewTools .settings-tabs button.active{
        background:#fffaf2 !important;
        color:#9b691f !important;
      }

      body.admin-global-light #viewTools .settings-msg,
      body.admin-global-light #viewTools .settings-main-msg{
        color:#6d6258;
      }

      @media(max-width:650px){
        .admin-header{
          gap:8px !important;
          padding-left:9px !important;
          padding-right:9px !important;
        }
        .admin-header-actions{gap:5px}
        .admin-header-actions .header-refresh,
        .admin-global-theme-btn{
          flex-basis:38px;
          width:38px !important;
          min-width:38px !important;
          height:38px !important;
          border-radius:11px !important;
        }
        #saveRestaurantSettingsBtn.admin-top-save-btn{
          width:42px !important;
          min-width:42px !important;
          padding:0 !important;
          font-size:0 !important;
        }
        #saveRestaurantSettingsBtn.admin-top-save-btn::before{
          content:'💾';
          font-size:17px;
          line-height:1;
        }
        .admin-header-copy p{display:none !important}
      }

      @media(max-width:390px){
        .admin-logo{width:40px !important;height:40px !important}
        .admin-header h1{font-size:15px !important}
      }
    `;
    document.head.appendChild(style);
  }

  function settingsActive(){
    return document.getElementById('viewTools')?.classList.contains('active') === true;
  }

  function savedTheme(){
    try {
      return localStorage.getItem(THEME_KEY) || localStorage.getItem(LEGACY_THEME_KEY) || 'dark';
    } catch (_) {
      return 'dark';
    }
  }

  function syncTopControlsVisibility(){
    /* Theme toggle is global and stays visible on every dashboard page. */
    document.getElementById('adminGlobalThemeBtn')?.classList.remove('admin-settings-top-hidden');

    /* Restaurant save button is only relevant inside Settings. */
    document.getElementById('saveRestaurantSettingsBtn')?.classList.toggle(
      'admin-settings-top-hidden',
      !settingsActive()
    );

    applyTheme(savedTheme(), false);
  }

  function applyTheme(mode, persist = true){
    const normalized = mode === 'light' ? 'light' : 'dark';
    const light = normalized === 'light';
    const view = document.getElementById('viewTools');
    const button = document.getElementById('adminGlobalThemeBtn');

    /* GLOBAL: never remove the theme when changing dashboard pages. */
    document.body.classList.toggle('admin-global-light', light);
    document.body.classList.toggle('admin-global-dark', !light);

    /* Keep legacy settings selectors compatible. */
    view?.classList.toggle('admin-settings-light', light);

    document.documentElement.style.colorScheme = light ? 'light' : 'dark';

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', light ? '#fffaf3' : '#080604');

    if (button) {
      button.textContent = light ? '🌙' : '☀️';
      button.title = light ? 'الوضع الليلي' : 'الوضع النهاري';
      button.setAttribute('aria-label', button.title);
      button.setAttribute('aria-pressed', String(light));
    }

    if (persist) {
      try {
        localStorage.setItem(THEME_KEY, normalized);
        localStorage.setItem(LEGACY_THEME_KEY, normalized);
      } catch (_) {}
    }
  }

  function buildToolbar(){
    const header = document.querySelector('.admin-header');
    const refresh = document.getElementById('refreshBtn');
    const save = document.getElementById('saveRestaurantSettingsBtn');
    if (!header || !refresh || !save) return false;

    let actions = document.getElementById('adminHeaderActions');
    if (!actions) {
      actions = document.createElement('div');
      actions.id = 'adminHeaderActions';
      actions.className = 'admin-header-actions';
      header.appendChild(actions);
    }

    let theme = document.getElementById('adminGlobalThemeBtn');
    if (!theme) {
      theme = document.createElement('button');
      theme.id = 'adminGlobalThemeBtn';
      theme.className = 'admin-global-theme-btn';
      theme.type = 'button';
      actions.appendChild(theme);
      theme.addEventListener('click', () => {
        const current = savedTheme();
        applyTheme(current === 'light' ? 'dark' : 'light');
      });
    }

    save.classList.add('admin-top-save-btn');
    save.title = 'حفظ إعدادات المطعم';

    actions.appendChild(save);
    actions.appendChild(theme);
    actions.appendChild(refresh);

    return true;
  }

  function watchDashboardViews(){
    document.querySelectorAll('.admin-view').forEach(view => {
      const observer = new MutationObserver(syncTopControlsVisibility);
      observer.observe(view, { attributes:true, attributeFilter:['class'] });
    });

    document.querySelectorAll('[data-admin-nav]').forEach(button => {
      button.addEventListener('click', () => requestAnimationFrame(syncTopControlsVisibility));
    });
  }

  function start(){
    installStyles();
    if (!buildToolbar()) return;
    watchDashboardViews();
    applyTheme(savedTheme(), false);
    syncTopControlsVisibility();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once:true });
  } else {
    start();
  }
})();

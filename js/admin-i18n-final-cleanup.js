(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__RESTBR_ADMIN_I18N_FINAL_CLEANUP_V2__) return;
  window.__RESTBR_ADMIN_I18N_FINAL_CLEANUP_V2__ = true;

  const staticOriginals = new WeakMap();
  const backupOriginal = new WeakMap();
  const backupTranslated = new WeakMap();

  const isEnglish = () => document.documentElement.dataset.adminLang === 'en';

  const STATIC_BLOCKS = [
    {
      selector: '.ui-design-note',
      english:
        'Each group has its own Default button, and there is also a Reset All button. After any reset, click Save Restaurant Settings.<br>' +
        '0% = exactly the same glass transparency as the footer shown on the live site. Increasing the percentage makes the same glass lighter. The text has no separate background. Default: 0%.'
    },
    {
      selector: '.excel-note',
      english:
        'The file contains Sheets for sections, products, and options. Import updates existing records by <bdi>ID</bdi> and does not delete any record. ' +
        'A full Backup is saved automatically before importing. Best practice: download the current Excel → edit what you need → upload it again.'
    }
  ];

  const BACKUP_EXACT = new Map([
    ['النسخة الكاملة تشمل الأقسام، الأصناف، الخيارات وإعدادات المطعم.', 'The full backup includes sections, products, options, and restaurant settings.'],
    ['النسخة الكاملة تشمل الأقسام، الأصناف، الخيارات وإعدادات المطعم بالكامل.', 'The full backup includes sections, products, options, and all restaurant settings.'],
    ['يشمل الأقسام، الأصناف، الخيارات وإعدادات المطعم بالكامل.', 'Includes sections, products, options, and all restaurant settings.'],
    ['نسخة إعدادات المطعم فقط.', 'Restaurant settings only.'],
    ['نسخة الأقسام فقط.', 'Sections only.'],
    ['نسخة الأصناف والخيارات فقط.', 'Products and options only.'],
    ['نسخة الأسعار فقط.', 'Prices only.']
  ]);

  const ROLE_EN = {
    super_admin: 'System Administrator',
    owner: 'Restaurant Owner',
    manager: 'Manager',
    menu_editor: 'Menu Editor',
    viewer: 'View Only'
  };

  function installFinalStyles() {
    if (document.getElementById('restbrAdminFinalPolishStyles')) return;
    const style = document.createElement('style');
    style.id = 'restbrAdminFinalPolishStyles';
    style.textContent = `
      body.admin-global-light .social-setting-row,
      body.admin-global-light .appearance-mode-card,
      body.admin-global-light .bulk-price-preview{
        background:#fffaf3 !important;
        color:#30281f !important;
        border-color:rgba(112,79,34,.16) !important;
        box-shadow:none !important;
      }

      body.admin-global-light .social-setting-name,
      body.admin-global-light .social-setting-row .mini-visibility span,
      body.admin-global-light .appearance-mode-card span,
      body.admin-global-light .bulk-price-preview,
      body.admin-global-light #smBulkPriceTargetPreview{
        color:#776b5f !important;
        -webkit-text-fill-color:#776b5f !important;
      }

      body.admin-global-light .social-setting-row input,
      body.admin-global-light .appearance-mode-card input,
      body.admin-global-light .appearance-mode-card select{
        background:#fffdf9 !important;
        color:#30281f !important;
        -webkit-text-fill-color:#30281f !important;
        border-color:rgba(112,79,34,.22) !important;
        color-scheme:light !important;
        box-shadow:inset 0 1px 0 rgba(255,255,255,.82) !important;
      }

      body.admin-global-light .social-setting-row input::placeholder,
      body.admin-global-light .appearance-mode-card input::placeholder{
        color:#9b9187 !important;
        -webkit-text-fill-color:#9b9187 !important;
      }

      body.admin-global-light .bulk-price-preview strong,
      body.admin-global-light #smBulkPriceTargetPreview strong{
        color:#8d5e1b !important;
        -webkit-text-fill-color:#8d5e1b !important;
      }

      html[data-admin-lang="en"] #adminAccountIdentity span[data-admin-role-label-en],
      html[data-admin-lang="en"] #adminRoleBadge[data-admin-role-label-en]{
        font-size:0 !important;
      }

      html[data-admin-lang="en"] #adminAccountIdentity span[data-admin-role-label-en]::after{
        content:attr(data-admin-role-label-en);
        font-size:11px;
        font-weight:800;
      }

      html[data-admin-lang="en"] #adminRoleBadge[data-admin-role-label-en]::after{
        content:attr(data-admin-display-name) " • " attr(data-admin-role-label-en);
        font-size:9px;
        font-weight:800;
        line-height:1.3;
      }
    `;
    document.head.appendChild(style);
  }

  function translateBackupText(value) {
    const raw = String(value ?? '');
    const trimmed = raw.trim();
    if (!trimmed) return raw;
    if (BACKUP_EXACT.has(trimmed)) return BACKUP_EXACT.get(trimmed);

    return trimmed
      .replace(/النسخة الكاملة تشمل/gu, 'The full backup includes')
      .replace(/يشمل/gu, 'Includes')
      .replace(/الأقسام/gu, 'sections')
      .replace(/الأصناف/gu, 'products')
      .replace(/الخيارات/gu, 'options')
      .replace(/إعدادات المطعم/gu, 'restaurant settings')
      .replace(/الأسعار/gu, 'prices')
      .replace(/بالكامل/gu, 'in full');
  }

  function applyStaticBlocks() {
    STATIC_BLOCKS.forEach(item => {
      document.querySelectorAll(item.selector).forEach(element => {
        if (!staticOriginals.has(element)) staticOriginals.set(element, element.innerHTML);
        const next = isEnglish() ? item.english : staticOriginals.get(element);
        if (element.innerHTML !== next) element.innerHTML = next;
      });
    });
  }

  function applySubtitleHint() {
    const toggle = document.getElementById('rs_show_subtitle');
    const element = toggle?.closest('.settings-element')?.querySelector('.settings-element-head small');
    if (!element) return;

    const next = isEnglish()
      ? 'You can use <bdi>{name}</bdi> to insert the restaurant name automatically.'
      : 'يمكن استخدام <bdi>{name}</bdi> ليأخذ اسم المطعم تلقائياً.';

    if (element.innerHTML !== next) element.innerHTML = next;
  }

  function applyRoleLabels() {
    const role = String(document.body?.dataset?.adminRole || '').trim();
    const englishLabel = ROLE_EN[role];
    if (!englishLabel) return;

    const identity = document.getElementById('adminAccountIdentity');
    const identityRole = identity?.querySelector('span');
    const displayName = identity?.querySelector('strong')?.textContent?.trim() || '';
    const badge = document.getElementById('adminRoleBadge');

    if (identityRole) identityRole.setAttribute('data-admin-role-label-en', englishLabel);
    if (badge) {
      badge.setAttribute('data-admin-role-label-en', englishLabel);
      if (displayName) badge.setAttribute('data-admin-display-name', displayName);
    }
  }

  function applyBackupNote() {
    const element = document.getElementById('backupTypeNote');
    if (!element) return;

    const live = String(element.textContent ?? '');
    const last = backupTranslated.get(element);
    if (!backupOriginal.has(element) || (last !== undefined && live !== last)) {
      backupOriginal.set(element, live);
    }

    const source = backupOriginal.get(element) ?? live;
    if (isEnglish()) {
      const next = translateBackupText(source);
      backupTranslated.set(element, next);
      if (element.textContent !== next) element.textContent = next;
    } else {
      backupTranslated.delete(element);
      if (element.textContent !== source) element.textContent = source;
    }
  }

  function refresh() {
    installFinalStyles();
    applyStaticBlocks();
    applySubtitleHint();
    applyRoleLabels();
    applyBackupNote();
  }

  function start() {
    refresh();
    document.addEventListener('restbr:admin-language-change', () => requestAnimationFrame(refresh));

    const observer = new MutationObserver(() => {
      requestAnimationFrame(refresh);
    });
    observer.observe(document.body, { subtree:true, childList:true, characterData:true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once:true });
  } else {
    start();
  }
})();

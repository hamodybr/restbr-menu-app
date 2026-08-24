(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;
  if (document.getElementById('smAdminLightThemeCompleteStyles')) return;

  const style = document.createElement('style');
  style.id = 'smAdminLightThemeCompleteStyles';
  style.textContent = `
    /* =========================================================
       SHORASH ADMIN — LIGHT THEME COMPLETION LAYER
       Only overrides components that still carry hard-coded dark CSS.
       Dark mode remains untouched.
       ========================================================= */

    /* Product/category editor modals */
    body.admin-global-light .admin-modal-card,
    body.admin-global-light .admin-modal .modal-head,
    body.admin-global-light .admin-modal .modal-actions{
      background:#fffaf3 !important;
      color:#30281f !important;
      border-color:rgba(112,79,34,.16) !important;
    }

    body.admin-global-light .admin-modal .field label{
      color:#776b5f !important;
    }

    body.admin-global-light .admin-modal .field input:not([type="checkbox"]):not([type="radio"]):not([type="file"]),
    body.admin-global-light .admin-modal .field textarea,
    body.admin-global-light .admin-modal .field select,
    body.admin-global-light .admin-modal .option-editor input,
    body.admin-global-light .admin-modal input[type="url"],
    body.admin-global-light .admin-modal input[type="number"],
    body.admin-global-light .admin-modal input[type="text"]{
      background:#fffdf9 !important;
      color:#30281f !important;
      border-color:rgba(112,79,34,.22) !important;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.82) !important;
      -webkit-text-fill-color:#30281f !important;
    }

    body.admin-global-light .admin-modal input::placeholder,
    body.admin-global-light .admin-modal textarea::placeholder{
      color:#9b9187 !important;
      -webkit-text-fill-color:#9b9187 !important;
    }

    body.admin-global-light .admin-modal .check-card,
    body.admin-global-light .admin-modal .option-editor,
    body.admin-global-light .admin-modal .image-upload-box{
      background:#fffaf3 !important;
      color:#30281f !important;
      border-color:rgba(112,79,34,.18) !important;
      box-shadow:none !important;
    }

    body.admin-global-light .admin-modal .image-upload-btn{
      background:#fffdf8 !important;
      color:#6f4b1b !important;
      border-color:rgba(112,79,34,.2) !important;
    }

    body.admin-global-light .admin-modal .image-file-name,
    body.admin-global-light .admin-modal .upload-progress{
      color:#8b7761 !important;
    }

    body.admin-global-light .admin-modal .modal-close{
      background:#fffdf8 !important;
      color:#6f4b1b !important;
      border-color:rgba(112,79,34,.2) !important;
    }

    /* Category / product ordering */
    body.admin-global-light .compact-details,
    body.admin-global-light .compact-details > summary,
    body.admin-global-light .compact-details-body,
    body.admin-global-light .sort-section,
    body.admin-global-light .sortable-item{
      background:#fffaf3 !important;
      color:#30281f !important;
      border-color:rgba(112,79,34,.16) !important;
      box-shadow:0 5px 16px rgba(83,58,26,.04) !important;
    }

    body.admin-global-light .compact-details > summary{
      background:linear-gradient(180deg,#fffdf8,#fff8ee) !important;
    }

    body.admin-global-light .sort-item-name{
      color:#33291f !important;
    }

    body.admin-global-light .sort-item-meta,
    body.admin-global-light .sort-help{
      color:#84786c !important;
    }

    body.admin-global-light .drag-handle{
      background:#fff7e9 !important;
      color:#9a681f !important;
      border-color:rgba(154,104,31,.25) !important;
    }

    body.admin-global-light .sortable-item.sortable-chosen,
    body.admin-global-light .sortable-item.sortable-ghost{
      border-color:rgba(182,126,45,.48) !important;
      background:#fff4df !important;
    }

    /* Analytics KPIs and cards */
    body.admin-global-light .analytics-kpi,
    body.admin-global-light .analytics-card{
      background:#fffaf3 !important;
      color:#30281f !important;
      border-color:rgba(112,79,34,.16) !important;
      box-shadow:0 7px 20px rgba(83,58,26,.045) !important;
    }

    body.admin-global-light .analytics-kpi span,
    body.admin-global-light .analytics-label,
    body.admin-global-light .analytics-note{
      color:#817568 !important;
    }

    body.admin-global-light .analytics-kpi strong,
    body.admin-global-light .analytics-value,
    body.admin-global-light .analytics-card h3{
      color:#8d5e1b !important;
    }

    body.admin-global-light .analytics-bar{
      background:#e8ded1 !important;
      box-shadow:inset 0 1px 2px rgba(88,61,29,.07) !important;
    }

    /* Language-settings plugin */
    body.admin-global-light #smLanguageSettingCard,
    body.admin-global-light .sm-language-setting-card{
      background:#fffaf3 !important;
      color:#30281f !important;
      border-color:rgba(112,79,34,.16) !important;
      box-shadow:none !important;
    }

    body.admin-global-light .sm-language-setting-head strong{
      color:#33291f !important;
    }

    body.admin-global-light .sm-language-setting-head span,
    body.admin-global-light .sm-language-setting-status{
      color:#817568 !important;
    }

    body.admin-global-light .sm-language-setting-option{
      background:#fffdf9 !important;
      color:#4b4035 !important;
      border-color:rgba(112,79,34,.18) !important;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.8) !important;
    }

    body.admin-global-light .sm-language-setting-option:has(input:checked){
      background:#fff5e1 !important;
      color:#805418 !important;
      border-color:rgba(183,128,47,.35) !important;
    }

    /* Restaurant opening-hours plugin — full light-mode parity. */
    body.admin-global-light #smRestaurantHoursBox,
    body.admin-global-light .sm-hours-content,
    body.admin-global-light .sm-hours-day,
    body.admin-global-light .sm-hours-preview{
      background:#fffaf3 !important;
      color:#30281f !important;
      border-color:rgba(112,79,34,.16) !important;
      box-shadow:none !important;
    }

    body.admin-global-light .sm-hours-toggle{
      background:linear-gradient(180deg,#fffdf8,#fff8ee) !important;
      color:#30281f !important;
    }

    body.admin-global-light .sm-hours-toggle-title,
    body.admin-global-light .sm-hours-day-name{
      color:#8d5e1b !important;
    }

    body.admin-global-light .sm-hours-toggle-summary,
    body.admin-global-light .sm-hours-help,
    body.admin-global-light .sm-hours-note,
    body.admin-global-light .sm-hours-day-toggle,
    body.admin-global-light .sm-hours-day-times label,
    body.admin-global-light .sm-hours-times label{
      color:#776b5f !important;
    }

    body.admin-global-light .sm-hours-chevron{
      background:#fff7e9 !important;
      color:#9a681f !important;
      border-color:rgba(154,104,31,.22) !important;
    }

    body.admin-global-light .sm-hours-mode,
    body.admin-global-light .sm-hours-times input,
    body.admin-global-light .sm-hours-day-times input{
      background:#fffdf9 !important;
      color:#30281f !important;
      -webkit-text-fill-color:#30281f !important;
      border-color:rgba(112,79,34,.22) !important;
      color-scheme:light !important;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.82) !important;
    }

    body.admin-global-light .sm-hours-day.is-off{
      background:#f6efe5 !important;
      opacity:.7 !important;
    }

    body.admin-global-light .sm-hours-day-state{
      color:#6f6255 !important;
    }

    /* Common hard-coded dark surfaces used by dynamic admin panels */
    body.admin-global-light .tools-card,
    body.admin-global-light .backup-card,
    body.admin-global-light .bulk-price-card,
    body.admin-global-light .dynamic-manager,
    body.admin-global-light .dynamic-item,
    body.admin-global-light .option-editor,
    body.admin-global-light .settings-field-clean,
    body.admin-global-light .settings-toggle-card,
    body.admin-global-light .ui-design-group,
    body.admin-global-light .ui-design-topbar{
      background:#fffaf3 !important;
      color:#30281f !important;
      border-color:rgba(112,79,34,.16) !important;
    }

    /* iOS form controls sometimes keep their native dark fill unless explicitly reset. */
    body.admin-global-light input:not([type="checkbox"]):not([type="radio"]):not([type="file"]),
    body.admin-global-light textarea,
    body.admin-global-light select{
      color-scheme:light !important;
    }
  `;

  document.head.appendChild(style);
})();

(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;
  if (document.getElementById('shorashAdminFontScaleStyles')) return;

  const style = document.createElement('style');
  style.id = 'shorashAdminFontScaleStyles';
  style.textContent = `
    html,
    body {
      -webkit-text-size-adjust: 108% !important;
      text-size-adjust: 108% !important;
    }
  `;

  document.head.appendChild(style);

  // This file is already part of the admin bootstrap; load the role-aware UI layer here.
  if (!document.getElementById('restbrAdminRoleUiScript')) {
    const script = document.createElement('script');
    script.id = 'restbrAdminRoleUiScript';
    script.src = 'js/admin-role-ui.js?v=1.0';
    script.async = false;
    document.head.appendChild(script);
  }

  // Admin-only: allow every authenticated dashboard user to change their own password.
  if (!document.getElementById('restbrAdminAccountPasswordScript')) {
    const script = document.createElement('script');
    script.id = 'restbrAdminAccountPasswordScript';
    script.src = 'js/admin-account-password.js?v=1.0';
    script.async = false;
    document.head.appendChild(script);
  }

  // Admin-only: allow every authenticated dashboard user to request changing their own email.
  if (!document.getElementById('restbrAdminAccountEmailScript')) {
    const script = document.createElement('script');
    script.id = 'restbrAdminAccountEmailScript';
    script.src = 'js/admin-account-email.js?v=1.1';
    script.async = false;
    document.head.appendChild(script);
  }

  // Owner / super-admin only: create users, change roles, and enable/disable access.
  if (!document.getElementById('restbrAdminUsersListScript')) {
    const script = document.createElement('script');
    script.id = 'restbrAdminUsersListScript';
    script.src = 'js/admin-users-list.js?v=1.2';
    script.async = false;
    document.head.appendChild(script);
  }

  // Owner / super-admin only: permanently delete eligible dashboard users with confirmation.
  if (!document.getElementById('restbrAdminUserDeleteScript')) {
    const script = document.createElement('script');
    script.id = 'restbrAdminUserDeleteScript';
    script.src = 'js/admin-user-delete.js?v=1.0';
    script.async = false;
    document.head.appendChild(script);
  }

  // Super-admin only: safe dry-run preview for preparing the system for a new restaurant.
  if (!document.getElementById('restbrRestaurantResetPreviewScript')) {
    const script = document.createElement('script');
    script.id = 'restbrRestaurantResetPreviewScript';
    script.src = 'js/admin-restaurant-reset-preview.js?v=1.1';
    script.async = false;
    document.head.appendChild(script);
  }

  // Super-admin only: 4B mandatory full backup gate before any future destructive reset.
  if (!document.getElementById('restbrRestaurantResetBackupScript')) {
    const script = document.createElement('script');
    script.id = 'restbrRestaurantResetBackupScript';
    script.src = 'js/admin-restaurant-reset-backup.js?v=1.0';
    script.async = false;
    document.head.appendChild(script);
  }

  // Super-admin only: 4C guarded destructive reset, unlocked only by a fresh 4B gate.
  if (!document.getElementById('restbrRestaurantResetExecuteScript')) {
    const script = document.createElement('script');
    script.id = 'restbrRestaurantResetExecuteScript';
    script.src = 'js/admin-restaurant-reset-execute.js?v=1.0';
    script.async = false;
    document.head.appendChild(script);
  }

  // 4D safety hardening: bind each Full Backup/Challenge to a SHA-256 state fingerprint.
  if (!document.getElementById('restbrResetFingerprintPatchScript')) {
    const script = document.createElement('script');
    script.id = 'restbrResetFingerprintPatchScript';
    script.src = 'js/admin-reset-fingerprint-patch.js?v=1.0';
    script.async = false;
    document.head.appendChild(script);
  }
})();

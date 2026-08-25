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
})();

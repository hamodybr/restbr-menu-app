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
})();

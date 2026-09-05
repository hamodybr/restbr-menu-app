(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;

  function loadScript(id, src) {
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = false;
    document.head.appendChild(script);
  }

  // Keep the existing category-filter implementation unchanged.
  loadScript(
    'restbrAdminProductCategoryFilterCoreScript',
    'js/admin-product-category-filter-core.js?v=2.0'
  );

  // Self-heal the protected "غير معروض" system category if an import or
  // accidental database change removes it.
  loadScript(
    'restbrAdminHiddenCategoryGuardScript',
    'js/admin-hidden-category-guard.js?v=1.0'
  );

  // Tested RESTBR admin password recovery flow.
  loadScript(
    'restbrAdminAccountPasswordScript',
    'js/admin-account-password.js?v=2.0'
  );
})();

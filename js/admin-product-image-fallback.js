(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;
  if (window.__SHORASH_ADMIN_PRODUCT_IMAGE_FALLBACK__) return;
  window.__SHORASH_ADMIN_PRODUCT_IMAGE_FALLBACK__ = true;

  const LEGACY_FALLBACK = 'assets/shorash-logo.jpeg';
  const TARGET_SELECTOR = '#p_image_preview,#np_image_preview,.product-image';
  let restaurantLogo = '';
  let applying = false;

  function cleanUrl(value) {
    return String(value || '').trim();
  }

  function isLegacyFallback(value) {
    const src = cleanUrl(value);
    if (!src) return true;
    return src === LEGACY_FALLBACK || src.endsWith('/assets/shorash-logo.jpeg');
  }

  function currentSettingsLogo() {
    const preview = document.getElementById('rs_logo_preview');
    const src = cleanUrl(preview?.getAttribute('src') || preview?.src);
    return src && !isLegacyFallback(src) ? src : '';
  }

  function fallbackLogo() {
    return currentSettingsLogo() || restaurantLogo || LEGACY_FALLBACK;
  }

  function markFallback(img) {
    if (!(img instanceof HTMLImageElement)) return;
    const fallback = fallbackLogo();
    if (!fallback) return;

    const rawSrc = cleanUrl(img.getAttribute('src'));
    if (!rawSrc || isLegacyFallback(rawSrc)) {
      if (rawSrc !== fallback) img.src = fallback;
      img.dataset.smRestaurantLogoFallback = '1';
    }

    if (img.dataset.smFallbackBound !== '1') {
      img.dataset.smFallbackBound = '1';
      img.addEventListener('error', () => {
        const next = fallbackLogo();
        if (!next) return;
        if (cleanUrl(img.src) !== next) {
          img.dataset.smRestaurantLogoFallback = '1';
          img.src = next;
        }
      });
    }
  }

  function applyFallbacks() {
    if (applying) return;
    applying = true;
    try {
      const liveLogo = currentSettingsLogo();
      if (liveLogo) restaurantLogo = liveLogo;
      document.querySelectorAll(TARGET_SELECTOR).forEach(markFallback);
    } finally {
      applying = false;
    }
  }

  async function loadRestaurantLogo() {
    try {
      if (typeof supabaseClient === 'undefined' || !supabaseClient) return;

      const { data, error } = await supabaseClient
        .from('restaurant_settings')
        .select('logo_url,updated_at')
        .order('updated_at', { ascending:false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      const logo = cleanUrl(data?.logo_url);
      if (logo) restaurantLogo = logo;
      applyFallbacks();
    } catch (error) {
      console.warn('ADMIN PRODUCT FALLBACK LOGO ERROR:', error);
      applyFallbacks();
    }
  }

  const observer = new MutationObserver(() => applyFallbacks());

  function boot() {
    applyFallbacks();
    observer.observe(document.body, {
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:['src']
    });
    loadRestaurantLogo();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once:true });
  } else {
    boot();
  }
})();

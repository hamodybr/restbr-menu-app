// RESTBR single-restaurant public configuration template.
// Replace only the restaurant-specific values at the top for each new copy.
// Never put a Supabase service_role key in browser code.
window.RESTBR_CONFIG = Object.freeze({
  restaurantName: 'Restaurant',
  orderIdPrefix: 'ORD',
  supabaseUrl: 'https://YOUR_PROJECT_REF.supabase.co',
  supabasePublishableKey: 'YOUR_SUPABASE_PUBLISHABLE_KEY',
  enableUserManagement: false,
  enableRestaurantReset: false,
  legacyRestaurantNames: [],
  legacyBackupFormats: [],
  legacyLocalStorageKeys: {},
  legacySessionStorageKeys: {}
});

(() => {
  const config = window.RESTBR_CONFIG || {};

  const uniqueStrings = value => [
    ...new Set(
      (Array.isArray(value) ? value : [])
        .map(item => String(item || '').trim())
        .filter(Boolean)
    )
  ];

  const legacyBackupFormats = new Set(
    uniqueStrings(config.legacyBackupFormats)
  );

  window.RESTBR_IS_SUPPORTED_BACKUP_FORMAT = value =>
    String(value || '') === 'RESTBR_MENU_BACKUP' ||
    legacyBackupFormats.has(String(value || ''));

  const migrateKeys = (storage, mappings) => {
    if (!storage || !mappings || typeof mappings !== 'object') return false;
    let migrated = false;

    Object.entries(mappings).forEach(([currentKey, legacyKey]) => {
      if (!currentKey || !legacyKey || storage.getItem(currentKey) !== null) return;
      const legacyValue = storage.getItem(String(legacyKey));
      if (legacyValue !== null) {
        storage.setItem(currentKey, legacyValue);
        migrated = true;
      }
    });

    return migrated;
  };

  try {
    const migratedLocal = migrateKeys(window.localStorage, config.legacyLocalStorageKeys);
    migrateKeys(window.sessionStorage, config.legacySessionStorageKeys);
    if (migratedLocal) localStorage.setItem('RESTBR_TEMPLATE_RESET_V1', 'done');
  } catch (_) {}

  const normalizeRestaurantIdentity = value =>
    String(value || '').trim().toLocaleLowerCase('en-US');

  const configuredRestaurantKey = normalizeRestaurantIdentity(config.restaurantName);
  const hasSpecificRestaurantIdentity =
    configuredRestaurantKey &&
    configuredRestaurantKey !== 'restaurant' &&
    configuredRestaurantKey !== 'restaurant name';

  window.RESTBR_RESTAURANT_KEY = hasSpecificRestaurantIdentity
    ? configuredRestaurantKey
    : '';

  window.RESTBR_READ_BRAND_CACHE = () => {
    try {
      const raw = window.localStorage.getItem('RESTBR_BRAND_CACHE_V1');
      if (!raw) return null;

      const cached = JSON.parse(raw);
      if (!cached || typeof cached !== 'object' || Array.isArray(cached)) {
        window.localStorage.removeItem('RESTBR_BRAND_CACHE_V1');
        return null;
      }

      if (hasSpecificRestaurantIdentity) {
        const cachedKey = normalizeRestaurantIdentity(cached.restaurantKey);
        const cachedNames = [cached.nameAr, cached.nameKu, cached.nameEn]
          .map(normalizeRestaurantIdentity)
          .filter(Boolean);

        if (
          cachedKey !== configuredRestaurantKey &&
          !cachedNames.includes(configuredRestaurantKey)
        ) {
          window.localStorage.removeItem('RESTBR_BRAND_CACHE_V1');
          return null;
        }
      }

      return cached;
    } catch (_) {
      try { window.localStorage.removeItem('RESTBR_BRAND_CACHE_V1'); } catch (_) {}
      return null;
    }
  };

  // Remove a brand cache copied from another restaurant before the intro uses it.
  window.RESTBR_READ_BRAND_CACHE();

  const applyInitialBrand = () => {
    const name = String(config.restaurantName || '').trim();
    if (!name || name === 'Restaurant' || name === 'Restaurant Name') return;

    document.title = `${name} Menu`;
    document.querySelector('meta[name="apple-mobile-web-app-title"]')
      ?.setAttribute('content', name);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyInitialBrand, { once: true });
  } else {
    applyInitialBrand();
  }
})();

// Backward-compatible loader for page shells that do not load the URL guard first.
(() => {
  if (document.getElementById('restbrUrlSafetyScript')) return;
  const script = document.createElement('script');
  script.id = 'restbrUrlSafetyScript';
  script.src = 'js/url-safety.js?v=1.3';
  script.defer = true;
  document.head.appendChild(script);
})();

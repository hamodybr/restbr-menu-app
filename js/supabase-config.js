// ==========================================
// RESTBR single-restaurant menu — Supabase configuration
// ==========================================

const RESTBR_CONFIG = window.RESTBR_CONFIG || {};
const SUPABASE_URL = String(RESTBR_CONFIG.supabaseUrl || '').trim();
const SUPABASE_PUBLISHABLE_KEY = String(
  RESTBR_CONFIG.supabasePublishableKey || ''
).trim();

const RESTBR_CONFIGURED =
  /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(SUPABASE_URL) &&
  !/YOUR_PROJECT_REF/i.test(SUPABASE_URL) &&
  SUPABASE_PUBLISHABLE_KEY.length > 20 &&
  !/YOUR_SUPABASE_PUBLISHABLE_KEY/i.test(SUPABASE_PUBLISHABLE_KEY);

const RESTBR_IS_ADMIN_PATH =
  /(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname);

if (!RESTBR_CONFIGURED) {
  console.error(
    'RESTBR setup is incomplete. Add this restaurant Supabase URL and publishable key to js/runtime-config.js.'
  );

  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('restbrSetupNotice')) return;
    const notice = document.createElement('div');
    notice.id = 'restbrSetupNotice';
    notice.dir = 'rtl';
    notice.textContent =
      'إعداد القالب غير مكتمل: أضف رابط Supabase والمفتاح العام داخل js/runtime-config.js';
    notice.style.cssText =
      'position:fixed;z-index:99999;inset-inline:12px;top:12px;padding:12px 14px;border:1px solid #f59e0b;border-radius:12px;background:#241607;color:#fff3d0;font:700 13px/1.7 system-ui;text-align:center;box-shadow:0 12px 35px #0008';
    document.body.appendChild(notice);
  }, { once: true });
}

// Create Supabase client
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

if (RESTBR_CONFIGURED) {
  console.log(`✅ RESTBR connected for ${RESTBR_CONFIG.restaurantName || 'Restaurant'}`);
}

(() => {
  const name = String(RESTBR_CONFIG.restaurantName || 'Restaurant').trim();
  const isAdmin = RESTBR_IS_ADMIN_PATH;
  document.title = isAdmin ? `${name} — Admin Dashboard` : `${name} Menu`;
  document.querySelector('meta[name="apple-mobile-web-app-title"]')
    ?.setAttribute('content', name);
  if (isAdmin) {
    const loginTitle = document.querySelector('.login-brand h1');
    const subtitle = document.getElementById('adminPageSubtitle');
    if (loginTitle) loginTitle.textContent = `${name} Admin`;
    if (subtitle) subtitle.textContent = `${name} Admin`;
  }
})();

// Load the shared menu-language policy for both the public menu and admin.
(() => {
  if (document.getElementById('restbrLanguageSettingsScript')) return;

  const script = document.createElement('script');
  script.id = 'restbrLanguageSettingsScript';
  script.src = 'js/language-settings.js?v=1.1';
  script.async = false;
  document.head.appendChild(script);
})();

// Public-menu only: keep the open options sheet synced after live price refreshes.
(() => {
  if (RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('restbrDiscountChoicePriceSyncScript')) return;

  const script = document.createElement('script');
  script.id = 'restbrDiscountChoicePriceSyncScript';
  script.src = 'js/discount-choice-price-sync.js?v=1.0';
  script.async = false;
  document.head.appendChild(script);
})();

// Public-menu only: automatic restaurant opening hours.
(() => {
  if (RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('restbrRestaurantHoursScript')) return;

  const script = document.createElement('script');
  script.id = 'restbrRestaurantHoursScript';
  script.src = 'js/restaurant-hours.js?v=1.3';
  script.async = false;
  document.head.appendChild(script);
})();

// Public-menu only: use bullets instead of numeric sequencing in WhatsApp order items.
(() => {
  if (RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('restbrWhatsappOrderBulletsScript')) return;

  const script = document.createElement('script');
  script.id = 'restbrWhatsappOrderBulletsScript';
  script.src = 'js/whatsapp-order-bullets.js?v=1.0';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only sticky toolbar + GLOBAL dashboard light/dark theme.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('restbrAdminThemeToolbarScript')) return;

  const script = document.createElement('script');
  script.id = 'restbrAdminThemeToolbarScript';
  script.src = 'js/admin-theme-toolbar.js?v=1.1';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only: slightly increase all dashboard text without changing layout sizing.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('restbrAdminFontScaleScript')) return;

  const script = document.createElement('script');
  script.id = 'restbrAdminFontScaleScript';
  script.src = 'js/admin-font-scale.js?v=1.3';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only native category filter inside the existing products filter system.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('restbrAdminProductCategoryFilterScript')) return;

  const script = document.createElement('script');
  script.id = 'restbrAdminProductCategoryFilterScript';
  script.src = 'js/admin-product-category-filter.js?v=2.0';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only dine-in / takeaway price controls for product options.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('restbrAdminTakeawayPricesScript')) return;

  const script = document.createElement('script');
  script.id = 'restbrAdminTakeawayPricesScript';
  script.src = 'js/admin-takeaway-prices.js?v=1.1';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only tap ordering for product options inside the product editor.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('restbrAdminOptionOrderScript')) return;

  const script = document.createElement('script');
  script.id = 'restbrAdminOptionOrderScript';
  script.src = 'js/admin-option-order.js?v=1.4';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only: use the current restaurant logo when a product has no image.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('restbrAdminProductImageFallbackScript')) return;

  const script = document.createElement('script');
  script.id = 'restbrAdminProductImageFallbackScript';
  script.src = 'js/admin-product-image-fallback.js?v=1.1';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only: choose which price type a bulk change targets.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('restbrAdminBulkPriceTargetUiScript')) return;

  const script = document.createElement('script');
  script.id = 'restbrAdminBulkPriceTargetUiScript';
  script.src = 'js/admin-bulk-price-target-ui.js?v=2.0';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only: enhanced full backup includes discounts too.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('restbrAdminFullBackupDiscountsScript')) return;

  const script = document.createElement('script');
  script.id = 'restbrAdminFullBackupDiscountsScript';
  script.src = 'js/admin-full-backup-discounts.js?v=1.1';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only: restore discounts from enhanced backups too.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('restbrAdminFullRestoreDiscountsScript')) return;

  const script = document.createElement('script');
  script.id = 'restbrAdminFullRestoreDiscountsScript';
  script.src = 'js/admin-full-restore-discounts.js?v=1.1';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only: include dine-in and takeaway prices in Excel export.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('restbrAdminExcelExportTakeawayScript')) return;

  const script = document.createElement('script');
  script.id = 'restbrAdminExcelExportTakeawayScript';
  script.src = 'js/admin-excel-export-takeaway.js?v=1.0';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only: allow takeaway_price updates during Excel import.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('restbrAdminExcelImportTakeawayScript')) return;

  const script = document.createElement('script');
  script.id = 'restbrAdminExcelImportTakeawayScript';
  script.src = 'js/admin-excel-import-takeaway.js?v=1.0';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only restaurant opening-hours editor.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('restbrAdminRestaurantHoursScript')) return;

  const script = document.createElement('script');
  script.id = 'restbrAdminRestaurantHoursScript';
  script.src = 'js/admin-restaurant-hours.js?v=1.2';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only editor for the first dine-in / takeaway choice window.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('restbrAdminDiningGateSettingsScript')) return;

  const script = document.createElement('script');
  script.id = 'restbrAdminDiningGateSettingsScript';
  script.src = 'js/admin-dining-gate-settings.js?v=1.0';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only simple percentage discount manager.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('restbrAdminDiscountsScript')) return;

  const script = document.createElement('script');
  script.id = 'restbrAdminDiscountsScript';
  script.src = 'js/admin-discounts.js?v=1.0';
  script.async = false;
  document.head.appendChild(script);
})();

// Final admin-only light-theme completion layer for hard-coded dark components.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('restbrAdminLightThemeCompleteScript')) return;

  const script = document.createElement('script');
  script.id = 'restbrAdminLightThemeCompleteScript';
  script.src = 'js/admin-light-theme-complete.js?v=1.0';
  script.async = false;
  document.head.appendChild(script);
})();

// ==========================================
// RESTBR MENU — Supabase Connection Test
// ==========================================

async function testSupabaseConnection() {
  try {
    console.log('🔄 Testing Supabase connection...');

    const { data, error } = await supabaseClient
      .from('restaurant_settings')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Supabase test failed:', error);
      return;
    }

    console.log('✅ SUPABASE CONNECTION SUCCESS');
    console.log('📦 Restaurant settings:', data);

  } catch (error) {
    console.error('❌ Supabase connection error:', error);
  }
}

testSupabaseConnection();

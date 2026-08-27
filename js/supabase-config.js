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
  if (document.getElementById('shorashLanguageSettingsScript')) return;

  const script = document.createElement('script');
  script.id = 'shorashLanguageSettingsScript';
  script.src = 'js/language-settings.js?v=1.1';
  script.async = false;
  document.head.appendChild(script);
})();

// Public-menu only: keep the open options sheet synced after live price refreshes.
(() => {
  if (RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('shorashDiscountChoicePriceSyncScript')) return;

  const script = document.createElement('script');
  script.id = 'shorashDiscountChoicePriceSyncScript';
  script.src = 'js/discount-choice-price-sync.js?v=1.0';
  script.async = false;
  document.head.appendChild(script);
})();

// Public-menu only: automatic restaurant opening hours.
(() => {
  if (RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('shorashRestaurantHoursScript')) return;

  const script = document.createElement('script');
  script.id = 'shorashRestaurantHoursScript';
  script.src = 'js/restaurant-hours.js?v=1.3';
  script.async = false;
  document.head.appendChild(script);
})();

// Public-menu only: use bullets instead of numeric sequencing in WhatsApp order items.
(() => {
  if (RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('shorashWhatsappOrderBulletsScript')) return;

  const script = document.createElement('script');
  script.id = 'shorashWhatsappOrderBulletsScript';
  script.src = 'js/whatsapp-order-bullets.js?v=1.0';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only sticky toolbar + GLOBAL dashboard light/dark theme.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('shorashAdminThemeToolbarScript')) return;

  const script = document.createElement('script');
  script.id = 'shorashAdminThemeToolbarScript';
  script.src = 'js/admin-theme-toolbar.js?v=1.1';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only: slightly increase all dashboard text without changing layout sizing.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('shorashAdminFontScaleScript')) return;

  const script = document.createElement('script');
  script.id = 'shorashAdminFontScaleScript';
  script.src = 'js/admin-font-scale.js?v=1.0';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only native category filter inside the existing products filter system.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('shorashAdminProductCategoryFilterScript')) return;

  const script = document.createElement('script');
  script.id = 'shorashAdminProductCategoryFilterScript';
  script.src = 'js/admin-product-category-filter.js?v=2.0';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only dine-in / takeaway price controls for product options.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('shorashAdminTakeawayPricesScript')) return;

  const script = document.createElement('script');
  script.id = 'shorashAdminTakeawayPricesScript';
  script.src = 'js/admin-takeaway-prices.js?v=1.1';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only tap ordering for product options inside the product editor.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('shorashAdminOptionOrderScript')) return;

  const script = document.createElement('script');
  script.id = 'shorashAdminOptionOrderScript';
  script.src = 'js/admin-option-order.js?v=1.4';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only: use the current restaurant logo when a product has no image.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('shorashAdminProductImageFallbackScript')) return;

  const script = document.createElement('script');
  script.id = 'shorashAdminProductImageFallbackScript';
  script.src = 'js/admin-product-image-fallback.js?v=1.0';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only: choose which price type a bulk change targets.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('shorashAdminBulkPriceTargetUiScript')) return;

  const script = document.createElement('script');
  script.id = 'shorashAdminBulkPriceTargetUiScript';
  script.src = 'js/admin-bulk-price-target-ui.js?v=2.0';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only: enhanced full backup includes discounts too.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('shorashAdminFullBackupDiscountsScript')) return;

  const script = document.createElement('script');
  script.id = 'shorashAdminFullBackupDiscountsScript';
  script.src = 'js/admin-full-backup-discounts.js?v=1.1';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only: restore discounts from enhanced backups too.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('shorashAdminFullRestoreDiscountsScript')) return;

  const script = document.createElement('script');
  script.id = 'shorashAdminFullRestoreDiscountsScript';
  script.src = 'js/admin-full-restore-discounts.js?v=1.0';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only: include dine-in and takeaway prices in Excel export.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('shorashAdminExcelExportTakeawayScript')) return;

  const script = document.createElement('script');
  script.id = 'shorashAdminExcelExportTakeawayScript';
  script.src = 'js/admin-excel-export-takeaway.js?v=1.0';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only: allow takeaway_price updates during Excel import.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('shorashAdminExcelImportTakeawayScript')) return;

  const script = document.createElement('script');
  script.id = 'shorashAdminExcelImportTakeawayScript';
  script.src = 'js/admin-excel-import-takeaway.js?v=1.0';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only restaurant opening-hours editor.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('shorashAdminRestaurantHoursScript')) return;

  const script = document.createElement('script');
  script.id = 'shorashAdminRestaurantHoursScript';
  script.src = 'js/admin-restaurant-hours.js?v=1.2';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only editor for the first dine-in / takeaway choice window.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('shorashAdminDiningGateSettingsScript')) return;

  const script = document.createElement('script');
  script.id = 'shorashAdminDiningGateSettingsScript';
  script.src = 'js/admin-dining-gate-settings.js?v=1.0';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only simple percentage discount manager.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('shorashAdminDiscountsScript')) return;

  const script = document.createElement('script');
  script.id = 'shorashAdminDiscountsScript';
  script.src = 'js/admin-discounts.js?v=1.0';
  script.async = false;
  document.head.appendChild(script);
})();

// Final admin-only light-theme completion layer for hard-coded dark components.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('shorashAdminLightThemeCompleteScript')) return;

  const script = document.createElement('script');
  script.id = 'shorashAdminLightThemeCompleteScript';
  script.src = 'js/admin-light-theme-complete.js?v=1.0';
  script.async = false;
  document.head.appendChild(script);
})();

// ==========================================
// SHORASH MENU — Supabase Connection Test
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

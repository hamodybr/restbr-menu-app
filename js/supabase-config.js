// ==========================================
// SHORASH MENU — Supabase Configuration
// ==========================================

const SUPABASE_URL = 'https://pklzxpivnoqnrzyjryqz.supabase.co';

const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_CC5l_DeuRDVy32hFOoVWMw_7i45WhmK';

// Create Supabase client
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

console.log('✅ SHORASH Supabase connected');

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
  if (/(?:^|\/)admin\.html$/i.test(location.pathname)) return;
  if (document.getElementById('shorashDiscountChoicePriceSyncScript')) return;

  const script = document.createElement('script');
  script.id = 'shorashDiscountChoicePriceSyncScript';
  script.src = 'js/discount-choice-price-sync.js?v=1.0';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only sticky toolbar + GLOBAL dashboard light/dark theme.
(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;
  if (document.getElementById('shorashAdminThemeToolbarScript')) return;

  const script = document.createElement('script');
  script.id = 'shorashAdminThemeToolbarScript';
  script.src = 'js/admin-theme-toolbar.js?v=1.1';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only native category filter inside the existing products filter system.
(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;
  if (document.getElementById('shorashAdminProductCategoryFilterScript')) return;

  const script = document.createElement('script');
  script.id = 'shorashAdminProductCategoryFilterScript';
  script.src = 'js/admin-product-category-filter.js?v=2.0';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only dine-in / takeaway price controls for product options.
(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;
  if (document.getElementById('shorashAdminTakeawayPricesScript')) return;

  const script = document.createElement('script');
  script.id = 'shorashAdminTakeawayPricesScript';
  script.src = 'js/admin-takeaway-prices.js?v=1.1';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only editor for the first dine-in / takeaway choice window.
(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;
  if (document.getElementById('shorashAdminDiningGateSettingsScript')) return;

  const script = document.createElement('script');
  script.id = 'shorashAdminDiningGateSettingsScript';
  script.src = 'js/admin-dining-gate-settings.js?v=1.0';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only simple percentage discount manager.
(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;
  if (document.getElementById('shorashAdminDiscountsScript')) return;

  const script = document.createElement('script');
  script.id = 'shorashAdminDiscountsScript';
  script.src = 'js/admin-discounts.js?v=1.0';
  script.async = false;
  document.head.appendChild(script);
})();

// Final admin-only light-theme completion layer for hard-coded dark components.
(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;
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

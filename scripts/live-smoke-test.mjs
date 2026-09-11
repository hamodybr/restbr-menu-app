const BASE_URL = String(process.env.SMOKE_BASE_URL || '').trim().replace(/\/$/, '');
const failures = [];
const passed = [];

if (!/^https?:\/\//i.test(BASE_URL)) {
  throw new Error('SMOKE_BASE_URL must be the deployed RESTBR Pages URL');
}

function ok(label) {
  passed.push(label);
  console.log(`✓ ${label}`);
}

function fail(label, detail = '') {
  const message = detail ? `${label}: ${detail}` : label;
  failures.push(message);
  console.error(`✗ ${message}`);
}

function deployedUrl(ref = '') {
  const clean = String(ref || '').replace(/^\/+/, '');
  const url = new URL(clean, `${BASE_URL}/`);
  url.searchParams.set('__smoke', Date.now().toString());
  return url;
}

async function get(ref = '', { json = false } = {}) {
  const response = await fetch(deployedUrl(ref), {
    redirect: 'follow',
    cache: 'no-store',
    headers: {
      'cache-control': 'no-cache',
      'user-agent': 'RESTBR-Master-Live-Smoke/1.0'
    }
  });
  const body = json ? await response.json() : await response.text();
  return { response, body };
}

async function expectText(ref, markers, label) {
  try {
    const { response, body } = await get(ref);
    if (!response.ok) {
      fail(label, `HTTP ${response.status}`);
      return '';
    }
    const missing = markers.filter(marker => !body.includes(marker));
    if (missing.length) fail(label, `missing marker ${missing.join(', ')}`);
    else ok(`${label} (${response.status})`);
    return body;
  } catch (error) {
    fail(label, error?.message || String(error));
    return '';
  }
}

function localRefs(html) {
  const refs = new Set();
  if (!html) return [];
  for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) {
    const value = match[1].trim();
    if (!value || value.includes('${') || value.includes('{{')) continue;
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#|data:|blob:)/i.test(value)) continue;
    refs.add(value.replace(/^\.\//, ''));
  }
  return [...refs];
}

async function checkAsset(ref) {
  try {
    const response = await fetch(deployedUrl(ref), {
      redirect: 'follow',
      cache: 'no-store',
      headers: { 'cache-control': 'no-cache' }
    });
    if (!response.ok) fail(`asset ${ref}`, `HTTP ${response.status}`);
    else ok(`asset ${ref}`);
  } catch (error) {
    fail(`asset ${ref}`, error?.message || String(error));
  }
}

const indexHtml = await expectText('', [
  'js/runtime-config.js?v=2.0',
  'js/url-safety.js?v=1.4',
  'css/flexible-actions.css?v=1.0',
  'js/product-service-mode.js?v=2.0',
  'js/app.js?v=18.1',
  'js/product-colors.js?v=1.0',
  'js/product-color-cart-meta.js?v=1.0',
  'js/order-submit.js?v=1.0'
], 'master storefront');

const adminHtml = await expectText('admin.html', [
  'Admin Dashboard',
  'customTopActionsDraft',
  'customFooterActionsDraft',
  'customSocialLinksDraft'
], 'master admin page');

await expectText('js/runtime-config.js?v=2.0', [
  "script.src = 'js/admin-order-print.js?v=1.0'",
  'restbrAdminOrderPrintScript'
], 'admin invoice print loader');

await expectText('js/url-safety.js?v=1.4', [
  'RESTBR_NORMALIZE_CONFIGURED_URL',
  'PHONE_SHORTHAND',
  'WEB_SHORTHAND',
  'RESTBR_SAFE_CONFIGURED_URL'
], 'URL safety layer');

await expectText('css/flexible-actions.css?v=1.0', [
  'repeat(auto-fit,minmax(110px,1fr))',
  'repeat(4,minmax(0,1fr))'
], 'flexible action presentation');

await expectText('sw.js', [
  'restbr-restaurant-template-v8',
  'js/product-service-mode.js?v=2.0',
  'js/url-safety.js?v=1.4',
  'js/number-normalizer.js?v=1.0',
  'js/product-colors.js?v=1.0',
  'js/product-color-cart-meta.js?v=1.0',
  'js/order-submit.js?v=1.0',
  'staleWhileRevalidate(event, request)',
  'css/flexible-actions.css?v=1.0'
], 'service worker');

await expectText('js/number-normalizer.js?v=1.0', [
  'RESTBR_TO_ENGLISH_DIGITS',
  'RESTBR_NUMERIC_FAST_PATH_V2',
  'data-restbr-native-number'
], 'numeric input normalizer');

await expectText('js/live-prices.js?v=1.0', [
  'PRICE_SYNC_INTERVAL_MS = 5 * 60 * 1000',
  'restbr-live-prices-v2',
  'syncInFlight'
], 'live price reconciliation');

await expectText('js/product-colors.js?v=1.0', [
  'syntheticOptionIndex',
  "from('product_colors')",
  'RESTBR_PRODUCT_COLORS'
], 'product color runtime');

await expectText('js/product-color-cart-meta.js?v=1.0', [
  'RESTBR_CART_COLOR_META_V1',
  'selectedColor',
  'RESTBR_CART_COLOR_META'
], 'cart color metadata bridge');

await expectText('js/order-submit.js?v=1.0', [
  "db.rpc('submit_order', { p_payload: payload })",
  'RESTBR_PENDING_ORDER_V1',
  'selected_color_id',
  'restbr:order-created',
  'RESTBR_CHECKOUT_LOCATION_V1'
], 'persisted checkout runtime');

await expectText('js/supabase-config.js', [
  "script.src = 'js/admin-orders.js?v=1.0'",
  'restbrAdminOrdersScript'
], 'admin orders loader');

await expectText('js/admin-orders.js?v=1.0', [
  "let currentStatus = 'new'",
  "['all','كل الحالات']",
  ".from('orders')",
  ".from('order_items')",
  "rpc('set_order_status'",
  "rpc('delete_order'",
  'selected_color_name',
  "timeZone:'Asia/Baghdad'",
  "channel('restbr-admin-orders-v1')"
], 'admin orders runtime');

await expectText('js/admin-order-print.js?v=1.0', [
  "from('orders')",
  "from('order_items')",
  "from('restaurant_settings')",
  '100mm 150mm',
  'A4 portrait',
  'selected_color_name',
  'filter:grayscale(1)',
  'RESTBR_PRINT_ORDER'
], 'admin invoice print runtime');

try {
  const { response, body } = await get('manifest.webmanifest', { json: true });
  if (!response.ok) fail('manifest', `HTTP ${response.status}`);
  else if (!String(body?.name || '').trim()) fail('manifest', 'app name is empty');
  else {
    ok('manifest');
    for (const icon of body.icons || []) await checkAsset(icon.src);
  }
} catch (error) {
  fail('manifest', error?.message || String(error));
}

const refs = new Set([
  ...localRefs(indexHtml),
  ...localRefs(adminHtml)
]);
for (const ref of refs) await checkAsset(ref);

console.log(`\nLive smoke summary: ${passed.length} passed, ${failures.length} failed`);
if (failures.length) {
  console.error('\nFailures:');
  failures.forEach(item => console.error(` - ${item}`));
  process.exit(1);
}

console.log('✓ RESTBR master live delivery smoke test passed');

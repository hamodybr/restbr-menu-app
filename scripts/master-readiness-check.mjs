import fs from 'node:fs';
import path from 'node:path';

const failures = [];
const passed = [];
const ok = message => { passed.push(message); console.log(`✓ ${message}`); };
const fail = message => failures.push(message);
const read = file => fs.readFileSync(file, 'utf8');
const exists = file => fs.existsSync(file) && fs.statSync(file).isFile();

function requireFile(file) {
  if (!exists(file)) fail(`missing required file: ${file}`);
  else ok(`required file exists: ${file}`);
}

function requireMarker(file, marker, label = marker) {
  if (!exists(file)) return fail(`${file}: file is missing`);
  if (!read(file).includes(marker)) fail(`${file}: missing ${label}`);
}

const manifestFile = 'restbr-release-manifest.json';
requireFile(manifestFile);

let manifest = null;
try {
  manifest = JSON.parse(read(manifestFile));
} catch (error) {
  fail(`${manifestFile}: invalid JSON (${error?.message || error})`);
}

if (manifest) {
  if (manifest.schema_version !== 1) fail('release manifest schema_version must be 1');
  if (manifest.model !== 'single-restaurant-copy') {
    fail('release manifest must keep the single-restaurant-copy model');
  } else {
    ok('release model is single restaurant per independent copy');
  }

  for (const file of manifest.database_install_order || []) requireFile(file);
  for (const file of manifest.critical_browser_files || []) requireFile(file);
  for (const file of manifest.required_validation_scripts || []) requireFile(file);
}

const expectedInstallOrder = [
  'supabase/bootstrap.sql',
  'supabase/migrations/20260911171000_generic_product_colors.sql',
  'supabase/migrations/20260911173000_order_persistence.sql',
  'supabase/migrations/20260911173100_order_hours_guard.sql',
  'supabase/migrations/20260911174000_admin_orders.sql'
];

if (manifest && JSON.stringify(manifest.database_install_order) !== JSON.stringify(expectedInstallOrder)) {
  fail('release manifest database_install_order changed from the tested canonical sequence');
} else if (manifest) {
  ok('canonical database install order is stable');
}

const setup = read('SETUP.md');
let previousPosition = -1;
for (const file of expectedInstallOrder) {
  const position = setup.indexOf(file);
  if (position < 0) {
    fail(`SETUP.md: missing install step ${file}`);
    continue;
  }
  if (position <= previousPosition) fail(`SETUP.md: install order is not canonical at ${file}`);
  previousPosition = position;
}
if (!failures.some(item => item.startsWith('SETUP.md: install'))) {
  ok('SETUP documents the canonical database install order');
}

for (const marker of [
  "restaurantName: 'Restaurant'",
  "supabaseUrl: 'https://YOUR_PROJECT_REF.supabase.co'",
  "supabasePublishableKey: 'YOUR_SUPABASE_PUBLISHABLE_KEY'",
  'enableUserManagement: false',
  'enableRestaurantReset: false'
]) requireMarker('js/runtime-config.js', marker);

for (const marker of [
  "db.rpc('submit_order', { p_payload: payload })",
  'client_token',
  'selected_color_id'
]) requireMarker('js/order-submit.js', marker);

for (const marker of [
  "let currentStatus = 'new'",
  "rpc('set_order_status'",
  "rpc('delete_order'",
  "channel('restbr-admin-orders-v1')"
]) requireMarker('js/admin-orders.js', marker);

for (const marker of [
  '100mm 150mm',
  'A4 portrait',
  'RESTBR_PRINT_ORDER',
  "from('orders')",
  "from('order_items')"
]) requireMarker('js/admin-order-print.js', marker);

const identityFiles = [
  'js/runtime-config.js',
  'manifest.webmanifest',
  'index.html'
];
const forbiddenRestaurantIdentities = /(?:pasha\s*baby|pashababyiq|shorash\s*rest|shorashrest)/i;
for (const file of identityFiles) {
  if (forbiddenRestaurantIdentities.test(read(file))) {
    fail(`${file}: contains a restaurant-specific production identity`);
  }
}
if (!identityFiles.some(file => forbiddenRestaurantIdentities.test(read(file)))) {
  ok('active storefront identity surfaces are restaurant-generic');
}

const browserFiles = [
  'index.html',
  'admin.html',
  ...fs.readdirSync('js')
    .filter(name => name.endsWith('.js'))
    .map(name => path.join('js', name))
];

const credentialPatterns = [
  /sb_secret_[A-Za-z0-9_-]{12,}/,
  /service_role\s*[:=]\s*['"][^'"]{16,}['"]/i,
  /['"]eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}['"]/
];
let credentialLeak = false;
for (const file of browserFiles) {
  const text = read(file);
  for (const pattern of credentialPatterns) {
    if (pattern.test(text)) {
      fail(`${file}: possible privileged/secret credential embedded in browser code`);
      credentialLeak = true;
      break;
    }
  }
}
if (!credentialLeak) ok('browser surfaces contain no obvious privileged Supabase credential');

const workflow = read('.github/workflows/pages.yml');
for (const marker of [
  'node scripts/predeploy-check.mjs',
  'node scripts/product-colors-check.mjs',
  'node scripts/order-persistence-check.mjs',
  'node scripts/admin-orders-check.mjs',
  'node scripts/invoice-print-check.mjs',
  'node scripts/master-readiness-check.mjs',
  'node scripts/live-smoke-test.mjs'
]) {
  if (!workflow.includes(marker)) fail(`pages workflow: missing ${marker}`);
}
if (!failures.some(item => item.startsWith('pages workflow:'))) {
  ok('CI contains the complete master validation chain');
}

const printRuntime = read('js/admin-order-print.js');
if (/\.(?:insert|update|delete|upsert)\s*\(/.test(printRuntime) || /\.rpc\s*\(/.test(printRuntime)) {
  fail('invoice print runtime must remain read-only');
} else {
  ok('invoice print runtime remains read-only');
}

if (failures.length) {
  console.error(`\nRESTBR master readiness failed: ${passed.length} passed, ${failures.length} failed`);
  failures.forEach(item => console.error(`  ✗ ${item}`));
  process.exit(1);
}

console.log(`\n✓ RESTBR master readiness passed: ${passed.length} checks`);

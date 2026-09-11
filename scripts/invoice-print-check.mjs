import fs from 'node:fs';

const failures = [];
const ok = message => console.log(`✓ ${message}`);
const fail = message => failures.push(message);
const read = file => fs.readFileSync(file, 'utf8');
const requireText = (file, marker, label = marker) => {
  const text = read(file);
  if (!text.includes(marker)) fail(`${file}: missing ${label}`);
};

const runtime = read('js/runtime-config.js');
const printer = read('js/admin-order-print.js');

for (const marker of [
  "script.src = 'js/admin-order-print.js?v=1.0'",
  'restbrAdminOrderPrintScript'
]) requireText('js/runtime-config.js', marker);

for (const marker of [
  "from('orders')",
  "from('order_items')",
  "from('restaurant_settings')",
  "timeZone:'Asia/Baghdad'",
  '100mm 150mm',
  'A4 portrait',
  'selected_color_name',
  'option_name',
  'delivery_fee',
  'filter:grayscale(1)',
  'window.open(',
  'printWindow.print()',
  'data-order-print',
  'RESTBR_PRINT_ORDER'
]) requireText('js/admin-order-print.js', marker);

const loaderPos = runtime.indexOf("js/admin-order-print.js?v=1.0");
const urlSafetyPos = runtime.indexOf("js/url-safety.js?v=1.4");
if (!(loaderPos >= 0 && urlSafetyPos > loaderPos)) {
  fail('js/runtime-config.js: admin print loader ordering is unstable');
} else {
  ok('admin print loader order is stable');
}

if (/\.(?:insert|update|delete|upsert)\s*\(/.test(printer) || /\.rpc\s*\(/.test(printer)) {
  fail('js/admin-order-print.js: printing runtime must remain read-only');
} else {
  ok('invoice printing runtime is read-only');
}

if (/service_role/i.test(printer)) {
  fail('js/admin-order-print.js: service_role must never appear in browser print code');
}

if (/pasha|shorash/i.test(`${runtime}\n${printer}`)) {
  fail('invoice print implementation must remain restaurant-generic');
} else {
  ok('invoice printing remains generic');
}

if (!/new MutationObserver\([\s\S]*observe\(card,\s*\{\s*childList:true\s*\}\)/m.test(printer)) {
  fail('js/admin-order-print.js: print action observer must stay scoped to the order modal card');
} else {
  ok('print observer is scoped to the order modal card');
}

if (failures.length) {
  console.error('\nRESTBR invoice print regression check failed:');
  failures.forEach(item => console.error(`  ✗ ${item}`));
  process.exit(1);
}

ok('generic invoice print regression check passed');

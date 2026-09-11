import fs from 'node:fs';

const failures = [];
const ok = message => console.log(`✓ ${message}`);
const fail = message => failures.push(message);
const read = file => fs.readFileSync(file, 'utf8');
const requireText = (file, marker, label = marker) => {
  const text = read(file);
  if (!text.includes(marker)) fail(`${file}: missing ${label}`);
};

const adminOrders = read('js/admin-orders.js');
const supabaseConfig = read('js/supabase-config.js');
const migration = read('supabase/migrations/20260911174000_admin_orders.sql');

requireText('js/supabase-config.js', "script.src = 'js/admin-orders.js?v=1.0'", 'admin orders loader');
requireText('js/supabase-config.js', 'restbrAdminOrdersScript', 'admin orders loader id');

for (const marker of [
  "let currentStatus = 'new'",
  "['new','جديد']",
  "['all','كل الحالات']",
  "new Set(['super_admin','owner','manager'])",
  "new Set(['super_admin','owner','manager','viewer'])",
  "new Set(['super_admin','owner'])",
  ".from('orders')",
  ".from('order_items')",
  "rpc('set_order_status'",
  "rpc('delete_order'",
  'selected_color_name',
  'selected_color_hex',
  'delivery_fee',
  "new Intl.DateTimeFormat('en-GB'",
  "timeZone:'Asia/Baghdad'",
  "channel('restbr-admin-orders-v1')",
  "navBtn.dataset.adminNav = 'orders'",
  "grid-template-columns:repeat(6,minmax(0,1fr))"
]) requireText('js/admin-orders.js', marker);

const allIndex = adminOrders.indexOf("['all','كل الحالات']");
const cancelledIndex = adminOrders.indexOf("['cancelled','ملغي']");
if (!(cancelledIndex >= 0 && allIndex > cancelledIndex)) {
  fail('js/admin-orders.js: all-status filter must remain last');
} else {
  ok('all-status filter remains last');
}

if (adminOrders.includes('new MutationObserver')) {
  fail('js/admin-orders.js: whole-dashboard MutationObserver must not be introduced');
} else {
  ok('admin orders has no MutationObserver polling layer');
}

const genericText = `${adminOrders}\n${supabaseConfig}`.toLowerCase();
if (genericText.includes('pasha')) fail('admin orders contains Pasha-specific naming');
if (genericText.includes('shorash')) fail('admin orders contains Shorash-specific naming');

for (const marker of [
  'create or replace function public.set_order_status',
  'create or replace function public.delete_order',
  'private.can_manage_orders()',
  "grant execute on function public.set_order_status(uuid,text) to authenticated",
  "grant execute on function public.delete_order(uuid) to authenticated",
  "alter publication supabase_realtime add table public.orders"
]) requireText('supabase/migrations/20260911174000_admin_orders.sql', marker);

if (/grant\s+[^;]*delete[^;]*on\s+public\.(?:orders|order_items)\s+to\s+(?:anon|authenticated)/i.test(migration)) {
  fail('admin orders migration must not grant broad DELETE rights on order tables');
} else {
  ok('order deletion remains RPC-gated');
}

if (/grant\s+[^;]*insert[^;]*on\s+public\.(?:orders|order_items)\s+to\s+anon/i.test(migration)) {
  fail('admin orders migration must not expose anonymous INSERT rights');
}

if (!/v_status not in\s*\([\s\S]*'new'[\s\S]*'confirmed'[\s\S]*'preparing'[\s\S]*'ready'[\s\S]*'delivering'[\s\S]*'completed'[\s\S]*'cancelled'[\s\S]*\)/m.test(migration)) {
  fail('admin orders migration: status allowlist is incomplete');
} else {
  ok('server status allowlist is complete');
}

if (failures.length) {
  console.error('\nRESTBR admin orders regression check failed:');
  failures.forEach(item => console.error(`  ✗ ${item}`));
  process.exit(1);
}

ok('generic admin orders regression check passed');

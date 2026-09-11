import fs from 'node:fs';

const failures = [];
const ok = message => console.log(`✓ ${message}`);
const fail = message => failures.push(message);
const read = file => fs.readFileSync(file, 'utf8');
const requireText = (file, marker, label = marker) => {
  const text = read(file);
  if (!text.includes(marker)) fail(`${file}: missing ${label}`);
};

const index = read('index.html');
const submit = read('js/order-submit.js');
const migration = read('supabase/migrations/20260911173000_order_persistence.sql');
const bootstrap = read('supabase/bootstrap.sql');
const sw = read('sw.js');

const cartPos = index.indexOf('js/cart.js?v=4.5');
const submitPos = index.indexOf('js/order-submit.js?v=1.0');
const stalePos = index.indexOf('js/cart-stale-item-guard.js?v=1.1');
if (!(cartPos >= 0 && submitPos > cartPos && stalePos > submitPos)) {
  fail('index.html: persisted checkout must load after cart.js and before stale-cart guard');
} else {
  ok('persisted checkout script order is stable');
}

for (const marker of [
  "db.rpc('submit_order', { p_payload: payload })",
  'RESTBR_PENDING_ORDER_V1',
  'client_token',
  'selected_color_id',
  'RESTBR_ORDER_MODE',
  'clearCartAfterSuccess()',
  "event.target.closest?.('#smSendWhatsApp')",
  'RESTBR_CHECKOUT_LOCATION_V1',
  'delivery_fee',
  "window.dispatchEvent(new CustomEvent('restbr:order-created'"
]) requireText('js/order-submit.js', marker);

if (/\b(?:price|unit_price|line_total|subtotal|total)\s*:\s*row/i.test(submit)) {
  fail('js/order-submit.js: checkout payload must not trust client price/totals');
} else {
  ok('checkout payload does not submit client prices');
}

for (const marker of [
  'create or replace function public.submit_order(p_payload jsonb)',
  'security definer',
  'orders_client_token_uidx',
  'v_discount_percent := coalesce(v_discount_percent, 0);',
  "coalesce(v_option.takeaway_price, v_option.price)",
  "d.scope_type = 'product'",
  "d.scope_type = 'category'",
  "d.scope_type = 'restaurant'",
  'selected_color_id',
  'selected_color_name',
  'selected_color_hex',
  'selected_color_image_url',
  "grant execute on function public.submit_order(jsonb) to anon, authenticated",
  "raise exception 'A product is not available'",
  'private.restbr_time_window_open',
  'delivery_fee numeric not null default 0'
]) requireText('supabase/migrations/20260911173000_order_persistence.sql', marker);

if (/grant\s+[^;]*insert[^;]*on\s+public\.(?:orders|order_items)\s+to\s+anon/i.test(migration)) {
  fail('order persistence migration must not grant direct anonymous INSERT on order tables');
} else {
  ok('anonymous checkout is RPC-only; no direct order INSERT grant');
}

for (const marker of [
  'grant select, update on public.orders to authenticated;',
  'grant select on public.order_items to authenticated;'
]) requireText('supabase/bootstrap.sql', marker);

if (/grant\s+[^;]*insert[^;]*on\s+public\.(?:orders|order_items)\s+to\s+anon/i.test(bootstrap)) {
  fail('bootstrap.sql: direct anonymous order INSERT permission must stay disabled');
} else {
  ok('bootstrap keeps order tables private from anonymous inserts');
}

for (const marker of [
  'restbr-restaurant-template-v8',
  './js/order-submit.js?v=1.0'
]) requireText('sw.js', marker);

if (sw.includes('restbr-restaurant-template-v7')) {
  fail('sw.js: stale cache v7 must not remain after persisted checkout release');
}

if (failures.length) {
  console.error('\nRESTBR order persistence regression check failed:');
  failures.forEach(item => console.error(`  ✗ ${item}`));
  process.exit(1);
}

ok('generic order persistence regression check passed');

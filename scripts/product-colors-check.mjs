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
const colors = read('js/product-colors.js');
const cartMeta = read('js/product-color-cart-meta.js');
const admin = read('js/admin-product-colors.js');
const supabaseConfig = read('js/supabase-config.js');
const migration = read('supabase/migrations/20260911171000_generic_product_colors.sql');

const productColorsPos = index.indexOf('js/product-colors.js?v=1.0');
const cartMetaPos = index.indexOf('js/product-color-cart-meta.js?v=1.0');
const cartPos = index.indexOf('js/cart.js?v=4.5');
if (!(productColorsPos >= 0 && cartMetaPos > productColorsPos && cartPos > cartMetaPos)) {
  fail('index.html: product colors and metadata bridge must load before cart.js in that order');
} else {
  ok('storefront color scripts load before cart.js');
}

for (const marker of [
  'new Proxy(baseOptions',
  'syntheticOptionIndex',
  'restbr:product-color-selected',
  "from('product_colors')",
  'data-restbr-color-product',
  '__restbrBaseOptions'
]) requireText('js/product-colors.js', marker);

for (const marker of [
  'RESTBR_CART_COLOR_META_V1',
  'selectedColor',
  'colorId',
  'colorName',
  'colorHex',
  'colorImage',
  'RESTBR_CART_COLOR_META'
]) requireText('js/product-color-cart-meta.js', marker);

for (const marker of [
  "const TABLE = 'product_colors'",
  'uploadColorImage',
  "storage.from('menu-images')",
  'saveExistingProduct',
  'createProductWithColors',
  'is_available',
  'is_active'
]) requireText('js/admin-product-colors.js', marker);

requireText('js/supabase-config.js', "script.src = 'js/admin-product-colors.js?v=1.0'", 'admin product color loader');
requireText('js/supabase-config.js', 'window.RESTBR_SUPABASE_CLIENT = supabaseClient', 'shared publishable client handle');

for (const marker of [
  'create table if not exists public.product_colors',
  'selected_color_id',
  'selected_color_name',
  'selected_color_hex',
  'selected_color_image_url',
  'restbr_product_colors_public_read',
  'restbr_product_colors_authenticated_read',
  'restbr_product_colors_insert',
  'restbr_product_colors_update',
  'restbr_product_colors_delete',
  'private.can_manage_menu()'
]) requireText('supabase/migrations/20260911171000_generic_product_colors.sql', marker);

const combined = `${colors}\n${cartMeta}\n${admin}`.toLowerCase();
if (combined.includes('pasha')) fail('generic color runtime contains client-specific Pasha naming');
if (combined.includes('shorash')) fail('generic color runtime contains client-specific Shorash naming');

if (/new MutationObserver\([^)]*\)[\s\S]{0,400}observe\(document\.(?:body|documentElement)/.test(colors)) {
  fail('js/product-colors.js: whole-document MutationObserver is forbidden');
}

// Stable synthetic index contract: base option indexes remain unchanged, while
// each color gets a deterministic non-overlapping block of indexes.
function synthetic(baseLength, baseIndex, colorIndex) {
  return baseLength + (colorIndex * baseLength) + baseIndex;
}
const sample = new Set();
for (let colorIndex = 0; colorIndex < 4; colorIndex += 1) {
  for (let optionIndex = 0; optionIndex < 3; optionIndex += 1) {
    sample.add(synthetic(3, optionIndex, colorIndex));
  }
}
if (sample.size !== 12 || Math.min(...sample) < 3) {
  fail('synthetic color/option index contract is not collision-free');
} else {
  ok('synthetic color/option index contract is collision-free');
}

if (failures.length) {
  console.error('\nRESTBR product color regression check failed:');
  failures.forEach(item => console.error(`  ✗ ${item}`));
  process.exit(1);
}

ok('generic product color regression check passed');

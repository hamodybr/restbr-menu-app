import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const notes = [];

const fail = message => failures.push(message);
const note = message => notes.push(message);
const exists = file => fs.existsSync(path.join(root, file));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const stripQuery = value => String(value || '').split('#')[0].split('?')[0];
const isExternal = value => /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|data:|blob:)/i.test(String(value || ''));

function walk(dir, predicate = () => true) {
  if (!exists(dir)) return [];
  const output = [];
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const relative = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) output.push(...walk(relative, predicate));
    else if (predicate(relative)) output.push(relative);
  }
  return output;
}

function checkLocalRef(ref, source, base = '') {
  if (!ref || isExternal(ref) || ref.includes('${') || ref.includes('{{')) return;
  const clean = stripQuery(ref).replace(/^\.\//, '');
  if (!clean || clean.startsWith('../')) return;
  const resolved = path.posix.normalize(path.posix.join(base, clean));
  if (!resolved.startsWith('..') && !exists(resolved)) {
    fail(`${source}: missing local asset ${ref}`);
  }
}

function requireText(file, marker, label = marker) {
  if (!exists(file)) {
    fail(`${file}: missing file`);
    return;
  }
  if (!read(file).includes(marker)) fail(`${file}: missing ${label}`);
}

// 1) Browser/service-worker/scripts syntax.
const syntaxFiles = [
  ...walk('js', file => file.endsWith('.js')),
  ...walk('scripts', file => file.endsWith('.mjs')),
  'sw.js'
].filter((file, index, list) => list.indexOf(file) === index && exists(file));

for (const file of syntaxFiles) {
  try {
    execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'pipe' });
  } catch (error) {
    fail(`${file}: JavaScript syntax check failed\n${String(error?.stderr || error?.message || error)}`);
  }
}
note(`JavaScript syntax checked: ${syntaxFiles.length} files`);

// 1b) Numeric-input behavior must stay compatible with Arabic/Persian keyboards
// and the iPhone text-backed number-field workaround.
if (exists('scripts/numeric-input-check.mjs')) {
  try {
    execFileSync(process.execPath, [path.join(root, 'scripts/numeric-input-check.mjs')], { stdio: 'pipe' });
    note('Localized numeric input regression check passed');
  } catch (error) {
    fail(`scripts/numeric-input-check.mjs: behavior check failed\n${String(error?.stderr || error?.message || error)}`);
  }
} else {
  fail('scripts/numeric-input-check.mjs: missing numeric input regression check');
}

// 2) Manifest validity and local icons.
try {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  if (!String(manifest.name || '').trim()) fail('manifest.webmanifest: app name is empty');
  if (!Array.isArray(manifest.icons) || manifest.icons.length < 1) {
    fail('manifest.webmanifest: no icons configured');
  }
  for (const icon of manifest.icons || []) checkLocalRef(icon.src, 'manifest.webmanifest');
} catch (error) {
  fail(`manifest.webmanifest: invalid JSON (${error.message})`);
}

// 3) Local HTML references must exist.
for (const file of ['index.html', 'admin.html']) {
  if (!exists(file)) {
    fail(`${file}: missing`);
    continue;
  }
  const html = read(file);
  for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) {
    checkLocalRef(match[1], file);
  }
}

// 4) Local CSS url(...) references must exist.
for (const file of walk('css', file => file.endsWith('.css'))) {
  const css = read(file);
  const base = path.posix.dirname(file);
  for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    const ref = match[1].trim();
    if (!ref || isExternal(ref) || ref.includes('${') || ref.includes('{{')) continue;
    checkLocalRef(ref, file, base);
  }
}

// 5) Service-worker cache entries cannot point to missing files.
const sw = read('sw.js');
if (!/restbr-restaurant-template-v\d+/.test(sw)) {
  fail('sw.js: generic RESTBR cache namespace is missing');
}
for (const match of sw.matchAll(/["']\.\/([^"']+)["']/g)) {
  const ref = match[1];
  if (!ref || ref === 'index.html') continue;
  checkLocalRef(ref, 'sw.js');
}
requireText('sw.js', './js/url-safety.js?v=1.4', 'current URL safety cache entry');
requireText('sw.js', './css/flexible-actions.css?v=1.0', 'generic flexible actions cache entry');
requireText('sw.js', './js/number-normalizer.js?v=1.0', 'generic number normalizer cache entry');
requireText('sw.js', 'staleWhileRevalidate(event, request)', 'stale-while-revalidate public asset strategy');

// 6) Flexible actions/socials must exist from DB -> admin -> storefront.
for (const marker of ['custom_social_links', 'custom_top_actions', 'custom_footer_actions']) {
  requireText('supabase/bootstrap.sql', marker, `${marker} schema field`);
}
for (const marker of ['customSocialLinksDraft', 'customTopActionsDraft', 'customFooterActionsDraft']) {
  requireText('admin.html', marker, `${marker} dashboard manager`);
}
for (const marker of ['customSocialLinks', 'customTopActions', 'customFooterActions']) {
  requireText('js/app.js', marker, `${marker} storefront renderer`);
}
requireText('js/app.js', 'sm-custom-footer-action', 'custom footer action class');
requireText('js/app.js', 'sm-custom-social-link', 'custom social link class');
requireText('css/flexible-actions.css', 'repeat(auto-fit,minmax(110px,1fr))', 'responsive top action layout');
requireText('css/flexible-actions.css', 'repeat(4,minmax(0,1fr))', 'equal social columns');

// 7) URL safety/normalization invariants learned from production usage.
for (const marker of [
  'RESTBR_NORMALIZE_CONFIGURED_URL',
  'PHONE_SHORTHAND',
  'WEB_SHORTHAND',
  'RESTBR_SAFE_CONFIGURED_URL',
  'sm-custom-footer-action',
  'sm-custom-social-link'
]) {
  requireText('js/url-safety.js', marker, marker);
}
requireText('index.html', 'js/url-safety.js?v=1.4', 'current URL safety script version');
requireText('js/runtime-config.js', "script.src = 'js/url-safety.js?v=1.4'", 'runtime URL safety fallback version');

// 7b) Generic iPhone number normalization must stay wired into admin without a
// whole-dashboard MutationObserver.
for (const marker of [
  'RESTBR_TO_ENGLISH_DIGITS',
  'RESTBR_NORMALIZE_NUMERIC_INPUT',
  'RESTBR_IOS_NUMERIC_FALLBACK_ACTIVE',
  'RESTBR_NUMERIC_FAST_PATH_V2',
  'data-restbr-native-number'
]) {
  requireText('js/number-normalizer.js', marker, marker);
}
requireText('js/runtime-config.js', "script.src = 'js/number-normalizer.js?v=1.0'", 'admin number-normalizer loader');
if (read('js/number-normalizer.js').includes('MutationObserver')) {
  fail('js/number-normalizer.js: global MutationObserver must not be reintroduced');
}

// 7c) Live prices: Realtime first, one paginated reconciliation, no 30-second
// full-table polling, and no reconciliation while the page is hidden/offline.
for (const marker of [
  'PRICE_SYNC_INTERVAL_MS = 5 * 60 * 1000',
  'syncInFlight',
  '.range(from, from + PAGE_SIZE - 1)',
  "document.visibilityState !== 'visible'",
  "channel('restbr-live-prices-v2')"
]) {
  requireText('js/live-prices.js', marker, marker);
}
if (read('js/live-prices.js').includes('setInterval(syncAllPrices, 30000)')) {
  fail('js/live-prices.js: 30-second full-price polling was reintroduced');
}

// 8) No privileged Supabase credentials may ship to the browser.
const browserFiles = [
  'index.html',
  'admin.html',
  ...walk('js', file => file.endsWith('.js'))
];
for (const file of browserFiles) {
  const text = read(file);
  if (/sb_secret_[A-Za-z0-9_-]{10,}/.test(text)) {
    fail(`${file}: Supabase secret key detected`);
  }
  if (/SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+["']/i.test(text)) {
    fail(`${file}: service-role key assignment detected`);
  }
  for (const match of text.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
    try {
      const payload = match[0].split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
      if (decoded?.role === 'service_role') fail(`${file}: legacy service_role JWT detected`);
    } catch (_) {}
  }
}

// 9) Keep the master reusable; placeholder Supabase values are expected here.
requireText('js/runtime-config.js', "restaurantName: 'Restaurant'", 'generic restaurant identity');
requireText('js/runtime-config.js', "supabaseUrl: 'https://YOUR_PROJECT_REF.supabase.co'", 'Supabase project placeholder');
requireText('js/runtime-config.js', "supabasePublishableKey: 'YOUR_SUPABASE_PUBLISHABLE_KEY'", 'Supabase publishable-key placeholder');

// 10) CI supply-chain actions must stay pinned to immutable SHAs.
if (exists('.github/workflows/pages.yml')) {
  const workflow = read('.github/workflows/pages.yml');
  if (/uses:\s*actions\/[\w-]+@v\d+/i.test(workflow)) {
    fail('.github/workflows/pages.yml: GitHub Actions must be pinned to commit SHAs');
  }
}

for (const message of notes) console.log(`✓ ${message}`);
if (failures.length) {
  console.error('\nRESTBR master pre-deploy audit failed:');
  failures.forEach(item => console.error(`  ✗ ${item}`));
  process.exit(1);
}

console.log('✓ RESTBR master pre-deploy audit passed');

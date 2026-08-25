(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;
  if (window.__RESTBR_RESTAURANT_RESET_BACKUP_V1__) return;
  window.__RESTBR_RESTAURANT_RESET_BACKUP_V1__ = true;

  const BUCKET = 'menu-images';
  const GATE_KEY = 'RESTBR_RESET_BACKUP_GATE_V1';
  const GATE_TTL_MS = 15 * 60 * 1000;
  const JSZIP_URL = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
  const PAGE_SIZE = 1000;
  const STORAGE_PAGE_SIZE = 100;
  const DOWNLOAD_CONCURRENCY = 4;

  const TABLES = [
    ['categories', 'categories'],
    ['products', 'products'],
    ['product_options', 'product_options'],
    ['discounts', 'discounts'],
    ['orders', 'orders'],
    ['order_items', 'order_items'],
    ['menu_analytics_daily', 'menu_analytics_daily'],
    ['restaurant_settings', 'restaurant_settings'],
  ];

  const q = (selector, root = document) => root.querySelector(selector);
  const nf = new Intl.NumberFormat('ar-IQ');

  function allowed() {
    return document.body?.dataset?.adminRole === 'super_admin';
  }

  function formatBytes(value) {
    const n = Number(value || 0);
    if (!Number.isFinite(n) || n <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
    const v = n / Math.pow(1024, i);
    return `${v >= 10 || i === 0 ? v.toFixed(0) : v.toFixed(1)} ${units[i]}`;
  }

  function safeName(value) {
    return String(value || 'restaurant')
      .trim()
      .replace(/[^\p{L}\p{N}_-]+/gu, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'restaurant';
  }

  function fileDate() {
    return new Date().toISOString().replace(/[:.]/g, '-');
  }

  function setStatus(message, error = false) {
    const el = q('#restbrResetBackupStatus');
    if (!el) return;
    el.textContent = message || '';
    el.style.color = error ? '#fecaca' : '#a9a198';
  }

  function clearGate() {
    try { sessionStorage.removeItem(GATE_KEY); } catch (_) {}
    window.__RESTBR_RESET_BACKUP_GATE__ = null;
    renderGate(null);
  }

  function saveGate(gate) {
    try { sessionStorage.setItem(GATE_KEY, JSON.stringify(gate)); } catch (_) {}
    window.__RESTBR_RESET_BACKUP_GATE__ = gate;
    renderGate(gate);
  }

  function readGate() {
    try {
      const raw = sessionStorage.getItem(GATE_KEY);
      if (!raw) return null;
      const gate = JSON.parse(raw);
      if (!gate?.ok || !gate?.expires_at || Date.now() >= Number(gate.expires_at)) {
        sessionStorage.removeItem(GATE_KEY);
        return null;
      }
      return gate;
    } catch (_) {
      return null;
    }
  }

  function renderGate(gate) {
    const el = q('#restbrResetBackupGate');
    if (!el) return;
    const valid = gate?.ok && Number(gate.expires_at) > Date.now();
    el.classList.toggle('ready', !!valid);
    if (!valid) {
      el.textContent = '🔒 بوابة Reset مقفلة — يلزم Full Backup ناجح';
      return;
    }
    const until = new Date(Number(gate.expires_at)).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });
    el.textContent = `✅ Full Backup ناجح — بوابة Reset جاهزة حتى ${until}`;
  }

  function installStyles() {
    if (q('#restbrResetBackupStyles')) return;
    const style = document.createElement('style');
    style.id = 'restbrResetBackupStyles';
    style.textContent = `
      #restbrResetBackupStep{display:grid;gap:10px;margin-top:12px;padding:12px;border:1px solid rgba(216,169,88,.18);border-radius:12px;background:rgba(216,169,88,.035)}
      #restbrResetBackupStep .restbr-backup-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
      #restbrResetBackupStep .restbr-backup-head strong{display:block;color:#efc46e;font-size:11px;margin-bottom:3px}
      #restbrResetBackupStep .restbr-backup-head span{display:block;color:#999188;font-size:9px;line-height:1.75}
      #restbrResetCreateFullBackup{border:1px solid rgba(134,239,172,.22);background:rgba(34,197,94,.08);color:#b7f7c9;border-radius:10px;padding:9px 12px;font:inherit;font-size:10px;font-weight:900;white-space:nowrap}
      #restbrResetCreateFullBackup:disabled{opacity:.5;cursor:not-allowed}
      #restbrResetBackupStatus{min-height:18px;color:#a9a198;font-size:9px;line-height:1.75;overflow-wrap:anywhere}
      #restbrResetBackupGate{padding:10px;border-radius:10px;border:1px solid rgba(248,113,113,.18);background:rgba(248,113,113,.045);color:#fecaca;font-size:9px;font-weight:800;line-height:1.7}
      #restbrResetBackupGate.ready{border-color:rgba(134,239,172,.18);background:rgba(34,197,94,.045);color:#b7f7c9}
      #restbrResetBackupFacts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
      #restbrResetBackupFacts div{padding:8px;border:1px solid rgba(255,255,255,.06);border-radius:9px;background:rgba(255,255,255,.02);display:grid;gap:2px}
      #restbrResetBackupFacts b{font-size:11px;color:#eee7df}
      #restbrResetBackupFacts span{font-size:8px;color:#8f877e}
      body.admin-light-theme #restbrResetBackupStep,
      #viewTools.admin-settings-light #restbrResetBackupStep{background:#fffaf2;border-color:rgba(104,74,34,.15)}
      body.admin-light-theme #restbrResetBackupFacts div,
      #viewTools.admin-settings-light #restbrResetBackupFacts div{background:#fff;border-color:rgba(104,74,34,.1)}
      body.admin-light-theme #restbrResetBackupFacts b,
      #viewTools.admin-settings-light #restbrResetBackupFacts b{color:#2c251e}
      @media(max-width:680px){#restbrResetBackupStep .restbr-backup-head{display:grid}#restbrResetCreateFullBackup{width:100%}#restbrResetBackupFacts{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function ensureUi() {
    const panel = q('#restbrResetPreviewPanel');
    const summary = q('#restbrResetSummary');
    if (!panel || !summary) return false;
    if (q('#restbrResetBackupStep')) return true;

    const box = document.createElement('div');
    box.id = 'restbrResetBackupStep';
    box.innerHTML = `
      <div class="restbr-backup-head">
        <div>
          <strong>الخطوة 4B — Full Backup إجباري قبل Reset</strong>
          <span>ينشئ ملف ZIP حقيقي يحتوي بيانات التهيئة ونسخة فعلية من ملفات الصور. لا يوجد زر حذف فعلي في هذه المرحلة.</span>
        </div>
        <button id="restbrResetCreateFullBackup" type="button">إنشاء Full Backup</button>
      </div>
      <div id="restbrResetBackupFacts">
        <div><b>كل بيانات التهيئة</b><span>الأقسام، الأصناف، الخيارات، الخصومات، الطلبات، العناصر، الإحصائيات والإعدادات</span></div>
        <div><b>ملفات Storage الفعلية</b><span>كل ملفات bucket: menu-images داخل ZIP</span></div>
        <div><b>تحقق قبل وبعد</b><span>إذا تغيّرت الأعداد أثناء النسخ يفشل الـBackup وتبقى بوابة Reset مقفلة</span></div>
      </div>
      <div id="restbrResetBackupStatus">جاهز لإنشاء النسخة الإلزامية.</div>
      <div id="restbrResetBackupGate">🔒 بوابة Reset مقفلة — يلزم Full Backup ناجح</div>
    `;
    summary.insertAdjacentElement('afterend', box);
    q('#restbrResetCreateFullBackup')?.addEventListener('click', () => void createResetBackup());
    renderGate(readGate());
    return true;
  }

  async function loadJsZip() {
    if (window.JSZip) return window.JSZip;
    const existing = q('#restbrResetJsZip');
    if (existing) {
      await new Promise((resolve, reject) => {
        if (window.JSZip) return resolve();
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', () => reject(new Error('فشل تحميل أداة ZIP.')), { once: true });
      });
      if (!window.JSZip) throw new Error('أداة ZIP غير متوفرة.');
      return window.JSZip;
    }

    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.id = 'restbrResetJsZip';
      script.src = JSZIP_URL;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('فشل تحميل أداة ZIP. تحقق من اتصال الإنترنت ثم أعد المحاولة.'));
      document.head.appendChild(script);
    });
    if (!window.JSZip) throw new Error('أداة ZIP لم تبدأ بشكل صحيح.');
    return window.JSZip;
  }

  async function getPreview() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient?.rpc) throw new Error('Supabase غير جاهز.');
    const { data, error } = await supabaseClient.rpc('restaurant_reset_preview');
    if (error) throw error;
    if (!data?.ok || data?.dry_run !== true) throw new Error(data?.error || 'تعذر قراءة معاينة التهيئة.');
    return data;
  }

  async function fetchAllRows(table) {
    const rows = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabaseClient
        .from(table)
        .select('*')
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw new Error(`${table}: ${error.message || error}`);
      const page = Array.isArray(data) ? data : [];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
    return rows;
  }

  async function fetchAllData() {
    const output = {};
    for (const [table] of TABLES) {
      setStatus(`جاري نسخ جدول ${table}...`);
      output[table] = await fetchAllRows(table);
    }
    return output;
  }

  async function listStorageFiles() {
    const files = [];

    async function walk(path = '') {
      for (let offset = 0; ; offset += STORAGE_PAGE_SIZE) {
        const { data, error } = await supabaseClient.storage
          .from(BUCKET)
          .list(path, {
            limit: STORAGE_PAGE_SIZE,
            offset,
            sortBy: { column: 'name', order: 'asc' },
          });
        if (error) throw new Error(`Storage list ${path || '/'}: ${error.message || error}`);
        const page = Array.isArray(data) ? data : [];
        for (const item of page) {
          const fullPath = path ? `${path}/${item.name}` : item.name;
          if (item?.id == null) {
            await walk(fullPath);
          } else {
            files.push({
              path: fullPath,
              id: item.id,
              created_at: item.created_at || null,
              updated_at: item.updated_at || null,
              last_accessed_at: item.last_accessed_at || null,
              metadata: item.metadata || null,
              expected_size: Number(item?.metadata?.size || 0),
              mime_type: item?.metadata?.mimetype || item?.metadata?.contentType || null,
            });
          }
        }
        if (page.length < STORAGE_PAGE_SIZE) break;
      }
    }

    await walk('');
    return files;
  }

  function countsFromData(data, storageCount) {
    return {
      categories: data.categories?.length || 0,
      products: data.products?.length || 0,
      product_options: data.product_options?.length || 0,
      discounts: data.discounts?.length || 0,
      orders: data.orders?.length || 0,
      order_items: data.order_items?.length || 0,
      menu_analytics_daily: data.menu_analytics_daily?.length || 0,
      restaurant_settings: data.restaurant_settings?.length || 0,
      storage_files: Number(storageCount || 0),
    };
  }

  function assertCounts(preview, actual, label) {
    const expected = preview?.counts || {};
    for (const [, key] of TABLES) {
      const e = Number(expected[key] || 0);
      const a = Number(actual[key] || 0);
      if (e !== a) throw new Error(`${label}: عدد ${key} لا يطابق المعاينة (${a} بدل ${e}).`);
    }
    const storageExpected = Number(expected.storage_files || 0);
    const storageActual = Number(actual.storage_files || 0);
    if (storageExpected !== storageActual) {
      throw new Error(`${label}: عدد ملفات الصور لا يطابق المعاينة (${storageActual} بدل ${storageExpected}).`);
    }
  }

  function samePreviewCounts(a, b) {
    const keys = [...TABLES.map(([, key]) => key), 'storage_files'];
    return keys.every(key => Number(a?.counts?.[key] || 0) === Number(b?.counts?.[key] || 0));
  }

  async function sha256(value) {
    if (!window.crypto?.subtle) return null;
    const bytes = new TextEncoder().encode(String(value));
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(hash)].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  async function addStorageToZip(zip, storageFiles) {
    let done = 0;
    let bytes = 0;

    for (let start = 0; start < storageFiles.length; start += DOWNLOAD_CONCURRENCY) {
      const batch = storageFiles.slice(start, start + DOWNLOAD_CONCURRENCY);
      const downloaded = await Promise.all(batch.map(async file => {
        const publicUrl = supabaseClient.storage.from(BUCKET).getPublicUrl(file.path)?.data?.publicUrl;
        if (!publicUrl) throw new Error(`تعذر إنشاء رابط الملف: ${file.path}`);
        const response = await fetch(publicUrl, { cache: 'no-store' });
        if (!response.ok) throw new Error(`فشل تنزيل ${file.path} (${response.status}).`);
        const blob = await response.blob();
        if (file.expected_size > 0 && blob.size !== file.expected_size) {
          throw new Error(`حجم الملف ${file.path} غير مطابق (${blob.size} بدل ${file.expected_size}).`);
        }
        return { file, blob };
      }));

      for (const { file, blob } of downloaded) {
        zip.file(`storage/${BUCKET}/${file.path}`, blob, { binary: true, compression: 'STORE' });
        bytes += blob.size;
        done += 1;
      }
      setStatus(`جاري نسخ الصور داخل ZIP... ${nf.format(done)} / ${nf.format(storageFiles.length)} — ${formatBytes(bytes)}`);
    }

    return { files: done, bytes };
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function createResetBackup() {
    if (!allowed()) return;
    const button = q('#restbrResetCreateFullBackup');
    if (button) button.disabled = true;
    clearGate();

    try {
      setStatus('1/7 — جاري قراءة معاينة 4A الحالية...');
      const previewStart = await getPreview();

      setStatus('2/7 — جاري قراءة كل جداول البيانات...');
      const data = await fetchAllData();

      setStatus('3/7 — جاري فهرسة ملفات الصور...');
      const storageFiles = await listStorageFiles();
      const actualCounts = countsFromData(data, storageFiles.length);
      assertCounts(previewStart, actualCounts, 'فشل التحقق الأول');

      setStatus(`4/7 — جاري تجهيز ZIP (${nf.format(storageFiles.length)} ملف صورة)...`);
      const JSZip = await loadJsZip();
      const zip = new JSZip();

      const backupId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const createdAt = new Date().toISOString();
      const restaurant = previewStart?.restaurant || {};

      const manifest = {
        format: 'RESTBR_RESET_FULL_BACKUP',
        version: 1,
        backup_id: backupId,
        created_at: createdAt,
        scope: 'restaurant_reset_full',
        restaurant,
        source_preview: previewStart,
        counts: actualCounts,
        protected: {
          admin_users: Number(previewStart?.counts?.admin_users || 0),
          note: 'admin_users are protected from restaurant reset and are intentionally not exported in this reset backup.',
        },
        restore_order: [
          'restaurant_settings',
          'categories',
          'products',
          'product_options',
          'discounts',
          'orders',
          'order_items',
          'menu_analytics_daily',
          `storage/${BUCKET}`,
        ],
        storage: {
          bucket: BUCKET,
          files: storageFiles.map(({ expected_size, ...file }) => ({ ...file, size: expected_size })),
        },
        data,
      };

      zip.file('backup.json', JSON.stringify(manifest, null, 2), { compression: 'DEFLATE', compressionOptions: { level: 6 } });

      setStatus('5/7 — جاري تنزيل ملفات Storage وإضافتها للنسخة...');
      const storageResult = await addStorageToZip(zip, storageFiles);
      if (storageResult.files !== storageFiles.length) throw new Error('لم يتم نسخ كل ملفات Storage.');

      setStatus('6/7 — جاري التحقق أن بيانات المطعم لم تتغير أثناء النسخ...');
      const previewEnd = await getPreview();
      if (!samePreviewCounts(previewStart, previewEnd)) {
        throw new Error('تغيّرت أعداد بيانات المطعم أثناء إنشاء النسخة. أعد تشغيل Full Backup للحصول على نسخة متسقة.');
      }
      assertCounts(previewEnd, actualCounts, 'فشل التحقق النهائي');

      manifest.completed_at = new Date().toISOString();
      manifest.storage.downloaded_files = storageResult.files;
      manifest.storage.downloaded_bytes = storageResult.bytes;
      manifest.verification = {
        start_end_counts_match: true,
        table_counts_match_preview: true,
        storage_file_count_matches_preview: true,
        storage_files_downloaded: storageResult.files,
        storage_bytes_downloaded: storageResult.bytes,
      };
      const signatureSource = JSON.stringify({
        backup_id: backupId,
        counts: actualCounts,
        storage_bytes: storageResult.bytes,
        created_at: createdAt,
      });
      manifest.verification.sha256 = await sha256(signatureSource);
      zip.file('backup.json', JSON.stringify(manifest, null, 2), { compression: 'DEFLATE', compressionOptions: { level: 6 } });

      setStatus('7/7 — جاري إنشاء ملف ZIP النهائي...');
      const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' }, metadata => {
        if (metadata?.percent != null) setStatus(`7/7 — ضغط وتجهيز ZIP... ${Math.round(metadata.percent)}%`);
      });
      if (!blob || blob.size <= 0) throw new Error('تم إنشاء ملف Backup فارغ.');

      const restaurantName = restaurant.name_ar || restaurant.name_ku || restaurant.name_en || 'restaurant';
      const filename = `${safeName(restaurantName)}-RESET-FULL-${fileDate()}.zip`;
      triggerDownload(blob, filename);

      const gate = {
        ok: true,
        version: 1,
        backup_id: backupId,
        filename,
        created_at: createdAt,
        completed_at: manifest.completed_at,
        expires_at: Date.now() + GATE_TTL_MS,
        counts: actualCounts,
        storage_bytes: storageResult.bytes,
        zip_bytes: blob.size,
        verification_sha256: manifest.verification.sha256,
      };
      saveGate(gate);
      setStatus(`Full Backup ناجح ✓ — ${nf.format(storageResult.files)} صورة، ${formatBytes(storageResult.bytes)} ملفات، حجم ZIP ${formatBytes(blob.size)}. تم تنزيل ${filename}`);

      window.dispatchEvent(new CustomEvent('restbr:reset-backup-ready', { detail: gate }));
    } catch (error) {
      console.error('RESTBR RESET FULL BACKUP ERROR:', error);
      clearGate();
      setStatus('فشل Full Backup — بوابة Reset بقيت مقفلة: ' + String(error?.message || error || ''), true);
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function init() {
    installStyles();
    if (!ensureUi()) {
      setTimeout(init, 150);
      return;
    }
    const role = document.body?.dataset?.adminRole || '';
    if (!role) {
      setTimeout(init, 150);
      return;
    }
    const box = q('#restbrResetBackupStep');
    if (!allowed()) {
      if (box) box.style.display = 'none';
      clearGate();
      return;
    }
    if (box) box.style.display = '';
    renderGate(readGate());
  }

  window.RestBrResetBackup = {
    create: createResetBackup,
    readGate,
    clearGate,
    gateKey: GATE_KEY,
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else void init();
})();

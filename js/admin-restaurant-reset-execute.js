(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;
  if (window.__RESTBR_RESTAURANT_RESET_EXECUTE_V1__) return;
  window.__RESTBR_RESTAURANT_RESET_EXECUTE_V1__ = true;

  const BUCKET = 'menu-images';
  const PENDING_KEY = 'RESTBR_RESET_STORAGE_CLEANUP_PENDING_V1';
  const COUNTDOWN_SECONDS = 10;
  const STORAGE_PAGE_SIZE = 100;
  const REMOVE_BATCH_SIZE = 100;
  const q = (s, r = document) => r.querySelector(s);
  const nf = new Intl.NumberFormat('ar-IQ');
  const countKeys = [
    'categories', 'products', 'product_options', 'discounts',
    'orders', 'order_items', 'menu_analytics_daily',
    'restaurant_settings', 'storage_files'
  ];

  let currentPreview = null;
  let challenge = null;
  let countdownTimer = null;
  let countdownLeft = 0;

  function allowed() {
    return document.body?.dataset?.adminRole === 'super_admin';
  }

  function getGate() {
    try {
      if (window.RestBrResetBackup?.readGate) return window.RestBrResetBackup.readGate();
      const raw = sessionStorage.getItem('RESTBR_RESET_BACKUP_GATE_V1');
      if (!raw) return null;
      const gate = JSON.parse(raw);
      return gate?.ok && Number(gate.expires_at) > Date.now() ? gate : null;
    } catch (_) {
      return null;
    }
  }

  function clearBackupGate() {
    try {
      if (window.RestBrResetBackup?.clearGate) window.RestBrResetBackup.clearGate();
      else sessionStorage.removeItem('RESTBR_RESET_BACKUP_GATE_V1');
    } catch (_) {}
  }

  function readPending() {
    try {
      const raw = sessionStorage.getItem(PENDING_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  function savePending(value) {
    try {
      if (value) sessionStorage.setItem(PENDING_KEY, JSON.stringify(value));
      else sessionStorage.removeItem(PENDING_KEY);
    } catch (_) {}
  }

  function setStatus(message, error = false) {
    const el = q('#restbrResetExecuteStatus');
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('error', !!error);
  }

  function installStyles() {
    if (q('#restbrResetExecuteStyles')) return;
    const style = document.createElement('style');
    style.id = 'restbrResetExecuteStyles';
    style.textContent = `
      #restbrResetExecuteStep{display:grid;gap:11px;margin-top:12px;padding:12px;border:1px solid rgba(248,113,113,.20);border-radius:12px;background:rgba(248,113,113,.025)}
      #restbrResetExecuteStep .r4c-title{display:grid;gap:3px}.r4c-title strong{font-size:12px;color:#fecaca}.r4c-title span{font-size:9px;color:#9d958c;line-height:1.75}
      .r4c-lock{padding:10px;border-radius:10px;border:1px solid rgba(248,113,113,.16);background:rgba(248,113,113,.04);color:#fecaca;font-size:9px;font-weight:800;line-height:1.7}
      .r4c-lock.ready{border-color:rgba(134,239,172,.18);background:rgba(34,197,94,.04);color:#b7f7c9}
      .r4c-check{display:flex;gap:8px;align-items:flex-start;padding:9px;border:1px solid rgba(255,255,255,.06);border-radius:9px;background:rgba(255,255,255,.02);font-size:9px;color:#b5ada4;line-height:1.7}.r4c-check input{margin-top:3px}
      .r4c-field{display:grid;gap:5px}.r4c-field label{font-size:9px;color:#aaa198}.r4c-field input{width:100%;border:1px solid rgba(255,255,255,.10);background:#080604;color:#f5f1ec;border-radius:9px;padding:10px;font:inherit;font-size:10px;outline:none}.r4c-field input:focus{border-color:rgba(239,196,110,.55)}
      #restbrResetArmBtn,#restbrResetFinalBtn,#restbrResetCleanupBtn{width:100%;border-radius:10px;padding:10px 12px;font:inherit;font-size:10px;font-weight:900}
      #restbrResetArmBtn{border:1px solid rgba(239,196,110,.25);background:rgba(216,169,88,.08);color:#efc46e}
      #restbrResetFinalBtn{border:1px solid rgba(248,113,113,.42);background:rgba(127,29,29,.30);color:#fecaca}
      #restbrResetCleanupBtn{border:1px solid rgba(251,191,36,.28);background:rgba(251,191,36,.07);color:#fcd34d}
      #restbrResetArmBtn:disabled,#restbrResetFinalBtn:disabled,#restbrResetCleanupBtn:disabled{opacity:.45;cursor:not-allowed}
      #restbrResetExecuteStatus{min-height:18px;color:#a9a198;font-size:9px;line-height:1.75;overflow-wrap:anywhere}#restbrResetExecuteStatus.error{color:#fecaca}
      #restbrResetFinalBox{display:grid;gap:9px;padding:11px;border:1px solid rgba(248,113,113,.24);border-radius:11px;background:rgba(127,29,29,.10)}
      #restbrResetFinalBox[hidden]{display:none}.r4c-phrase{direction:ltr;text-align:center;padding:9px;border-radius:9px;background:#050403;border:1px dashed rgba(248,113,113,.30);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:15px;font-weight:900;color:#fecaca;letter-spacing:.5px}
      .r4c-countdown{text-align:center;font-size:9px;color:#fca5a5}.r4c-result{padding:10px;border-radius:10px;border:1px solid rgba(134,239,172,.18);background:rgba(34,197,94,.04);color:#b7f7c9;font-size:9px;line-height:1.8}
      body.admin-light-theme #restbrResetExecuteStep,#viewTools.admin-settings-light #restbrResetExecuteStep{background:#fff8f6;border-color:rgba(153,27,27,.14)}
      body.admin-light-theme .r4c-field input,#viewTools.admin-settings-light .r4c-field input{background:#fff;color:#2c251e;border-color:rgba(104,74,34,.14)}
    `;
    document.head.appendChild(style);
  }

  function ensureUi() {
    if (q('#restbrResetExecuteStep')) return true;
    const backupStep = q('#restbrResetBackupStep');
    if (!backupStep) return false;

    const box = document.createElement('div');
    box.id = 'restbrResetExecuteStep';
    box.innerHTML = `
      <div class="r4c-title">
        <strong>الخطوة 4C — Reset فعلي محمي</strong>
        <span>هذه المرحلة قادرة على حذف بيانات المطعم نهائياً. لن يبدأ أي حذف إلا بعد Full Backup حديث، مطابقة الأعداد، Challenge قصير العمر، وعبارة تأكيد نهائية.</span>
      </div>
      <div id="restbrResetExecuteLock" class="r4c-lock">🔒 Reset مقفول</div>
      <label class="r4c-check"><input id="restbrResetBackupAck" type="checkbox"><span>أؤكد أن ملف Full Backup نزل عندي واحتفظت به قبل التهيئة.</span></label>
      <div class="r4c-field"><label id="restbrResetNameLabel">اكتب اسم المطعم الحالي كما يظهر أعلاه</label><input id="restbrResetNameConfirm" autocomplete="off" spellcheck="false"></div>
      <button id="restbrResetArmBtn" type="button" disabled>تجهيز التأكيد النهائي — لا يحذف شيئاً</button>
      <div id="restbrResetExecuteStatus">4C بانتظار Full Backup صالح.</div>
      <div id="restbrResetFinalBox" hidden>
        <div class="r4c-title"><strong>آخر بوابة قبل الحذف</strong><span>اكتب العبارة التالية حرفياً. الـChallenge ينتهي تلقائياً خلال 5 دقائق.</span></div>
        <div id="restbrResetPhrase" class="r4c-phrase">RESET</div>
        <div class="r4c-field"><label>عبارة التأكيد النهائية</label><input id="restbrResetPhraseConfirm" autocomplete="off" spellcheck="false" dir="ltr"></div>
        <div id="restbrResetCountdown" class="r4c-countdown"></div>
        <button id="restbrResetFinalBtn" type="button" disabled>تنفيذ التهيئة النهائية</button>
      </div>
      <button id="restbrResetCleanupBtn" type="button" hidden>إكمال تنظيف ملفات الصور فقط</button>
      <div id="restbrResetResult" hidden></div>
    `;
    backupStep.insertAdjacentElement('afterend', box);

    q('#restbrResetArmBtn')?.addEventListener('click', () => void prepareReset());
    q('#restbrResetFinalBtn')?.addEventListener('click', () => void executeReset());
    q('#restbrResetCleanupBtn')?.addEventListener('click', () => void retryCleanup());
    q('#restbrResetBackupAck')?.addEventListener('change', refreshControls);
    q('#restbrResetNameConfirm')?.addEventListener('input', refreshControls);
    q('#restbrResetPhraseConfirm')?.addEventListener('input', refreshFinalButton);
    return true;
  }

  function normalizedCounts(value) {
    const out = {};
    countKeys.forEach(key => out[key] = Number(value?.[key] ?? -1));
    return out;
  }

  function countsMatch(a, b) {
    const aa = normalizedCounts(a), bb = normalizedCounts(b);
    return countKeys.every(key => aa[key] === bb[key]);
  }

  async function getPreview() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient?.rpc) throw new Error('Supabase غير جاهز.');
    const { data, error } = await supabaseClient.rpc('restaurant_reset_preview');
    if (error) throw error;
    if (!data?.ok || data?.dry_run !== true) throw new Error('تعذر قراءة معاينة التهيئة.');
    return data;
  }

  function restaurantName(preview) {
    const r = preview?.restaurant || {};
    return String(r.name_ar || r.name_ku || r.name_en || '').trim();
  }

  function gateValid(gate) {
    return !!(gate?.ok && Number(gate.expires_at) > Date.now());
  }

  function refreshControls() {
    const gate = getGate();
    const pending = readPending();
    const lock = q('#restbrResetExecuteLock');
    const arm = q('#restbrResetArmBtn');
    const ack = q('#restbrResetBackupAck');
    const typed = String(q('#restbrResetNameConfirm')?.value || '').trim();
    const expectedName = restaurantName(currentPreview);

    if (pending?.database_reset) {
      if (lock) { lock.classList.remove('ready'); lock.textContent = '⚠️ قاعدة البيانات مهيأة — تنظيف Storage غير مكتمل'; }
      if (arm) arm.disabled = true;
      const cleanup = q('#restbrResetCleanupBtn');
      if (cleanup) cleanup.hidden = false;
      return;
    }

    const ready = gateValid(gate) && !!currentPreview && countsMatch(gate.counts, currentPreview.counts);
    if (lock) {
      lock.classList.toggle('ready', ready);
      lock.textContent = ready
        ? '✅ Full Backup صالح والأعداد مطابقة — يمكن تجهيز التأكيد النهائي'
        : '🔒 Reset مقفول — أنشئ Full Backup حديثاً ومطابقاً';
    }
    if (arm) arm.disabled = !(ready && ack?.checked && expectedName && typed === expectedName);
  }

  function clearCountdown() {
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = null;
    countdownLeft = 0;
  }

  function startCountdown() {
    clearCountdown();
    countdownLeft = COUNTDOWN_SECONDS;
    const el = q('#restbrResetCountdown');
    const tick = () => {
      if (el) el.textContent = countdownLeft > 0
        ? `زر التنفيذ يفتح بعد ${nf.format(countdownLeft)} ثوانٍ.`
        : 'انتهى عدّ الأمان. اكتب العبارة الصحيحة لتفعيل زر التنفيذ.';
      refreshFinalButton();
      if (countdownLeft <= 0) { clearCountdown(); return; }
      countdownLeft -= 1;
    };
    tick();
    countdownTimer = setInterval(tick, 1000);
  }

  function refreshFinalButton() {
    const btn = q('#restbrResetFinalBtn');
    if (!btn) return;
    const gate = getGate();
    const typed = String(q('#restbrResetPhraseConfirm')?.value || '').trim();
    const phrase = String(challenge?.confirmation_phrase || '');
    const challengeAlive = challenge?.expires_at && new Date(challenge.expires_at).getTime() > Date.now();
    btn.disabled = !(gateValid(gate) && challengeAlive && countdownLeft <= 0 && phrase && typed === phrase);
  }

  async function prepareReset() {
    const gate = getGate();
    if (!gateValid(gate)) { setStatus('انتهت صلاحية Full Backup. أنشئ Backup جديداً.', true); return; }

    const arm = q('#restbrResetArmBtn');
    if (arm) arm.disabled = true;
    challenge = null;
    q('#restbrResetFinalBox').hidden = true;
    setStatus('جاري التحقق مرة أخرى من البيانات وتجهيز Challenge آمن...');

    try {
      const preview = await getPreview();
      currentPreview = preview;
      if (!countsMatch(gate.counts, preview.counts)) throw new Error('تغيّرت البيانات بعد الـBackup. أنشئ Full Backup جديداً.');

      const expectedName = restaurantName(preview);
      const typedName = String(q('#restbrResetNameConfirm')?.value || '').trim();
      if (!expectedName || typedName !== expectedName) throw new Error('اسم المطعم المكتوب لا يطابق المطعم الحالي.');
      if (!q('#restbrResetBackupAck')?.checked) throw new Error('يجب تأكيد الاحتفاظ بملف Full Backup أولاً.');

      const { data, error } = await supabaseClient.rpc('restaurant_reset_prepare', {
        p_backup_id: gate.backup_id,
        p_expected_counts: gate.counts,
      });
      if (error) throw error;
      if (!data?.ok || !data?.armed || !data?.challenge_token) throw new Error('تعذر تجهيز Challenge.');

      challenge = data;
      q('#restbrResetPhrase').textContent = data.confirmation_phrase;
      q('#restbrResetPhraseConfirm').value = '';
      q('#restbrResetFinalBox').hidden = false;
      setStatus(`تم تجهيز Challenge بدون حذف أي شيء. صالح حتى ${new Date(data.expires_at).toLocaleTimeString('ar-IQ', {hour:'2-digit', minute:'2-digit', second:'2-digit'})}.`);
      startCountdown();
    } catch (error) {
      console.error('RESTBR RESET PREPARE ERROR:', error);
      setStatus('لم يتم فتح بوابة التنفيذ: ' + String(error?.message || error || ''), true);
    } finally {
      refreshControls();
    }
  }

  async function listStorageFiles() {
    const files = [];
    async function walk(path = '') {
      for (let offset = 0; ; offset += STORAGE_PAGE_SIZE) {
        const { data, error } = await supabaseClient.storage.from(BUCKET).list(path, {
          limit: STORAGE_PAGE_SIZE,
          offset,
          sortBy: { column: 'name', order: 'asc' },
        });
        if (error) throw error;
        const page = Array.isArray(data) ? data : [];
        for (const item of page) {
          const fullPath = path ? `${path}/${item.name}` : item.name;
          if (item?.id == null) await walk(fullPath);
          else files.push(fullPath);
        }
        if (page.length < STORAGE_PAGE_SIZE) break;
      }
    }
    await walk('');
    return files;
  }

  async function purgeStorage() {
    const files = await listStorageFiles();
    let deleted = 0;
    for (let i = 0; i < files.length; i += REMOVE_BATCH_SIZE) {
      const batch = files.slice(i, i + REMOVE_BATCH_SIZE);
      setStatus(`قاعدة البيانات تمت تهيئتها. جاري حذف ملفات الصور... ${nf.format(deleted)} / ${nf.format(files.length)}`);
      const { error } = await supabaseClient.storage.from(BUCKET).remove(batch);
      if (error) throw error;
      deleted += batch.length;
    }
    const remaining = await listStorageFiles();
    if (remaining.length) throw new Error(`بقي ${remaining.length} ملف في Storage.`);
    return { discovered: files.length, deleted };
  }

  async function executeReset() {
    const gate = getGate();
    const typed = String(q('#restbrResetPhraseConfirm')?.value || '').trim();
    if (!gateValid(gate) || !challenge?.challenge_token || typed !== challenge.confirmation_phrase) return;

    const finalText = `هذا آخر تأكيد.\n\nسيتم حذف بيانات المطعم الحالية ثم تنظيف كل ملفات الصور. حسابات الإدارة ستبقى محفوظة.\n\nهل تريد تنفيذ التهيئة الآن؟`;
    if (!confirm(finalText)) return;

    const btn = q('#restbrResetFinalBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'جاري تنفيذ التهيئة...'; }
    clearCountdown();
    setStatus('جاري تنفيذ Reset قاعدة البيانات داخل Transaction...');

    try {
      const { data, error } = await supabaseClient.rpc('restaurant_reset_execute', {
        p_challenge_token: challenge.challenge_token,
        p_confirmation: challenge.confirmation_phrase,
      });
      if (error) throw error;
      if (!data?.ok || !data?.database_reset) throw new Error('لم تؤكد قاعدة البيانات نجاح التهيئة.');

      savePending({
        database_reset: true,
        backup_id: data.backup_id || gate.backup_id,
        challenge_token: data.challenge_token,
        storage_expected: Number(data.storage_pending || 0),
        started_at: new Date().toISOString(),
      });
      clearBackupGate();
      challenge = null;
      q('#restbrResetFinalBox').hidden = true;

      const storage = await purgeStorage();
      const verify = await getPreview();
      const remainingDeleteTotal = Number(verify?.plan?.delete_total || 0);
      if (remainingDeleteTotal !== 0 || Number(verify?.counts?.storage_files || 0) !== 0) {
        throw new Error(`التحقق النهائي لم يصل للصفر. المتبقي: ${remainingDeleteTotal}.`);
      }

      savePending(null);
      currentPreview = verify;
      const result = q('#restbrResetResult');
      if (result) {
        result.hidden = false;
        result.className = 'r4c-result';
        result.textContent = `تمت تهيئة المطعم بنجاح ✓ حُذفت بيانات المطعم و ${nf.format(storage.deleted)} ملف صورة، وبقيت حسابات الإدارة محمية.`;
      }
      setStatus('اكتملت التهيئة والتحقق النهائي بنجاح. النظام جاهز لإعداد مطعم جديد.');
      q('#restbrResetCleanupBtn').hidden = true;
      q('#restbrResetBackupAck').checked = false;
      q('#restbrResetNameConfirm').value = '';
      refreshControls();
      window.dispatchEvent(new CustomEvent('restbr:restaurant-reset-complete', { detail: { database: data, storage } }));
    } catch (error) {
      console.error('RESTBR RESET EXECUTE ERROR:', error);
      const pending = readPending();
      if (pending?.database_reset) {
        setStatus('قاعدة البيانات تمت تهيئتها، لكن تنظيف Storage لم يكتمل: ' + String(error?.message || error || '') + ' استخدم زر «إكمال تنظيف ملفات الصور فقط».', true);
        q('#restbrResetCleanupBtn').hidden = false;
      } else {
        setStatus('فشل Reset قبل اكتمال التهيئة: ' + String(error?.message || error || '') + ' لم نبدأ تنظيف Storage.', true);
      }
    } finally {
      if (btn) btn.textContent = 'تنفيذ التهيئة النهائية';
      refreshControls();
    }
  }

  async function retryCleanup() {
    const pending = readPending();
    if (!pending?.database_reset) return;
    const btn = q('#restbrResetCleanupBtn');
    if (btn) btn.disabled = true;
    try {
      const storage = await purgeStorage();
      const verify = await getPreview();
      if (Number(verify?.counts?.storage_files || 0) !== 0 || Number(verify?.plan?.delete_total || 0) !== 0) {
        throw new Error('لا تزال هناك بيانات أو ملفات متبقية بعد محاولة التنظيف.');
      }
      savePending(null);
      currentPreview = verify;
      if (btn) btn.hidden = true;
      const result = q('#restbrResetResult');
      if (result) {
        result.hidden = false;
        result.className = 'r4c-result';
        result.textContent = `اكتمل تنظيف Storage بنجاح ✓ تم حذف ${nf.format(storage.deleted)} ملف متبقٍ.`;
      }
      setStatus('اكتملت التهيئة والتحقق النهائي بنجاح.');
    } catch (error) {
      setStatus('تعذر إكمال تنظيف Storage: ' + String(error?.message || error || ''), true);
    } finally {
      if (btn) btn.disabled = false;
      refreshControls();
    }
  }

  async function refreshPreview() {
    if (!allowed()) return;
    try {
      currentPreview = await getPreview();
      const name = restaurantName(currentPreview);
      const label = q('#restbrResetNameLabel');
      if (label) label.textContent = name ? `اكتب اسم المطعم الحالي حرفياً: ${name}` : 'اسم المطعم الحالي غير متوفر';
      refreshControls();
    } catch (error) {
      setStatus('تعذر تحديث حالة 4C: ' + String(error?.message || error || ''), true);
    }
  }

  async function init() {
    installStyles();
    if (!ensureUi()) { setTimeout(init, 150); return; }
    const role = document.body?.dataset?.adminRole || '';
    if (!role) { setTimeout(init, 150); return; }
    const box = q('#restbrResetExecuteStep');
    if (!allowed()) { if (box) box.style.display = 'none'; return; }
    if (box) box.style.display = '';

    const pending = readPending();
    if (pending?.database_reset) q('#restbrResetCleanupBtn').hidden = false;
    await refreshPreview();
    setInterval(() => {
      refreshControls();
      refreshFinalButton();
    }, 1000);
    window.addEventListener('restbr:reset-backup-ready', () => void refreshPreview());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => void init(), { once: true });
  else void init();
})();

(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;
  if (window.__RESTBR_RESET_FINGERPRINT_PATCH_V1__) return;
  window.__RESTBR_RESET_FINGERPRINT_PATCH_V1__ = true;

  const GATE_KEY = 'RESTBR_RESET_BACKUP_GATE_V1';
  const q = (s, r = document) => r.querySelector(s);

  function readGate() {
    try {
      const raw = sessionStorage.getItem(GATE_KEY);
      if (!raw) return null;
      const gate = JSON.parse(raw);
      return gate?.ok && Number(gate.expires_at) > Date.now() ? gate : null;
    } catch (_) {
      return null;
    }
  }

  function writeGate(gate) {
    try { sessionStorage.setItem(GATE_KEY, JSON.stringify(gate)); } catch (_) {}
  }

  function clearGate() {
    try {
      if (window.RestBrResetBackup?.clearGate) window.RestBrResetBackup.clearGate();
      else sessionStorage.removeItem(GATE_KEY);
    } catch (_) {}
  }

  function setBackupStatus(message, error = false) {
    const el = q('#restbrResetBackupStatus');
    if (!el) return;
    el.textContent = message || '';
    el.style.color = error ? '#fecaca' : '#a9a198';
  }

  function setExecuteStatus(message, error = false) {
    const el = q('#restbrResetExecuteStatus');
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('error', !!error);
  }

  function validFingerprint(value) {
    return /^[a-f0-9]{64}$/i.test(String(value || '').trim());
  }

  async function getPreview() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient?.rpc) {
      throw new Error('Supabase غير جاهز.');
    }
    const { data, error } = await supabaseClient.rpc('restaurant_reset_preview');
    if (error) throw error;
    if (!data?.ok || data?.dry_run !== true) throw new Error('تعذر قراءة معاينة التهيئة.');
    if (!validFingerprint(data?.state_fingerprint)) throw new Error('بصمة بيانات المطعم غير متوفرة.');
    return data;
  }

  async function createFingerprintBackup() {
    const button = q('#restbrResetCreateFullBackup');
    if (button) button.disabled = true;
    clearGate();
    setBackupStatus('جاري تثبيت بصمة البيانات قبل Full Backup...');

    try {
      const before = await getPreview();
      const fingerprint = String(before.state_fingerprint).toLowerCase();

      if (!window.RestBrResetBackup?.create) throw new Error('أداة Full Backup غير جاهزة.');
      await window.RestBrResetBackup.create();

      const gate = readGate();
      if (!gate?.ok) throw new Error('لم يكتمل Full Backup الأساسي بنجاح.');

      const after = await getPreview();
      const afterFingerprint = String(after.state_fingerprint || '').toLowerCase();
      if (fingerprint !== afterFingerprint) {
        throw new Error('تغيّر محتوى المطعم أثناء إنشاء النسخة. أعد Full Backup من جديد.');
      }

      gate.version = 2;
      gate.state_fingerprint = fingerprint;
      gate.fingerprint_verified_at = new Date().toISOString();
      writeGate(gate);

      setBackupStatus('Full Backup ناجح ✓ — تم تثبيت SHA-256 لمحتوى البيانات أيضًا.');
      window.dispatchEvent(new CustomEvent('restbr:reset-backup-fingerprint-ready', { detail: gate }));
    } catch (error) {
      console.error('RESTBR RESET FINGERPRINT BACKUP ERROR:', error);
      clearGate();
      setBackupStatus('فشل تثبيت بصمة Full Backup — Reset بقي مقفولاً: ' + String(error?.message || error || ''), true);
    } finally {
      if (button) button.disabled = false;
    }
  }

  function installRpcFingerprintBridge() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient?.rpc) {
      setTimeout(installRpcFingerprintBridge, 120);
      return;
    }
    if (supabaseClient.__RESTBR_RESET_FINGERPRINT_RPC_V1__) return;

    const originalRpc = supabaseClient.rpc.bind(supabaseClient);
    supabaseClient.rpc = (fn, args, options) => {
      if (fn === 'restaurant_reset_prepare') {
        const gate = readGate();
        args = {
          ...(args || {}),
          p_expected_fingerprint: validFingerprint(gate?.state_fingerprint)
            ? String(gate.state_fingerprint).toLowerCase()
            : '',
        };
      }
      return originalRpc(fn, args, options);
    };
    supabaseClient.__RESTBR_RESET_FINGERPRINT_RPC_V1__ = true;
  }

  document.addEventListener('click', event => {
    const backupButton = event.target.closest?.('#restbrResetCreateFullBackup');
    if (backupButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      void createFingerprintBackup();
      return;
    }

    const armButton = event.target.closest?.('#restbrResetArmBtn');
    if (armButton) {
      const gate = readGate();
      if (!validFingerprint(gate?.state_fingerprint)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setExecuteStatus('هذا الـFull Backup قديم ولا يحتوي بصمة محتوى. أنشئ Full Backup جديداً قبل تجهيز Reset.', true);
      }
    }
  }, true);

  installRpcFingerprintBridge();
})();

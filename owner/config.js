// RESTBR Owner Dashboard — public browser configuration.
// Supabase Publishable keys are intended for client-side use.
// NEVER put sb_secret / service_role / database passwords in this file.
window.RESTBR_OWNER_CONFIG = {
  supabaseUrl: "https://xdqewaapwhmqlfotaofg.supabase.co",
  publishableKey: "sb_publishable_dOGkocLtn1WVvrxmu6TnJQ_8qyPyV-T"
};

// ---------------------------------------------------------------------------
// Owner shell safety V1.1
// ---------------------------------------------------------------------------
// Several V2 extensions use the native HTML `hidden` attribute while their
// component CSS declares display:grid/flex. Author CSS can override the UA
// `[hidden]` rule, which caused extension sheets (Audit/Analytics/etc.) to
// appear immediately and block the whole dashboard. Keep hidden semantics
// authoritative across the Owner application.
(() => {
  const style = document.createElement('style');
  style.id = 'restbrOwnerHiddenGuard';
  style.textContent = '[hidden]{display:none!important}';
  document.head.appendChild(style);

  const params = new URLSearchParams(location.search);
  window.RESTBR_OWNER_TENANT_SLUG = String(params.get('tenant') || '').trim().toLowerCase();
  if(window.RESTBR_OWNER_TENANT_SLUG){
    try{localStorage.setItem('RESTBR_OWNER_LAST_TENANT',window.RESTBR_OWNER_TENANT_SLUG);}catch(_){}
  }
})();

// Load Owner V2 extensions only after the dashboard shell, Supabase CDN and
// legacy controller have finished booting. async=false preserves execution
// order and isolates the stable dashboard from extension failures.
window.addEventListener('load', () => {
  const load = (id, src) => {
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = false;
    script.onerror = () => console.error(`RESTBR Owner extension failed: ${src}`);
    document.body.appendChild(script);
  };

  load('restbrOwnerAuthV2Script', './auth-v2.js?v=2.1');
  load('restbrOwnerTenantRecoveryV2Script', './tenant-recovery-v2.js?v=2.0');
  load('restbrOwnerPermissionsV2Script', './permissions-v2.js?v=2.1');
  load('restbrOwnerV2Script', './owner-v2.js?v=2.1');
  load('restbrOwnerSettingsV2Script', './owner-settings-v2.js?v=2.1');
  load('restbrBulkPricingV2Script', './bulk-pricing-v2.js?v=2.1');
  load('restbrOwnerAnalyticsV2Script', './analytics-v2.js?v=2.1');
  load('restbrOwnerVisibilityV2Script', './visibility-v2.js?v=2.1');
  load('restbrOwnerAuditV2Script', './audit-v2.js?v=2.1');
  load('restbrOwnerQrV2Script', './qr-v2.js?v=2.1');
}, { once:true });

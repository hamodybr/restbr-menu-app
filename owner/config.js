// RESTBR Owner Dashboard — public browser configuration.
// Supabase Publishable keys are intended for client-side use.
// NEVER put sb_secret / service_role / database passwords in this file.
window.RESTBR_OWNER_CONFIG = {
  supabaseUrl: "https://xdqewaapwhmqlfotaofg.supabase.co",
  publishableKey: "sb_publishable_dOGkocLtn1WVvrxmu6TnJQ_8qyPyV-T"
};

(() => {
  const style = document.createElement('style');
  style.id = 'restbrOwnerHiddenGuard';
  style.textContent = '[hidden]{display:none!important}';
  document.head.appendChild(style);
  const params = new URLSearchParams(location.search);
  window.RESTBR_OWNER_TENANT_SLUG = String(params.get('tenant') || '').trim().toLowerCase();
  if(window.RESTBR_OWNER_TENANT_SLUG){try{localStorage.setItem('RESTBR_OWNER_LAST_TENANT',window.RESTBR_OWNER_TENANT_SLUG);}catch(_){} }
})();

window.addEventListener('load', () => {
  const load = (id, src) => {
    if (document.getElementById(id)) return;
    const script = document.createElement('script');script.id=id;script.src=src;script.async=false;
    script.onerror=()=>console.error(`RESTBR Owner extension failed: ${src}`);
    document.body.appendChild(script);
  };
  load('restbrOwnerAuthV2Script','./auth-v2.js?v=2.1');
  load('restbrOwnerTenantRecoveryV2Script','./tenant-recovery-v2.js?v=2.1');
  load('restbrOwnerPermissionsV2Script','./permissions-v2.js?v=2.1');
  load('restbrOwnerV2Script','./owner-v2.js?v=2.1');
  load('restbrOwnerSettingsV2Script','./owner-settings-v2.js?v=2.1');
  load('restbrBulkPricingV2Script','./bulk-pricing-v2.js?v=2.1');
  load('restbrOwnerAnalyticsV2Script','./analytics-v2.js?v=2.1');
  load('restbrOwnerVisibilityV2Script','./visibility-v2.js?v=2.1');
  load('restbrOwnerActionsV2Script','./actions-v2.js?v=2.1');
  load('restbrOwnerDesignAdvancedV2Script','./design-advanced-v2.js?v=2.0');
  load('restbrOwnerBackupResetV2Script','./backup-reset-v2.js?v=2.2');
  load('restbrOwnerAuditV2Script','./audit-v2.js?v=2.1');
  load('restbrOwnerQrV2Script','./qr-v2.js?v=2.2');
  load('restbrOwnerMediaPolicyV2Script','./media-policy-v2.js?v=2.0');
  load('restbrOwnerSettingsOrganizerV3Script','./settings-organizer-v3.js?v=3.0');
}, { once:true });

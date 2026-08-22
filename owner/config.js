// RESTBR Owner Dashboard — public browser configuration.
// Supabase Publishable keys are intended for client-side use.
// NEVER put sb_secret / service_role / database passwords in this file.
window.RESTBR_OWNER_CONFIG = {
  supabaseUrl: "https://xdqewaapwhmqlfotaofg.supabase.co",
  publishableKey: "sb_publishable_dOGkocLtn1WVvrxmu6TnJQ_8qyPyV-T"
};

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
    document.body.appendChild(script);
  };

  load('restbrOwnerAuthV2Script', './auth-v2.js?v=2.0');
  load('restbrOwnerV2Script', './owner-v2.js?v=2.0');
  load('restbrOwnerSettingsV2Script', './owner-settings-v2.js?v=2.0');
  load('restbrBulkPricingV2Script', './bulk-pricing-v2.js?v=2.0');
}, { once:true });

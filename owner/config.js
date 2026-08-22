// RESTBR Owner Dashboard — public browser configuration.
// Supabase Publishable keys are intended for client-side use.
// NEVER put sb_secret / service_role / database passwords in this file.
window.RESTBR_OWNER_CONFIG = {
  supabaseUrl: "https://xdqewaapwhmqlfotaofg.supabase.co",
  publishableKey: "sb_publishable_dOGkocLtn1WVvrxmu6TnJQ_8qyPyV-T"
};

// Load the schema-aware Owner V2 extension only after the dashboard shell,
// Supabase CDN and legacy controller have finished booting.
window.addEventListener('load', () => {
  if (document.getElementById('restbrOwnerV2Script')) return;
  const script = document.createElement('script');
  script.id = 'restbrOwnerV2Script';
  script.src = './owner-v2.js?v=2.0';
  script.defer = true;
  document.body.appendChild(script);
}, { once:true });

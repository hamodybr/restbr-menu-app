// RestBr Menu — Google Sheets public data-source configuration
//
// Leave endpoint empty to keep the current Supabase behavior.
// After the Apps Script API patch is deployed, set endpoint to the /exec URL.
window.RESTBR_GOOGLE_SHEETS = Object.freeze({
  endpoint: "",
  cacheKey: "RESTBR_GOOGLE_SHEETS_MENU_CACHE_V1",
  refreshAfterMs: 5 * 60 * 1000,
  requestTimeoutMs: 6500,
  apiVersion: "1"
});

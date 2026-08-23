// ============================================================
// RESTBR BRAND CACHE POLICY V2.0
// Keeps intro/name/logo cache isolated per public hostname. Never reuse a
// previous restaurant's cached brand on another tenant/domain.
// ============================================================
(() => {
  'use strict';
  const host=location.hostname.toLowerCase().replace(/^www\./,'');
  const key=`RESTBR_BRAND_CACHE_V2:${host}`;

  function save(){
    const db=window.SHORASH_DB;const r=db?.restaurant;if(!r)return;
    try{
      localStorage.setItem(key,JSON.stringify({
        saved_at:Date.now(),
        restaurantId:r.id||window.RESTBR_TENANT?.id||'',
        nameAr:r.nameAr||'',
        nameKu:r.nameKu||'',
        nameEn:r.nameEn||'',
        logo:r.logo||''
      }));
      // Remove the old cross-tenant cache so older builds cannot leak it.
      localStorage.removeItem('SHORASH_BRAND_CACHE_V1');
    }catch(_){}
  }

  window.RESTBR_BRAND_CACHE_KEY=key;
  if(window.SHORASH_DB)save();
  else window.addEventListener('shorash:ready',save,{once:true});
})();

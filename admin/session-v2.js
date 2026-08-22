// ============================================================
// RESTBR SUPER ADMIN SESSION V2.0
// Reuses one Supabase client/session across Admin V1 + V2 extensions.
// Load after supabase-js CDN and before admin.js.
// ============================================================
(() => {
  'use strict';

  if(!window.supabase?.createClient || window.__RESTBR_ADMIN_CREATE_CLIENT_WRAPPED)return;

  const nativeCreateClient=window.supabase.createClient.bind(window.supabase);
  window.__RESTBR_ADMIN_CREATE_CLIENT_WRAPPED=true;
  window.__RESTBR_ADMIN_CLIENTS=new Map();

  window.supabase.createClient=(url,key,options)=>{
    const cacheKey=`${String(url||'')}::${String(key||'')}`;
    if(window.__RESTBR_ADMIN_CLIENTS.has(cacheKey)){
      return window.__RESTBR_ADMIN_CLIENTS.get(cacheKey);
    }
    const client=nativeCreateClient(url,key,options);
    window.__RESTBR_ADMIN_CLIENTS.set(cacheKey,client);
    window.RESTBR_ADMIN_CLIENT=client;
    return client;
  };

  console.log('✅ RESTBR Super Admin shared session V2.0 ready');
})();

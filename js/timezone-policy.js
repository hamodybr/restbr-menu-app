// ==========================================
// RESTBR TENANT TIMEZONE POLICY V1.0
// Replaces legacy Asia/Baghdad-only clock helpers with the current tenant TZ.
// Loaded immediately after app.js while its async bootstrap is still pending.
// ==========================================
(() => {
  'use strict';

  function tenantTimeZone(){
    const zone=String(
      window.RESTBR_BOOTSTRAP?.settings?.timezone ||
      window.RESTBR_TENANT?.timezone ||
      'Asia/Baghdad'
    ).trim();

    try{
      new Intl.DateTimeFormat('en-US',{timeZone:zone}).format(new Date());
      return zone;
    }catch(_){
      return 'Asia/Baghdad';
    }
  }

  window.iraqMinutesNow=function tenantMinutesNow(){
    const parts=new Intl.DateTimeFormat('en-GB',{
      timeZone:tenantTimeZone(),
      hour:'2-digit',
      minute:'2-digit',
      hour12:false
    }).formatToParts(new Date());

    const h=Number(parts.find(part=>part.type==='hour')?.value||0);
    const m=Number(parts.find(part=>part.type==='minute')?.value||0);
    return h*60+m;
  };

  window.trackPageViewOnce=function restbrTrackPageViewOnce(){
    const day=new Intl.DateTimeFormat('en-CA',{
      timeZone:tenantTimeZone(),
      year:'numeric',
      month:'2-digit',
      day:'2-digit'
    }).format(new Date());

    const tenant=String(
      window.RESTBR_TENANT?.id ||
      window.RESTBR_BOOTSTRAP?.settings?.restaurant_id ||
      location.hostname
    );
    const key=`restbr:view:${tenant}:${day}`;

    if(sessionStorage.getItem(key))return;
    sessionStorage.setItem(key,'1');

    if(typeof window.trackMenuEvent==='function'){
      window.trackMenuEvent('menu_view');
    }
  };

  console.log('✅ RESTBR tenant timezone policy V1.0 ready');
})();

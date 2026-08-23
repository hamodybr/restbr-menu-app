// ============================================================
// RESTBR OWNER ANALYTICS V2.0
// Tenant-scoped analytics dashboard using existing RLS.
// ============================================================
(() => {
  'use strict';

  const cfg=window.RESTBR_OWNER_CONFIG||{};
  if(!cfg.supabaseUrl||!cfg.publishableKey||!window.supabase)return;
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const $=id=>document.getElementById(id);
  const state={tenantId:null,days:30,products:new Map(),categories:new Map(),rows:[]};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const n=v=>Number(v)||0;
  const pct=(a,b)=>b>0?`${Math.round((a/b)*1000)/10}%`:'—';

  async function tenantId(){
    if(state.tenantId)return state.tenantId;
    const host=location.hostname.toLowerCase().replace(/^www\./,'');
    if(host==='hamodybr.github.io'){
      const slug=new URLSearchParams(location.search).get('tenant');
      const {data,error}=await sb.from('restaurants').select('id').eq('slug',slug).maybeSingle();
      if(error)throw error;if(!data?.id)throw new Error('restaurant not found');
      return state.tenantId=data.id;
    }
    const {data,error}=await sb.from('restaurant_domains').select('restaurant_id').eq('hostname',host).eq('status','active').eq('is_verified',true).maybeSingle();
    if(error)throw error;if(!data?.restaurant_id)throw new Error('restaurant domain not found');
    return state.tenantId=data.restaurant_id;
  }

  function installStyles(){
    if($('rbAnalyticsV2Styles'))return;
    const s=document.createElement('style');s.id='rbAnalyticsV2Styles';s.textContent=`
      .rb-an-modal{position:fixed;z-index:170;inset:0;display:grid;place-items:end center;padding:10px;background:rgba(0,0,0,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
      .rb-an-card{width:min(900px,100%);max-height:94dvh;overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:25px;padding:15px;box-shadow:0 30px 90px rgba(0,0,0,.5)}
      .rb-an-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.rb-an-head h3{margin:0;font-size:18px}.rb-an-head p{margin:4px 0 0;color:var(--muted);font-size:10px}.rb-an-close{width:38px;height:38px;border:1px solid var(--line);border-radius:12px;background:var(--panel2);color:var(--text);font-size:20px}
      .rb-an-toolbar{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}.rb-an-toolbar button{border:1px solid var(--line);border-radius:10px;background:var(--panel2);color:var(--muted);padding:7px 10px;font-size:10px;font-weight:800}.rb-an-toolbar button.active{color:var(--gold);border-color:rgba(216,169,88,.35);background:rgba(216,169,88,.08)}
      .rb-an-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.rb-an-stat{padding:11px;border:1px solid var(--line);border-radius:15px;background:var(--panel2)}.rb-an-stat strong{display:block;color:var(--gold);font-size:20px}.rb-an-stat span{color:var(--muted);font-size:9px}.rb-an-stat small{display:block;margin-top:4px;color:var(--muted);font-size:8px}
      .rb-an-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:9px}.rb-an-box{border:1px solid var(--line);border-radius:16px;background:var(--panel2);padding:11px}.rb-an-box h4{margin:0 0 9px;font-size:12px;color:var(--gold)}
      .rb-an-rank{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;padding:7px 0;border-bottom:1px solid var(--line);align-items:center}.rb-an-rank:last-child{border-bottom:0}.rb-an-rank span{font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rb-an-rank b{font-size:10px;color:var(--gold)}
      .rb-an-day{display:grid;grid-template-columns:74px minmax(0,1fr) 34px;gap:7px;align-items:center;margin:6px 0}.rb-an-day span,.rb-an-day b{font-size:8px;color:var(--muted)}.rb-an-bar{height:7px;border-radius:999px;background:rgba(255,255,255,.06);overflow:hidden}.rb-an-bar i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--gold2),var(--gold));min-width:2px}
      .rb-an-empty{color:var(--muted);font-size:10px;padding:14px;text-align:center}.rb-an-msg{min-height:18px;color:var(--muted);font-size:10px;margin-top:8px}.rb-an-msg.err{color:var(--danger)}
      @media(max-width:700px){.rb-an-stats{grid-template-columns:1fr 1fr}.rb-an-grid{grid-template-columns:1fr}.rb-an-card{border-radius:22px 22px 12px 12px}.rb-an-stat strong{font-size:18px}}
    `;document.head.appendChild(s);
  }

  function ensureModal(){
    let modal=$('rbAnalyticsModal');if(modal)return modal;
    modal=document.createElement('div');modal.id='rbAnalyticsModal';modal.className='rb-an-modal';modal.hidden=true;
    modal.innerHTML=`<div class="rb-an-card"><div class="rb-an-head"><div><h3>📊 إحصائيات RESTBR</h3><p>البيانات تخص هذا المطعم فقط حسب RLS. “محاولة طلب” تعني ضغط إرسال WhatsApp وليست تأكيد استلام الرسالة.</p></div><button id="rbAnalyticsClose" class="rb-an-close" type="button">×</button></div><div class="rb-an-toolbar"><button type="button" data-an-days="7">7 أيام</button><button type="button" data-an-days="30" class="active">30 يوم</button><button type="button" data-an-days="90">90 يوم</button><button id="rbAnalyticsRefresh" type="button">↻ تحديث</button></div><div id="rbAnalyticsBody"></div><div id="rbAnalyticsMsg" class="rb-an-msg"></div></div>`;
    document.body.appendChild(modal);
    modal.onclick=e=>{if(e.target===modal)close();};$('rbAnalyticsClose').onclick=close;$('rbAnalyticsRefresh').onclick=load;
    modal.querySelectorAll('[data-an-days]').forEach(button=>button.onclick=()=>{state.days=Number(button.dataset.anDays)||30;modal.querySelectorAll('[data-an-days]').forEach(b=>b.classList.toggle('active',b===button));void load();});
    return modal;
  }

  function injectButton(){
    if($('rbAnalyticsOpen'))return;
    const grid=$('view-home')?.querySelector('.grid2');if(!grid)return;
    const button=document.createElement('button');button.id='rbAnalyticsOpen';button.className='btn';button.type='button';button.textContent='📊 الإحصائيات';button.onclick=open;grid.appendChild(button);
  }

  function setMsg(text,type=''){const el=$('rbAnalyticsMsg');if(!el)return;el.textContent=text||'';el.className='rb-an-msg'+(type?' '+type:'');}
  function close(){const modal=$('rbAnalyticsModal');if(modal)modal.hidden=true;document.body.style.overflow='';}
  function open(){ensureModal().hidden=false;document.body.style.overflow='hidden';void load();}

  function sinceDate(days){const d=new Date();d.setUTCDate(d.getUTCDate()-(days-1));return d.toISOString().slice(0,10);}
  function sumType(type){return state.rows.filter(r=>r.event_type===type).reduce((s,r)=>s+n(r.count),0);}
  function aggregate(type,key='ref_id'){
    const map=new Map();state.rows.filter(r=>r.event_type===type).forEach(r=>{const id=String(r[key]||'').trim();if(!id)return;map.set(id,(map.get(id)||0)+n(r.count));});return [...map.entries()].sort((a,b)=>b[1]-a[1]);
  }
  function rankHtml(entries,names){
    if(!entries.length)return '<div class="rb-an-empty">لا توجد بيانات كافية بعد.</div>';
    return entries.slice(0,7).map(([id,count],index)=>`<div class="rb-an-rank"><span>${index+1}. ${esc(names.get(id)||id||'—')}</span><b>${count.toLocaleString('en-US')}</b></div>`).join('');
  }

  function render(){
    const views=sumType('menu_view'),interest=sumType('product_interest'),checkout=sumType('checkout_start'),attempt=sumType('order_attempt');
    const searches=sumType('search_use'),shares=sumType('share_product')+sumType('share_category'),categoryViews=sumType('category_view'),languageChanges=sumType('language_change');
    const productRanks=aggregate('product_interest');const categoryRanks=aggregate('category_view');
    const orderTypes=aggregate('order_attempt');
    const languageMap=new Map([['ar','العربية'],['ku','کوردی'],['en','English'],['delivery','Delivery'],['pickup','Pickup']]);

    const daily=new Map();state.rows.filter(r=>r.event_type==='menu_view').forEach(r=>daily.set(r.event_date,(daily.get(r.event_date)||0)+n(r.count)));
    const days=[...daily.entries()].sort((a,b)=>a[0].localeCompare(b[0]));const max=Math.max(1,...days.map(x=>x[1]));

    $('rbAnalyticsBody').innerHTML=`
      <div class="rb-an-stats">
        <div class="rb-an-stat"><strong>${views.toLocaleString('en-US')}</strong><span>مشاهدات المنيو</span><small>${state.days} يوم</small></div>
        <div class="rb-an-stat"><strong>${interest.toLocaleString('en-US')}</strong><span>اهتمام/إضافة صنف</span><small>${pct(interest,views)} من المشاهدات</small></div>
        <div class="rb-an-stat"><strong>${checkout.toLocaleString('en-US')}</strong><span>بدء Checkout</span><small>${pct(checkout,views)} من المشاهدات</small></div>
        <div class="rb-an-stat"><strong>${attempt.toLocaleString('en-US')}</strong><span>محاولة طلب WhatsApp</span><small>${pct(attempt,checkout)} من Checkout</small></div>
        <div class="rb-an-stat"><strong>${searches.toLocaleString('en-US')}</strong><span>استخدام البحث</span><small>${pct(searches,views)} من المشاهدات</small></div>
        <div class="rb-an-stat"><strong>${shares.toLocaleString('en-US')}</strong><span>مشاركات</span><small>منتج + قسم</small></div>
        <div class="rb-an-stat"><strong>${categoryViews.toLocaleString('en-US')}</strong><span>فتح أقسام</span><small>Category views</small></div>
        <div class="rb-an-stat"><strong>${languageChanges.toLocaleString('en-US')}</strong><span>تغيير اللغة</span><small>Language changes</small></div>
      </div>
      <div class="rb-an-grid">
        <div class="rb-an-box"><h4>🔥 أكثر الأصناف اهتمامًا</h4>${rankHtml(productRanks,state.products)}</div>
        <div class="rb-an-box"><h4>📂 أكثر الأقسام فتحًا</h4>${rankHtml(categoryRanks,state.categories)}</div>
        <div class="rb-an-box"><h4>📱 نوع محاولة الطلب</h4>${rankHtml(orderTypes,languageMap)}</div>
        <div class="rb-an-box"><h4>🌐 تغييرات اللغة</h4>${rankHtml(aggregate('language_change','language'),languageMap)}</div>
        <div class="rb-an-box" style="grid-column:1/-1"><h4>📈 مشاهدات المنيو حسب اليوم</h4>${days.length?days.map(([date,count])=>`<div class="rb-an-day"><span>${esc(date)}</span><div class="rb-an-bar"><i style="width:${Math.max(2,(count/max)*100)}%"></i></div><b>${count}</b></div>`).join(''):'<div class="rb-an-empty">لا توجد مشاهدات ضمن الفترة المختارة.</div>'}</div>
      </div>`;
  }

  async function load(){
    setMsg('جاري تحميل الإحصائيات...');
    try{
      const rid=await tenantId();
      const [a,p,c]=await Promise.all([
        sb.from('menu_analytics_daily').select('event_date,event_type,ref_id,language,count').eq('restaurant_id',rid).gte('event_date',sinceDate(state.days)).order('event_date',{ascending:true}),
        sb.from('products').select('id,name_ar,name_ku,name_en').eq('restaurant_id',rid),
        sb.from('categories').select('id,name_ar,name_ku,name_en').eq('restaurant_id',rid)
      ]);
      for(const result of [a,p,c])if(result.error)throw result.error;
      state.rows=a.data||[];
      state.products=new Map((p.data||[]).map(x=>[String(x.id),x.name_ar||x.name_ku||x.name_en||'صنف']));
      state.categories=new Map((c.data||[]).map(x=>[String(x.id),x.name_ar||x.name_ku||x.name_en||'قسم']));
      render();setMsg(`آخر تحديث: ${new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}`);
    }catch(error){setMsg(error?.message||String(error),'err');$('rbAnalyticsBody').innerHTML='<div class="rb-an-empty">تعذر تحميل الإحصائيات.</div>';}
  }

  function boot(){installStyles();ensureModal();injectButton();const home=$('view-home');if(home)new MutationObserver(injectButton).observe(home,{childList:true,subtree:true});console.log('✅ RESTBR Owner Analytics V2.0 ready');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

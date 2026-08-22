// ============================================================
// RESTBR OWNER BULK PRICING V2.0
// Safe bulk price changes for all menu or one category.
// ============================================================
(() => {
  'use strict';
  const cfg=window.RESTBR_OWNER_CONFIG||{};
  if(!cfg.supabaseUrl||!cfg.publishableKey||!window.supabase)return;

  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const $=id=>document.getElementById(id);
  const state={tenantId:null,categories:[],products:[],options:[]};
  const money=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:3})+' د.ع';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

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

  async function loadData(){
    const rid=await tenantId();
    const [c,p,o]=await Promise.all([
      sb.from('categories').select('id,name_ar,name_ku,name_en,sort_order').eq('restaurant_id',rid).order('sort_order',{ascending:true}),
      sb.from('products').select('id,category_id,name_ar,base_price').eq('restaurant_id',rid),
      sb.from('product_options').select('id,product_id,name_ar,price').eq('restaurant_id',rid)
    ]);
    for(const r of [c,p,o])if(r.error)throw r.error;
    state.categories=c.data||[];state.products=p.data||[];state.options=o.data||[];
  }

  function injectButton(){
    if($('rbv2BulkPriceBtn'))return;
    const head=$('view-products')?.querySelector('.panel-head');
    if(!head)return;
    const add=$('addProductBtn');
    const holder=document.createElement('div');
    holder.style.cssText='display:flex;gap:7px;flex-wrap:wrap;align-items:center';
    const button=document.createElement('button');
    button.id='rbv2BulkPriceBtn';button.className='btn';button.type='button';button.textContent='⚡ أسعار جماعية';
    if(add?.parentNode===head){head.replaceChild(holder,add);holder.append(add,button);}else head.appendChild(button);
    button.onclick=open;
  }

  function openModal(title,html){
    $('modalTitle').textContent=title;$('modalBody').innerHTML=html;$('modalBack').classList.remove('hidden');
  }

  async function open(){
    try{
      await loadData();
      openModal('الأسعار الجماعية — RESTBR V2',`
        <div class="notice">تقدر تغيّر أسعار المنيو كله أو قسم واحد. قبل الحفظ راح تشوف عدد الأسعار المتأثرة، وما نسمح بسعر أقل من صفر.</div>
        <div class="grid2" style="margin-top:12px">
          <div class="field"><label>النطاق</label><select id="rbBulkScope"><option value="">كل المنيو</option>${state.categories.map(c=>`<option value="${c.id}">${esc(c.name_ar||c.name_ku||c.name_en||'قسم')}</option>`).join('')}</select></div>
          <div class="field"><label>نوع التغيير</label><select id="rbBulkMode"><option value="percent">نسبة % (موجب زيادة / سالب تخفيض)</option><option value="fixed">مبلغ ثابت (موجب زيادة / سالب تخفيض)</option><option value="set">تعيين سعر موحد</option></select></div>
          <div class="field"><label>القيمة</label><input id="rbBulkValue" type="number" step="0.001" value="0"></div>
          <div class="field"><label>التقريب</label><select id="rbBulkRound"><option value="1">بدون تقريب خاص</option><option value="250">أقرب 250</option><option value="500">أقرب 500</option><option value="1000">أقرب 1,000</option></select></div>
        </div>
        <div class="grid2" style="margin-top:10px">
          <div class="switchline"><label>تعديل السعر الأساسي للأصناف</label><input id="rbBulkBase" type="checkbox" checked></div>
          <div class="switchline"><label>تعديل أسعار الخيارات</label><input id="rbBulkOptions" type="checkbox" checked></div>
        </div>
        <div id="rbBulkPreview" class="notice" style="margin-top:12px"></div>
        <div class="savebar"><button id="rbBulkApply" class="btn primary" type="button">تطبيق التغيير</button></div>
        <div id="rbBulkMsg" class="status" style="margin-top:9px"></div>`);
      ['rbBulkScope','rbBulkMode','rbBulkValue','rbBulkRound','rbBulkBase','rbBulkOptions'].forEach(id=>$(id).addEventListener('input',preview));
      $('rbBulkApply').onclick=apply;
      preview();
    }catch(error){alert(error?.message||String(error));}
  }

  function targets(){
    const categoryId=$('rbBulkScope')?.value||'';
    const products=categoryId?state.products.filter(p=>p.category_id===categoryId):state.products;
    const ids=new Set(products.map(p=>p.id));
    const options=state.options.filter(o=>ids.has(o.product_id));
    return {products,options};
  }

  function nextPrice(oldValue){
    const old=Math.max(0,Number(oldValue)||0);
    const value=Number($('rbBulkValue')?.value||0);
    const mode=$('rbBulkMode')?.value||'percent';
    let next=mode==='set'?value:mode==='fixed'?old+value:old*(1+value/100);
    next=Math.max(0,next);
    const round=Math.max(1,Number($('rbBulkRound')?.value||1));
    if(round>1)next=Math.round(next/round)*round;
    return Math.round(next*1000)/1000;
  }

  function preview(){
    const {products,options}=targets();
    const base=Boolean($('rbBulkBase')?.checked);const opts=Boolean($('rbBulkOptions')?.checked);
    const prices=[];
    if(base)products.slice(0,2).forEach(p=>prices.push(`${esc(p.name_ar||'صنف')}: ${money(p.base_price)} ← ${money(nextPrice(p.base_price))}`));
    if(opts)options.slice(0,2).forEach(o=>prices.push(`${esc(o.name_ar||'خيار')}: ${money(o.price)} ← ${money(nextPrice(o.price))}`));
    const count=(base?products.length:0)+(opts?options.length:0);
    $('rbBulkPreview').innerHTML=`سيتغير <b>${count}</b> سعر (${base?products.length:0} سعر أساسي + ${opts?options.length:0} خيار).${prices.length?'<br>'+prices.join('<br>'):''}`;
  }

  async function runLimited(items,worker,limit=6){
    let index=0;
    const runners=Array.from({length:Math.min(limit,items.length)},async()=>{
      while(index<items.length){const current=items[index++];await worker(current);}
    });
    await Promise.all(runners);
  }

  async function apply(){
    const {products,options}=targets();
    const doBase=Boolean($('rbBulkBase')?.checked);const doOptions=Boolean($('rbBulkOptions')?.checked);
    const total=(doBase?products.length:0)+(doOptions?options.length:0);
    if(!total){$('rbBulkMsg').textContent='اختر نوع سعر واحد على الأقل.';$('rbBulkMsg').className='status err';return;}
    const value=Number($('rbBulkValue')?.value||0);
    if(!Number.isFinite(value)){return;}
    if(!confirm(`سيتم تعديل ${total} سعر. هل أنت متأكد؟`))return;
    const button=$('rbBulkApply');button.disabled=true;
    $('rbBulkMsg').textContent='جاري تحديث الأسعار...';$('rbBulkMsg').className='status';
    try{
      const rid=await tenantId();
      if(doBase)await runLimited(products,async p=>{
        const {error}=await sb.from('products').update({base_price:nextPrice(p.base_price)}).eq('id',p.id).eq('restaurant_id',rid);if(error)throw error;
      });
      if(doOptions)await runLimited(options,async o=>{
        const {error}=await sb.from('product_options').update({price:nextPrice(o.price)}).eq('id',o.id).eq('restaurant_id',rid);if(error)throw error;
      });
      $('rbBulkMsg').textContent=`تم تحديث ${total} سعر بنجاح ✓`;$('rbBulkMsg').className='status ok';
      await loadData();preview();setTimeout(()=>$('refreshBtn')?.click(),200);
    }catch(error){$('rbBulkMsg').textContent=error?.message||String(error);$('rbBulkMsg').className='status err';}
    finally{button.disabled=false;}
  }

  function boot(){injectButton();const obs=new MutationObserver(injectButton);const products=$('view-products');if(products)obs.observe(products,{childList:true,subtree:true});console.log('✅ RESTBR Bulk Pricing V2.0 ready');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

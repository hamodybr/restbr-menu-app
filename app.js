(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const state={config:null,menu:null,lang:'ar',cart:[],query:'',activeCategory:''};
  const RTL=new Set(['ar','ku']);
  const labels={
    ar:{search:'ابحث عن صنف...',cart:'السلة',total:'الإجمالي',add:'＋ إضافة',choose:'＋ اختر',empty:'لا توجد نتائج',checkout:'إرسال الطلب على واتساب',location:'الموقع',call:'اتصال',whatsapp:'واتساب',order:'طلب جديد',qty:'العدد'},
    ku:{search:'لێگەڕین...',cart:'سەبەتە',total:'کۆی گشتی',add:'＋ زیاد بکە',choose:'＋ هەڵبژێرە',empty:'هیچ ئەنجامێک نییە',checkout:'ناردنی داواکاری بە واتساپ',location:'شوێن',call:'پەیوەندی',whatsapp:'واتساپ',order:'داواکاری نوێ',qty:'ژمارە'},
    en:{search:'Search menu...',cart:'Cart',total:'Total',add:'＋ Add to cart',choose:'＋ Choose',empty:'No results',checkout:'Send order on WhatsApp',location:'Location',call:'Call',whatsapp:'WhatsApp',order:'New order',qty:'Qty'}
  };
  const L=key=>labels[state.lang]?.[key]||labels.en[key]||key;
  const text=obj=>typeof obj==='string'?obj:(obj?.[state.lang]||obj?.ar||obj?.en||obj?.ku||'');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const slugKey=()=>`restbr-simple-cart:${state.config?.slug||'menu'}`;
  function money(v){const code=String(state.config?.currency||'IQD').toUpperCase();const n=Number(v)||0;const label=code==='IQD'?'IQD':code;return n.toLocaleString('en-US',{maximumFractionDigits:code==='IQD'?0:2})+' '+label;}
  function loadCart(){try{state.cart=JSON.parse(localStorage.getItem(slugKey())||'[]');if(!Array.isArray(state.cart))state.cart=[];}catch{state.cart=[];}}
  function saveCart(){localStorage.setItem(slugKey(),JSON.stringify(state.cart));renderCartButton();}
  function toast(msg){$('toast').textContent=msg;$('toast').hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>$('toast').hidden=true,1800);}
  async function load(){
    try{
      const [c,m]=await Promise.all([fetch('data/restaurant.json',{cache:'no-store'}),fetch('data/menu.json',{cache:'no-store'})]);
      if(!c.ok||!m.ok)throw new Error('Menu files not found');
      state.config=await c.json();state.menu=await m.json();
      state.lang=state.config.defaultLanguage||state.config.languages?.[0]||'ar';
      loadCart();applyTheme();renderAll();bind();
    }catch(e){console.error(e);document.body.innerHTML='<div style="padding:40px;color:white;text-align:center">RESTBR Simple V1<br><small>Check data/restaurant.json and data/menu.json</small></div>';}
  }
  function applyTheme(){
    const t=state.config.theme||{};const r=document.documentElement.style;
    if(t.accent)r.setProperty('--accent',t.accent);if(t.glass)r.setProperty('--glass',t.glass);if(t.border)r.setProperty('--line',t.border);if(t.blur!=null)r.setProperty('--blur',`${t.blur}px`);if(t.cardRadius!=null)r.setProperty('--radius',`${t.cardRadius}px`);if(t.cardHeight!=null)r.setProperty('--card-h',`${t.cardHeight}px`);if(t.imagePercent!=null)r.setProperty('--image-pct',`${t.imagePercent}%`);
    const bg=state.config.background||{};$('background').style.backgroundImage=bg.image?`linear-gradient(rgba(0,0,0,.1),rgba(0,0,0,.3)),url('${bg.image}')`:'';
    if(bg.video){$('backgroundVideo').src=bg.video;$('backgroundVideo').hidden=false;$('backgroundVideo').play().catch(()=>{});}else $('backgroundVideo').hidden=true;
  }
  function setLanguage(lang){state.lang=lang;document.documentElement.lang=lang;document.documentElement.dir=RTL.has(lang)?'rtl':'ltr';renderAll();}
  function renderAll(){renderHeader();renderCategories();renderMenu();renderFooter();renderCartButton();renderCart();}
  function renderHeader(){
    const c=state.config;document.title=text(c.name)||'RESTBR Menu';$('restaurantName').textContent=text(c.name);$('subtitle').textContent=text(c.subtitle);$('logo').src=c.logo||'';$('logo').alt=text(c.name);$('langBtn').textContent=state.lang.toUpperCase();$('searchInput').placeholder=L('search');
    const actions=[];if(c.locationUrl)actions.push({href:c.locationUrl,icon:'📍',label:L('location')});if(c.phone)actions.push({href:`tel:${c.phone}`,icon:'☎️',label:L('call')});if(c.whatsapp)actions.push({href:`https://wa.me/${String(c.whatsapp).replace(/\D/g,'')}`,icon:'💬',label:L('whatsapp')});
    $('heroActions').innerHTML=actions.map(a=>`<a class="hero-action" href="${esc(a.href)}" target="${a.href.startsWith('http')?'_blank':'_self'}"><div><span>${a.icon}</span>${esc(a.label)}</div></a>`).join('');
    const ann=text(c.announcement);$('announcement').textContent=ann;$('announcement').hidden=!ann;
  }
  function categories(){return (state.menu.categories||[]).filter(c=>c.visible!==false);}
  function products(){return (state.menu.products||[]).filter(p=>p.visible!==false);}
  function renderCategories(){const cats=categories();if(!state.activeCategory&&cats[0])state.activeCategory=cats[0].id;$('categories').innerHTML=cats.map(c=>`<button class="category-chip ${c.id===state.activeCategory?'active':''}" data-cat="${esc(c.id)}">${esc(text(c.name))}</button>`).join('');}
  function renderMenu(){
    const q=state.query.trim().toLowerCase();const cats=categories();let html='';
    for(const c of cats){const ps=products().filter(p=>p.categoryId===c.id&&(!q||[text(p.name),text(p.description)].join(' ').toLowerCase().includes(q)));if(!ps.length)continue;html+=`<section class="section" id="cat-${esc(c.id)}"><h2 class="section-title">${esc(text(c.name))}</h2>${ps.map(productCard).join('')}</section>`;}
    $('menu').innerHTML=html||`<div style="text-align:center;padding:30px;color:var(--muted)">${L('empty')}</div>`;
  }
  function productCard(p){
    const opts=(p.options||[]).filter(o=>o.visible!==false);const img=p.image||'';const hasOpts=opts.length>0;let priceHtml='';
    if(hasOpts){priceHtml=`<div class="option-list">${opts.map(o=>`<div class="option-row"><span class="option-name">${esc(text(o.name))}</span><span class="option-price">${money(o.price)}</span></div>`).join('')}</div>`;}else priceHtml=`<div class="base-price">${money(p.price)}</div>`;
    return `<article class="product-card" data-product="${esc(p.id)}"><div class="product-info"><h3 class="product-name">${esc(text(p.name))}</h3>${p.description?`<div class="product-desc">${esc(text(p.description))}</div>`:''}${priceHtml}<div class="product-bottom">${!hasOpts?`<button class="add-btn" data-add="${esc(p.id)}">${L('add')}</button>`:`<button class="add-btn" data-choose="${esc(p.id)}">${L('choose')}</button>`}</div></div><div class="product-image-wrap">${img?`<img class="product-image" src="${esc(img)}" loading="lazy" alt="${esc(text(p.name))}">`:''}<button class="share-btn" data-share="${esc(p.id)}" type="button">↗</button></div></article>`;
  }
  function renderFooter(){const c=state.config;$('footer').innerHTML=`<strong>${esc(text(c.name))}</strong>${c.footerText?esc(text(c.footerText)):''}${c.qrEnabled!==false?`<div style="margin-top:10px"><a href="qr.html" style="color:var(--accent)">QR Code</a></div>`:''}`;}
  function findProduct(id){return products().find(p=>p.id===id);}
  function addItem(p,option=null){const key=`${p.id}:${option?.id||'base'}`;const found=state.cart.find(x=>x.key===key);const item={key,productId:p.id,optionId:option?.id||null,name:p.name,optionName:option?.name||null,price:Number(option?.price??p.price??0),qty:1};if(found)found.qty++;else state.cart.push(item);saveCart();renderCart();toast(text(p.name));}
  function chooseOption(p){const opts=(p.options||[]).filter(o=>o.visible!==false);if(!opts.length)return addItem(p);const lines=opts.map((o,i)=>`${i+1}. ${text(o.name)} — ${money(o.price)}`).join('\n');const answer=prompt(`${text(p.name)}\n${lines}\n\n1-${opts.length}`,'1');if(answer==null)return;const i=Math.max(0,Math.min(opts.length-1,(parseInt(answer,10)||1)-1));addItem(p,opts[i]);}
  async function shareProduct(p){const url=`${location.origin}${location.pathname}#product-${encodeURIComponent(p.id)}`;const data={title:text(p.name),text:`${text(p.name)} — ${text(state.config.name)}`,url};try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(url);toast('Copied');}}catch{} }
  function renderCartButton(){const count=state.cart.reduce((s,x)=>s+x.qty,0);$('cartButton').hidden=count===0;$('cartCount').textContent=count;$('cartText').textContent=L('cart');}
  function renderCart(){
    $('cartTitle').textContent=L('cart');$('totalLabel').textContent=L('total');$('cartRestaurant').textContent=text(state.config?.name||{});$('checkoutBtn').textContent=L('checkout');
    $('cartItems').innerHTML=state.cart.length?state.cart.map((x,i)=>`<div class="cart-row"><div><strong>${esc(text(x.name))}</strong><small>${x.optionName?esc(text(x.optionName))+' • ':''}${money(x.price)}</small></div><div class="qty"><button data-minus="${i}">−</button><b>${x.qty}</b><button data-plus="${i}">＋</button></div></div>`).join(''):`<div style="text-align:center;color:var(--muted);padding:20px">${L('empty')}</div>`;
    $('cartTotal').textContent=money(state.cart.reduce((s,x)=>s+x.price*x.qty,0));
  }
  function openCart(){$('cartBackdrop').hidden=false;$('cartSheet').hidden=false;document.body.style.overflow='hidden';}
  function closeCart(){$('cartBackdrop').hidden=true;$('cartSheet').hidden=true;document.body.style.overflow='';}
  function checkout(){if(!state.cart.length)return;const c=state.config;if(!c.whatsapp)return toast('WhatsApp number missing');const lines=[`*${L('order')} - ${text(c.name)}*`,''];state.cart.forEach((x,i)=>lines.push(`${i+1}) ${text(x.name)}${x.optionName?' - '+text(x.optionName):''} × ${x.qty} = ${money(x.price*x.qty)}`));lines.push('',`${L('total')}: ${money(state.cart.reduce((s,x)=>s+x.price*x.qty,0))}`);location.href=`https://wa.me/${String(c.whatsapp).replace(/\D/g,'')}?text=${encodeURIComponent(lines.join('\n'))}`;}
  function bind(){
    $('langBtn').onclick=()=>{const langs=state.config.languages||['ar'];const i=langs.indexOf(state.lang);setLanguage(langs[(i+1)%langs.length]);};
    $('searchToggle').onclick=()=>{$('searchBox').hidden=!$('searchBox').hidden;if(!$('searchBox').hidden)$('searchInput').focus();};
    $('searchInput').oninput=e=>{state.query=e.target.value;renderMenu();};
    $('categories').onclick=e=>{const b=e.target.closest('[data-cat]');if(!b)return;state.activeCategory=b.dataset.cat;renderCategories();document.getElementById(`cat-${state.activeCategory}`)?.scrollIntoView({behavior:'smooth',block:'start'});};
    $('menu').onclick=e=>{const add=e.target.closest('[data-add]'),choose=e.target.closest('[data-choose]'),share=e.target.closest('[data-share]');if(add){const p=findProduct(add.dataset.add);if(p)addItem(p);}else if(choose){const p=findProduct(choose.dataset.choose);if(p)chooseOption(p);}else if(share){const p=findProduct(share.dataset.share);if(p)shareProduct(p);}};
    $('cartButton').onclick=openCart;$('closeCart').onclick=closeCart;$('cartBackdrop').onclick=closeCart;$('checkoutBtn').onclick=checkout;
    $('cartItems').onclick=e=>{const plus=e.target.closest('[data-plus]'),minus=e.target.closest('[data-minus]');if(plus){state.cart[+plus.dataset.plus].qty++;}else if(minus){const i=+minus.dataset.minus;state.cart[i].qty--;if(state.cart[i].qty<=0)state.cart.splice(i,1);}else return;saveCart();renderCart();};
    document.documentElement.lang=state.lang;document.documentElement.dir=RTL.has(state.lang)?'rtl':'ltr';
  }
  load();
})();

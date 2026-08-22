const I18N = {
  ar: {
    subtitle: "اكتشف منيو {name}",
    location: "موقعنا",
    call: "اتصال",
    whatsapp: "واتساب منيو",
    popular: "الأكثر طلباً",
    fresh: "جديد",
    hot: "حار 🌶",
    offer: "عرض",
    unavailable: "غير متوفر حالياً",
    currency: "د.ع",
    search: "ابحث عن صنف...",
    searchResults: "نتائج البحث",
    noResults: "ما لقينا صنف مطابق",
    share: "مشاركة",
    copied: "تم نسخ الرابط"
  },

  ku: {
    subtitle: "مێنیوی {name} ببینە",
    location: "شوێنی مە",
    call: "پەیوەندی",
    whatsapp: "مێنیوی واتساپ",
    popular: "زۆرترین داواکراو",
    fresh: "نوێ",
    hot: "توند 🌶",
    offer: "ئۆفەر",
    unavailable: "بەردەست نییە",
    currency: "د.ع",
    search: "لێگەڕان بۆ بەرهەم...",
    searchResults: "ئەنجامی گەڕان",
    noResults: "هیچ بەرهەمێک نەدۆزرایەوە",
    share: "هاوبەشکردن",
    copied: "لینک کۆپی کرا"
  },

  en: {
    subtitle: "Discover {name} Menu",
    location: "Location",
    call: "Call",
    whatsapp: "WhatsApp Menu",
    popular: "Most Popular",
    fresh: "New",
    hot: "Spicy 🌶",
    offer: "Offer",
    unavailable: "Currently unavailable",
    currency: "IQD",
    search: "Search menu...",
    searchResults: "Search results",
    noResults: "No matching items",
    share: "Share",
    copied: "Link copied"
  }
};


let DB = null;
let lang = localStorage.getItem("shorashLang") || "ar";
let active = "";
let searchQuery = "";
let searchTracked = false;

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const safeArray=value=>{if(Array.isArray(value))return value;if(typeof value==="string"){try{const p=JSON.parse(value);return Array.isArray(p)?p:[]}catch(_){return []}}return []};
const safeObject=value=>{if(value&&typeof value==="object"&&!Array.isArray(value))return value;if(typeof value==="string"){try{const p=JSON.parse(value);return p&&typeof p==="object"&&!Array.isArray(p)?p:{}}catch(_){return {}}}return {}};
const escapeUi=value=>String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
const actionLabel=(item,currentLang=lang)=>String(item?.[`label_${currentLang}`]??item?.label_ar??item?.label_en??"").trim();



function txt(obj) {
  if (!obj) return "";
  return obj[lang] || obj.ar || obj.en || "";
}


function money(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) return "";

  return (
    Number(value).toLocaleString("en-US") +
    " " +
    I18N[lang].currency
  );
}


function installMenuDiscoveryUI(){

  if(document.getElementById("smDiscoveryStyle"))return;

  const style=document.createElement("style");
  style.id="smDiscoveryStyle";

  style.textContent=`
    .sm-search-wrap{
      width:min(calc(100% - 4px),680px);
      margin:12px auto 4px;
      display:grid;
      grid-template-columns:auto minmax(0,1fr) auto;
      align-items:center;
      gap:7px;
      padding:7px 9px;
      border:1px solid rgba(232,184,98,.18);
      border-radius:14px;
      background:rgba(10,7,4,.68);
      backdrop-filter:blur(14px);
      -webkit-backdrop-filter:blur(14px);
      box-sizing:border-box;
    }

    .sm-search-icon{
      font-size:14px;
      opacity:.8;
    }

    .sm-search-input{
      width:100%;
      min-width:0;
      border:0;
      outline:0;
      background:transparent;
      color:#f4efe9;
      font:inherit;
      font-size:16px;
      line-height:1.4;
    }

    .sm-search-input::placeholder{
      color:#817971;
    }

    .sm-search-clear{
      width:28px;
      height:28px;
      display:grid;
      place-items:center;
      border:0;
      border-radius:9px;
      background:rgba(255,255,255,.05);
      color:#a69e95;
      font-size:15px;
    }

    .sm-search-count{
      width:min(calc(100% - 14px),680px);
      margin:5px auto 2px;
      color:#8e867d;
      font-size:9px;
      text-align:center;
      min-height:14px;
    }

    .sm-section-head{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:8px;
      margin-bottom:8px;
    }

    .sm-section-head .sm-section-title{
      margin:0 !important;
    }

    .sm-card .sm-badges,
    .sm-card .sm-badge,
    .sm-card .sm-off{
      position:relative;
      z-index:30;
    }

    .sm-share-category,
    .sm-share-product{
      display:grid;
      place-items:center;
      border:1px solid rgba(232,184,98,.2);
      background:rgba(12,8,5,.76);
      color:#e8b862;
      border-radius:10px;
      cursor:pointer;
    }

    .sm-share-category{
      min-width:34px;
      height:34px;
      padding:0 8px;
      font-size:14px;
    }

    .sm-card{
      position:relative;
    }

    .sm-share-product{
      position:absolute;
      z-index:45;
      top:7px;
      inset-inline-start:7px;
      width:29px;
      height:29px;
      font-size:12px;
      backdrop-filter:blur(10px);
      -webkit-backdrop-filter:blur(10px);
      pointer-events:auto;
      touch-action:manipulation;
      -webkit-tap-highlight-color:transparent;
    }

    .sm-search-category{
      color:#91877d;
      font-size:8.5px;
      line-height:1.3;
      margin:-1px 0 4px;
    }

    .sm-deep-highlight{
      animation:smDeepPulse 1.8s ease;
    }

    @keyframes smDeepPulse{
      0%,100%{box-shadow:inherit}
      30%,65%{box-shadow:0 0 0 2px rgba(232,184,98,.65),0 12px 35px rgba(0,0,0,.35)}
    }

    .sm-offline-banner{
      position:fixed;
      z-index:85;
      left:50%;
      bottom:calc(82px + env(safe-area-inset-bottom));
      transform:translateX(-50%);
      width:max-content;
      max-width:88%;
      padding:7px 11px;
      border:1px solid rgba(232,184,98,.2);
      border-radius:999px;
      background:rgba(10,7,4,.9);
      color:#d6aa5b;
      font-size:9px;
      text-align:center;
      backdrop-filter:blur(12px);
      -webkit-backdrop-filter:blur(12px);
    }
  `;

  document.head.appendChild(style);
}


function installV44PolishStyles(){
  if(document.getElementById("smV44PolishStyles"))return;

  const style=document.createElement("style");
  style.id="smV44PolishStyles";
  style.textContent=`
    .sm-header{position:relative!important}

    .sm-header-tools{
      position:absolute;
      z-index:70;
      top:calc(8px + env(safe-area-inset-top));
      right:10px;
      display:flex;
      align-items:center;
      gap:7px;
      direction:ltr;
    }

    .sm-header-icon-btn{
      position:relative;
      width:38px;
      height:38px;
      display:grid;
      place-items:center;
      padding:0;
      border:1px solid rgba(232,184,98,.22);
      border-radius:12px;
      background:rgba(8,5,3,.54);
      color:#e8b862;
      box-shadow:0 8px 22px rgba(0,0,0,.16);
      backdrop-filter:blur(12px);
      -webkit-backdrop-filter:blur(12px);
      font:inherit;
      font-size:17px;
      cursor:pointer;
      touch-action:manipulation;
      -webkit-tap-highlight-color:transparent;
    }

    .sm-header-icon-btn:active{transform:scale(.94)}

    .sm-lang-code{
      position:absolute;
      right:-3px;
      bottom:-3px;
      min-width:17px;
      height:17px;
      display:grid;
      place-items:center;
      padding:0 3px;
      border:1px solid rgba(232,184,98,.34);
      border-radius:999px;
      background:#171008;
      color:#e8b862;
      font-size:7px;
      line-height:1;
      font-weight:900;
      box-sizing:border-box;
    }

    .sm-lang-glyph{
      width:24px;
      height:24px;
      position:relative;
      display:grid;
      place-items:center;
      border:1px solid rgba(232,184,98,.55);
      border-radius:50%;
      background:
        radial-gradient(circle at 35% 30%,rgba(232,184,98,.18),transparent 45%),
        rgba(22,14,8,.72);
      box-shadow:
        inset 0 0 0 2px rgba(232,184,98,.045),
        0 0 15px rgba(216,169,88,.08);
    }

    .sm-lang-glyph b{
      position:absolute;
      right:4px;
      top:2px;
      color:#efc86f;
      font-size:12px;
      line-height:1;
      font-weight:900;
    }

    .sm-lang-glyph i{
      position:absolute;
      left:4px;
      bottom:3px;
      color:#d3c5b4;
      font-size:8px;
      line-height:1;
      font-weight:900;
      font-style:normal;
    }

    .sm-header-icon-btn svg{
      width:19px;
      height:19px;
      display:block;
      stroke:#e8b862;
      stroke-width:1.8;
      fill:none;
      stroke-linecap:round;
      stroke-linejoin:round;
    }

    #smLangs.sm-lang-menu{
      position:absolute;
      z-index:75;
      top:45px;
      right:0;
      width:132px;
      display:none !important;
      gap:5px;
      padding:6px;
      border:1px solid rgba(232,184,98,.2);
      border-radius:12px;
      background:rgba(8,5,3,.92);
      box-shadow:0 16px 38px rgba(0,0,0,.34);
      backdrop-filter:blur(18px);
      -webkit-backdrop-filter:blur(18px);
      direction:rtl;
      box-sizing:border-box;
    }

    #smLangs.sm-lang-menu.open{display:grid!important}

    .sm-lang-menu button{
      width:100%;
      min-height:34px;
      border:0;
      border-radius:8px;
      background:transparent;
      color:#d8d1c9;
      font:inherit;
      font-size:11px;
      cursor:pointer;
    }

    .sm-lang-menu button.active{
      background:rgba(232,184,98,.12);
      color:#e8b862;
      font-weight:900;
    }

    .sm-header-tools .sm-search-wrap{
      position:absolute!important;
      z-index:76;
      top:45px;
      right:0;
      width:min(330px,calc(100vw - 20px))!important;
      margin:0!important;
      padding:7px!important;
      display:none!important;
      grid-template-columns:1fr!important;
      gap:5px!important;
      border-radius:12px!important;
      background:rgba(8,5,3,.94)!important;
      box-shadow:0 16px 38px rgba(0,0,0,.34);
      box-sizing:border-box;
    }

    .sm-header-tools .sm-search-wrap.open{display:grid!important}

    .sm-search-row{
      display:grid;
      grid-template-columns:auto minmax(0,1fr) auto;
      align-items:center;
      gap:7px;
      min-width:0;
    }

    .sm-header-tools .sm-search-input{
      min-width:0;
      width:100%;
      font-size:16px!important;
    }

    .sm-header-tools .sm-search-count{
      width:100%!important;
      margin:0!important;
      min-height:0!important;
      padding:0 4px 1px;
      font-size:8px!important;
      text-align:center;
      box-sizing:border-box;
    }

    .sm-header .sm-logo-wrap{overflow:visible!important}

    .sm-header h1::after{
      content:"";
      display:block;
      width:clamp(92px,28vw,150px);
      height:1px;
      margin:10px auto 7px;
      background:
        linear-gradient(
          90deg,
          transparent 0%,
          rgba(196,139,52,.45) 18%,
          #efc86f 50%,
          rgba(196,139,52,.45) 82%,
          transparent 100%
        );
      box-shadow:0 0 10px rgba(232,184,98,.16);
    }

    #smSubtitle{
      letter-spacing:.15px;
      text-shadow:0 1px 8px rgba(0,0,0,.28);
    }

    .sm-header .sm-logo{
      animation:smLogoWaveV44 4.6s ease-in-out infinite;
      transform-origin:50% 68%;
      will-change:transform;
    }

    @keyframes smLogoWaveV44{
      0%,100%{transform:translateY(0) rotate(0deg) scale(1)}
      22%{transform:translateY(-3px) rotate(-1.2deg) scale(1.014)}
      48%{transform:translateY(1px) rotate(.9deg) scale(.998)}
      74%{transform:translateY(-2px) rotate(1.1deg) scale(1.01)}
    }

    @media(prefers-reduced-motion:reduce){
      .sm-header .sm-logo{animation:none!important}
    }

    .sm-news-ticker{
      direction:rtl;
      width:min(calc(100% - 18px),680px);
      height:30px;
      display:none;
      align-items:stretch;
      margin:0 auto 9px;
      border:1px solid rgba(232,184,98,.22);
      border-radius:9px;
      background:rgba(12,8,5,.48);
      overflow:hidden;
      box-sizing:border-box;
      box-shadow:0 7px 22px rgba(0,0,0,.12);
      backdrop-filter:blur(10px);
      -webkit-backdrop-filter:blur(10px);
    }

    .sm-news-label{
      flex:0 0 auto;
      min-width:43px;
      display:grid;
      place-items:center;
      padding:0 7px;
      background:linear-gradient(135deg,#edc46d,#c98e2d);
      color:#171008;
      font-size:8px;
      font-weight:1000;
      white-space:nowrap;
    }

    .sm-news-window{
      flex:1 1 auto;
      min-width:0;
      overflow:hidden;
      display:flex;
      align-items:center;
      justify-content:flex-start;
      direction:rtl;
    }

    .sm-news-track{
      display:flex;
      align-items:center;
      direction:rtl;
      width:max-content;
      min-width:max-content;
      white-space:nowrap;
      will-change:transform;
      animation:smNewsTickerV44 var(--sm-news-duration,16s) linear infinite;
    }

    .sm-news-copy{
      display:inline-flex;
      align-items:center;
      gap:18px;
      min-width:max-content;
      padding:0 8px;
      color:#e4d9cd;
      font-size:9.5px;
      font-weight:700;
    }

    .sm-news-dot{color:#d7a54c;font-size:8px}

    @keyframes smNewsTickerV44{
      from{transform:translateX(0)}
      to{transform:translateX(-50%)}
    }

    @media(max-width:650px){
      .sm-header-tools{
        top:calc(7px + env(safe-area-inset-top));
        right:8px;
        gap:6px;
      }

      .sm-header-icon-btn{
        width:36px;
        height:36px;
        border-radius:11px;
        font-size:16px;
      }

      .sm-lang-menu,
      .sm-header-tools .sm-search-wrap{top:43px}
    }
  `;

  document.head.appendChild(style);
}


function ensureHeaderTools(){
  const header=document.querySelector(".sm-header");
  if(!header)return null;

  let tools=document.getElementById("smHeaderTools");
  if(!tools){
    tools=document.createElement("div");
    tools.id="smHeaderTools";
    tools.className="sm-header-tools";
    header.appendChild(tools);
  }

  let searchToggle=document.getElementById("smSearchToggle");
  if(!searchToggle){
    searchToggle=document.createElement("button");
    searchToggle.id="smSearchToggle";
    searchToggle.type="button";
    searchToggle.className="sm-header-icon-btn";
    searchToggle.innerHTML=`
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="10.5" cy="10.5" r="5.5"></circle>
        <path d="M14.8 14.8 20 20"></path>
      </svg>
    `;
    searchToggle.setAttribute("aria-label","Search");
    tools.appendChild(searchToggle);
  }

  let langToggle=document.getElementById("smLangToggle");
  if(!langToggle){
    langToggle=document.createElement("button");
    langToggle.id="smLangToggle";
    langToggle.type="button";
    langToggle.className="sm-header-icon-btn";
    langToggle.setAttribute("aria-label","Language");
    tools.appendChild(langToggle);
  }

  const langHolder=document.getElementById("smLangs");
  if(langHolder && langHolder.parentElement!==tools){
    tools.appendChild(langHolder);
  }

  return tools;
}


function setLanguageMenuOpen(open){
  const menu=document.getElementById("smLangs");
  if(menu)menu.classList.toggle("open",!!open);
}


function setSearchPanelOpen(open,{clear=false}={}){
  const wrap=document.getElementById("smSearchWrap");
  if(!wrap)return;

  if(clear){
    const input=document.getElementById("smSearchInput");
    if(input)input.value="";
    searchQuery="";
    searchTracked=false;
    render();
    updateSearchCount();
  }

  wrap.classList.toggle("open",!!open);

  if(open){
    setLanguageMenuOpen(false);
    setTimeout(()=>document.getElementById("smSearchInput")?.focus(),40);
  }
}


function normalizeSearchText(value){
  return String(value||"")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g,"")
    .replace(/[أإآ]/g,"ا")
    .replace(/ة/g,"ه")
    .replace(/ى/g,"ي")
    .replace(/\s+/g," ")
    .trim();
}


function productMatchesSearch(product,query){
  const q=normalizeSearchText(query);

  if(!q)return true;

  const parts=[
    product.name?.ar,
    product.name?.ku,
    product.name?.en,
    product.category?.ar,
    product.category?.ku,
    product.category?.en,
    ...(product.options||[]).flatMap(option=>[
      option.ar,
      option.ku,
      option.en
    ])
  ];

  return normalizeSearchText(
    parts.filter(Boolean).join(" ")
  ).includes(q);
}


function ensureSearchUI(){
  const tools=ensureHeaderTools();
  if(!tools)return;

  let wrap=document.getElementById("smSearchWrap");

  if(!wrap){
    wrap=document.createElement("div");
    wrap.id="smSearchWrap";
    wrap.className="sm-search-wrap";

    wrap.innerHTML=`
      <div class="sm-search-row">
        <span class="sm-search-icon">⌕</span>
        <input id="smSearchInput" class="sm-search-input" type="search" autocomplete="off" enterkeyhint="search">
        <button id="smSearchClear" class="sm-search-clear" type="button" aria-label="Close search">×</button>
      </div>
      <div id="smSearchCount" class="sm-search-count"></div>
    `;

    tools.appendChild(wrap);

    const input=document.getElementById("smSearchInput");
    const clear=document.getElementById("smSearchClear");

    input.addEventListener("input",()=>{
      const next=input.value.trim();
      const wasEmpty=!searchQuery;
      searchQuery=next;

      if(next && wasEmpty && !searchTracked){
        searchTracked=true;
        trackMenuEvent("search_use");
      }

      if(!next)searchTracked=false;

      render();
      updateSearchCount();
    });

    clear.addEventListener("click",()=>{
      setSearchPanelOpen(false,{clear:true});
    });
  }

  const searchToggle=document.getElementById("smSearchToggle");
  if(searchToggle && !searchToggle.dataset.bound){
    searchToggle.dataset.bound="1";
    searchToggle.addEventListener("click",event=>{
      event.stopPropagation();
      const open=!wrap.classList.contains("open");
      setSearchPanelOpen(open);
    });
  }

  const langToggle=document.getElementById("smLangToggle");
  if(langToggle && !langToggle.dataset.bound){
    langToggle.dataset.bound="1";
    langToggle.addEventListener("click",event=>{
      event.stopPropagation();
      const menu=document.getElementById("smLangs");
      const open=!menu?.classList.contains("open");
      setSearchPanelOpen(false);
      setLanguageMenuOpen(open);
    });
  }

  updateSearchUiLanguage();
}

function updateSearchUiLanguage(){
  const input=document.getElementById("smSearchInput");
  if(input)input.placeholder=I18N[lang].search;

  const toggle=document.getElementById("smSearchToggle");
  if(toggle){
    toggle.setAttribute(
      "aria-label",
      lang==="en" ? "Search menu" : lang==="ku" ? "لێگەڕان" : "البحث في المنيو"
    );
  }
}


function updateSearchCount(count=null){
  const holder=document.getElementById("smSearchCount");
  if(!holder)return;

  if(!searchQuery){
    holder.textContent="";
    return;
  }

  const total=count===null
    ? DB.products.filter(p=>productMatchesSearch(p,searchQuery)).length
    : count;

  holder.textContent=
    lang==="en"
      ? `${total} result${total===1?"":"s"}`
      : lang==="ku"
        ? `${total} ئەنجام`
        : `${total} نتيجة`;
}


function makeDeepLink(type,id){
  const cleanId=String(id||"").trim();
  const url=new URL(window.location.origin+window.location.pathname);
  url.searchParams.set(type,cleanId);
  if(type==="product")url.hash=`product-${cleanId}`;
  return url.toString();
}

async function shareMenuLink(url,title,eventType,refId){
  trackMenuEvent(eventType,refId);

  try{
    if(navigator.share){
      await navigator.share({
        title:title||document.title,
        url
      });
      return;
    }
  }catch(error){
    if(error?.name==="AbortError")return;
  }

  try{
    await navigator.clipboard.writeText(url);
  }catch(_){
    const area=document.createElement("textarea");
    area.value=url;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }

  const toast=document.getElementById("smCartToast");

  if(toast){
    toast.textContent=I18N[lang].copied;
    toast.classList.add("show");
    setTimeout(()=>toast.classList.remove("show"),1600);
  }
}


function setUrlForCategory(categoryId){
  const url=new URL(window.location.href);

  url.searchParams.delete("product");
  url.searchParams.delete("q");

  if(categoryId){
    url.searchParams.set("category",String(categoryId));
  }else{
    url.searchParams.delete("category");
  }

  history.replaceState(
    {},
    "",
    url.pathname+url.search
  );
}


function applyDeepLinkBeforeRender(){
  const params=new URLSearchParams(window.location.search);

  const productId=params.get("product");
  const categoryId=params.get("category");
  const q=params.get("q");

  if(q){
    searchQuery=q;
  }

  if(productId){
    const product=DB.products.find(p=>String(p.id)===String(productId));

    if(product?.category){
      active=product.category.ar;
      return;
    }
  }

  if(categoryId){
    const category=categories().find(c=>String(c.id)===String(categoryId));

    if(category){
      active=category.ar;
    }
  }
}


function scrollToDeepLink(){
  const productId=String(new URLSearchParams(window.location.search).get("product")||"").trim();
  if(!productId)return;
  const locate=()=>{
    const safeId=productId.replace(/"/g,'\\"');
    const card=document.querySelector(`[data-product-card="${safeId}"]`)||document.getElementById(`product-${productId}`);
    if(!card)return false;
    card.scrollIntoView({behavior:"smooth",block:"center"});
    card.classList.add("sm-deep-highlight");
    setTimeout(()=>card.classList.remove("sm-deep-highlight"),2400);
    return true;
  };
  [80,250,650,1200,2200].forEach(delay=>setTimeout(locate,delay));
}

function trackMenuEvent(type,refId="",languageValue=lang){
  if(
    typeof supabaseClient==="undefined" ||
    !supabaseClient
  ) return;

  supabaseClient
    .rpc(
      "track_menu_event",
      {
        p_event_type:String(type||""),
        p_ref_id:String(refId||""),
        p_language:String(languageValue||"")
      }
    )
    .then(({error})=>{
      if(error){
        console.debug("Analytics skipped:",error.message||error);
      }
    })
    .catch(()=>{});
}


function trackPageViewOnce(){
  const day=new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:"Asia/Baghdad",
      year:"numeric",
      month:"2-digit",
      day:"2-digit"
    }
  ).format(new Date());

  const key=`shorash:view:${day}`;

  if(sessionStorage.getItem(key))return;

  sessionStorage.setItem(key,"1");
  trackMenuEvent("menu_view");
}


function saveMenuOfflineCache(db){
  try{
    localStorage.setItem(
      "SHORASH_MENU_OFFLINE_CACHE_V1",
      JSON.stringify({
        saved_at:Date.now(),
        db
      })
    );
  }catch(_){}
}


function loadMenuOfflineCache(){
  try{
    const raw=localStorage.getItem("SHORASH_MENU_OFFLINE_CACHE_V1");
    if(!raw)return null;

    const parsed=JSON.parse(raw);

    if(
      !parsed?.db ||
      !Array.isArray(parsed.db.products)
    ) return null;

    return parsed.db;
  }catch(_){
    return null;
  }
}


function showOfflineDataBanner(){
  if(document.getElementById("smOfflineBanner"))return;

  const el=document.createElement("div");
  el.id="smOfflineBanner";
  el.className="sm-offline-banner";
  el.textContent=
    lang==="en"
      ?"Offline mode — showing last saved menu"
      :lang==="ku"
        ?"دۆخی ئۆفلاین — دوایین مینیو نیشان دەدرێت"
        :"وضع أوفلاين — نعرض آخر نسخة محفوظة";

  document.body.appendChild(el);

  setTimeout(()=>el.remove(),4500);
}


function registerPwa(){
  if(!("serviceWorker" in navigator))return;

  window.addEventListener(
    "load",
    ()=>{
      navigator.serviceWorker
        .register("./sw.js")
        .catch(error=>console.debug("SW:",error));
    },
    {once:true}
  );
}


const UI_DESIGN_DEFAULTS={card_height:160,image_percent:50,card_glass_transparency:0,card_radius:18,card_gap:10,info_padding:10,product_name_font:14,option_font:10.5,price_font:11,section_title_font:21,add_button_height:30,add_button_font:10,category_height:41,category_font:12,top_action_height:48,top_action_font:11,cart_width:180,cart_height:56,cart_font:13,cart_horizontal:50,cart_bottom:16,logo_size:84,menu_title_font:26,subtitle_font:12,search_height:46,search_font:16,footer_title_font:17,footer_action_font:10.5,footer_phone_font:17};
function uiDesignValue(k){const v=Number(DB?.restaurant?.uiDesign?.[k]);return Number.isFinite(v)?v:UI_DESIGN_DEFAULTS[k]}
function applyUiDesignSettings(){
  if(!DB)return;
  const root=document.documentElement;
  ['card_height','card_radius','card_gap','info_padding','product_name_font','option_font','price_font','section_title_font','add_button_height','add_button_font','category_height','category_font','top_action_height','top_action_font','cart_width','cart_height','cart_font','cart_bottom','logo_size','menu_title_font','subtitle_font','search_height','search_font','footer_title_font','footer_action_font','footer_phone_font'].forEach(k=>root.style.setProperty(`--sm-ui-${k.replaceAll('_','-')}`,`${uiDesignValue(k)}px`));
  root.style.setProperty('--sm-ui-image-percent',`${uiDesignValue('image_percent')}%`);
  root.style.setProperty('--sm-ui-info-percent',`${100-uiDesignValue('image_percent')}%`);

  const cardGlassTransparency=
    Math.max(
      0,
      Math.min(
        100,
        uiDesignValue('card_glass_transparency')
      )
    );

  /*
    V4.5.2:
    0% = EXACT footer glass alphas (.91 / .88)
    100% = fully transparent.
    New key intentionally ignores the old V4.4/V4.5 transparency value.
  */
  const glassFactor=
    1-(cardGlassTransparency/100);

  root.style.setProperty(
    '--sm-ui-card-glass-a1',
    String(
      Math.round(.91*glassFactor*1000)/1000
    )
  );

  root.style.setProperty(
    '--sm-ui-card-glass-a2',
    String(
      Math.round(.88*glassFactor*1000)/1000
    )
  );

  root.style.setProperty('--sm-ui-cart-horizontal',`${uiDesignValue('cart_horizontal')}%`);
  let style=document.getElementById('smUiDesignRuntime');if(!style){style=document.createElement('style');style.id='smUiDesignRuntime';document.head.appendChild(style)}
  style.textContent=`
    @media(max-width:768px){
      .sm-grid{gap:var(--sm-ui-card-gap,10px)!important}
      html[dir="ltr"] .sm-card{grid-template-columns:var(--sm-ui-image-percent,50%) var(--sm-ui-info-percent,50%)!important}
      html[dir="rtl"] .sm-card{grid-template-columns:var(--sm-ui-info-percent,50%) var(--sm-ui-image-percent,50%)!important}
      .sm-card{
        position:relative!important;
        isolation:isolate!important;
        overflow:hidden!important;

        grid-template-rows:var(--sm-ui-card-height,160px)!important;
        height:var(--sm-ui-card-height,160px)!important;
        min-height:var(--sm-ui-card-height,160px)!important;
        max-height:var(--sm-ui-card-height,160px)!important;

        border-radius:var(--sm-ui-card-radius,18px)!important;
      }

      /*
        V4.5.3:
        Background / border / blur / shadow are NOT hard-coded here.
        They are copied from the live rendered footer with inline !important
        by syncProductGlassFromLiveFooter().
      */

      .sm-card::before,
      .sm-card::after{
        content:none!important;
        display:none!important;
        background:none!important;
        background-image:none!important;
        box-shadow:none!important;
      }

      .sm-card .sm-img,.sm-card .sm-info{
        height:var(--sm-ui-card-height,160px)!important;
        min-height:var(--sm-ui-card-height,160px)!important;
        max-height:var(--sm-ui-card-height,160px)!important;
      }

      .sm-card .sm-info,
      .sm-cold-card .sm-info{
        position:relative!important;
        z-index:10!important;

        padding:var(--sm-ui-info-padding,10px)!important;

        background:transparent!important;
        background-image:none!important;

        box-shadow:none!important;

        backdrop-filter:none!important;
        -webkit-backdrop-filter:none!important;
      }

      /* Remove every old text-side glass layer.
         Only the full .sm-card glass remains. */
      .sm-card .sm-info::before,
      .sm-card .sm-info::after,
      .sm-cold-card .sm-info::before,
      .sm-cold-card .sm-info::after{
        content:none!important;
        display:none!important;
        background:none!important;
        background-image:none!important;
        box-shadow:none!important;
        backdrop-filter:none!important;
        -webkit-backdrop-filter:none!important;
      }

      .sm-card .sm-img{
        position:relative!important;
        z-index:5!important;

        width:100%!important;
        min-width:0!important;
        max-width:100%!important;

        overflow:hidden!important;
        background:transparent!important;
      }

      /* No separate image overlay; the card itself provides the glass/reflection. */
      .sm-card .sm-img::before,
      .sm-card .sm-img::after{
        content:none!important;
        display:none!important;
        background:none!important;
      }

      .sm-card .sm-img img,.sm-card .sm-product-image{
        position:relative!important;
        z-index:1;
        display:block!important;
        width:100%!important;
        height:100%!important;
        min-width:0!important;
        min-height:0!important;
        max-width:none!important;
        max-height:none!important;
        object-fit:cover!important;
        object-position:center center!important;

        filter:
          saturate(1.025)
          contrast(1.018)
          brightness(.985)!important;

        margin:0!important;
        padding:0!important;
        transform:none!important;
      }

      .sm-options-scroll{
        flex:1 1 auto;
        min-height:0;
        max-height:100%;
        overflow-y:auto;
        overflow-x:hidden;
        -webkit-overflow-scrolling:touch;
        overscroll-behavior:contain;
        scrollbar-width:thin;
        scrollbar-color:rgba(226,181,94,.48) transparent;
        padding-inline-end:3px;
        margin-inline-end:-3px;
      }

      .sm-options-scroll::-webkit-scrollbar{width:3px}
      .sm-options-scroll::-webkit-scrollbar-thumb{
        background:rgba(226,181,94,.48);
        border-radius:999px;
      }
      .sm-options-scroll .sm-option:last-child{border-bottom:0}
      .sm-card .sm-info{
        display:flex!important;
        flex-direction:column!important;
        justify-content:center!important;
        min-width:0!important;
        overflow:hidden!important;
      }

      .sm-card .sm-name{
        flex:0 0 auto;
        font-size:var(--sm-ui-product-name-font,14px)!important;
      }

      .sm-card .sm-option{
        font-size:var(--sm-ui-option-font,10.5px)!important;
      }
      .sm-card .sm-price{font-size:var(--sm-ui-price-font,11px)!important}
      .sm-section-title{font-size:var(--sm-ui-section-title-font,21px)!important}
      .sm-card .sm-choose-options,.sm-card .sm-direct-add{min-height:var(--sm-ui-add-button-height,30px)!important;font-size:var(--sm-ui-add-button-font,10px)!important}
      #smCats .sm-cat,.sm-cats .sm-cat{height:var(--sm-ui-category-height,41px)!important;min-height:var(--sm-ui-category-height,41px)!important;font-size:var(--sm-ui-category-font,12px)!important}
      .sm-quick-actions a,#smActions a{min-height:var(--sm-ui-top-action-height,48px)!important;font-size:var(--sm-ui-top-action-font,11px)!important}
      .sm-quick-actions a b,#smActions a b{font-size:var(--sm-ui-top-action-font,11px)!important}
      .sm-logo,.sm-intro-logo-wrap{width:var(--sm-ui-logo-size,84px)!important;height:var(--sm-ui-logo-size,84px)!important}
      .sm-header h1,.sm-hero h1,.sm-title{font-size:var(--sm-ui-menu-title-font,26px)!important}
      #smSubtitle,#smHeroSubtitle,.sm-subtitle{font-size:var(--sm-ui-subtitle-font,12px)!important}
      .sm-search-wrap{min-height:var(--sm-ui-search-height,46px)!important}
      .sm-search-input{font-size:max(16px,var(--sm-ui-search-font,16px))!important}
      .sm-footer h2,.sm-footer-brand strong{font-size:var(--sm-ui-footer-title-font,17px)!important}
      .sm-footer-main-actions a,.sm-footer-actions a{font-size:var(--sm-ui-footer-action-font,10.5px)!important}
      .sm-footer-phone,.sm-phone{font-size:var(--sm-ui-footer-phone-font,17px)!important}
    }`;
}

// ==========================================
// V4.5.3 — LIVE FOOTER GLASS ENGINE
// ==========================================

let footerGlassObserver=null;
let footerGlassRaf=0;


function multiplyRgbaAlpha(cssText,factor){

  if(
    !cssText ||
    cssText==="none"
  ){
    return cssText;
  }


  const cleanFactor=
    Math.max(
      0,
      Math.min(
        1,
        Number(factor)
      )
    );


  // rgba(12, 10, 7, 0.54)
  let result=
    String(cssText).replace(
      /rgba\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)/gi,
      (_,r,g,b,a)=>{
        const next=
          Math.max(
            0,
            Math.min(
              1,
              Number(a)*cleanFactor
            )
          );

        return `rgba(${r}, ${g}, ${b}, ${Math.round(next*1000)/1000})`;
      }
    );


  // rgba modern syntax: rgba(12 10 7 / 0.54)
  result=
    result.replace(
      /rgba\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*\/\s*([0-9.]+)\s*\)/gi,
      (_,r,g,b,a)=>{
        const next=
          Math.max(
            0,
            Math.min(
              1,
              Number(a)*cleanFactor
            )
          );

        return `rgba(${r} ${g} ${b} / ${Math.round(next*1000)/1000})`;
      }
    );


  return result;
}


function footerGlassSnapshot(){

  const footer=
    document.querySelector(
      ".sm-footer"
    );


  if(!footer)return null;


  const style=
    getComputedStyle(
      footer
    );


  return {
    backgroundImage:
      style.backgroundImage,

    backgroundColor:
      style.backgroundColor,

    borderTop:
      style.borderTop,

    borderRight:
      style.borderRight,

    borderBottom:
      style.borderBottom,

    borderLeft:
      style.borderLeft,

    boxShadow:
      style.boxShadow,

    backdropFilter:
      style.backdropFilter ||
      "none",

    webkitBackdropFilter:
      style.webkitBackdropFilter ||
      style.getPropertyValue(
        "-webkit-backdrop-filter"
      ) ||
      "none"
  };
}


function syncProductGlassFromLiveFooter(){

  if(!DB)return;


  const snapshot=
    footerGlassSnapshot();


  if(!snapshot)return;


  const transparency=
    Math.max(
      0,
      Math.min(
        100,
        uiDesignValue(
          "card_glass_transparency"
        )
      )
    );


  /*
    0%   = exact live footer.
    100% = same footer recipe, but background alpha becomes 0.
    Blur, border and shadow stay footer-style.
  */
  const factor=
    1-(transparency/100);


  const backgroundImage=
    multiplyRgbaAlpha(
      snapshot.backgroundImage,
      factor
    );


  const backgroundColor=
    multiplyRgbaAlpha(
      snapshot.backgroundColor,
      factor
    );


  document
    .querySelectorAll(
      "#smMenu .sm-card"
    )
    .forEach(card=>{

      /*
        INLINE !important deliberately beats:
        - style.css
        - category-specific .sm-*-card backgrounds
        - old mobile CSS
        - any previous runtime style
      */
      card.style.setProperty(
        "background-image",
        backgroundImage || "none",
        "important"
      );

      card.style.setProperty(
        "background-color",
        backgroundColor || "transparent",
        "important"
      );


      card.style.setProperty(
        "border-top",
        snapshot.borderTop,
        "important"
      );

      card.style.setProperty(
        "border-right",
        snapshot.borderRight,
        "important"
      );

      card.style.setProperty(
        "border-bottom",
        snapshot.borderBottom,
        "important"
      );

      card.style.setProperty(
        "border-left",
        snapshot.borderLeft,
        "important"
      );


      card.style.setProperty(
        "box-shadow",
        snapshot.boxShadow,
        "important"
      );


      card.style.setProperty(
        "backdrop-filter",
        snapshot.backdropFilter,
        "important"
      );

      card.style.setProperty(
        "-webkit-backdrop-filter",
        snapshot.webkitBackdropFilter,
        "important"
      );


      // Absolutely no second background behind the text.
      const info=
        card.querySelector(
          ".sm-info"
        );

      if(info){
        info.style.setProperty(
          "background",
          "transparent",
          "important"
        );

        info.style.setProperty(
          "background-image",
          "none",
          "important"
        );

        info.style.setProperty(
          "box-shadow",
          "none",
          "important"
        );

        info.style.setProperty(
          "backdrop-filter",
          "none",
          "important"
        );

        info.style.setProperty(
          "-webkit-backdrop-filter",
          "none",
          "important"
        );
      }
    });


  document.documentElement.dataset.smGlassSource=
    "live-footer";
}


function scheduleFooterGlassSync(){

  cancelAnimationFrame(
    footerGlassRaf
  );


  footerGlassRaf=
    requestAnimationFrame(
      syncProductGlassFromLiveFooter
    );
}


function initFooterGlassSync(){

  const menu=
    document.getElementById(
      "smMenu"
    );


  if(!menu)return;


  footerGlassObserver?.disconnect();


  footerGlassObserver=
    new MutationObserver(
      scheduleFooterGlassSync
    );


  footerGlassObserver.observe(
    menu,
    {
      childList:true,
      subtree:true
    }
  );


  window.addEventListener(
    "resize",
    scheduleFooterGlassSync,
    {
      passive:true
    }
  );


  scheduleFooterGlassSync();

  setTimeout(
    scheduleFooterGlassSync,
    80
  );

  setTimeout(
    scheduleFooterGlassSync,
    350
  );
}


function installMenuCardPolish(){
  if(document.getElementById("smMenuCardPolishV38"))return;

  const style=document.createElement("style");
  style.id="smMenuCardPolishV38";
  style.textContent=`
    @media(max-width:768px){
      .sm-card{
        grid-template-rows:160px !important;
        height:160px !important;
        min-height:160px !important;
        max-height:160px !important;
      }
      .sm-card .sm-img,.sm-card .sm-info{
        height:160px !important;
        min-height:160px !important;
        max-height:160px !important;
      }
      .sm-card .sm-info{padding:11px 10px !important}
      .sm-card .sm-name{font-size:14px !important;line-height:1.35 !important;margin-bottom:5px !important}
      .sm-card .sm-option{font-size:10.5px !important;line-height:1.45 !important}
      .sm-card .sm-price{font-size:11px !important;line-height:1.35 !important}
      .sm-card .sm-choose-options,.sm-card .sm-direct-add{min-height:30px !important;font-size:10px !important}
      .sm-schedule-note{margin-top:4px;font-size:8.5px;line-height:1.45;color:rgba(232,184,98,.82)}
    }
  `;
  document.head.appendChild(style);
}

function iraqMinutesNow(){
  const parts=new Intl.DateTimeFormat("en-GB",{
    timeZone:"Asia/Baghdad",
    hour:"2-digit",
    minute:"2-digit",
    hour12:false
  }).formatToParts(new Date());

  const h=Number(parts.find(p=>p.type==="hour")?.value||0);
  const m=Number(parts.find(p=>p.type==="minute")?.value||0);
  return h*60+m;
}

function timeToMinutes(value){
  const match=String(value||"").match(/^(\d{1,2}):(\d{2})/);
  if(!match)return null;
  const h=Number(match[1]),m=Number(match[2]);
  if(!Number.isFinite(h)||!Number.isFinite(m))return null;
  return h*60+m;
}

function scheduledAvailability(product){
  if(product?.availability_schedule_enabled!==true){
    return true;
  }

  const from=timeToMinutes(product.available_from);
  const to=timeToMinutes(product.available_to);

  if(from===null||to===null||from===to){
    return true;
  }

  const now=iraqMinutesNow();

  return from<to
    ? now>=from&&now<to
    : now>=from||now<to;
}

function productScheduleText(product){
  if(
    product?.availability_schedule_enabled!==true ||
    !product.available_from ||
    !product.available_to
  ) return "";

  const from=String(product.available_from).slice(0,5);
  const to=String(product.available_to).slice(0,5);

  if(lang==="en")return `Available ${from}–${to}`;
  if(lang==="ku")return `بەردەستە ${from}–${to}`;
  return `متوفر ${from}–${to}`;
}

function refreshScheduledAvailability(){
  if(!DB?.products)return;

  DB.products.forEach(product=>{
    const scheduleUnavailable=
      product.availability_schedule_enabled===true &&
      scheduledAvailability(product)===false;

    const categoryScheduleUnavailable=
      product.category?.availability_schedule_enabled===true &&
      scheduledAvailability(product.category)===false;

    product.badges.unavailable=
      product.manualUnavailable===true ||
      categoryScheduleUnavailable ||
      scheduleUnavailable;

    if(categoryScheduleUnavailable){
      const from=String(product.category.available_from||"").slice(0,5);
      const to=String(product.category.available_to||"").slice(0,5);

      product.scheduleText=
        lang==="en"
          ? `Category available ${from}–${to}`
          : lang==="ku"
            ? `بەشەکە بەردەستە ${from}–${to}`
            : `القسم متوفر ${from}–${to}`;
    }else{
      product.scheduleText=
        productScheduleText(product);
    }
  });

  render();
}


function restaurantNameForLang(targetLang=lang) {

  const restaurant =
    DB?.restaurant || {};


  if (targetLang === "ar") {
    return String(
      restaurant.nameAr ??
      restaurant.name ??
      restaurant.nameEn ??
      ""
    ).trim();
  }


  if (targetLang === "ku") {
    return String(
      restaurant.nameKu ??
      restaurant.nameAr ??
      restaurant.name ??
      restaurant.nameEn ??
      ""
    ).trim();
  }


  return String(
    restaurant.nameEn ??
    restaurant.name ??
    restaurant.nameAr ??
    ""
  ).trim();
}


function formatRestaurantTemplate(value,targetLang=lang) {

  let text =
    String(value ?? "");

  const currentName =
    restaurantNameForLang(targetLang);


  text =
    text.replaceAll(
      "{name}",
      currentName
    );


  // Backward compatibility with old saved SHORASH text.
  const oldBrandPatterns =
    targetLang === "en"
      ? [/SHORASH/gi,/Shorash/g]
      : [/شوراش/g,/شورش/g,/SHORASH/gi];


  oldBrandPatterns.forEach(pattern => {
    text =
      text.replace(
        pattern,
        currentName
      );
  });


  return text
    .replace(/\s{2,}/g," ")
    .trim();
}


/* ========================================
   CATEGORY EFFECTS
======================================== */

function effect(category) {

  const k = category?.ar || "";

  const effects = {

    "فطور صباحي": "sm-breakfast-card",

    "منسف": "sm-mansaf-card",

    "الأطباق الشرقية": "sm-eastern-card",
    "الاطباق الشرقية": "sm-eastern-card",

    "مشاوي": "sm-grill-card",

    "قلية": "sm-qalya-card",

    "الوجبات الغربية": "sm-western-card",

    "بركر": "sm-burger-card",

    "بيتزا": "sm-pizza-card",

    "السندويشات": "sm-sandwich-card",
    "سندويشات": "sm-sandwich-card",

    /* ❄️ Cold drinks */
    "مشروبات باردة": "sm-cold-card",
    "مشروبات بارده": "sm-cold-card",
    "المشروبات الباردة": "sm-cold-card",
    "المشروبات بارده": "sm-cold-card",

    "القهوة": "sm-coffee-card",

    "القهوة الباردة": "sm-icedcoffee-card",
    "القهوة بارده": "sm-icedcoffee-card",

    "موهيتو": "sm-mojito-card",

    "سموذي": "sm-smoothie-card",

    "ميلك شيك": "sm-milkshake-card",

    "حلويات": "sm-dessert-card"
  };

  return effects[k] || "";
}


/* ========================================
   CATEGORIES
======================================== */

function categories() {

  const map = new Map();

  DB.products.forEach(product => {

    if (
      !product.category ||
      !product.category.ar
    ) return;

    if (!map.has(product.category.ar)) {
      map.set(
        product.category.ar,
        product.category
      );
    }

  });

  return [...map.values()].sort(
    (a, b) =>
      Number(a.order || 999) -
      Number(b.order || 999)
  );
}


function renderCats() {

  const rail = $("#smCats");
  const sentinel = $("#smCatsSentinel");

  if (!rail) return;


  const show =
    DB?.restaurant?.display?.categoryNav !== false;


  rail.style.display =
    show
      ? ""
      : "none";


  if (sentinel && !show) {
    sentinel.style.height = "0";
  }


  if (!show) {
    rail.classList.remove("fixed");
    catsFixed = false;
    return;
  }


  const savedScroll = rail.scrollLeft;

  rail.innerHTML = categories()
    .map(category => `
      <button
        class="sm-cat ${category.ar === active ? "active" : ""}"
        data-cat="${category.ar}"
        data-cat-id="${category.id}">
        ${txt(category)}
      </button>
    `)
    .join("");


  requestAnimationFrame(() => {
    rail.scrollLeft = savedScroll;
  });
}


/* ========================================
   BADGES
======================================== */

function badges(product) {

  const b = product.badges || {};

  let html = "";

  if (b.popular) {

    html += `
      <span class="sm-display-badge gold">
        ⭐ ${I18N[lang].popular}
      </span>
    `;

  }

  if (b.new) {

    html += `
      <span class="sm-display-badge">
        ✨ ${I18N[lang].fresh}
      </span>
    `;

  }

  if (b.hot) {

    html += `
      <span class="sm-display-badge red">
        🔥 ${I18N[lang].hot}
      </span>
    `;

  }

  if (b.offer) {

    html += `
      <span class="sm-display-badge offer">
        🏷 ${I18N[lang].offer}
      </span>
    `;

  }

  if (!html) return "";

  return `
    <div class="sm-badges">
      ${html}
    </div>
  `;
}


/* ========================================
   PRODUCT CARD
======================================== */

function productCard(product) {

  const b = product.badges || {};

  const classes = [
    "sm-card",
    "sm-reveal",
    effect(product.category),

    b.popular
      ? "sm-popular-card"
      : "",

    b.hot
      ? "sm-hot-card"
      : ""
  ]
    .filter(Boolean)
    .join(" ");


  const productOptions = product.options || [];
  const hasVariants = productOptions.length > 1;

  const optionRows = productOptions
    .map((option, optionIndex) => {

      const optionName = txt(option);

      return `
        <div class="sm-option">
          <span>${optionName}</span>

          <div class="sm-option-buy">
            <b class="sm-price">${money(option.price)}</b>
            ${""}
          </div>
        </div>
      `;
    })
    .join("");

  const options =
    optionRows
      ? `<div class="sm-options-scroll">${optionRows}</div>`
      : "";

  const variantButton = b.unavailable ? "" : hasVariants
    ? `<button class="sm-choose-options" type="button" data-product-id="${product.id}">
         <span>+</span><b>${lang === "en" ? "Choose" : lang === "ku" ? "هەڵبژێرە" : "اختيار"}</b>
       </button>`
    : `<button class="sm-direct-add" type="button" data-product-id="${product.id}" data-option-index="0">
         <span>+</span><b>${lang === "en" ? "Add to cart" : lang === "ku" ? "زیادکردن بۆ سەبەتە" : "إضافة للسلة"}</b>
       </button>`;


  return `
    <article
      id="product-${product.id}"
      class="${classes}"
      data-product-card="${product.id}"
    >

      <button
        class="sm-share-product"
        type="button"
        data-share-product="${product.id}"
        aria-label="${I18N[lang].share}">
        ↗
      </button>

      ${badges(product)}

      ${
        b.unavailable
          ? `
            <div class="sm-off">
              ${I18N[lang].unavailable}
            </div>
          `
          : ""
      }

      <div class="sm-img">

        <img
          class="sm-product-image"
          data-full-image="${product.image || ""}"
          data-product-name="${txt(product.name)}"
          loading="lazy"
          decoding="async"
          src="${product.image || ""}"
          alt="${txt(product.name)}"
        >

      </div>

      <div class="sm-info">

        <div class="sm-name">
          ${txt(product.name)}
        </div>

        ${
          searchQuery
            ? `<div class="sm-search-category">${txt(product.category)}</div>`
            : ""
        }

        ${options}

        ${
          b.unavailable && product.scheduleText
            ? `<div class="sm-schedule-note">${product.scheduleText}</div>`
            : ""
        }

        ${variantButton}

      </div>

    </article>
  `;
}


/* ========================================
   MENU
======================================== */

function render() {

  const menu=$("#smMenu");

  if(!menu||!DB)return;


  if(searchQuery){

    const products=DB.products.filter(
      product=>productMatchesSearch(product,searchQuery)
    );

    updateSearchCount(products.length);


    if(!products.length){
      menu.innerHTML=`
        <section class="sm-section">
          <div class="analytics-empty" style="padding:30px 12px;text-align:center;color:#9a9188;">
            ${I18N[lang].noResults}
          </div>
        </section>
      `;
      return;
    }


    menu.innerHTML=`
      <section class="sm-section">

        <div class="sm-section-head">
          <h2 class="sm-section-title">
            ${I18N[lang].searchResults}
          </h2>
        </div>

        <div class="sm-grid">
          ${products.map(productCard).join("")}
        </div>

      </section>
    `;

    watchCards();
    scheduleFooterGlassSync();
    return;
  }


  const products=DB.products.filter(
    product=>
      product.category &&
      product.category.ar===active
  );


  if(!products.length){
    menu.innerHTML="";
    return;
  }


  const category=products[0].category;


  menu.innerHTML=`
    <section class="sm-section">

      <div class="sm-section-head">
        <h2 class="sm-section-title">
          ${txt(category)}
        </h2>

        <button
          class="sm-share-category"
          type="button"
          data-share-category="${category.id}"
          aria-label="${I18N[lang].share}">
          ↗
        </button>
      </div>

      <div class="sm-grid">
        ${products.map(productCard).join("")}
      </div>

    </section>
  `;


  watchCards();
  scheduleFooterGlassSync();
}

/* ========================================
   LANGUAGES
======================================== */

function renderLanguages() {
  ensureHeaderTools();

  const holder=$("#smLangs");
  const toggle=document.getElementById("smLangToggle");

  if(!holder)return;

  const show=
    DB?.restaurant?.display?.languageSwitch !== false;

  holder.className="sm-lang-menu";
  holder.removeAttribute("style");

  if(toggle){
    toggle.style.display=
      show
        ? "grid"
        : "none";

    toggle.innerHTML=`
      <span class="sm-lang-glyph" aria-hidden="true">
        <b>ع</b>
        <i>A</i>
      </span>
      <small class="sm-lang-code">${lang.toUpperCase()}</small>
    `;
  }

  if(!show){
    holder.style.setProperty(
      "display",
      "none",
      "important"
    );
    holder.innerHTML="";
    return;
  }

  holder.classList.remove("open");

  holder.innerHTML=`
    <button type="button" data-lang="ar" class="${lang==="ar"?"active":""}">عربي</button>
    <button type="button" data-lang="ku" class="${lang==="ku"?"active":""}">کوردی</button>
    <button type="button" data-lang="en" class="${lang==="en"?"active":""}">English</button>
  `;
}

/* ========================================
   TOP ACTIONS
======================================== */

function renderActions(){const holder=$("#smActions");if(!holder||!DB)return;const r=DB.restaurant||{},q=r.quickActions||{},a=[];if(q.location?.enabled!==false&&String(r.location||"").trim()&&r.location!=="#")a.push({icon:"📍",label:q.location?.label?.[lang]||I18N[lang].location,url:r.location});if(q.call?.enabled!==false&&String(r.phone||"").trim())a.push({icon:"☎",label:q.call?.label?.[lang]||I18N[lang].call,url:"tel:"+r.phone});if(q.whatsapp?.enabled!==false&&String(r.whatsapp||"").trim())a.push({icon:"💬",label:q.whatsapp?.label?.[lang]||I18N[lang].whatsapp,url:r.whatsapp});safeArray(r.customTopActions).forEach(i=>{const l=actionLabel(i),u=String(i?.url||"").trim();if(i?.enabled!==false&&l&&u)a.push({icon:String(i.icon||"🔗"),label:l,url:u})});holder.className="sm-quick-actions";holder.innerHTML=a.map(i=>`<a href="${escapeUi(i.url)}" ${/^https?:/i.test(i.url)?'target="_blank" rel="noopener"':''}><span>${escapeUi(i.icon)}</span><b>${escapeUi(i.label)}</b></a>`).join("");if(a.length){holder.style.display="grid";holder.style.gridTemplateColumns=`repeat(${a.length},minmax(0,1fr))`}else holder.style.display="none"}

/* ========================================
   APPLY LANGUAGE
======================================== */

function applyLang() {

  document.documentElement.lang = lang;

  document.documentElement.dir =
    lang === "en"
      ? "ltr"
      : "rtl";


  const subtitle = $("#smSubtitle");

  if (subtitle) {
    const customSubtitle =
      DB?.restaurant?.subtitle?.[lang];

    const sourceText =
      customSubtitle === null ||
      customSubtitle === undefined
        ? I18N[lang].subtitle
        : customSubtitle;

    subtitle.textContent =
      formatRestaurantTemplate(
        sourceText,
        lang
      );

    subtitle.style.display =
      DB?.restaurant?.display?.subtitle !== false &&
      subtitle.textContent
        ? ""
        : "none";
  }


  applyRestaurantBranding();
  updateRestaurantLanguageUI();

  updateSearchUiLanguage();
  renderLanguages();
  renderActions();
  renderCats();
  render();
}


/* ========================================
   CARD REVEAL
======================================== */

let observer = null;


if ("IntersectionObserver" in window) {

  observer =
    new IntersectionObserver(

      entries => {

        entries.forEach(entry => {

          if (entry.isIntersecting) {

            entry.target.classList.add(
              "sm-visible"
            );

            observer.unobserve(
              entry.target
            );
          }

        });

      },

      {
        rootMargin:
          "0px 0px -6% 0px",

        threshold: 0.05
      }
    );
}


function watchCards() {

  $$(".sm-card:not(.watched)")
    .forEach(card => {

      card.classList.add(
        "watched"
      );


      if (observer) {

        observer.observe(card);

      } else {

        card.classList.add(
          "sm-visible"
        );
      }

    });
}


/* ========================================
   CLICK EVENTS
======================================== */

document.addEventListener(
  "click",
  event => {


    if(
      !event.target.closest("#smLangToggle") &&
      !event.target.closest("#smLangs")
    ){
      setLanguageMenuOpen(false);
    }


    const languageButton =
      event.target.closest(
        "[data-lang]"
      );


    if (languageButton) {

      lang =
        languageButton.dataset.lang;

      localStorage.setItem(
        "shorashLang",
        lang
      );

      trackMenuEvent("language_change","",lang);

      applyLang();
      setLanguageMenuOpen(false);

      return;
    }


    const productShare=
      event.target.closest(
        "[data-share-product]"
      );

    if(productShare){
      event.preventDefault();
      event.stopImmediatePropagation();

      const id=String(productShare.dataset.shareProduct||"").trim();
      const product=DB?.products?.find(p=>String(p.id)===id);
      if(!id||!product)return;

      void shareMenuLink(
        makeDeepLink("product",id),
        txt(product.name)||document.title,
        "share_product",
        id
      );

      return;
    }


    const categoryShare=
      event.target.closest(
        "[data-share-category]"
      );

    if(categoryShare){
      event.preventDefault();
      event.stopPropagation();

      const id=categoryShare.dataset.shareCategory;
      const category=categories().find(c=>String(c.id)===String(id));

      shareMenuLink(
        makeDeepLink("category",id),
        category?txt(category):document.title,
        "share_category",
        id
      );

      return;
    }


    const categoryButton =
      event.target.closest(
        ".sm-cat"
      );


    if (
      categoryButton &&
      categoryButton.dataset.cat !== active
    ) {

      const rail = $("#smCats");

      const savedScroll =
        rail
          ? rail.scrollLeft
          : 0;


      active =
        categoryButton.dataset.cat;

      searchQuery="";
      const searchInput=document.getElementById("smSearchInput");
      if(searchInput)searchInput.value="";
      updateSearchCount();

      const categoryId=
        categoryButton.dataset.catId || "";

      setUrlForCategory(categoryId);
      trackMenuEvent("category_view",categoryId);


      renderCats();
      render();


      requestAnimationFrame(() => {

        if (rail) {
          rail.scrollLeft =
            savedScroll;
        }

      });
    }

  }
);


/* ========================================
   FOOTER
======================================== */

function setupFooter() {

  if (!DB) return;


  const restaurant =
    DB.restaurant || {};

  const display =
    restaurant.display || {};

  const footer =
    document.querySelector(".sm-footer");


  if (footer) {
    footer.style.display =
      display.footer === false
        ? "none"
        : "";
  }


  const location =
    $("#smFooterLocation");

  const call =
    $("#smFooterCall");

  const whatsapp =
    $("#smFooterWhatsapp");


  const hasLocation =
    String(restaurant.location || "").trim() &&
    restaurant.location !== "#";

  const hasPhone =
    String(restaurant.phone || "").trim();

  const hasWhatsapp =
    String(restaurant.whatsappNumber || "").trim();


  if (location) {
    location.href =
      restaurant.location || "#";

    const show =
      display.footerLocationButton !== false &&
      !!hasLocation;

    location.hidden = !show;
    location.style.display = show ? "" : "none";
  }


  if (call) {
    call.href =
      "tel:" +
      (restaurant.phone || "");

    const show =
      display.footerCallButton !== false &&
      !!hasPhone;

    call.hidden = !show;
    call.style.display = show ? "" : "none";
  }


  if (whatsapp) {
    whatsapp.href =
      restaurant.whatsapp || "#";

    const show =
      display.footerWhatsappButton !== false &&
      !!hasWhatsapp;

    whatsapp.hidden = !show;
    whatsapp.style.display = show ? "" : "none";
  }


  const facebook =
    $("#smFacebook");

  const snapchat =
    $("#smSnapchat");

  const tiktok =
    $("#smTikTok");

  const instagram =
    $("#smInstagram");


  function applySocialLink(element,url,enabled) {

    if (!element) return;

    const clean =
      String(url || "").trim();

    const show =
      display.footerSocials !== false &&
      enabled !== false &&
      !!clean;

    if (show) {
      element.href = clean;
      element.hidden = false;
      element.style.display = "";
    } else {
      element.removeAttribute("href");
      element.hidden = true;
      element.style.display = "none";
    }
  }


  applySocialLink(
    facebook,
    restaurant.social?.facebook,
    restaurant.socialEnabled?.facebook
  );

  applySocialLink(
    snapchat,
    restaurant.social?.snapchat,
    restaurant.socialEnabled?.snapchat
  );

  applySocialLink(
    tiktok,
    restaurant.social?.tiktok,
    restaurant.socialEnabled?.tiktok
  );

  applySocialLink(
    instagram,
    restaurant.social?.instagram,
    restaurant.socialEnabled?.instagram
  );


  const socialsWrap =
    document.querySelector(".sm-footer-socials, .sm-footer-social");

  if (socialsWrap) {
    socialsWrap.style.display =
      display.footerSocials === false
        ? "none"
        : "";
  }
  const footerActionsParent=location?.parentElement||call?.parentElement||whatsapp?.parentElement||document.querySelector(".sm-footer-actions");
  if(footerActionsParent){footerActionsParent.querySelectorAll(".sm-custom-footer-action").forEach(el=>el.remove());safeArray(restaurant.customFooterActions).forEach(item=>{const label=actionLabel(item),url=String(item?.url||"").trim();if(item?.enabled===false||!label||!url)return;const link=document.createElement("a");link.className=(location?.className||call?.className||whatsapp?.className||"")+" sm-custom-footer-action";link.href=url;if(/^https?:/i.test(url)){link.target="_blank";link.rel="noopener"}link.innerHTML=`<span>${escapeUi(item.icon||"🔗")}</span><b>${escapeUi(label)}</b>`;footerActionsParent.appendChild(link)})}
  const socialParent=instagram?.parentElement||facebook?.parentElement||tiktok?.parentElement||snapchat?.parentElement||document.querySelector(".sm-footer-socials, .sm-footer-social");
  if(socialParent){socialParent.querySelectorAll(".sm-custom-social-link").forEach(el=>el.remove());safeArray(restaurant.customSocialLinks).forEach(item=>{const url=String(item?.url||"").trim(),name=String(item?.name||"Social").trim();if(item?.enabled===false||!url)return;const link=document.createElement("a");link.className=(instagram?.className||facebook?.className||"sm-social-link")+" sm-custom-social-link";link.href=url;link.target="_blank";link.rel="noopener";link.title=name;link.setAttribute("aria-label",name);link.innerHTML=`<span style="display:grid;place-items:center;min-width:1.25em;min-height:1.25em;font-size:1.05em;">${escapeUi(item.icon||"🔗")}</span>`;socialParent.appendChild(link)})}

}


/* ========================================
   LANGUAGE-AWARE RESTAURANT UI
======================================== */

function updateRestaurantLanguageUI() {

  if (!DB) return;

  const restaurant =
    DB.restaurant || {};

  const display =
    restaurant.display || {};


  const footerLocation =
    document.querySelector(
      ".sm-footer-location, .sm-footer-brand span"
    );

  if (footerLocation) {
    const text =
      restaurant.footerLocation?.[lang] ??
      restaurant.footerLocation?.ar ??
      "";

    footerLocation.textContent =
      text;

    footerLocation.style.display =
      display.footerLocation !== false &&
      String(text).trim()
        ? ""
        : "none";
  }


  let announcement =
    document.getElementById(
      "smAnnouncement"
    );


  if (!announcement) {

    announcement =
      document.createElement("div");

    announcement.id =
      "smAnnouncement";

    announcement.className=
      "sm-news-ticker";


    const target =
      document.querySelector(
        ".sm-cats-wrap"
      ) ||
      document.getElementById(
        "smCatsSentinel"
      );


    if (target?.parentNode) {
      target.parentNode.insertBefore(
        announcement,
        target
      );
    } else {
      document.body.appendChild(
        announcement
      );
    }
  }


  const announcementText =
    restaurant.announcement?.[lang] ??
    restaurant.announcement?.ar ??
    "";


  const showAnnouncement =
    restaurant.announcementEnabled === true &&
    String(announcementText).trim();


  if(showAnnouncement){
    const label=lang==="en" ? "NEWS" : lang==="ku" ? "نوێ" : "عاجل";
    const safeText=escapeUi(String(announcementText));
    const duration=Math.max(6,Math.min(16,Math.round(String(announcementText).length*.11)));

    announcement.style.setProperty("--sm-news-duration",`${duration}s`);

    announcement.innerHTML=`
      <span class="sm-news-label">${label}</span>
      <div class="sm-news-window">
        <div class="sm-news-track">
          <span class="sm-news-copy" dir="auto">${safeText}<i class="sm-news-dot">●</i></span>
          <span class="sm-news-copy" dir="auto" aria-hidden="true">${safeText}<i class="sm-news-dot">●</i></span>
        </div>
      </div>
    `;

    announcement.style.display="flex";
  }else{
    announcement.innerHTML="";
    announcement.style.display="none";
  }
}


/* ========================================
   RESTAURANT BRANDING
======================================== */

function saveBrandCache(){

  if(!DB?.restaurant)return;

  const restaurant=
    DB.restaurant;

  try{
    localStorage.setItem(
      "SHORASH_BRAND_CACHE_V1",
      JSON.stringify({
        saved_at:Date.now(),
        nameAr:restaurant.nameAr ?? "",
        nameKu:restaurant.nameKu ?? "",
        nameEn:restaurant.nameEn ?? "",
        logo:restaurant.logo ?? ""
      })
    );
  }catch(_){}
}


function applyRestaurantBranding() {

  if (!DB) return;

  const restaurant =
    DB.restaurant || {};

  const display =
    restaurant.display || {};

  const currentName =
    restaurantNameForLang(lang);

  const englishName =
    restaurantNameForLang("en");


  document.title =
    currentName
      ? currentName + " — Menu"
      : "Menu";


  const logo =
    String(restaurant.logo ?? "").trim();


  [
    ...document.querySelectorAll(
      ".sm-intro-logo, #smLogo, .sm-logo, .sm-logo img"
    )
  ].forEach(img => {

    if (!img) return;

    const show =
      display.logo !== false &&
      !!logo;

    img.style.display =
      show
        ? ""
        : "none";

    img.style.visibility =
      show
        ? "visible"
        : "hidden";

    if (show) {
      img.src = logo;
      img.alt = currentName || "Restaurant";
    }
  });


  document
    .querySelectorAll(".sm-logo-wrap")
    .forEach(el => {
      el.style.display =
        display.logo !== false &&
        !!logo
          ? ""
          : "none";
    });


  const introBrand =
    document.querySelector(
      ".sm-intro-brand"
    );

  if (introBrand) {
    introBrand.textContent =
      currentName;

    introBrand.style.display =
      currentName
        ? ""
        : "none";
  }


  const menuTitle =
    document.querySelector(
      ".sm-header h1, .sm-hero h1"
    );

  if (menuTitle) {

    const genericTitle =
      lang === "ar"
        ? "المنيو"
        : lang === "ku"
          ? "مینیو"
          : "MENU";

    const title =
      currentName
        ? (
            lang === "ar"
              ? "منيو " + currentName
              : lang === "ku"
                ? "مینیوی " + currentName
                : (englishName || currentName) + " MENU"
          )
        : genericTitle;


    menuTitle.textContent =
      title;

    menuTitle.style.display =
      display.menuTitle !== false
        ? ""
        : "none";
  }


  const footerTitle =
    document.querySelector(
      ".sm-footer h2, .sm-footer-brand strong"
    );

  if (footerTitle) {
    footerTitle.textContent =
      currentName;

    footerTitle.style.display =
      display.footerBrand !== false &&
      !!currentName
        ? ""
        : "none";
  }


  const footerPhone =
    document.querySelector(
      ".sm-footer-phone, .sm-phone"
    );

  if (footerPhone) {
    const phoneText =
      footerPhone.querySelector?.("bdi") ||
      footerPhone;

    if (phoneText) {
      phoneText.textContent =
        restaurant.phone || "";
    }

    footerPhone.style.display =
      display.footerPhone !== false &&
      String(restaurant.phone || "").trim()
        ? ""
        : "none";
  }


  const footerCopy =
    document.querySelector(
      ".sm-footer-copy"
    );

  if (footerCopy) {

    footerCopy.textContent =
      currentName
        ? (
            currentName +
            " — All Rights Reserved " +
            new Date().getFullYear() +
            " ©"
          )
        : (
            "All Rights Reserved " +
            new Date().getFullYear() +
            " ©"
          );

    footerCopy.style.display =
      display.footerCopy !== false
        ? ""
        : "none";
  }


  setupFooter();
}


/* ========================================
   BACKGROUND VIDEO
======================================== */

function setupBackground() {

  if (!DB) return;


  const video =
    $("#smBgVideo");


  if (!video) return;


  const enabled =
    DB.restaurant?.display?.backgroundVideo !== false;


  const url =
    String(
      DB.restaurant?.backgroundVideo || ""
    ).trim();


  if (!enabled || !url) {
    video.pause?.();
    video.removeAttribute("src");
    video.style.display = "none";
    return;
  }


  video.style.display = "";
  video.src = url;

  video.muted = true;
  video.loop = true;
  video.playsInline = true;


  const promise =
    video.play();


  if (
    promise &&
    typeof promise.catch === "function"
  ) {

    promise.catch(() => {

      const resume = () => {

        video
          .play()
          .catch(() => {});

        document.removeEventListener(
          "touchstart",
          resume
        );

        document.removeEventListener(
          "click",
          resume
        );
      };


      document.addEventListener(
        "touchstart",
        resume,
        {
          once: true,
          passive: true
        }
      );


      document.addEventListener(
        "click",
        resume,
        {
          once: true
        }
      );

    });
  }
}


/* ========================================
   INTRO
======================================== */

function setupIntro() {

  const intro=
    $("#smIntro");

  if(!intro)return;


  if(
    DB?.restaurant?.display?.intro===false
  ){
    intro.style.display="none";
    return;
  }


  const alreadySeen=
    sessionStorage.getItem(
      "shorashIntroSeen"
    );


  if(alreadySeen){
    intro.style.display="none";
    return;
  }


  sessionStorage.setItem(
    "shorashIntroSeen",
    "1"
  );


  const totalDuration=
    Math.max(
      400,
      Math.min(
        3000,
        Number(
          DB?.restaurant?.introDurationMs
        ) || 900
      )
    );


  const bornAt=
    Number(
      window.__smIntroBornAt
    ) || Date.now();


  const elapsed=
    Math.max(
      0,
      Date.now()-bornAt
    );


  const remaining=
    Math.max(
      0,
      totalDuration-elapsed
    );


  const fadeDelay=
    Math.max(
      0,
      remaining-280
    );


  setTimeout(()=>{
    intro.classList.add("hide");
  },fadeDelay);


  setTimeout(()=>{
    intro.style.display="none";
  },remaining+80);
}

/* ========================================
   STICKY CATEGORIES
======================================== */

let catsFixed = false;
let savedCatsX = 0;


function pinCategories() {

  const cats =
    $("#smCats");

  const sentinel =
    $("#smCatsSentinel");


  if (
    !cats ||
    !sentinel ||
    catsFixed
  ) return;


  savedCatsX =
    cats.scrollLeft;


  sentinel.style.height =
    Math.ceil(
      cats.getBoundingClientRect().height
    ) + "px";


  cats.classList.add(
    "fixed"
  );


  cats.scrollLeft =
    savedCatsX;


  catsFixed = true;
}


function unpinCategories() {

  const cats =
    $("#smCats");

  const sentinel =
    $("#smCatsSentinel");


  if (
    !cats ||
    !sentinel ||
    !catsFixed
  ) return;


  savedCatsX =
    cats.scrollLeft;


  cats.classList.remove(
    "fixed"
  );


  sentinel.style.height =
    "1px";


  cats.scrollLeft =
    savedCatsX;


  catsFixed = false;
}


/* ========================================
   SCROLL EFFECTS
======================================== */

function scrollEffects() {

  const root =
    document.documentElement;


  const max =
    root.scrollHeight -
    root.clientHeight;


  const progress =
    $("#smProgress");


  if (progress) {

    progress.style.width =
      (
        max
          ? root.scrollTop /
            max *
            100
          : 0
      ) + "%";
  }


  const sentinel =
    $("#smCatsSentinel");


  if (sentinel) {

    if (
      !catsFixed &&
      sentinel
        .getBoundingClientRect()
        .top <= 0
    ) {

      pinCategories();

    }


    if (
      catsFixed &&
      window.scrollY <=
        sentinel.offsetTop
    ) {

      unpinCategories();

    }
  }


  const topButton =
    $("#smTopBtn");


  if (topButton) {

    const allowed =
      DB?.restaurant?.display?.backToTop !== false;

    topButton.classList.toggle(
      "show",
      allowed &&
      window.scrollY > 520
    );

    if (!allowed) {
      topButton.style.display = "none";
    } else {
      topButton.style.display = "";
    }
  }
}


window.addEventListener(
  "scroll",
  scrollEffects,
  {
    passive: true
  }
);


/* ========================================
   BACK TO TOP
======================================== */

const topButton =
  $("#smTopBtn");


if (topButton) {

  topButton.addEventListener(
    "click",
    () => {

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

    }
  );
}


/* ========================================
   SUPABASE MENU LOADER
======================================== */

async function loadMenuFromSupabase() {

  if (
    typeof supabaseClient === "undefined" ||
    !supabaseClient
  ) {
    throw new Error("Supabase client is not available");
  }

  console.log("🔄 Loading SHORASH menu from Supabase...");


  /* =========================
     RESTAURANT SETTINGS
  ========================= */

  const {
    data: settingsData,
    error: settingsError
  } = await supabaseClient
    .from("restaurant_settings")
    .select("*")
    .order("updated_at", {
      ascending: false
    })
    .limit(1);


  if (settingsError) {
    console.warn(
      "Restaurant settings error:",
      settingsError
    );
  }


  const settings =
    settingsData?.[0] || {};


  /* =========================
     CATEGORIES
  ========================= */

  const {
    data: categoriesData,
    error: categoriesError
  } = await supabaseClient
    .from("categories")
    .select("*")
    .order("sort_order", {
      ascending: true
    });


  if (categoriesError) {
    throw categoriesError;
  }


  /* =========================
     PRODUCTS
  ========================= */

  const {
    data: productsData,
    error: productsError
  } = await supabaseClient
    .from("products")
    .select("*")
    .order("sort_order", {
      ascending: true
    });


  if (productsError) {
    throw productsError;
  }


  /* =========================
     PRODUCT OPTIONS
  ========================= */

  const {
    data: optionsData,
    error: optionsError
  } = await supabaseClient
    .from("product_options")
    .select("*")
    .order("sort_order", {
      ascending: true
    });


  if (optionsError) {
    throw optionsError;
  }


  console.log(
    "📦 Supabase data:",
    {
      categories: categoriesData?.length || 0,
      products: productsData?.length || 0,
      options: optionsData?.length || 0
    }
  );


  /* =========================
     CATEGORY MAP
  ========================= */

  const categoryMap =
    new Map();


  (categoriesData || [])
    .filter(category =>
      category.is_active !== false &&
      category.is_visible !== false
    )
    .forEach(category => {

      categoryMap.set(
        category.id,
        {
          id: category.id,

          ar:
            category.name_ar ||
            category.ar ||
            "",

          ku:
            category.name_ku ||
            category.ku ||
            category.name_ar ||
            "",

          en:
            category.name_en ||
            category.en ||
            category.name_ar ||
            "",

          order:
            category.sort_order ??
            category.order ??
            999,

          availability_schedule_enabled:
            category.availability_schedule_enabled === true,

          available_from:
            category.available_from || null,

          available_to:
            category.available_to || null
        }
      );

    });


  /* =========================
     OPTIONS MAP
  ========================= */

  const optionsMap =
    new Map();


  (optionsData || [])
    .forEach(option => {

      const productId =
        option.product_id;


      if (!optionsMap.has(productId)) {

        optionsMap.set(
          productId,
          []
        );

      }


      optionsMap
        .get(productId)
        .push({

          id: option.id,

          ar:
            option.name_ar ||
            option.ar ||
            "",

          ku:
            option.name_ku ||
            option.ku ||
            option.name_ar ||
            "",

          en:
            option.name_en ||
            option.en ||
            option.name_ar ||
            "",

          price:
            option.price ?? null,

          order:
            option.sort_order ??
            option.order ??
            999

        });

    });


  /* =========================
     BUILD PRODUCTS
  ========================= */

  const products =
    (productsData || [])
      .filter(product => {

        /*
          Only products connected
          to an existing category
          are displayed.
        */

        return (
          product.is_active !== false &&
          product.is_visible !== false &&
          product.category_id &&
          categoryMap.has(
            product.category_id
          )
        );

      })
      .map(product => {

        const category =
          categoryMap.get(
            product.category_id
          );


        let productOptions =
          optionsMap.get(
            product.id
          ) || [];


        productOptions =
          productOptions.sort(
            (a, b) =>
              Number(a.order || 999) -
              Number(b.order || 999)
          );


        /*
          Safety fallback:
          if a product has no option row
          but has a direct price,
          create one option for the cart.
        */

        if (
          !productOptions.length &&
          product.price !== null &&
          product.price !== undefined
        ) {

          productOptions.push({

            id:
              product.id +
              "-default",

            ar: "",

            ku: "",

            en: "",

            price:
              product.price,

            order: 1

          });

        }


        const manualUnavailable=
          product.is_available === false ||
          product.available === false;

        const scheduleUnavailable=
          product.availability_schedule_enabled === true &&
          scheduledAvailability(product) === false;

        const categoryScheduleUnavailable=
          category.availability_schedule_enabled === true &&
          scheduledAvailability(category) === false;

        const effectiveScheduleText=
          categoryScheduleUnavailable
            ? (
                lang==="en"
                  ? `Category available ${String(category.available_from||"").slice(0,5)}–${String(category.available_to||"").slice(0,5)}`
                  : lang==="ku"
                    ? `بەشەکە بەردەستە ${String(category.available_from||"").slice(0,5)}–${String(category.available_to||"").slice(0,5)}`
                    : `القسم متوفر ${String(category.available_from||"").slice(0,5)}–${String(category.available_to||"").slice(0,5)}`
              )
            : productScheduleText(product);


        return {

          id:
            product.id,

          manualUnavailable:
            manualUnavailable,

          availability_schedule_enabled:
            product.availability_schedule_enabled === true,

          available_from:
            product.available_from || null,

          available_to:
            product.available_to || null,

          scheduleText:
            effectiveScheduleText,

          name: {

            ar:
              product.name_ar ||
              product.ar ||
              "",

            ku:
              product.name_ku ||
              product.ku ||
              product.name_ar ||
              "",

            en:
              product.name_en ||
              product.en ||
              product.name_ar ||
              ""

          },


          category:
            category,


          image:
            product.image_url ||
            product.image ||
            "",


          order:
            product.sort_order ??
            product.order ??
            999,


          badges: {

            popular:
              Boolean(
                product.is_popular ??
                product.popular
              ),

            new:
              Boolean(
                product.is_new ??
                product.new
              ),

            hot:
              Boolean(
                product.is_hot ??
                product.hot
              ),

            offer:
              Boolean(
                product.is_offer ??
                product.offer
              ),

            unavailable:
              manualUnavailable ||
              categoryScheduleUnavailable ||
              scheduleUnavailable

          },


          options:
            productOptions

        };

      })
      .sort(
        (a, b) =>
          Number(a.order || 999) -
          Number(b.order || 999)
      );


  /* =========================
     RESTAURANT OBJECT
  ========================= */

  const whatsappRaw =
    String(
      settings.whatsapp_number ||
      settings.whatsapp ||
      settings.whatsapp_url ||
      "9647502662002"
    );

  let whatsappNumber =
    whatsappRaw.replace(/\D/g,"");

  if (whatsappNumber.startsWith("00")) {
    whatsappNumber =
      whatsappNumber.slice(2);
  }

  if (/^07\d{9}$/.test(whatsappNumber)) {
    whatsappNumber =
      "964" +
      whatsappNumber.slice(1);
  }

  if (/^7\d{9}$/.test(whatsappNumber)) {
    whatsappNumber =
      "964" +
      whatsappNumber;
  }

  const value=(key,fallback="")=>{
    const v=settings[key];
    return v===null || v===undefined
      ? fallback
      : v;
  };


  const restaurant = {

    name:
      value(
        "name_en",
        value(
          "name_ar",
          value("name","")
        )
      ),

    nameAr:
      value(
        "name_ar",
        value("name","")
      ),

    nameKu:
      value("name_ku",""),

    nameEn:
      value(
        "name_en",
        value("name","")
      ),

    subtitle: {
      ar:
        value(
          "subtitle_ar",
          "اكتشف منيو {name}"
        ),

      ku:
        value(
          "subtitle_ku",
          "مینیوی {name} ببینە"
        ),

      en:
        value(
          "subtitle_en",
          "Discover {name} Menu"
        )
    },

    phone:
      value(
        "phone",
        "07502662002"
      ),

    whatsappNumber:
      whatsappNumber ||
      "",

    whatsapp:
      whatsappNumber
        ? "https://wa.me/" + whatsappNumber
        : "",

    quickActions: {
      location: {
        enabled:
          settings.top_location_enabled !== false,

        label: {
          ar:
            value(
              "top_location_label_ar",
              "موقعنا"
            ),

          ku:
            value(
              "top_location_label_ku",
              "شوێنی مە"
            ),

          en:
            value(
              "top_location_label_en",
              "Location"
            )
        }
      },

      call: {
        enabled:
          settings.top_call_enabled !== false,

        label: {
          ar:
            value(
              "top_call_label_ar",
              "اتصال"
            ),

          ku:
            value(
              "top_call_label_ku",
              "پەیوەندی"
            ),

          en:
            value(
              "top_call_label_en",
              "Call"
            )
        }
      },

      whatsapp: {
        enabled:
          settings.top_whatsapp_enabled !== false,

        label: {
          ar:
            value(
              "top_whatsapp_label_ar",
              "واتساب منيو"
            ),

          ku:
            value(
              "top_whatsapp_label_ku",
              "مێنیوی واتساپ"
            ),

          en:
            value(
              "top_whatsapp_label_en",
              "WhatsApp Menu"
            )
        }
      }
    },

    location:
      value(
        "location",
        value("location_url","#")
      ),

    footerLocation: {
      ar:
        value(
          "footer_location_ar",
          "دهوك • كوردستان"
        ),

      ku:
        value(
          "footer_location_ku",
          "دهۆک • کوردستان"
        ),

      en:
        value(
          "footer_location_en",
          "Duhok • Kurdistan"
        )
    },

    social: {
      instagram:
        value(
          "instagram_url",
          "https://www.instagram.com/shorashrest"
        ),

      facebook:
        value(
          "facebook_url",
          "https://facebook.com/shorashrest"
        ),

      tiktok:
        value(
          "tiktok_url",
          "https://www.tiktok.com/@shorashrest"
        ),

      snapchat:
        value(
          "snapchat_url",
          "https://www.snapchat.com/add/shorest2000"
        )
    },

    socialEnabled: {
      instagram:
        settings.instagram_enabled !== false,

      facebook:
        settings.facebook_enabled !== false,

      tiktok:
        settings.tiktok_enabled !== false,

      snapchat:
        settings.snapchat_enabled !== false
    },

    customSocialLinks:
      safeArray(settings.custom_social_links),

    customTopActions:
      safeArray(settings.custom_top_actions),

    customFooterActions:
      safeArray(settings.custom_footer_actions),

    uiDesign:
      safeObject(settings.ui_design_settings),

    introDurationMs:
      Math.max(
        400,
        Math.min(
          3000,
          Number(settings.intro_duration_ms) || 900
        )
      ),

    display: {
      logo:
        settings.show_logo !== false,

      menuTitle:
        settings.show_menu_title !== false,

      subtitle:
        settings.show_subtitle !== false,

      languageSwitch:
        settings.show_language_switch !== false,

      categoryNav:
        settings.show_category_nav !== false,

      backToTop:
        settings.show_back_to_top !== false,

      intro:
        settings.intro_enabled !== false,

      backgroundVideo:
        settings.background_video_enabled !== false,

      footer:
        settings.show_footer !== false,

      footerBrand:
        settings.show_footer_brand !== false,

      footerLocation:
        settings.show_footer_location !== false,

      footerPhone:
        settings.show_footer_phone !== false,

      footerSocials:
        settings.show_footer_socials !== false,

      footerCopy:
        settings.show_footer_copy !== false,

      footerLocationButton:
        settings.footer_location_enabled !== false,

      footerCallButton:
        settings.footer_call_enabled !== false,

      footerWhatsappButton:
        settings.footer_whatsapp_enabled !== false
    },

    backgroundVideo:
      value(
        "background_video",
        value(
          "background_video_url",
          "assets/background.mp4"
        )
      ),

    logo:
      value(
        "logo_url",
        "assets/shorash-logo.jpeg"
      ),

    isOpen:
      settings.is_open !== false,

    ordersEnabled:
      settings.orders_enabled !== false,

    deliveryEnabled:
      settings.delivery_enabled !== false,

    pickupEnabled:
      settings.pickup_enabled !== false,

    deliveryInfoEnabled:
      settings.delivery_info_enabled !== false,

    deliveryInfo: {
      ar:
        value("delivery_info_ar",""),

      ku:
        value("delivery_info_ku",""),

      en:
        value("delivery_info_en","")
    },

    announcementEnabled:
      settings.announcement_enabled === true,

    announcement: {
      ar:
        value("announcement_ar",""),

      ku:
        value("announcement_ku",""),

      en:
        value("announcement_en","")
    },

    closedMessage: {
      ar:
        value(
          "closed_message_ar",
          "المطعم مغلق حالياً. يسعدنا استقبال طلبك عند إعادة فتح الطلبات."
        ),

      ku:
        value(
          "closed_message_ku",
          "چێشتخانەکە لە ئێستادا داخراوە."
        ),

      en:
        value(
          "closed_message_en",
          "The restaurant is currently closed."
        )
    }

  };


  return {

    restaurant,

    products

  };
}



/* ========================================
   JSON FALLBACK
======================================== */

async function loadMenuFallback() {

  console.warn(
    "⚠️ Using menu.json fallback"
  );


  const response =
    await fetch(
      "data/menu.json?v=32",
      {
        cache: "no-store"
      }
    );


  if (!response.ok) {

    throw new Error(
      "menu.json HTTP " +
      response.status
    );

  }


  return await response.json();

}



/* ========================================
   START SHORASH
======================================== */

async function startShorash() {

  /*
    Intro runs independently
    so it never gets stuck while
    Supabase is loading.
  */

  try {

    /* =========================
       TRY SUPABASE FIRST
    ========================= */

    try {

      DB =
        await loadMenuFromSupabase();


      console.log(
        "✅ SHORASH MENU LOADED FROM SUPABASE"
      );

      saveMenuOfflineCache(DB);


    } catch (supabaseError) {

      console.error(
        "❌ Supabase menu loading failed:",
        supabaseError
      );


      /* =========================
         FALLBACK TO JSON
      ========================= */

      try{
        DB=
          await loadMenuFallback();

        console.log(
          "✅ SHORASH MENU LOADED FROM JSON FALLBACK"
        );

        saveMenuOfflineCache(DB);

      }catch(jsonError){

        const cached=
          loadMenuOfflineCache();

        if(!cached){
          throw jsonError;
        }

        DB=cached;

        console.log(
          "✅ SHORASH MENU LOADED FROM OFFLINE CACHE"
        );

        showOfflineDataBanner();
      }

    }


    /* =========================
       VALIDATE DATABASE
    ========================= */

    if (
      !DB ||
      !Array.isArray(DB.products)
    ) {

      throw new Error(
        "Invalid menu data"
      );

    }


    console.log(
      "🍽 Products loaded:",
      DB.products.length
    );


    /* =========================
       FIND CATEGORIES
    ========================= */

    const cats =
      categories();


    active =
      cats[0]?.ar || "";


    console.log(
      "📂 Categories loaded:",
      cats.length
    );


    /* =========================
       INITIALIZE WEBSITE
    ========================= */

    installMenuCardPolish();
    installMenuDiscoveryUI();
    installV44PolishStyles();
    applyUiDesignSettings();
    ensureSearchUI();

    applyDeepLinkBeforeRender();

    const searchInput=document.getElementById("smSearchInput");
    if(searchInput && searchQuery){
      searchInput.value=searchQuery;
    }

    setupBackground();
    setupFooter();

    applyRestaurantBranding();
    applyLang();

    initFooterGlassSync();

    saveBrandCache();
    setupIntro();


    /* =========================
       GLOBAL DATABASE
    ========================= */

    window.SHORASH_DB = DB;

    window.SHORASH_LANG =
      () => lang;

    window.SHORASH_TRACK=
      trackMenuEvent;

    trackPageViewOnce();
    registerPwa();
    scrollToDeepLink();


    if(!window.__shorashScheduleTimer){
      window.__shorashScheduleTimer=setInterval(
        refreshScheduledAvailability,
        60000
      );
    }


    window.dispatchEvent(
      new CustomEvent(
        "shorash:ready",
        {
          detail: {
            DB
          }
        }
      )
    );


    scrollEffects();


    console.log(
      "🚀 SHORASH MENU READY"
    );


  } catch (error) {

    console.error(
      "SHORASH MENU ERROR:",
      error
    );


    const menu =
      $("#smMenu");


    if (menu) {

      menu.innerHTML = `

        <div style="
          max-width:600px;
          margin:40px auto;
          padding:25px;
          text-align:center;
          border:1px solid #5b4024;
          border-radius:20px;
          background:rgba(10,8,6,.86);
        ">

          تعذر تحميل المنيو.

          <br><br>

          يرجى تحديث الصفحة.

        </div>

      `;

    }

  }

}


/* ========================================
   RUN
======================================== */

startShorash();

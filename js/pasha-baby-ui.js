(() => {
  if (window.__PASHA_BABY_UI_V1__) return;
  window.__PASHA_BABY_UI_V1__ = true;

  const COPY = {
    ar: {
      name: 'پاشا بيبي',
      tagline: 'مستلزمات الأطفال بشكل واضح وسهل',
      title: 'تسوّق حسب القسم',
      intro: 'مستلزمات الأطفال',
      search: 'ابحث عن منتج...',
      searchLabel: 'البحث في المنتجات',
      pickup: 'استلام من المحل'
    },
    ku: {
      name: 'پاشا بەیبی',
      tagline: 'پێداویستیێن زاروکان، ب شێوەیەکێ ساناهی',
      title: 'ب پۆلێ بگەڕێ',
      intro: 'پێداویستیێن زاروکان',
      search: 'ل بەرهەمەکی بگەڕێ...',
      searchLabel: 'لێگەڕان ل بەرهەمان',
      pickup: 'وەرگرتن ژ دوکانێ'
    },
    en: {
      name: 'Pasha Baby',
      tagline: 'Baby essentials made simple',
      title: 'Shop by category',
      intro: 'BABY ESSENTIALS',
      search: 'Search products...',
      searchLabel: 'Search products',
      pickup: 'Pick up from store'
    }
  };

  function setText(element, value) {
    if (!element) return;
    const next = String(value ?? '');
    if (element.textContent !== next) element.textContent = next;
  }

  function setAttribute(element, name, value) {
    if (!element) return;
    const next = String(value ?? '');
    if (element.getAttribute(name) !== next) element.setAttribute(name, next);
  }

  function currentLang() {
    const value = String(
      (typeof window.RESTBR_LANG === 'function' ? window.RESTBR_LANG() : '') ||
      localStorage.getItem('RESTBR_LANG_V1') ||
      document.documentElement.lang ||
      'ar'
    ).toLowerCase();
    return ['ar', 'ku', 'en'].includes(value) ? value : 'ar';
  }

  function iconFor(value) {
    const text = String(value || '').toLowerCase();

    if (/حفاض|پەمپ|diaper|wipe|مناديل|دەستمال/.test(text)) return '🧷';
    if (/رضاع|حليب|شيشة|bottle|feed|pacifier|لهاية|شیردان|پستانک/.test(text)) return '🍼';
    if (/عناي|كريم|شامبو|care|cream|shampoo|چاڤدێر/.test(text)) return '🧴';
    if (/استحم|حمام|منشف|bath|towel|خۆشوشتن/.test(text)) return '🛁';
    if (/ملابس|لباس|قطن|clothes|clothing|جل|بەرگ/.test(text)) return '👕';
    if (/نوم|بطاني|سرير|sleep|blanket|bed|نڤستن/.test(text)) return '🌙';
    if (/لعب|العاب|ألعاب|toy|game|یاری/.test(text)) return '🧸';
    if (/عربات|عربة|كرسي|stroller|seat|carriage|عەرەبان/.test(text)) return '🚼';
    if (/حقيبة|شنط|bag|سفر/.test(text)) return '🎒';
    if (/سلامة|حماية|safety|protect/.test(text)) return '🛡️';
    if (/غذاء|طعام|food|meal/.test(text)) return '🥣';
    return '✨';
  }

  function ensureBrand() {
    const header = document.querySelector('.sm-header');
    if (!header) return;

    let brand = document.getElementById('pbBrand');
    if (!brand) {
      brand = document.createElement('div');
      brand.id = 'pbBrand';
      brand.className = 'pb-brand';
      brand.innerHTML = `
        <div class="pb-brand-mark" aria-hidden="true">PB<small></small></div>
        <div class="pb-brand-name"></div>
        <div class="pb-brand-tagline"></div>
      `;

      const title = header.querySelector('h1');
      if (title) header.insertBefore(brand, title);
      else header.prepend(brand);
    }

    const lang = currentLang();
    setText(brand.querySelector('.pb-brand-name'), COPY[lang].name);
    setText(brand.querySelector('.pb-brand-tagline'), COPY[lang].tagline);
    setAttribute(brand, 'aria-label', COPY[lang].name);
  }

  function ensureIntroMark() {
    const intro = document.getElementById('smIntro');
    if (!intro) return;

    let mark = document.getElementById('pbIntroMark');
    if (!mark) {
      mark = document.createElement('div');
      mark.id = 'pbIntroMark';
      mark.className = 'pb-intro-mark';
      mark.textContent = 'PB';
      const brand = intro.querySelector('.sm-intro-brand');
      if (brand) intro.insertBefore(mark, brand);
      else intro.prepend(mark);
    }
  }

  function decorateCategories() {
    document.querySelectorAll('#smCats .sm-cat').forEach(button => {
      const label = String(button.textContent || '').trim();
      const icon = iconFor(label);
      if (button.dataset.pbIcon !== icon) button.dataset.pbIcon = icon;
    });
  }

  function decorateCards() {
    const sectionTitle = document.querySelector('.sm-section-title')?.textContent || '';

    document.querySelectorAll('#smMenu .sm-card').forEach(card => {
      const category =
        card.querySelector('.sm-search-category')?.textContent ||
        sectionTitle ||
        '';
      const holder = card.querySelector('.sm-img');
      const image = card.querySelector('.sm-product-image');
      if (!holder || !image) return;

      const raw = String(image.getAttribute('src') || '').trim();
      const placeholder =
        !raw ||
        /restaurant-placeholder\.svg(?:\?|$)/i.test(raw) ||
        image.dataset.pbBroken === '1';

      const currentlyPlaceholder = holder.classList.contains('pb-placeholder');
      if (currentlyPlaceholder !== placeholder) {
        holder.classList.toggle('pb-placeholder', placeholder);
      }

      const icon = iconFor(category || image.alt || '');
      if (holder.dataset.pbIcon !== icon) holder.dataset.pbIcon = icon;

      if (!image.dataset.pbErrorBound) {
        image.dataset.pbErrorBound = '1';
        image.addEventListener('error', () => {
          image.dataset.pbBroken = '1';
          if (!holder.classList.contains('pb-placeholder')) {
            holder.classList.add('pb-placeholder');
          }
        });
      }
    });
  }

  function updateStoreCopy() {
    const lang = currentLang();
    const copy = COPY[lang];

    ensureBrand();
    ensureIntroMark();

    setText(document.querySelector('.sm-header h1'), copy.title);
    setText(document.querySelector('.sm-intro-brand'), copy.name);
    setText(document.querySelector('.sm-intro-sub'), copy.intro);
    setText(document.getElementById('smPickupBtn'), copy.pickup);
    setText(document.querySelector('.sm-footer h2'), copy.name);

    const search = document.getElementById('smSearchInput');
    if (search && search.placeholder !== copy.search) search.placeholder = copy.search;

    setAttribute(document.getElementById('smSearchToggle'), 'aria-label', copy.searchLabel);

    const currentTitle = `${copy.name} — ${copy.title}`;
    if (document.title !== currentTitle) document.title = currentTitle;

    setAttribute(
      document.querySelector('meta[name="apple-mobile-web-app-title"]'),
      'content',
      copy.name
    );
    setAttribute(document.querySelector('meta[name="theme-color"]'), 'content', '#fffaf5');

    decorateCategories();
    decorateCards();
  }

  let queued = false;
  function scheduleUpdate() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      updateStoreCopy();
    });
  }

  const observer = new MutationObserver(scheduleUpdate);

  function start() {
    updateStoreCopy();
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['src', 'class', 'data-lang']
    });

    document.addEventListener('click', event => {
      if (event.target.closest('[data-lang],[data-sm-gate-lang]')) {
        setTimeout(updateStoreCopy, 30);
        setTimeout(updateStoreCopy, 180);
      }
    });

    window.addEventListener('restbr:ready', updateStoreCopy);
    [120, 350, 800, 1600, 3000].forEach(delay => setTimeout(updateStoreCopy, delay));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

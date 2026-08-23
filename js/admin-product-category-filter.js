(() => {
  if (!/(?:^|\/)admin\.html$/i.test(location.pathname)) return;

  const ALL_ID = '__all__';
  let selectedCategory = ALL_ID;
  let originalMatcher = null;
  let observer = null;

  function esc(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function categoryName(category) {
    return String(
      category?.name_ar ||
      category?.name ||
      category?.name_ku ||
      category?.name_en ||
      'قسم بدون اسم'
    ).trim();
  }

  function globalsReady() {
    return (
      typeof renderAdminProducts === 'function' &&
      typeof productMatchesAdminFilter === 'function' &&
      typeof adminCategories !== 'undefined' &&
      typeof adminProducts !== 'undefined'
    );
  }

  function installMatcher() {
    if (window.__smCategoryMatcherInstalled) return true;
    if (!globalsReady()) return false;

    originalMatcher = productMatchesAdminFilter;

    productMatchesAdminFilter = function(product) {
      if (!originalMatcher(product)) return false;
      if (selectedCategory === ALL_ID) return true;
      return String(product?.category_id ?? '') === String(selectedCategory);
    };

    window.__smCategoryMatcherInstalled = true;
    return true;
  }

  function getFilterRow() {
    const view = document.getElementById('viewProducts');
    const first = view?.querySelector('[data-product-filter]');
    return first?.parentElement || null;
  }

  function installStyles() {
    if (document.getElementById('smAdminCategoryFilterStyle')) return;

    const style = document.createElement('style');
    style.id = 'smAdminCategoryFilterStyle';
    style.textContent = `
      #smAdminCategoryFilterList{display:contents}
      .sm-admin-category-chip{flex:0 0 auto;white-space:nowrap}
      .sm-admin-category-chip b{
        display:inline-grid;place-items:center;min-width:20px;height:20px;
        margin-inline-start:5px;padding:0 5px;border-radius:999px;
        background:rgba(255,255,255,.055);color:#9e968c;font-size:9px;line-height:1
      }
      .sm-admin-category-chip.active b{background:rgba(16,11,5,.15);color:#100b05}
      .sm-admin-category-divider{
        flex:0 0 1px;width:1px;height:24px;align-self:center;margin:0 2px;
        background:rgba(216,169,88,.22)
      }
    `;
    document.head.appendChild(style);
  }

  function mount() {
    const row = getFilterRow();
    if (!row) return null;

    let divider = document.getElementById('smAdminCategoryFilterDivider');
    let list = document.getElementById('smAdminCategoryFilterList');

    if (!divider) {
      divider = document.createElement('span');
      divider.id = 'smAdminCategoryFilterDivider';
      divider.className = 'sm-admin-category-divider';
      divider.setAttribute('aria-hidden', 'true');
      row.appendChild(divider);
    }

    if (!list) {
      list = document.createElement('span');
      list.id = 'smAdminCategoryFilterList';
      row.appendChild(list);
    }

    return list;
  }

  function categoriesArray() {
    try {
      return Array.isArray(adminCategories) ? adminCategories : [];
    } catch (_) {
      return [];
    }
  }

  function productsArray() {
    try {
      return Array.isArray(adminProducts) ? adminProducts : [];
    } catch (_) {
      return [];
    }
  }

  function renderCategories() {
    const list = mount();
    if (!list) return;

    const categories = [...categoriesArray()].sort((a, b) => {
      const order = Number(a?.sort_order || 0) - Number(b?.sort_order || 0);
      return order || categoryName(a).localeCompare(categoryName(b), 'ar');
    });
    const products = productsArray();

    const validIds = new Set(categories.map(c => String(c.id)));
    if (selectedCategory !== ALL_ID && !validIds.has(String(selectedCategory))) {
      selectedCategory = ALL_ID;
    }

    list.innerHTML = categories.map(category => {
      const id = String(category.id);
      const count = products.filter(p => String(p?.category_id ?? '') === id).length;
      return `
        <button
          class="filter-chip sm-admin-category-chip ${selectedCategory === id ? 'active' : ''}"
          type="button"
          data-admin-category-filter="${esc(id)}"
        >
          <span>${esc(categoryName(category))}</span><b>${count}</b>
        </button>
      `;
    }).join('');

    const divider = document.getElementById('smAdminCategoryFilterDivider');
    if (divider) divider.style.display = categories.length ? '' : 'none';

    syncVisualState();
  }

  function syncVisualState() {
    document.querySelectorAll('[data-admin-category-filter]').forEach(button => {
      button.classList.toggle(
        'active',
        String(button.dataset.adminCategoryFilter) === String(selectedCategory)
      );
    });

    const allStatus = document.querySelector('[data-product-filter="all"]');
    if (allStatus && selectedCategory !== ALL_ID) {
      allStatus.classList.remove('active');
    }
  }

  function rerenderProducts() {
    if (!installMatcher()) return;
    const search = document.getElementById('adminSearch')?.value || '';
    renderAdminProducts(search);
    requestAnimationFrame(syncVisualState);
  }

  function bind() {
    document.addEventListener('click', event => {
      const categoryButton = event.target.closest('[data-admin-category-filter]');
      if (categoryButton) {
        selectedCategory = String(categoryButton.dataset.adminCategoryFilter || ALL_ID);
        renderCategories();
        rerenderProducts();
        return;
      }

      const productFilter = event.target.closest('[data-product-filter]');
      if (productFilter) {
        if (String(productFilter.dataset.productFilter) === 'all') {
          selectedCategory = ALL_ID;
        }
        setTimeout(() => {
          renderCategories();
          rerenderProducts();
        }, 0);
      }
    });

    const search = document.getElementById('adminSearch');
    if (search) {
      search.addEventListener('input', () => {
        setTimeout(syncVisualState, 0);
      });
    }

    const container = document.getElementById('productsContainer');
    if (container && !observer) {
      observer = new MutationObserver(() => {
        setTimeout(() => {
          renderCategories();
          syncVisualState();
        }, 0);
      });
      observer.observe(container, { childList: true });
    }
  }

  function init() {
    installStyles();

    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (!installMatcher()) {
        if (attempts > 80) clearInterval(timer);
        return;
      }

      if (!mount()) return;

      clearInterval(timer);
      renderCategories();
      bind();
      rerenderProducts();
    }, 100);
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

(() => {
  if (/(?:^|\/)admin\.html$/i.test(location.pathname)) return;

  const inactiveCategoryIds = new Set();

  function transformResult(table, result) {
    if (!result || !Array.isArray(result.data)) return result;

    if (table === 'categories') {
      result.data = result.data.map(row => {
        if (!row || row.id == null) return row;

        const id = String(row.id);
        const visible = row.is_visible !== false;
        const inactive = visible && row.is_active === false;

        if (inactive) {
          inactiveCategoryIds.add(id);
          return {
            ...row,
            // Category policy: inactive + visible means the category stays
            // visible, but every product inside it becomes unavailable.
            is_active: true
          };
        }

        inactiveCategoryIds.delete(id);
        return row;
      });

      return result;
    }

    if (table === 'products') {
      result.data = result.data.map(row => {
        if (!row) return row;

        const visible = row.is_visible !== false;
        const productInactive = visible && row.is_active === false;

        // Product policy: "active" is the master switch. When it is off,
        // keep the original row untouched so app.js filters the product out.
        if (productInactive) return row;

        const categoryInactive =
          visible &&
          row.category_id != null &&
          inactiveCategoryIds.has(String(row.category_id));

        if (!categoryInactive) return row;

        return {
          ...row,
          // The category is inactive but visible: keep this active product in
          // the menu and route it through the existing unavailable state.
          is_available: false
        };
      });
    }

    return result;
  }

  function wrapBuilder(table, builder) {
    if (!builder || (typeof builder !== 'object' && typeof builder !== 'function')) {
      return builder;
    }

    return new Proxy(builder, {
      get(target, prop) {
        if (prop === 'then') {
          return (onFulfilled, onRejected) =>
            target.then(
              value => {
                const transformed = transformResult(table, value);
                return typeof onFulfilled === 'function'
                  ? onFulfilled(transformed)
                  : transformed;
              },
              onRejected
            );
        }

        const value = Reflect.get(target, prop, target);

        if (typeof value !== 'function') return value;

        return (...args) => {
          const next = value.apply(target, args);

          if (
            next &&
            (typeof next === 'object' || typeof next === 'function') &&
            typeof next.then === 'function'
          ) {
            return wrapBuilder(table, next);
          }

          return next;
        };
      }
    });
  }

  function installSupabaseAvailabilityBridge() {
    let client = null;

    try {
      if (typeof supabaseClient !== 'undefined') client = supabaseClient;
    } catch (_) {}

    if (!client) client = window.supabaseClient || null;
    if (!client || typeof client.from !== 'function') return false;
    if (client.__smUnavailableBridgeInstalled) return true;

    const originalFrom = client.from.bind(client);

    client.from = function(table) {
      return wrapBuilder(String(table || ''), originalFrom(table));
    };

    Object.defineProperty(client, '__smUnavailableBridgeInstalled', {
      value: true,
      configurable: true
    });

    return true;
  }

  function installStyles() {
    if (document.getElementById('smUnavailableCardStyles')) return;

    const style = document.createElement('style');
    style.id = 'smUnavailableCardStyles';
    style.textContent = `
      .sm-card.sm-unavailable-card{
        position:relative !important;
        isolation:isolate;
      }

      .sm-card.sm-unavailable-card::after{
        content:"";
        position:absolute;
        inset:0;
        z-index:40;
        border-radius:inherit;
        background:rgba(2,2,2,.58);
        backdrop-filter:grayscale(.58) saturate(.44) brightness(.58);
        -webkit-backdrop-filter:grayscale(.58) saturate(.44) brightness(.58);
        box-shadow:inset 0 0 0 1px rgba(255,255,255,.025);
        pointer-events:none;
      }

      .sm-card.sm-unavailable-card .sm-img,
      .sm-card.sm-unavailable-card .sm-info,
      .sm-card.sm-unavailable-card .sm-badges,
      .sm-card.sm-unavailable-card .sm-share-product{
        filter:saturate(.48) brightness(.70);
      }

      .sm-card.sm-unavailable-card .sm-off{
        position:absolute !important;
        z-index:52 !important;
        top:50% !important;
        left:50% !important;
        right:auto !important;
        bottom:auto !important;
        transform:translate(-50%,-50%) !important;
        width:max-content !important;
        max-width:calc(100% - 28px) !important;
        margin:0 !important;
        padding:9px 16px !important;
        border:1px solid rgba(238,199,116,.62) !important;
        border-radius:999px !important;
        background:rgba(8,6,4,.94) !important;
        color:#f2cf82 !important;
        box-shadow:0 10px 30px rgba(0,0,0,.52) !important;
        font-size:11.5px !important;
        font-weight:900 !important;
        line-height:1.35 !important;
        text-align:center !important;
        white-space:nowrap;
        pointer-events:none;
        filter:none !important;
        backdrop-filter:blur(12px);
        -webkit-backdrop-filter:blur(12px);
      }
    `;

    document.head.appendChild(style);
  }

  function syncCard(card) {
    if (!(card instanceof Element) || !card.matches('.sm-card')) return;
    card.classList.toggle('sm-unavailable-card', !!card.querySelector('.sm-off'));
  }

  function scan(root = document) {
    if (root instanceof Element && root.matches('.sm-card')) syncCard(root);
    root.querySelectorAll?.('.sm-card').forEach(syncCard);
  }

  installSupabaseAvailabilityBridge();
  installStyles();

  function startObserver() {
    scan();

    const observer = new MutationObserver(records => {
      records.forEach(record => {
        if (record.target instanceof Element) {
          const card = record.target.closest?.('.sm-card');
          if (card) syncCard(card);
        }

        record.addedNodes.forEach(node => {
          if (!(node instanceof Element)) return;
          scan(node);
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver, { once: true });
  } else {
    startObserver();
  }
})();

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
            // Public-menu policy: inactive + visible means unavailable,
            // not hidden. Keep is_visible as the actual hide switch.
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
        const categoryInactive =
          visible &&
          row.category_id != null &&
          inactiveCategoryIds.has(String(row.category_id));

        if (!productInactive && !categoryInactive) return row;

        return {
          ...row,
          // Let the existing menu renderer keep the card visible while using
          // its tested unavailable/order-blocking path.
          is_active: true,
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
        background:rgba(6,5,4,.30);
        backdrop-filter:saturate(.72) brightness(.86);
        -webkit-backdrop-filter:saturate(.72) brightness(.86);
        pointer-events:none;
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
        padding:8px 14px !important;
        border:1px solid rgba(238,199,116,.48) !important;
        border-radius:999px !important;
        background:rgba(11,8,5,.88) !important;
        color:#f0cb7b !important;
        box-shadow:0 8px 24px rgba(0,0,0,.32) !important;
        font-size:11px !important;
        font-weight:800 !important;
        line-height:1.35 !important;
        text-align:center !important;
        white-space:nowrap;
        pointer-events:none;
        backdrop-filter:blur(10px);
        -webkit-backdrop-filter:blur(10px);
      }

      .sm-card.sm-unavailable-card .sm-share-product{
        z-index:55 !important;
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

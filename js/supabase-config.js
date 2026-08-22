// ==========================================
// RESTBR MENU CORE — Tenant Data Bridge
// ==========================================
// Public data is supplied by the same-origin Cloudflare Worker:
//   GET  /_restbr/bootstrap
//   POST /_restbr/track
//
// This preserves the existing public menu app's small Supabase-like API
// while removing restaurant-specific database credentials from the frontend.

(() => {
  const RESTBR_BOOTSTRAP_URL = '/_restbr/bootstrap';
  const RESTBR_TRACK_URL = '/_restbr/track';

  let bootstrapPromise = null;

  function cloneRows(rows) {
    return Array.isArray(rows) ? rows.map(row => ({ ...row })) : [];
  }

  async function loadBootstrap(force = false) {
    if (!force && bootstrapPromise) return bootstrapPromise;

    bootstrapPromise = fetch(RESTBR_BOOTSTRAP_URL, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    })
      .then(async response => {
        const payload = await response.json().catch(() => ({}));

        if (!response.ok || !payload?.ok) {
          throw new Error(
            payload?.message ||
            payload?.error ||
            `RESTBR bootstrap failed (${response.status})`
          );
        }

        window.RESTBR_TENANT = payload.restaurant || null;
        window.RESTBR_BOOTSTRAP = payload;
        return payload;
      })
      .catch(error => {
        bootstrapPromise = null;
        console.error('❌ RESTBR bootstrap error:', error);
        throw error;
      });

    return bootstrapPromise;
  }

  class RestBRQuery {
    constructor(table) {
      this.table = table;
      this.orderColumn = null;
      this.ascending = true;
      this.limitCount = null;
    }

    select() {
      return this;
    }

    order(column, options = {}) {
      this.orderColumn = column;
      this.ascending = options?.ascending !== false;
      return this;
    }

    limit(count) {
      const n = Number(count);
      this.limitCount = Number.isFinite(n) && n >= 0 ? n : null;
      return this;
    }

    async execute() {
      try {
        const payload = await loadBootstrap();

        let rows;
        switch (this.table) {
          case 'restaurant_settings':
            rows = payload.settings ? [payload.settings] : [];
            break;
          case 'categories':
            rows = cloneRows(payload.categories);
            break;
          case 'products':
            rows = cloneRows(payload.products);
            break;
          case 'product_options':
            rows = cloneRows(payload.product_options);
            break;
          default:
            throw new Error(`Unsupported RESTBR public table: ${this.table}`);
        }

        if (this.orderColumn) {
          const key = this.orderColumn;
          const direction = this.ascending ? 1 : -1;
          rows.sort((a, b) => {
            const av = a?.[key];
            const bv = b?.[key];
            if (av === bv) return 0;
            if (av === null || av === undefined) return 1;
            if (bv === null || bv === undefined) return -1;
            return av > bv ? direction : -direction;
          });
        }

        if (this.limitCount !== null) {
          rows = rows.slice(0, this.limitCount);
        }

        return { data: rows, error: null };
      } catch (error) {
        return {
          data: null,
          error: {
            message: error?.message || String(error),
            details: error
          }
        };
      }
    }

    then(resolve, reject) {
      return this.execute().then(resolve, reject);
    }

    catch(reject) {
      return this.execute().catch(reject);
    }
  }

  const client = {
    from(table) {
      return new RestBRQuery(String(table || ''));
    },

    async rpc(name, params = {}) {
      if (name !== 'track_menu_event') {
        return {
          data: null,
          error: { message: `Unsupported RESTBR public RPC: ${name}` }
        };
      }

      try {
        const response = await fetch(RESTBR_TRACK_URL, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({
            event_type: String(params?.p_event_type || ''),
            ref_id: String(params?.p_ref_id || ''),
            language: String(params?.p_language || '')
          }),
          keepalive: true
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          return {
            data: null,
            error: { message: payload?.error || `Analytics failed (${response.status})` }
          };
        }

        return { data: null, error: null };
      } catch (error) {
        return {
          data: null,
          error: { message: error?.message || String(error) }
        };
      }
    }
  };

  window.supabaseClient = client;
  window.RESTBR_LOAD_BOOTSTRAP = loadBootstrap;

  console.log('✅ RESTBR tenant data bridge ready');
})();

// Existing app.js expects this global identifier.
const supabaseClient = window.supabaseClient;

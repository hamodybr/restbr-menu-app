// ==========================================
// RESTBR MENU CORE — Tenant Data Bridge V2.6
// ==========================================
// Public data is supplied by the same-origin Cloudflare Worker:
//   GET  /_restbr/bootstrap
//   POST /_restbr/track
//
// V2.1 tenant isolation normalization.
// V2.2 base_price -> legacy price compatibility.
// V2.3 active product-option normalization + derived has_options.
// V2.4 Owner Dashboard setting-name compatibility.
// V2.5 restaurant_name_* becomes authoritative over legacy branding name_*.
// V2.6 adds a tenant-scoped, time-limited bootstrap cache for true offline
// fallback so the app never replaces a previously loaded menu with the empty
// static data/menu.json fallback during a temporary network/router outage.

(() => {
  const RESTBR_BOOTSTRAP_URL = '/_restbr/bootstrap';
  const RESTBR_TRACK_URL = '/_restbr/track';
  const BOOTSTRAP_CACHE_PREFIX = 'RESTBR_BOOTSTRAP_CACHE_V1';
  const BOOTSTRAP_CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

  let bootstrapPromise = null;

  function cloneRows(rows) {
    return Array.isArray(rows) ? rows.map(row => ({ ...row })) : [];
  }

  function hasValue(value) {
    return value !== null && value !== undefined && String(value).trim() !== '';
  }

  function boolOr(value, fallback) {
    return typeof value === 'boolean' ? value : Boolean(fallback);
  }

  function objectValue(value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return { ...value };
    }

    if (typeof value === 'string' && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return { ...parsed };
        }
      } catch (_) {}
    }

    return {};
  }

  function clampPercent(value) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null;
  }

  function bootstrapCacheKey() {
    return `${BOOTSTRAP_CACHE_PREFIX}:${location.hostname}:${location.port || 'default'}`;
  }

  function normalizeProduct(raw = {}, hasActiveOptions = false) {
    const product = { ...(raw || {}) };
    const basePrice = product.base_price ?? product.price ?? null;

    return {
      ...product,
      base_price: basePrice,
      price: basePrice,
      has_options: Boolean(hasActiveOptions)
    };
  }

  function normalizeTenantSettings(raw = {}) {
    const s = { ...(raw || {}) };

    const nameAr = hasValue(s.restaurant_name_ar)
      ? String(s.restaurant_name_ar).trim()
      : hasValue(s.name_ar)
        ? String(s.name_ar).trim()
        : '';
    const nameKu = hasValue(s.restaurant_name_ku)
      ? String(s.restaurant_name_ku).trim()
      : hasValue(s.name_ku)
        ? String(s.name_ku).trim()
        : nameAr;
    const nameEn = hasValue(s.restaurant_name_en)
      ? String(s.restaurant_name_en).trim()
      : hasValue(s.name_en)
        ? String(s.name_en).trim()
        : nameAr;

    const phone = hasValue(s.phone) ? String(s.phone).trim() : '';
    const whatsapp = hasValue(s.whatsapp_number)
      ? String(s.whatsapp_number).trim()
      : hasValue(s.whatsapp)
        ? String(s.whatsapp).trim()
        : '';
    const location = hasValue(s.location)
      ? String(s.location).trim()
      : hasValue(s.location_url)
        ? String(s.location_url).trim()
        : '';

    const instagram = hasValue(s.instagram_url) ? String(s.instagram_url).trim() : '';
    const facebook = hasValue(s.facebook_url) ? String(s.facebook_url).trim() : '';
    const tiktok = hasValue(s.tiktok_url) ? String(s.tiktok_url).trim() : '';
    const snapchat = hasValue(s.snapchat_url) ? String(s.snapchat_url).trim() : '';
    const hasSocial = Boolean(instagram || facebook || tiktok || snapchat);

    const footerLocationAr = hasValue(s.footer_location_ar)
      ? String(s.footer_location_ar)
      : hasValue(s.address_ar)
        ? String(s.address_ar)
        : '';
    const footerLocationKu = hasValue(s.footer_location_ku)
      ? String(s.footer_location_ku)
      : hasValue(s.address_ku)
        ? String(s.address_ku)
        : '';
    const footerLocationEn = hasValue(s.footer_location_en)
      ? String(s.footer_location_en)
      : hasValue(s.address_en)
        ? String(s.address_en)
        : '';
    const hasFooterLocation = Boolean(footerLocationAr || footerLocationKu || footerLocationEn || location);

    const backgroundVideo = hasValue(s.background_video)
      ? String(s.background_video).trim()
      : hasValue(s.background_video_url)
        ? String(s.background_video_url).trim()
        : hasValue(s.background_url)
          ? String(s.background_url).trim()
          : '';

    const uiDesign = objectValue(s.ui_design_settings);
    if (hasValue(uiDesign.card_glass_opacity)) {
      const opacity = clampPercent(uiDesign.card_glass_opacity);
      if (opacity !== null) {
        uiDesign.card_glass_transparency = 100 - opacity;
      }
    }

    return {
      ...s,
      name_ar: nameAr,
      name_ku: nameKu,
      name_en: nameEn,
      restaurant_name_ar: nameAr,
      restaurant_name_ku: nameKu,
      restaurant_name_en: nameEn,
      phone,
      whatsapp,
      whatsapp_number: whatsapp,
      location,
      location_url: location,
      footer_location_ar: footerLocationAr,
      footer_location_ku: footerLocationKu,
      footer_location_en: footerLocationEn,
      instagram_url: instagram,
      facebook_url: facebook,
      tiktok_url: tiktok,
      snapchat_url: snapchat,
      background_url: backgroundVideo,
      background_video: backgroundVideo,
      background_video_url: backgroundVideo,
      ui_design_settings: uiDesign,
      background_video_enabled: boolOr(s.background_video_enabled, backgroundVideo),
      top_call_enabled: boolOr(s.top_call_enabled, phone),
      top_whatsapp_enabled: boolOr(s.top_whatsapp_enabled, whatsapp),
      top_location_enabled: boolOr(s.top_location_enabled, location),
      footer_call_enabled: boolOr(s.footer_call_enabled, phone),
      footer_whatsapp_enabled: boolOr(s.footer_whatsapp_enabled, whatsapp),
      footer_location_enabled: boolOr(s.footer_location_enabled, hasFooterLocation),
      instagram_enabled: boolOr(s.instagram_enabled, instagram),
      facebook_enabled: boolOr(s.facebook_enabled, facebook),
      tiktok_enabled: boolOr(s.tiktok_enabled, tiktok),
      snapchat_enabled: boolOr(s.snapchat_enabled, snapchat),
      show_footer_phone: boolOr(s.show_footer_phone, phone),
      show_footer_location: boolOr(s.show_footer_location, hasFooterLocation),
      show_footer_socials: boolOr(s.show_footer_socials, hasSocial),
    };
  }

  function normalizeBootstrapPayload(rawPayload = {}) {
    const payload = { ...(rawPayload || {}) };

    payload.settings = normalizeTenantSettings(payload.settings || {});

    payload.product_options = cloneRows(payload.product_options)
      .filter(option => option?.is_active !== false);

    const productIdsWithActiveOptions = new Set(
      payload.product_options
        .map(option => String(option?.product_id || '').trim())
        .filter(Boolean)
    );

    payload.products = cloneRows(payload.products).map(product =>
      normalizeProduct(
        product,
        productIdsWithActiveOptions.has(String(product?.id || '').trim())
      )
    );

    payload.categories = cloneRows(payload.categories);
    return payload;
  }

  function saveCachedBootstrap(payload) {
    try {
      localStorage.setItem(
        bootstrapCacheKey(),
        JSON.stringify({ saved_at: Date.now(), payload })
      );
    } catch (_) {}
  }

  function loadCachedBootstrap() {
    try {
      const raw = localStorage.getItem(bootstrapCacheKey());
      if (!raw) return null;

      const cached = JSON.parse(raw);
      const age = Date.now() - Number(cached?.saved_at || 0);

      if (
        !cached?.payload?.ok ||
        age < 0 ||
        age > BOOTSTRAP_CACHE_MAX_AGE ||
        !Array.isArray(cached.payload.products) ||
        !Array.isArray(cached.payload.categories) ||
        !Array.isArray(cached.payload.product_options)
      ) {
        return null;
      }

      return normalizeBootstrapPayload(cached.payload);
    } catch (_) {
      return null;
    }
  }

  function publishBootstrap(payload, offline = false) {
    window.RESTBR_TENANT = payload.restaurant || null;
    window.RESTBR_BOOTSTRAP = payload;
    window.RESTBR_OFFLINE_BOOTSTRAP = Boolean(offline);
    return payload;
  }

  async function loadBootstrap(force = false) {
    if (!force && bootstrapPromise) return bootstrapPromise;

    bootstrapPromise = (async () => {
      try {
        const response = await fetch(RESTBR_BOOTSTRAP_URL, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store'
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok || !payload?.ok) {
          const error = new Error(
            payload?.message ||
            payload?.error ||
            `RESTBR bootstrap failed (${response.status})`
          );
          error.restbrHttpStatus = response.status;
          throw error;
        }

        const normalized = normalizeBootstrapPayload(payload);
        saveCachedBootstrap(normalized);
        return publishBootstrap(normalized, false);
      } catch (error) {
        const status = Number(error?.restbrHttpStatus || 0);
        const mayUseOfflineCache = !status || status >= 500;

        if (mayUseOfflineCache) {
          const cached = loadCachedBootstrap();
          if (cached) {
            console.warn('⚠️ RESTBR bootstrap offline fallback is active.');
            return publishBootstrap(cached, true);
          }
        }

        bootstrapPromise = null;
        console.error('❌ RESTBR bootstrap error:', error);
        throw error;
      }
    })();

    return bootstrapPromise;
  }

  class RestBRQuery {
    constructor(table) {
      this.table = table;
      this.orderColumn = null;
      this.ascending = true;
      this.limitCount = null;
    }

    select() { return this; }

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

        if (this.limitCount !== null) rows = rows.slice(0, this.limitCount);
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

    then(resolve, reject) { return this.execute().then(resolve, reject); }
    catch(reject) { return this.execute().catch(reject); }
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
  console.log('✅ RESTBR tenant data bridge V2.6 ready');
})();

const supabaseClient = window.supabaseClient;

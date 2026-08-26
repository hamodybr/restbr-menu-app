(() => {
  if (/(?:^|\/)admin\.html$/i.test(location.pathname)) return;
  if (!window.supabase || typeof window.supabase.createClient !== 'function') return;

  const SUPPORTED_TABLES = new Set([
    'restaurant_settings',
    'categories',
    'products',
    'product_options'
  ]);

  const realCreateClient = window.supabase.createClient.bind(window.supabase);
  let memoryDataset = null;
  let refreshPromise = null;
  let loggedSource = false;

  const cfg = () => window.RESTBR_GOOGLE_SHEETS || {};
  const cacheKey = () => cfg().cacheKey || 'RESTBR_GOOGLE_SHEETS_MENU_CACHE_V1';
  const nowIso = () => new Date().toISOString();

  function bool(value, fallback = false) {
    if (value === true || value === false) return value;
    const text = String(value ?? '').trim().toLowerCase();
    if (['true','1','yes','y'].includes(text)) return true;
    if (['false','0','no','n'].includes(text)) return false;
    return fallback;
  }

  function num(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function text(value, fallback = '') {
    const s = String(value ?? '').trim();
    return s || fallback;
  }

  function readCache() {
    try {
      const parsed = JSON.parse(localStorage.getItem(cacheKey()) || 'null');
      if (!parsed?.payload?.data) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function writeCache(payload) {
    try {
      localStorage.setItem(cacheKey(), JSON.stringify({
        savedAt: Date.now(),
        payload
      }));
    } catch (_) {}
  }

  function jsonp(endpoint) {
    return new Promise((resolve, reject) => {
      const callback = '__restbrSheets_' + Date.now().toString(36) + Math.random().toString(36).slice(2);
      const script = document.createElement('script');
      const timeoutMs = Number(cfg().requestTimeoutMs) || 6500;
      let done = false;

      const cleanup = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        script.remove();
        try { delete window[callback]; } catch (_) { window[callback] = undefined; }
      };

      window[callback] = payload => {
        cleanup();
        resolve(payload);
      };

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Google Sheets menu request timed out'));
      }, timeoutMs);

      script.onerror = () => {
        cleanup();
        reject(new Error('Google Sheets menu request failed'));
      };

      const separator = endpoint.includes('?') ? '&' : '?';
      script.src = endpoint + separator +
        'api=menu' +
        '&callback=' + encodeURIComponent(callback) +
        '&v=' + encodeURIComponent(String(cfg().apiVersion || '1')) +
        '&_=' + Date.now();
      script.async = true;
      document.head.appendChild(script);
    });
  }

  function mapPayload(payload) {
    if (!payload?.success || !payload?.data) {
      throw new Error(payload?.message || 'Invalid Google Sheets menu payload');
    }

    const data = payload.data;
    const settings = data.settings || {};
    const categories = Array.isArray(data.categories) ? data.categories : [];
    const products = Array.isArray(data.products) ? data.products : [];
    const groups = Array.isArray(data.optionGroups) ? data.optionGroups : [];
    const options = Array.isArray(data.options) ? data.options : [];

    const groupMap = new Map(groups.map(group => [String(group.Option_Group_ID || ''), group]));
    const optionsByProduct = new Map();

    options.forEach(option => {
      if (!bool(option.Available, true)) return;
      const productId = String(option.Product_ID || '').trim();
      if (!productId) return;
      if (!optionsByProduct.has(productId)) optionsByProduct.set(productId, []);
      optionsByProduct.get(productId).push(option);
    });

    const restaurantSettings = [{
      id: 'google-sheets',
      updated_at: nowIso(),
      name_ar: text(settings.restaurant_name_ar),
      name_ku: text(settings.restaurant_name_ku),
      name_en: text(settings.restaurant_name_en),
      name: text(settings.restaurant_name_en, text(settings.restaurant_name_ar)),
      logo_url: text(settings.restaurant_logo),
      phone: text(settings.restaurant_phone),
      whatsapp_number: text(settings.whatsapp_number),
      location_url: text(settings.google_maps_url),
      instagram_url: text(settings.instagram_url),
      facebook_url: text(settings.facebook_url),
      tiktok_url: text(settings.tiktok_url),
      is_open: bool(settings.restaurant_open, true),
      orders_enabled: true,
      delivery_enabled: bool(settings.delivery_enabled, true),
      pickup_enabled: bool(settings.takeaway_enabled, true),
      dining_gate_texts: null,
      restaurant_schedule_mode: 'always',
      restaurant_schedule: {},
      show_logo: true,
      show_menu_title: true,
      show_subtitle: true,
      show_language_switch: bool(settings.show_language_switcher, true),
      show_category_nav: true,
      show_back_to_top: true,
      intro_enabled: true,
      background_video_enabled: false,
      show_footer: true,
      show_footer_brand: true,
      show_footer_location: true,
      show_footer_phone: true,
      show_footer_socials: true,
      show_footer_copy: true,
      footer_location_enabled: !!text(settings.google_maps_url),
      footer_call_enabled: !!text(settings.restaurant_phone),
      footer_whatsapp_enabled: !!text(settings.whatsapp_number),
      top_location_enabled: !!text(settings.google_maps_url),
      top_call_enabled: !!text(settings.restaurant_phone),
      top_whatsapp_enabled: !!text(settings.whatsapp_number),
      maintenance_mode: bool(settings.maintenance_mode, false),
      currency: text(settings.currency, 'IQD'),
      currency_symbol: text(settings.currency_symbol, 'د.ع')
    }];

    const categoryRows = categories.map(category => ({
      id: String(category.Category_ID || '').trim(),
      name_ar: text(category.Name_AR),
      name_ku: text(category.Name_KU, text(category.Name_AR)),
      name_en: text(category.Name_EN, text(category.Name_AR)),
      sort_order: num(category.Sort_Order, 999),
      is_active: bool(category.Active, true),
      is_visible: bool(category.Visible, true),
      availability_schedule_enabled: false,
      available_from: null,
      available_to: null,
      updated_at: nowIso()
    })).filter(row => row.id && row.is_active !== false && row.is_visible !== false);

    const productRows = products.map(product => ({
      id: String(product.Product_ID || '').trim(),
      category_id: String(product.Category_ID || '').trim(),
      name_ar: text(product.Name_AR),
      name_ku: text(product.Name_KU, text(product.Name_AR)),
      name_en: text(product.Name_EN, text(product.Name_AR)),
      image_url: text(product.Image_URL, text(product.Thumbnail_URL)),
      sort_order: num(product.Sort_Order, 999),
      is_active: true,
      is_visible: bool(product.Visible, true),
      is_available: bool(product.Available, true),
      available: bool(product.Available, true),
      is_popular: bool(product.Best_Seller, false) || bool(product.Featured, false),
      is_new: bool(product.New_Item, false),
      is_hot: bool(product.Spicy, false),
      is_offer: num(product.Old_Price, 0) > num(product.Price_DineIn, 0),
      price: num(product.Price_DineIn, 0),
      takeaway_price: num(product.Price_Takeaway, num(product.Price_DineIn, 0)),
      availability_schedule_enabled: false,
      available_from: null,
      available_to: null,
      updated_at: nowIso()
    })).filter(row => row.id && row.category_id && row.is_visible !== false);

    const productById = new Map(products.map(product => [String(product.Product_ID || '').trim(), product]));
    const optionRows = [];

    productRows.forEach(productRow => {
      const rawProduct = productById.get(productRow.id) || {};
      const baseInside = num(rawProduct.Price_DineIn, 0);
      const baseTakeaway = num(rawProduct.Price_Takeaway, baseInside);
      const rawOptions = (optionsByProduct.get(productRow.id) || [])
        .slice()
        .sort((a, b) => num(a.Sort_Order, 999) - num(b.Sort_Order, 999));

      if (!rawOptions.length) {
        optionRows.push({
          id: productRow.id + '__base',
          product_id: productRow.id,
          name_ar: '',
          name_ku: '',
          name_en: '',
          price: baseInside,
          takeaway_price: baseTakeaway,
          sort_order: 1,
          updated_at: nowIso()
        });
        return;
      }

      rawOptions.forEach((option, index) => {
        const group = groupMap.get(String(option.Option_Group_ID || '').trim()) || {};
        const extra = num(option.Extra_Price, 0);
        const groupPrefixAr = text(group.Name_AR);
        const groupPrefixKu = text(group.Name_KU);
        const groupPrefixEn = text(group.Name_EN);
        const optionAr = text(option.Name_AR);
        const optionKu = text(option.Name_KU, optionAr);
        const optionEn = text(option.Name_EN, optionAr);

        optionRows.push({
          id: String(option.Option_ID || (productRow.id + '__opt_' + (index + 1))),
          product_id: productRow.id,
          name_ar: groupPrefixAr && optionAr ? groupPrefixAr + ': ' + optionAr : optionAr,
          name_ku: groupPrefixKu && optionKu ? groupPrefixKu + ': ' + optionKu : optionKu,
          name_en: groupPrefixEn && optionEn ? groupPrefixEn + ': ' + optionEn : optionEn,
          price: baseInside + extra,
          takeaway_price: baseTakeaway + extra,
          sort_order: num(option.Sort_Order, index + 1),
          updated_at: nowIso()
        });
      });
    });

    return {
      restaurant_settings: restaurantSettings,
      categories: categoryRows,
      products: productRows,
      product_options: optionRows
    };
  }

  async function fetchRemoteDataset() {
    const endpoint = text(cfg().endpoint);
    if (!endpoint) throw new Error('Google Sheets endpoint is not configured');
    const payload = await jsonp(endpoint);
    const dataset = mapPayload(payload);
    writeCache(payload);
    memoryDataset = dataset;
    if (!loggedSource) {
      loggedSource = true;
      console.log('✅ RestBr public menu data source: Google Sheets');
    }
    window.dispatchEvent(new CustomEvent('restbr:sheets-data-ready', { detail: { source: 'remote' } }));
    return dataset;
  }

  async function getDataset() {
    if (memoryDataset) return memoryDataset;

    const cached = readCache();
    if (cached) {
      try {
        memoryDataset = mapPayload(cached.payload);
        const age = Date.now() - Number(cached.savedAt || 0);
        const refreshAfter = Number(cfg().refreshAfterMs) || 300000;
        if (age > refreshAfter && !refreshPromise) {
          refreshPromise = fetchRemoteDataset().catch(() => null).finally(() => { refreshPromise = null; });
        }
        if (!loggedSource) {
          loggedSource = true;
          console.log('⚡ RestBr public menu data source: Google Sheets cache');
        }
        return memoryDataset;
      } catch (_) {
        memoryDataset = null;
      }
    }

    if (!refreshPromise) {
      refreshPromise = fetchRemoteDataset().finally(() => { refreshPromise = null; });
    }
    return refreshPromise;
  }

  function projectRows(rows, columns) {
    const selection = String(columns || '*').trim();
    if (!selection || selection === '*') return rows;
    const keys = selection.split(',').map(x => x.trim()).filter(x => /^[A-Za-z_][A-Za-z0-9_]*$/.test(x));
    if (!keys.length) return rows;
    return rows.map(row => {
      const out = {};
      keys.forEach(key => { out[key] = row[key]; });
      return out;
    });
  }

  class SheetsQuery {
    constructor(table, originalFrom) {
      this.table = table;
      this.originalFrom = originalFrom;
      this.ops = [];
      this.singleMode = '';
    }

    select(columns = '*') { this.ops.push({ type: 'select', columns }); return this; }
    order(column, options = {}) { this.ops.push({ type: 'order', column, options }); return this; }
    limit(value) { this.ops.push({ type: 'limit', value }); return this; }
    eq(column, value) { this.ops.push({ type: 'eq', column, value }); return this; }
    neq(column, value) { this.ops.push({ type: 'neq', column, value }); return this; }
    in(column, values) { this.ops.push({ type: 'in', column, values }); return this; }
    maybeSingle() { this.singleMode = 'maybe'; return this; }
    single() { this.singleMode = 'single'; return this; }

    async fallback() {
      let query = this.originalFrom(this.table);
      for (const op of this.ops) {
        if (typeof query?.[op.type] !== 'function') continue;
        if (op.type === 'select') query = query.select(op.columns);
        else if (op.type === 'order') query = query.order(op.column, op.options);
        else if (op.type === 'limit') query = query.limit(op.value);
        else if (op.type === 'eq' || op.type === 'neq') query = query[op.type](op.column, op.value);
        else if (op.type === 'in') query = query.in(op.column, op.values);
      }
      if (this.singleMode === 'maybe' && typeof query.maybeSingle === 'function') query = query.maybeSingle();
      if (this.singleMode === 'single' && typeof query.single === 'function') query = query.single();
      return await query;
    }

    async execute() {
      try {
        const dataset = await getDataset();
        let rows = Array.isArray(dataset?.[this.table]) ? dataset[this.table].slice() : [];
        let selectedColumns = '*';

        for (const op of this.ops) {
          if (op.type === 'eq') rows = rows.filter(row => String(row?.[op.column] ?? '') === String(op.value ?? ''));
          else if (op.type === 'neq') rows = rows.filter(row => String(row?.[op.column] ?? '') !== String(op.value ?? ''));
          else if (op.type === 'in') {
            const allowed = new Set((Array.isArray(op.values) ? op.values : []).map(value => String(value)));
            rows = rows.filter(row => allowed.has(String(row?.[op.column] ?? '')));
          } else if (op.type === 'order') {
            const ascending = op.options?.ascending !== false;
            rows.sort((a, b) => {
              const av = a?.[op.column];
              const bv = b?.[op.column];
              const an = Number(av); const bn = Number(bv);
              const cmp = Number.isFinite(an) && Number.isFinite(bn)
                ? an - bn
                : String(av ?? '').localeCompare(String(bv ?? ''));
              return ascending ? cmp : -cmp;
            });
          } else if (op.type === 'limit') {
            rows = rows.slice(0, Math.max(0, Number(op.value) || 0));
          } else if (op.type === 'select') {
            selectedColumns = op.columns;
          }
        }

        rows = projectRows(rows, selectedColumns);
        if (this.singleMode === 'maybe') return { data: rows[0] || null, error: null };
        if (this.singleMode === 'single') {
          if (rows.length !== 1) return { data: null, error: new Error('Expected exactly one row') };
          return { data: rows[0], error: null };
        }
        return { data: rows, error: null };
      } catch (error) {
        console.debug('Google Sheets adapter fallback:', error?.message || error);
        return await this.fallback();
      }
    }

    then(resolve, reject) { return this.execute().then(resolve, reject); }
    catch(reject) { return this.execute().catch(reject); }
    finally(handler) { return this.execute().finally(handler); }
  }

  window.supabase.createClient = function(...args) {
    const client = realCreateClient(...args);
    const originalFrom = client.from.bind(client);

    client.from = function(table) {
      const name = String(table || '');
      if (!SUPPORTED_TABLES.has(name)) return originalFrom(name);
      return new SheetsQuery(name, originalFrom);
    };

    client.__restbrGoogleSheets = {
      enabled: () => !!text(cfg().endpoint),
      clearCache: () => {
        memoryDataset = null;
        try { localStorage.removeItem(cacheKey()); } catch (_) {}
      },
      refresh: () => fetchRemoteDataset()
    };

    return client;
  };

  console.log('🔌 RestBr Google Sheets adapter armed');
})();

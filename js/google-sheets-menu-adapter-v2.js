(() => {
  // Public menu only. The admin dashboard stays exactly as-is on Supabase.
  if (/(?:^|\/)admin\.html$/i.test(location.pathname)) return;
  if (!window.supabase || typeof window.supabase.createClient !== 'function') return;

  // Only menu content moves to Google Sheets in phase 1.
  // Restaurant branding/design/hours/WhatsApp settings stay on the stable
  // Supabase settings row so the public design remains pixel-for-pixel stable.
  const SHEETS_TABLES = new Set([
    'categories',
    'products',
    'product_options'
  ]);

  const realCreateClient = window.supabase.createClient.bind(window.supabase);
  let memoryDataset = null;
  let refreshPromise = null;

  const cfg = () => window.RESTBR_GOOGLE_SHEETS || {};
  const endpoint = () => String(cfg().endpoint || '').trim();
  const cacheKey = () => cfg().cacheKey || 'RESTBR_GOOGLE_SHEETS_MENU_CACHE_V1';

  const asBool = (value, fallback = false) => {
    if (value === true || value === false) return value;
    const v = String(value ?? '').trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(v)) return true;
    if (['false', '0', 'no', 'n'].includes(v)) return false;
    return fallback;
  };

  const asNumber = (value, fallback = 0) => {
    if (value === '' || value === null || value === undefined) return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  const asText = (value, fallback = '') => {
    const v = String(value ?? '').trim();
    return v || fallback;
  };

  function readCache() {
    try {
      const parsed = JSON.parse(localStorage.getItem(cacheKey()) || 'null');
      if (!parsed?.payload?.success || !parsed?.payload?.data) return null;
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

  function fetchJsonp(url) {
    return new Promise((resolve, reject) => {
      const callback = '__restbrSheets_' + Date.now().toString(36) + Math.random().toString(36).slice(2);
      const node = document.createElement('script');
      const timeoutMs = Math.max(1200, Number(cfg().requestTimeoutMs) || 4500);
      let finished = false;

      const cleanup = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        node.remove();
        try { delete window[callback]; } catch (_) { window[callback] = undefined; }
      };

      window[callback] = payload => {
        cleanup();
        resolve(payload);
      };

      node.onerror = () => {
        cleanup();
        reject(new Error('Google Sheets API could not be loaded'));
      };

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Google Sheets API timeout'));
      }, timeoutMs);

      const separator = url.includes('?') ? '&' : '?';
      node.src = url + separator +
        'api=menu' +
        '&callback=' + encodeURIComponent(callback) +
        '&v=' + encodeURIComponent(String(cfg().apiVersion || '1')) +
        '&_=' + Date.now();
      node.async = true;
      document.head.appendChild(node);
    });
  }

  function mapPayload(payload) {
    if (!payload?.success || !payload?.data) {
      throw new Error(payload?.message || 'Invalid Google Sheets menu payload');
    }

    const data = payload.data;
    const categories = Array.isArray(data.categories) ? data.categories : [];
    const products = Array.isArray(data.products) ? data.products : [];
    const groups = Array.isArray(data.optionGroups) ? data.optionGroups : [];
    const options = Array.isArray(data.options) ? data.options : [];

    const groupById = new Map(
      groups.map(group => [String(group.Option_Group_ID || '').trim(), group])
    );

    const rawProductById = new Map(
      products.map(product => [String(product.Product_ID || '').trim(), product])
    );

    const optionsByProduct = new Map();
    options.forEach(option => {
      if (!asBool(option.Available, true)) return;
      const productId = String(option.Product_ID || '').trim();
      if (!productId) return;
      if (!optionsByProduct.has(productId)) optionsByProduct.set(productId, []);
      optionsByProduct.get(productId).push(option);
    });

    const categoryRows = categories
      .map(category => ({
        id: String(category.Category_ID || '').trim(),
        name_ar: asText(category.Name_AR),
        name_ku: asText(category.Name_KU, asText(category.Name_AR)),
        name_en: asText(category.Name_EN, asText(category.Name_AR)),
        sort_order: asNumber(category.Sort_Order, 999),
        is_active: asBool(category.Active, true),
        is_visible: asBool(category.Visible, true),
        availability_schedule_enabled: false,
        available_from: null,
        available_to: null
      }))
      .filter(row => row.id && row.is_active !== false && row.is_visible !== false);

    const categoryIds = new Set(categoryRows.map(row => row.id));

    const productRows = products
      .map(product => ({
        id: String(product.Product_ID || '').trim(),
        category_id: String(product.Category_ID || '').trim(),
        name_ar: asText(product.Name_AR),
        name_ku: asText(product.Name_KU, asText(product.Name_AR)),
        name_en: asText(product.Name_EN, asText(product.Name_AR)),
        image_url: asText(product.Image_URL, asText(product.Thumbnail_URL)),
        sort_order: asNumber(product.Sort_Order, 999),
        is_active: true,
        is_visible: asBool(product.Visible, true),
        is_available: asBool(product.Available, true),
        available: asBool(product.Available, true),
        is_popular: asBool(product.Best_Seller, false) || asBool(product.Featured, false),
        is_new: asBool(product.New_Item, false),
        is_hot: asBool(product.Spicy, false),
        is_offer: asNumber(product.Old_Price, 0) > asNumber(product.Price_DineIn, 0),
        price: asNumber(product.Price_DineIn, 0),
        takeaway_price: asNumber(product.Price_Takeaway, asNumber(product.Price_DineIn, 0)),
        availability_schedule_enabled: false,
        available_from: null,
        available_to: null
      }))
      .filter(row => row.id && row.category_id && categoryIds.has(row.category_id) && row.is_visible !== false);

    const optionRows = [];

    productRows.forEach(productRow => {
      const rawProduct = rawProductById.get(productRow.id) || {};
      const dineInBase = asNumber(rawProduct.Price_DineIn, 0);
      const takeawayBase = asNumber(rawProduct.Price_Takeaway, dineInBase);
      const rawOptions = (optionsByProduct.get(productRow.id) || [])
        .slice()
        .sort((a, b) => asNumber(a.Sort_Order, 999) - asNumber(b.Sort_Order, 999));

      if (!rawOptions.length) {
        optionRows.push({
          id: productRow.id + '__base',
          product_id: productRow.id,
          name_ar: '',
          name_ku: '',
          name_en: '',
          price: dineInBase,
          takeaway_price: takeawayBase,
          sort_order: 1
        });
        return;
      }

      rawOptions.forEach((option, index) => {
        const group = groupById.get(String(option.Option_Group_ID || '').trim()) || {};
        const extra = asNumber(option.Extra_Price, 0);
        const ar = asText(option.Name_AR);
        const ku = asText(option.Name_KU, ar);
        const en = asText(option.Name_EN, ar);
        const groupAr = asText(group.Name_AR);
        const groupKu = asText(group.Name_KU);
        const groupEn = asText(group.Name_EN);

        optionRows.push({
          id: String(option.Option_ID || (productRow.id + '__opt_' + (index + 1))),
          product_id: productRow.id,
          name_ar: groupAr && ar ? groupAr + ': ' + ar : ar,
          name_ku: groupKu && ku ? groupKu + ': ' + ku : ku,
          name_en: groupEn && en ? groupEn + ': ' + en : en,
          price: dineInBase + extra,
          takeaway_price: takeawayBase + extra,
          sort_order: asNumber(option.Sort_Order, index + 1)
        });
      });
    });

    return {
      categories: categoryRows,
      products: productRows,
      product_options: optionRows
    };
  }

  async function fetchRemote() {
    if (!endpoint()) throw new Error('Google Sheets endpoint is not configured');
    const payload = await fetchJsonp(endpoint());
    const dataset = mapPayload(payload);
    memoryDataset = dataset;
    writeCache(payload);
    console.log('✅ RestBr menu content loaded from Google Sheets');
    return dataset;
  }

  async function getDataset() {
    if (memoryDataset) return memoryDataset;

    const cached = readCache();
    if (cached) {
      memoryDataset = mapPayload(cached.payload);
      const age = Date.now() - Number(cached.savedAt || 0);
      const refreshAfter = Math.max(10000, Number(cfg().refreshAfterMs) || 300000);

      if (age > refreshAfter && !refreshPromise && endpoint()) {
        refreshPromise = fetchRemote()
          .catch(error => console.debug('Sheets background refresh:', error?.message || error))
          .finally(() => { refreshPromise = null; });
      }

      console.log('⚡ RestBr menu content loaded from local Sheets cache');
      return memoryDataset;
    }

    if (!refreshPromise) {
      refreshPromise = fetchRemote().finally(() => { refreshPromise = null; });
    }
    return refreshPromise;
  }

  function project(rows, columns) {
    const selection = String(columns || '*').trim();
    if (!selection || selection === '*') return rows;
    const keys = selection
      .split(',')
      .map(value => value.trim())
      .filter(value => /^[A-Za-z_][A-Za-z0-9_]*$/.test(value));
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
      // Endpoint intentionally blank = zero-risk fallback to existing Supabase.
      if (!endpoint()) return this.fallback();

      try {
        const dataset = await getDataset();
        let rows = Array.isArray(dataset?.[this.table]) ? dataset[this.table].slice() : [];
        let columns = '*';

        for (const op of this.ops) {
          if (op.type === 'eq') {
            rows = rows.filter(row => String(row?.[op.column] ?? '') === String(op.value ?? ''));
          } else if (op.type === 'neq') {
            rows = rows.filter(row => String(row?.[op.column] ?? '') !== String(op.value ?? ''));
          } else if (op.type === 'in') {
            const allowed = new Set((Array.isArray(op.values) ? op.values : []).map(String));
            rows = rows.filter(row => allowed.has(String(row?.[op.column] ?? '')));
          } else if (op.type === 'order') {
            const ascending = op.options?.ascending !== false;
            rows.sort((a, b) => {
              const an = Number(a?.[op.column]);
              const bn = Number(b?.[op.column]);
              const compare = Number.isFinite(an) && Number.isFinite(bn)
                ? an - bn
                : String(a?.[op.column] ?? '').localeCompare(String(b?.[op.column] ?? ''));
              return ascending ? compare : -compare;
            });
          } else if (op.type === 'limit') {
            rows = rows.slice(0, Math.max(0, Number(op.value) || 0));
          } else if (op.type === 'select') {
            columns = op.columns;
          }
        }

        rows = project(rows, columns);

        if (this.singleMode === 'maybe') return { data: rows[0] || null, error: null };
        if (this.singleMode === 'single') {
          return rows.length === 1
            ? { data: rows[0], error: null }
            : { data: null, error: new Error('Expected exactly one row') };
        }

        return { data: rows, error: null };
      } catch (error) {
        console.warn('Google Sheets menu fallback to Supabase:', error?.message || error);
        return this.fallback();
      }
    }

    then(resolve, reject) { return this.execute().then(resolve, reject); }
    catch(reject) { return this.execute().catch(reject); }
    finally(handler) { return this.execute().finally(handler); }
  }

  window.supabase.createClient = function(...args) {
    const client = realCreateClient(...args);
    const originalFrom = client.from.bind(client);

    client.from = table => {
      const name = String(table || '');
      return SHEETS_TABLES.has(name)
        ? new SheetsQuery(name, originalFrom)
        : originalFrom(name);
    };

    client.__restbrGoogleSheets = {
      enabled: () => !!endpoint(),
      clearCache: () => {
        memoryDataset = null;
        try { localStorage.removeItem(cacheKey()); } catch (_) {}
      },
      refresh: () => fetchRemote()
    };

    return client;
  };

  console.log('🔌 RestBr Google Sheets menu adapter v2 armed');
})();

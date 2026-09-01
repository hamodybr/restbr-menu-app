// RESTBR admin product-image storage cleanup
// Removes only superseded/orphaned files owned by this restaurant's
// menu-images/products/<productId>/ folder. External URLs are never touched.
(() => {
  if (window.__RESTBR_ADMIN_STORAGE_CLEANUP_V1__) return;
  window.__RESTBR_ADMIN_STORAGE_CLEANUP_V1__ = true;

  const BUCKET = 'menu-images';
  const pendingUploads = new Map();

  const safeProductId = value =>
    String(value ?? '').replace(/[^a-zA-Z0-9_-]/g, '_');

  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  function projectOrigin() {
    try {
      const raw = String(window.RESTBR_CONFIG?.supabaseUrl || '').trim();
      if (!raw) return '';
      return new URL(raw).origin;
    } catch (_) {
      return '';
    }
  }

  function ownedProductPath(url, productId) {
    const raw = String(url ?? '').trim();
    if (!raw || !productId) return '';

    try {
      const parsed = new URL(raw, window.location.href);
      const origin = projectOrigin();
      if (!origin || parsed.origin !== origin) return '';

      const marker = `/storage/v1/object/public/${BUCKET}/`;
      if (!parsed.pathname.startsWith(marker)) return '';

      let path = parsed.pathname.slice(marker.length);
      try { path = decodeURIComponent(path); } catch (_) {}

      const prefix = `products/${safeProductId(productId)}/`;
      if (!path.startsWith(prefix)) return '';

      const segments = path.split('/');
      if (segments.some(segment => !segment || segment === '.' || segment === '..')) {
        return '';
      }

      return path;
    } catch (_) {
      return '';
    }
  }

  async function removeOwnedProductImage(url, productId, reason) {
    const path = ownedProductPath(url, productId);
    if (!path) return false;

    try {
      const { error } = await supabaseClient.storage
        .from(BUCKET)
        .remove([path]);

      if (error) {
        console.warn('RESTBR STORAGE CLEANUP SKIPPED:', reason, path, error);
        return false;
      }

      console.log('RESTBR STORAGE CLEANUP:', reason, path);
      return true;
    } catch (error) {
      console.warn('RESTBR STORAGE CLEANUP ERROR:', reason, path, error);
      return false;
    }
  }

  async function readProduct(productId) {
    try {
      const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .eq('id', productId)
        .maybeSingle();

      if (error) throw error;
      return data || null;
    } catch (error) {
      console.warn('RESTBR STORAGE CLEANUP VERIFY ERROR:', error);
      return undefined;
    }
  }

  async function readProductWithRetry(productId) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const row = await readProduct(productId);
      if (row !== undefined) return row;
      if (attempt < 2) await delay(250);
    }
    return undefined;
  }

  function productImageUrl(product) {
    return String(product?.image_url ?? product?.image ?? '').trim();
  }

  function currentAdminProduct(productId) {
    try {
      if (typeof adminProducts === 'undefined' || !Array.isArray(adminProducts)) {
        return null;
      }
      return adminProducts.find(
        item => String(item?.id) === String(productId)
      ) || null;
    } catch (_) {
      return null;
    }
  }

  async function reconcileSavedProduct(productId, oldUrl, reasonPrefix) {
    const row = await readProductWithRetry(productId);
    if (row === undefined) return false;

    const currentUrl = productImageUrl(row);
    const pendingUrl = pendingUploads.get(String(productId)) || '';

    if (row && oldUrl && currentUrl !== oldUrl) {
      await removeOwnedProductImage(
        oldUrl,
        productId,
        `${reasonPrefix}: superseded product image`
      );
    }

    if (pendingUrl && (!row || currentUrl !== pendingUrl)) {
      await removeOwnedProductImage(
        pendingUrl,
        productId,
        `${reasonPrefix}: orphaned product upload`
      );
    }

    pendingUploads.delete(String(productId));
    return true;
  }

  async function reconcileCreatedUploads(beforeKeys, reasonPrefix) {
    const createdKeys = [...pendingUploads.keys()]
      .filter(key => !beforeKeys.has(key));

    for (const key of createdKeys) {
      const pendingUrl = pendingUploads.get(key) || '';
      const row = await readProductWithRetry(key);
      if (row === undefined) continue;

      const currentUrl = productImageUrl(row);
      if (!row || currentUrl !== pendingUrl) {
        await removeOwnedProductImage(
          pendingUrl,
          key,
          `${reasonPrefix}: orphaned new-product upload`
        );
      }

      pendingUploads.delete(key);
    }
  }

  function wrapUploadFunction(name, inputId) {
    const original = window[name];
    if (typeof original !== 'function' || original.__restbrStorageWrapped) return;

    const wrapped = async function(productId, ...args) {
      const fileSelected = !!document.getElementById(inputId)?.files?.[0];
      const result = await original.call(this, productId, ...args);

      if (fileSelected) {
        const path = ownedProductPath(result, productId);
        if (path) {
          pendingUploads.set(String(productId), String(result));
        }
      }

      return result;
    };

    wrapped.__restbrStorageWrapped = true;
    wrapped.__restbrOriginal = original;
    window[name] = wrapped;
  }

  function wrapSaveProduct() {
    const original = window.saveAdminProduct;
    if (typeof original !== 'function' || original.__restbrStorageWrapped) return;

    const wrapped = async function(productId, ...args) {
      const before = currentAdminProduct(productId);
      const oldUrl = productImageUrl(before);

      try {
        const result = await original.call(this, productId, ...args);
        await reconcileSavedProduct(productId, oldUrl, 'saved product');
        return result;
      } catch (error) {
        await reconcileSavedProduct(productId, oldUrl, 'failed product save');
        throw error;
      }
    };

    wrapped.__restbrStorageWrapped = true;
    wrapped.__restbrOriginal = original;
    window.saveAdminProduct = wrapped;
  }

  function wrapCreateProduct() {
    const original = window.createAdminProduct;
    if (typeof original !== 'function' || original.__restbrStorageWrapped) return;

    const wrapped = async function(...args) {
      const beforeKeys = new Set(pendingUploads.keys());

      try {
        const result = await original.apply(this, args);
        await reconcileCreatedUploads(beforeKeys, 'created product');
        return result;
      } catch (error) {
        await reconcileCreatedUploads(beforeKeys, 'failed product create');
        throw error;
      }
    };

    wrapped.__restbrStorageWrapped = true;
    wrapped.__restbrOriginal = original;
    window.createAdminProduct = wrapped;
  }

  function wrapDeleteProduct() {
    const original = window.deleteAdminProduct;
    if (typeof original !== 'function' || original.__restbrStorageWrapped) return;

    const wrapped = async function(productId, ...args) {
      const before = currentAdminProduct(productId);
      const oldUrl = productImageUrl(before);

      const result = await original.call(this, productId, ...args);

      const row = await readProductWithRetry(productId);
      if (row === undefined) return result;

      if (!row && oldUrl) {
        await removeOwnedProductImage(
          oldUrl,
          productId,
          'deleted product image'
        );
      }

      return result;
    };

    wrapped.__restbrStorageWrapped = true;
    wrapped.__restbrOriginal = original;
    window.deleteAdminProduct = wrapped;
  }

  function install() {
    try {
      if (typeof supabaseClient === 'undefined' || !supabaseClient?.storage) {
        return false;
      }
    } catch (_) {
      return false;
    }

    wrapUploadFunction('uploadAdminProductImage', 'p_image_file');
    wrapUploadFunction('uploadNewProductImage', 'np_image_file');
    wrapSaveProduct();
    wrapCreateProduct();
    wrapDeleteProduct();

    return (
      typeof window.saveAdminProduct === 'function' &&
      window.saveAdminProduct.__restbrStorageWrapped === true &&
      typeof window.createAdminProduct === 'function' &&
      window.createAdminProduct.__restbrStorageWrapped === true &&
      typeof window.deleteAdminProduct === 'function' &&
      window.deleteAdminProduct.__restbrStorageWrapped === true
    );
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (install() || attempts >= 240) {
      clearInterval(timer);
    }
  }, 25);
})();

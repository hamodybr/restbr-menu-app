(() => {
  let channel = null;
  let started = false;
  let activeChoiceProductId = null;

  const client = () =>
    typeof supabaseClient !== "undefined"
      ? supabaseClient
      : null;

  const lang = () =>
    window.SHORASH_LANG
      ? window.SHORASH_LANG()
      : (localStorage.getItem("shorashLang") || "ar");

  const money = value => {
    if (value === null || value === undefined || value === "") return "";
    return Number(value).toLocaleString("en-US") + " " + (lang() === "en" ? "IQD" : "د.ع");
  };

  const db = () => window.SHORASH_DB;

  function productById(productId) {
    return db()?.products?.find(
      product => String(product.id) === String(productId)
    ) || null;
  }

  function optionById(product, optionId) {
    return product?.options?.find(
      option => String(option.id) === String(optionId)
    ) || null;
  }

  function productCard(productId) {
    return [...document.querySelectorAll("[data-product-card]")].find(
      card => String(card.dataset.productCard) === String(productId)
    ) || null;
  }

  function refreshProductDom(productId) {
    const product = productById(productId);
    const card = productCard(productId);

    if (product && card) {
      const rows = [...card.querySelectorAll(".sm-option")];

      (product.options || []).forEach((option, index) => {
        const price = rows[index]?.querySelector(".sm-price");
        if (price) price.textContent = money(option.price);
      });
    }

    if (
      product &&
      activeChoiceProductId !== null &&
      String(activeChoiceProductId) === String(productId)
    ) {
      const choiceRows = [...document.querySelectorAll("#smChoiceList .sm-choice-option")];

      (product.options || []).forEach((option, index) => {
        const price = choiceRows[index]?.querySelector("b");
        if (price) price.textContent = money(option.price);
      });
    }
  }

  function notifyPriceUpdate(detail = {}) {
    window.dispatchEvent(
      new CustomEvent("shorash:prices-updated", { detail })
    );
  }

  function applyRow(row, notify = true) {
    if (!row || row.id === undefined || row.product_id === undefined) return false;

    const product = productById(row.product_id);
    const option = optionById(product, row.id);
    if (!option) return false;

    const nextPrice = Number(row.price);
    if (!Number.isFinite(nextPrice)) return false;

    const changed = Number(option.price) !== nextPrice;
    option.price = nextPrice;

    if (changed) refreshProductDom(product.id);

    if (changed && notify) {
      notifyPriceUpdate({
        productId: product.id,
        optionId: option.id,
        price: nextPrice
      });
    }

    return changed;
  }

  async function syncAllPrices() {
    const sb = client();
    if (!sb || !db()?.products) return;

    const { data, error } = await sb
      .from("product_options")
      .select("id,product_id,price");

    if (error || !Array.isArray(data)) return;

    const touchedProducts = new Set();
    let changed = false;

    data.forEach(row => {
      const didChange = applyRow(row, false);
      if (didChange) {
        changed = true;
        touchedProducts.add(String(row.product_id));
      }
    });

    touchedProducts.forEach(refreshProductDom);

    if (changed) {
      notifyPriceUpdate({ bulk: true });
    }
  }

  function start() {
    const sb = client();
    if (started || !sb || !db()?.products) return;
    started = true;

    syncAllPrices();

    channel = sb
      .channel("shorash-live-prices-v1")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "product_options"
        },
        payload => {
          if (payload.eventType === "DELETE") {
            syncAllPrices();
            return;
          }

          applyRow(payload.new, true);
        }
      )
      .subscribe(status => {
        if (status === "SUBSCRIBED") {
          syncAllPrices();
        }
      });

    // Safety sync in case a mobile browser briefly drops the realtime socket.
    window.setInterval(syncAllPrices, 30000);
  }

  document.addEventListener("click", event => {
    const choose = event.target.closest(".sm-choose-options");
    if (choose) {
      activeChoiceProductId = choose.dataset.productId || null;
    }

    if (event.target.closest("#smChoiceClose,#smChoiceBackdrop")) {
      activeChoiceProductId = null;
    }
  }, true);

  window.addEventListener("online", syncAllPrices);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") syncAllPrices();
  });

  window.addEventListener("shorash:ready", start, { once: true });

  if (db()?.products) {
    start();
  }
})();
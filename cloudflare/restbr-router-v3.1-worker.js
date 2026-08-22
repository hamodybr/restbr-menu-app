// RESTBR Router V3.1
// Dynamic multi-restaurant router + same-origin public menu API + lightweight diagnostics.
// Required Worker bindings:
//   SUPABASE_URL
//   SUPABASE_PUBLISHABLE_KEY

const PLATFORM_ROOT = "restbr.com";

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}

function normalizeBasePath(value = "") {
  const path = String(value || "").trim();
  if (!path || path === "/") return "";
  return "/" + path.replace(/^\/+|\/+$/g, "");
}

function base(env) {
  return String(env.SUPABASE_URL || "").replace(/\/+$/, "");
}

function headers(env, extra = {}) {
  return {
    apikey: String(env.SUPABASE_PUBLISHABLE_KEY || ""),
    accept: "application/json",
    ...extra,
  };
}

function assertBindings(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("RESTBR router is missing Supabase bindings.");
  }
}

async function supabaseGet(env, table, params = {}) {
  const url = new URL(`${base(env)}/rest/v1/${table}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    headers: headers(env),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase ${table} lookup failed (${response.status}): ${details}`);
  }

  return response.json();
}

async function findRestaurantByHostname(hostname, env) {
  const rows = await supabaseGet(env, "restaurant_domains", {
    hostname: `eq.${hostname}`,
    status: "eq.active",
    is_verified: "eq.true",
    select:
      "restaurant_id,hostname,restaurants!inner(id,name,slug,status,default_language,timezone,currency,logo_url,router_origin,router_base_path,metadata)",
    "restaurants.status": "eq.active",
    limit: 1,
  });

  return rows?.[0] || null;
}

function flattenSettings(settings, restaurant) {
  const branding =
    settings?.branding && typeof settings.branding === "object" && !Array.isArray(settings.branding)
      ? settings.branding
      : {};

  const features =
    settings?.features && typeof settings.features === "object" && !Array.isArray(settings.features)
      ? settings.features
      : {};

  return {
    ...branding,
    ...features,
    ...(settings || {}),
    restaurant_id: restaurant.id,
    restaurant_slug: restaurant.slug,
    restaurant_status: restaurant.status,
    timezone: restaurant.timezone || "Asia/Baghdad",
    currency: restaurant.currency || "IQD",
    restaurant_name_ar:
      settings?.restaurant_name_ar || branding.restaurant_name_ar || restaurant.name || "",
    restaurant_name_ku:
      settings?.restaurant_name_ku || branding.restaurant_name_ku || restaurant.name || "",
    restaurant_name_en:
      settings?.restaurant_name_en || branding.restaurant_name_en || restaurant.name || "",
    logo_url:
      settings?.logo_url || branding.logo_url || restaurant.logo_url || "",
  };
}

async function getBootstrap(route, env) {
  const restaurant = route.restaurants;
  const id = restaurant.id;

  const [settingsRows, categories, products, options] = await Promise.all([
    supabaseGet(env, "restaurant_settings", {
      restaurant_id: `eq.${id}`,
      select: "*",
      limit: 1,
    }),
    supabaseGet(env, "categories", {
      restaurant_id: `eq.${id}`,
      select: "*",
      order: "sort_order.asc",
    }),
    supabaseGet(env, "products", {
      restaurant_id: `eq.${id}`,
      select: "*",
      order: "sort_order.asc",
    }),
    supabaseGet(env, "product_options", {
      restaurant_id: `eq.${id}`,
      select: "*",
      order: "sort_order.asc",
    }),
  ]);

  return {
    ok: true,
    version: 3.1,
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      status: restaurant.status,
      default_language: restaurant.default_language,
      timezone: restaurant.timezone,
      currency: restaurant.currency,
    },
    settings: flattenSettings(settingsRows?.[0] || {}, restaurant),
    categories: categories || [],
    products: products || [],
    product_options: options || [],
  };
}

async function getStatus(route, env, hostname) {
  const data = await getBootstrap(route, env);
  return {
    ok: true,
    routerVersion: 3.1,
    hostname,
    restaurant: data.restaurant,
    route: {
      origin: route.restaurants.router_origin,
      basePath: route.restaurants.router_base_path,
    },
    data: {
      settings: data.settings ? 1 : 0,
      categories: data.categories.length,
      products: data.products.length,
      options: data.product_options.length,
    },
  };
}

async function track(request, route, env) {
  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405, { allow: "POST" });
  }

  let payload = {};
  try {
    payload = await request.json();
  } catch (_) {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const response = await fetch(`${base(env)}/rest/v1/rpc/track_menu_event`, {
    method: "POST",
    headers: headers(env, { "content-type": "application/json" }),
    body: JSON.stringify({
      p_restaurant_id: route.restaurants.id,
      p_event_type: String(payload.event_type || ""),
      p_ref_id: String(payload.ref_id || ""),
      p_language: String(payload.language || ""),
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    console.warn("RESTBR analytics RPC failed:", response.status, details);
    return json({ ok: false, error: "analytics_failed" }, 502);
  }

  return json({ ok: true });
}

async function proxyRestaurant(request, route) {
  const restaurant = route.restaurants;

  if (!restaurant?.router_origin) {
    return json({ ok: false, error: "restaurant_origin_not_configured" }, 503);
  }

  const incoming = new URL(request.url);
  const origin = String(restaurant.router_origin).replace(/\/+$/, "");
  const basePath = normalizeBasePath(restaurant.router_base_path);
  const path = incoming.pathname === "/" ? "/" : incoming.pathname;
  const target = new URL(`${basePath}${path}${incoming.search}`, `${origin}/`);

  const upstream = await fetch(new Request(target.toString(), request));
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.set("x-restbr-restaurant", restaurant.slug);
  responseHeaders.set("x-restbr-router", "v3.1");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export default {
  async fetch(request, env) {
    try {
      assertBindings(env);

      const url = new URL(request.url);
      const hostname = url.hostname.toLowerCase();

      if (hostname.endsWith(".workers.dev")) {
        return json({
          ok: true,
          service: "restbr-router",
          version: 3.1,
          mode: "dynamic-supabase-menu-core",
        });
      }

      if (hostname === PLATFORM_ROOT || hostname === `www.${PLATFORM_ROOT}`) {
        return json({ ok: false, error: "platform_root_not_handled_by_restaurant_router" }, 404);
      }

      const route = await findRestaurantByHostname(hostname, env);

      if (!route?.restaurants) {
        return json({ ok: false, error: "restaurant_not_found", hostname }, 404);
      }

      if (url.pathname === "/_restbr/health") {
        return json({
          ok: true,
          hostname,
          restaurant: {
            id: route.restaurants.id,
            name: route.restaurants.name,
            slug: route.restaurants.slug,
            status: route.restaurants.status,
          },
          route: {
            origin: route.restaurants.router_origin,
            basePath: route.restaurants.router_base_path,
          },
          routerVersion: 3.1,
        });
      }

      if (url.pathname === "/_restbr/status") {
        if (request.method !== "GET" && request.method !== "HEAD") {
          return json({ ok: false, error: "method_not_allowed" }, 405, { allow: "GET, HEAD" });
        }
        return json(await getStatus(route, env, hostname));
      }

      if (url.pathname === "/_restbr/bootstrap") {
        if (request.method !== "GET" && request.method !== "HEAD") {
          return json({ ok: false, error: "method_not_allowed" }, 405, { allow: "GET, HEAD" });
        }

        const data = await getBootstrap(route, env);
        return json(data, 200, {
          "cache-control": "public, max-age=15, s-maxage=30, stale-while-revalidate=60",
        });
      }

      if (url.pathname === "/_restbr/track") {
        return track(request, route, env);
      }

      return await proxyRestaurant(request, route);
    } catch (error) {
      console.error("RESTBR Router V3.1 error:", error);
      return json(
        {
          ok: false,
          error: "router_internal_error",
          message: error?.message || "Unknown error",
        },
        500
      );
    }
  },
};

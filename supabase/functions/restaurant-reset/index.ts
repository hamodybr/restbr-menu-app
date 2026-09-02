import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function tableCount(client: any, table: string) {
  const { count, error } = await client.from(table).select("*", { count: "exact", head: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

async function countStorageFiles(client: any, bucket: string) {
  let total = 0;
  const queue = [""];
  const seen = new Set<string>();

  while (queue.length) {
    const prefix = queue.shift() ?? "";
    if (seen.has(prefix)) continue;
    seen.add(prefix);

    let offset = 0;
    while (true) {
      const { data, error } = await client.storage.from(bucket).list(prefix, {
        limit: 1000,
        offset,
        sortBy: { column: "name", order: "asc" },
      });

      if (error) {
        if (/not found/i.test(error.message || "")) return 0;
        throw new Error(`storage ${bucket}: ${error.message}`);
      }

      const items = data || [];
      for (const item of items) {
        const isFolder = !item.id && !item.metadata;
        if (isFolder) {
          const child = prefix ? `${prefix}/${item.name}` : item.name;
          queue.push(child);
        } else {
          total += 1;
        }
      }

      if (items.length < 1000) break;
      offset += items.length;
    }
  }

  return total;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !token) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    const caller = userData?.user;
    if (userError || !caller?.id) return json({ ok: false, error: "Unauthorized" }, 401);

    const { data: callerProfile, error: profileError } = await userClient
      .from("admin_users")
      .select("role,is_active")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (profileError || !callerProfile || callerProfile.is_active !== true || callerProfile.role !== "super_admin") {
      return json({ ok: false, error: "Super admin access required" }, 403);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const [
      categories,
      products,
      productOptions,
      discounts,
      orders,
      orderItems,
      analytics,
      settings,
      adminUsers,
      storageFiles,
    ] = await Promise.all([
      tableCount(adminClient, "categories"),
      tableCount(adminClient, "products"),
      tableCount(adminClient, "product_options"),
      tableCount(adminClient, "discounts"),
      tableCount(adminClient, "orders"),
      tableCount(adminClient, "order_items"),
      tableCount(adminClient, "menu_analytics_daily"),
      tableCount(adminClient, "restaurant_settings"),
      tableCount(adminClient, "admin_users"),
      countStorageFiles(adminClient, "menu-images"),
    ]);

    const { data: restaurant } = await adminClient
      .from("restaurant_settings")
      .select("restaurant_name_ar,restaurant_name_ku,restaurant_name_en,name_ar,name_ku,name_en,phone,whatsapp,whatsapp_number,logo_url")
      .limit(1)
      .maybeSingle();

    const deleteTotal = categories + products + productOptions + discounts + orders + orderItems + analytics + storageFiles;

    return json({
      ok: true,
      dry_run: true,
      restaurant: {
        name_ar: restaurant?.restaurant_name_ar || restaurant?.name_ar || "",
        name_ku: restaurant?.restaurant_name_ku || restaurant?.name_ku || "",
        name_en: restaurant?.restaurant_name_en || restaurant?.name_en || "",
        phone: restaurant?.phone || "",
        whatsapp: restaurant?.whatsapp || restaurant?.whatsapp_number || "",
        logo_url: restaurant?.logo_url || "",
      },
      counts: {
        categories,
        products,
        product_options: productOptions,
        discounts,
        orders,
        order_items: orderItems,
        menu_analytics_daily: analytics,
        storage_files: storageFiles,
        restaurant_settings: settings,
        admin_users: adminUsers,
      },
      plan: {
        delete_total: deleteTotal,
        reset_settings_rows: settings,
        protected_admin_users: adminUsers,
        storage_bucket: "menu-images",
      },
    });
  } catch (error) {
    console.error("restaurant-reset dry-run error", error);
    return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

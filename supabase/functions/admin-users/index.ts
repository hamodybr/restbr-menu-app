import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from("admin_users")
      .select("role,is_active")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (
      callerProfileError ||
      !callerProfile ||
      callerProfile.is_active !== true ||
      !["super_admin", "owner"].includes(callerProfile.role)
    ) {
      return json({ ok: false, error: "Forbidden" }, 403);
    }

    const { data: authData, error: authError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (authError) throw authError;

    const { data: profiles, error: profilesError } = await adminClient
      .from("admin_users")
      .select("user_id,display_name,role,is_active,created_at");
    if (profilesError) throw profilesError;

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
    const users = (authData?.users || [])
      .map((u) => {
        const p = profileMap.get(u.id);
        return {
          user_id: u.id,
          email: u.email || "",
          display_name: p?.display_name || "",
          role: p?.role || "",
          is_active: p?.is_active === true,
          created_at: p?.created_at || u.created_at || null,
          last_sign_in_at: u.last_sign_in_at || null,
          email_confirmed: !!u.email_confirmed_at,
          is_current_user: u.id === caller.id,
        };
      })
      .filter((u) => u.role)
      .sort((a, b) => {
        if (a.is_current_user !== b.is_current_user) return a.is_current_user ? -1 : 1;
        return String(a.display_name || a.email).localeCompare(String(b.display_name || b.email));
      });

    return json({ ok: true, users });
  } catch (error) {
    console.error("admin-users error", error);
    return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

const MANAGED_ROLES = ["owner", "manager", "menu_editor", "viewer"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function cleanText(value: unknown, max = 120) {
  return String(value ?? "").trim().slice(0, max);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!["GET", "POST", "PATCH", "DELETE"].includes(req.method)) {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

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

    const { data: callerProfile, error: callerProfileError } = await userClient
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

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (req.method === "POST") {
      let body: Record<string, unknown> = {};
      try { body = await req.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }

      const displayName = cleanText(body.display_name, 80);
      const email = cleanText(body.email, 254).toLowerCase();
      const password = String(body.password ?? "");
      const role = cleanText(body.role, 40);

      if (!displayName) return json({ ok: false, error: "Display name is required" }, 400);
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: "Valid email is required" }, 400);
      if (password.length < 8) return json({ ok: false, error: "Password must be at least 8 characters" }, 400);
      if (!MANAGED_ROLES.includes(role)) return json({ ok: false, error: "Invalid role" }, 400);

      const { data: createdAuth, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName },
      });
      if (createError || !createdAuth?.user?.id) return json({ ok: false, error: createError?.message || "Failed to create auth user" }, 400);

      const newUserId = createdAuth.user.id;
      const { error: profileError } = await adminClient.from("admin_users").insert({
        user_id: newUserId,
        display_name: displayName,
        role,
        is_active: true,
      });
      if (profileError) {
        try { await adminClient.auth.admin.deleteUser(newUserId); } catch (_) {}
        return json({ ok: false, error: profileError.message || "Failed to create admin profile" }, 500);
      }

      return json({ ok: true, user: {
        user_id: newUserId,
        email,
        display_name: displayName,
        role,
        is_active: true,
        email_confirmed: true,
        is_current_user: false,
      }}, 201);
    }

    if (req.method === "PATCH") {
      let body: Record<string, unknown> = {};
      try { body = await req.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }

      const userId = cleanText(body.user_id, 64);
      if (!userId) return json({ ok: false, error: "User id is required" }, 400);
      if (userId === caller.id) return json({ ok: false, error: "You cannot change your own role or status here" }, 400);

      const hasRole = Object.prototype.hasOwnProperty.call(body, "role");
      const hasActive = Object.prototype.hasOwnProperty.call(body, "is_active");
      if (!hasRole && !hasActive) return json({ ok: false, error: "Nothing to update" }, 400);

      const { data: target, error: targetError } = await adminClient.from("admin_users")
        .select("user_id,display_name,role,is_active")
        .eq("user_id", userId)
        .maybeSingle();
      if (targetError) return json({ ok: false, error: targetError.message }, 500);
      if (!target) return json({ ok: false, error: "User profile not found" }, 404);
      if (target.role === "super_admin") return json({ ok: false, error: "Super admin account is protected" }, 403);

      const updates: Record<string, unknown> = {};
      if (hasRole) {
        const role = cleanText(body.role, 40);
        if (!MANAGED_ROLES.includes(role)) return json({ ok: false, error: "Invalid role" }, 400);
        updates.role = role;
      }
      if (hasActive) {
        if (typeof body.is_active !== "boolean") return json({ ok: false, error: "Invalid active status" }, 400);
        updates.is_active = body.is_active;
      }

      const { data: updated, error: updateError } = await adminClient.from("admin_users")
        .update(updates)
        .eq("user_id", userId)
        .select("user_id,display_name,role,is_active,created_at")
        .single();
      if (updateError) return json({ ok: false, error: updateError.message }, 500);
      return json({ ok: true, user: updated });
    }

    if (req.method === "DELETE") {
      let body: Record<string, unknown> = {};
      try { body = await req.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }

      const userId = cleanText(body.user_id, 64);
      if (!userId) return json({ ok: false, error: "User id is required" }, 400);
      if (userId === caller.id) return json({ ok: false, error: "You cannot delete your own account" }, 400);

      const { data: target, error: targetError } = await adminClient.from("admin_users")
        .select("user_id,display_name,role,is_active")
        .eq("user_id", userId)
        .maybeSingle();
      if (targetError) return json({ ok: false, error: targetError.message }, 500);
      if (!target) return json({ ok: false, error: "User profile not found" }, 404);
      if (target.role === "super_admin") return json({ ok: false, error: "Super admin account is protected" }, 403);
      if (callerProfile.role === "owner" && target.role === "owner") {
        return json({ ok: false, error: "Owner accounts can only be deleted by the super admin" }, 403);
      }

      const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId, false);
      if (deleteAuthError) return json({ ok: false, error: deleteAuthError.message || "Failed to delete auth user" }, 500);

      const { error: cleanupError } = await adminClient.from("admin_users").delete().eq("user_id", userId);
      if (cleanupError) console.warn("admin_users cleanup warning", cleanupError.message);

      return json({ ok: true, deleted_user_id: userId });
    }

    const { data: authData, error: authError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (authError) throw authError;

    const { data: profiles, error: profilesError } = await userClient.from("admin_users")
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

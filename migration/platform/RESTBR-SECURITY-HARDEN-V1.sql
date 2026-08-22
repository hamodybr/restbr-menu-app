-- ============================================================
-- RESTBR SECURITY HARDEN V1.1
-- Removes unnecessary direct EXECUTE grants from internal helper functions.
-- Transaction lifecycle is owned by the Supabase migration runner.
-- ============================================================

-- This function is used only by the database event trigger `ensure_rls`.
-- It must not be callable as a public PostgREST RPC.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated, service_role;

-- Anonymous menu readers never need to ask whether they are platform admins.
-- Authenticated role keeps EXECUTE because RLS/admin helpers use this check.
revoke execute on function private.is_platform_admin() from public, anon;

grant execute on function private.is_platform_admin() to authenticated, service_role;

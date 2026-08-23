-- ============================================================
-- RESTBR SUPER ADMIN READ V1
-- Explicit read access for Platform Admins on admin-only datasets.
-- Does not grant general authenticated users access.
-- ============================================================

drop policy if exists subscriptions_platform_admin_read on public.subscriptions;
create policy subscriptions_platform_admin_read on public.subscriptions
for select to authenticated
using (private.is_platform_admin());

drop policy if exists restaurant_members_platform_admin_read on public.restaurant_members;
create policy restaurant_members_platform_admin_read on public.restaurant_members
for select to authenticated
using (private.is_platform_admin());

-- ============================================================
-- RESTBR SUPER ADMIN ONLY V1
-- Single-operator management mode.
--
-- Restaurant member rows are preserved for history, but disabled.
-- All private tenant-management helpers now authorize Platform Admin only.
-- Public menu read policies remain unchanged.
-- ============================================================

update public.restaurant_members
set is_active = false
where is_active = true;

create or replace function private.restaurant_role(p_restaurant_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when private.is_platform_admin() then 'platform_admin'::text
    else null::text
  end;
$$;

create or replace function private.is_restaurant_member(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_platform_admin();
$$;

create or replace function private.is_restaurant_owner(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_platform_admin();
$$;

create or replace function private.can_edit_menu(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_platform_admin();
$$;

create or replace function private.can_manage_restaurant(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_platform_admin();
$$;

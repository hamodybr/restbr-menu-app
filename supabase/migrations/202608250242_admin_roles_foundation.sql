begin;

-- RestBr admin role foundation. This migration does not tighten existing RLS yet.

alter table public.admin_users
  drop constraint if exists admin_users_role_check;

alter table public.admin_users
  add constraint admin_users_role_check
  check (role in ('super_admin','owner','manager','menu_editor','viewer'));

create index if not exists admin_users_active_role_idx
  on public.admin_users (is_active, role);

-- Bootstrap the existing dashboard account as Super Admin without hardcoding a user id.
insert into public.admin_users (user_id, display_name, role, is_active)
select
  u.id,
  coalesce(
    nullif(u.raw_user_meta_data ->> 'display_name',''),
    nullif(split_part(u.email,'@',1),''),
    'Super Admin'
  ),
  'super_admin',
  true
from auth.users u
where u.id = (
  select id
  from auth.users
  order by created_at asc
  limit 1
)
on conflict (user_id) do update
set
  role = 'super_admin',
  is_active = true;

create or replace function public.current_admin_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select au.role
  from public.admin_users au
  where au.user_id = (select auth.uid())
    and au.is_active = true
  limit 1;
$$;

create or replace function public.has_admin_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = (select auth.uid())
      and au.is_active = true
      and au.role = any(allowed_roles)
  );
$$;

create or replace function public.can_manage_menu()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_admin_role(
    array['super_admin','owner','manager','menu_editor']::text[]
  );
$$;

create or replace function public.can_manage_restaurant_settings()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_admin_role(
    array['super_admin','owner']::text[]
  );
$$;

create or replace function public.can_manage_users()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_admin_role(
    array['super_admin','owner']::text[]
  );
$$;

grant execute on function public.current_admin_role() to authenticated;
grant execute on function public.has_admin_role(text[]) to authenticated;
grant execute on function public.can_manage_menu() to authenticated;
grant execute on function public.can_manage_restaurant_settings() to authenticated;
grant execute on function public.can_manage_users() to authenticated;

commit;

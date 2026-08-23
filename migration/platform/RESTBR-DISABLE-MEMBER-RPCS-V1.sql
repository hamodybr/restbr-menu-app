-- ============================================================
-- RESTBR DISABLE MEMBER RPCS V1
-- Restaurant-level accounts are no longer part of RESTBR.
-- All restaurant management is performed by Platform Admin.
-- ============================================================

create or replace function public.admin_assign_restaurant_member(
  p_restaurant_id uuid,
  p_user_email text,
  p_role text default 'owner'::text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_platform_admin() then
    raise exception 'platform admin required' using errcode = '42501';
  end if;

  raise exception 'restaurant member accounts are disabled; use Super Admin restaurant management';
end;
$$;

create or replace function public.admin_set_restaurant_member_active(
  p_restaurant_id uuid,
  p_user_id uuid,
  p_is_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_platform_admin() then
    raise exception 'platform admin required' using errcode = '42501';
  end if;

  raise exception 'restaurant member accounts are disabled; use Super Admin restaurant management';
end;
$$;

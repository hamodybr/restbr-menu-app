-- ============================================================
-- RESTBR MEMBERS V1.2
-- Super Admin RPCs for assigning existing Auth users to restaurants.
-- Uses only the restaurant_members columns already required by Owner V1:
-- restaurant_id, user_id, role, is_active.
-- Run once in restbr-platform > Supabase SQL Editor.
-- ============================================================

begin;

create or replace function public.admin_assign_restaurant_member(
  p_restaurant_id uuid,
  p_user_email text,
  p_role text default 'owner'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_email text;
  v_role text;
begin
  if not private.is_platform_admin() then
    raise exception 'platform admin required' using errcode = '42501';
  end if;

  v_email := lower(btrim(coalesce(p_user_email,'')));
  v_role := lower(btrim(coalesce(p_role,'owner')));

  if v_email = '' then
    raise exception 'email is required';
  end if;

  if v_role not in ('owner','manager','editor','viewer') then
    raise exception 'invalid member role';
  end if;

  if not exists(select 1 from public.restaurants r where r.id = p_restaurant_id) then
    raise exception 'restaurant not found';
  end if;

  select u.id into v_user_id
  from auth.users u
  where lower(u.email) = v_email
  limit 1;

  if v_user_id is null then
    raise exception 'auth user not found for email %', v_email;
  end if;

  if exists(
    select 1 from public.restaurant_members m
    where m.restaurant_id = p_restaurant_id and m.user_id = v_user_id
  ) then
    update public.restaurant_members
    set role = v_role, is_active = true
    where restaurant_id = p_restaurant_id and user_id = v_user_id;
  else
    insert into public.restaurant_members(restaurant_id,user_id,role,is_active)
    values(p_restaurant_id,v_user_id,v_role,true);
  end if;

  return jsonb_build_object(
    'ok',true,
    'restaurant_id',p_restaurant_id,
    'user_id',v_user_id,
    'email',v_email,
    'role',v_role,
    'is_active',true
  );
end;
$$;

create or replace function public.admin_list_restaurant_members(
  p_restaurant_id uuid
)
returns table(
  user_id uuid,
  email text,
  role text,
  is_active boolean
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_platform_admin() then
    raise exception 'platform admin required' using errcode = '42501';
  end if;

  return query
  select m.user_id, u.email::text, m.role::text, m.is_active
  from public.restaurant_members m
  join auth.users u on u.id = m.user_id
  where m.restaurant_id = p_restaurant_id
  order by
    case m.role when 'owner' then 1 when 'manager' then 2 when 'editor' then 3 else 4 end,
    u.email;
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

  update public.restaurant_members
  set is_active = coalesce(p_is_active,false)
  where restaurant_id = p_restaurant_id and user_id = p_user_id;

  if not found then raise exception 'member not found'; end if;

  return jsonb_build_object('ok',true,'restaurant_id',p_restaurant_id,'user_id',p_user_id,'is_active',coalesce(p_is_active,false));
end;
$$;

revoke all on function public.admin_assign_restaurant_member(uuid,text,text) from public;
revoke all on function public.admin_list_restaurant_members(uuid) from public;
revoke all on function public.admin_set_restaurant_member_active(uuid,uuid,boolean) from public;

grant execute on function public.admin_assign_restaurant_member(uuid,text,text) to authenticated, service_role;
grant execute on function public.admin_list_restaurant_members(uuid) to authenticated, service_role;
grant execute on function public.admin_set_restaurant_member_active(uuid,uuid,boolean) to authenticated, service_role;

commit;

-- Note: the user must already exist in Supabase Auth. The Admin V2 UI shows
-- a clear message when an email has not registered yet.

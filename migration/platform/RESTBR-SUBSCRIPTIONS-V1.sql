-- ============================================================
-- RESTBR SUBSCRIPTIONS V1
-- Super Admin RPC for changing the active/latest restaurant plan.
-- Uses subscription columns already referenced by RESTBR Admin V1:
-- restaurant_id, plan, status, starts_at, expires_at, notes.
-- Run once in restbr-platform > Supabase SQL Editor.
-- ============================================================

begin;

create or replace function public.admin_set_restaurant_plan(
  p_restaurant_id uuid,
  p_plan text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan text;
  v_updated integer := 0;
begin
  if not private.is_platform_admin() then
    raise exception 'platform admin required' using errcode = '42501';
  end if;

  v_plan := lower(btrim(coalesce(p_plan,'')));

  if v_plan not in ('basic','pro','premium','internal') then
    raise exception 'invalid plan';
  end if;

  if not exists(select 1 from public.restaurants r where r.id = p_restaurant_id) then
    raise exception 'restaurant not found';
  end if;

  update public.subscriptions s
  set plan = v_plan
  where s.restaurant_id = p_restaurant_id
    and s.starts_at = (
      select max(s2.starts_at)
      from public.subscriptions s2
      where s2.restaurant_id = p_restaurant_id
    );

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    insert into public.subscriptions(
      restaurant_id,
      plan,
      status,
      starts_at,
      notes
    ) values (
      p_restaurant_id,
      v_plan,
      'active',
      now(),
      'Created by RESTBR Super Admin plan editor'
    );
  end if;

  return jsonb_build_object(
    'ok',true,
    'restaurant_id',p_restaurant_id,
    'plan',v_plan
  );
end;
$$;

revoke all on function public.admin_set_restaurant_plan(uuid,text) from public;
grant execute on function public.admin_set_restaurant_plan(uuid,text) to authenticated, service_role;

commit;

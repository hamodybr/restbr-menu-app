-- RESTBR staged onboarding activation guard V1
-- Draft -> Active is only allowed through admin_activate_restaurant().

create or replace function private.guard_restaurant_activation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'draft'
     and new.status = 'active'
     and coalesce(current_setting('restbr.activation_authorized', true), '') <> '1' then
    raise exception 'draft restaurant activation requires admin_activate_restaurant()'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists restbr_guard_restaurant_activation on public.restaurants;
create trigger restbr_guard_restaurant_activation
before update of status on public.restaurants
for each row
execute function private.guard_restaurant_activation();

create or replace function public.admin_activate_restaurant(p_restaurant_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_restaurant public.restaurants%rowtype;
  v_domain public.restaurant_domains%rowtype;
  v_subscription public.subscriptions%rowtype;
  v_has_settings boolean := false;
  v_expected_hostname text;
begin
  if not private.is_platform_admin() then
    raise exception 'platform admin required' using errcode = '42501';
  end if;

  select * into v_restaurant
  from public.restaurants
  where id = p_restaurant_id
  for update;

  if not found then raise exception 'restaurant not found'; end if;
  if v_restaurant.status <> 'draft' then raise exception 'restaurant must be draft before activation'; end if;

  v_expected_hostname := v_restaurant.slug || '.restbr.com';

  select * into v_domain
  from public.restaurant_domains d
  where d.restaurant_id = p_restaurant_id
    and d.is_primary = true
  for update;

  if not found then raise exception 'primary domain missing'; end if;

  select * into v_subscription
  from public.subscriptions s
  where s.restaurant_id = p_restaurant_id
  for update;

  if not found then raise exception 'subscription missing'; end if;

  select exists(
    select 1 from public.restaurant_settings s where s.restaurant_id = p_restaurant_id
  ) into v_has_settings;

  if not v_has_settings then raise exception 'restaurant settings missing'; end if;
  if lower(v_domain.hostname) <> lower(v_expected_hostname) then raise exception 'hostname mismatch'; end if;
  if v_domain.kind <> 'platform_subdomain' then raise exception 'domain kind invalid'; end if;
  if v_domain.status <> 'pending' then raise exception 'domain must be pending before activation'; end if;
  if v_subscription.status not in ('active','trial') then raise exception 'subscription is not active'; end if;
  if v_restaurant.router_origin <> 'https://hamodybr.github.io' then raise exception 'router origin mismatch'; end if;
  if v_restaurant.router_base_path <> '/restbr-menu-app' then raise exception 'router base path mismatch'; end if;

  update public.restaurant_domains
  set status='active', is_verified=true, verified_at=now()
  where id=v_domain.id;

  perform set_config('restbr.activation_authorized','1',true);

  update public.restaurants
  set status='active',
      metadata=coalesce(metadata,'{}'::jsonb) || jsonb_build_object(
        'provision_state','active',
        'activated_at',now()
      )
  where id=p_restaurant_id;

  return jsonb_build_object(
    'ok',true,
    'activated',true,
    'restaurant_id',p_restaurant_id,
    'slug',v_restaurant.slug,
    'hostname',v_expected_hostname,
    'url','https://' || v_expected_hostname,
    'restaurant_status','active',
    'domain_status','active',
    'domain_verified',true
  );
end;
$$;

revoke all on function public.admin_activate_restaurant(uuid) from public;
grant execute on function public.admin_activate_restaurant(uuid) to authenticated;

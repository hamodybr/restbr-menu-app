-- ============================================================
-- RESTBR ANALYTICS V2
-- Tenant-timezone daily aggregation + checkout/order funnel events.
-- ============================================================

begin;

alter table public.menu_analytics_daily
  drop constraint if exists menu_analytics_daily_event_type_check;

alter table public.menu_analytics_daily
  add constraint menu_analytics_daily_event_type_check
  check (event_type in (
    'menu_view',
    'category_view',
    'product_interest',
    'search_use',
    'share_product',
    'share_category',
    'language_change',
    'checkout_start',
    'order_attempt'
  ));

create or replace function public.track_menu_event(
  p_restaurant_id uuid,
  p_event_type text,
  p_ref_id text default '',
  p_language text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_timezone text;
  v_event_date date;
begin
  if p_event_type not in (
    'menu_view','category_view','product_interest','search_use',
    'share_product','share_category','language_change',
    'checkout_start','order_attempt'
  ) then
    raise exception 'invalid event type';
  end if;

  select coalesce(nullif(btrim(r.timezone),''),'UTC')
  into v_timezone
  from public.restaurants r
  where r.id = p_restaurant_id
    and r.status = 'active';

  if v_timezone is null then
    raise exception 'restaurant unavailable';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_timezone_names tz
    where tz.name = v_timezone
  ) then
    v_timezone := 'UTC';
  end if;

  v_event_date := (now() at time zone v_timezone)::date;

  insert into public.menu_analytics_daily (
    event_date, restaurant_id, event_type, ref_id, language, count, updated_at
  )
  values (
    v_event_date,
    p_restaurant_id,
    p_event_type,
    left(coalesce(p_ref_id,''),120),
    left(coalesce(p_language,''),10),
    1,
    now()
  )
  on conflict (event_date, restaurant_id, event_type, ref_id, language)
  do update
    set count = public.menu_analytics_daily.count + 1,
        updated_at = now();
end;
$$;

-- Anonymous menu traffic may record a whitelisted event, but the function
-- exposes no read access and only accepts active restaurant ids.
revoke execute on function public.track_menu_event(uuid,text,text,text) from public, authenticated;
grant execute on function public.track_menu_event(uuid,text,text,text) to anon, service_role;

commit;

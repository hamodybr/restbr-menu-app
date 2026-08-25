-- RESTBR onboarding preflight V1
-- Non-destructive validation for Super Admin restaurant creation.

create or replace function public.admin_create_restaurant_preview(
  p_name text,
  p_slug text,
  p_default_language text default 'ar',
  p_timezone text default 'Asia/Baghdad',
  p_currency text default 'IQD',
  p_phone text default '',
  p_whatsapp text default '',
  p_plan text default 'internal'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_slug text;
  v_language text;
  v_timezone text;
  v_currency text;
  v_phone text;
  v_whatsapp text;
  v_plan text;
  v_hostname text;
  v_slug_conflict boolean := false;
  v_hostname_conflict boolean := false;
  v_errors jsonb := '[]'::jsonb;
begin
  if not private.is_platform_admin() then
    raise exception 'platform admin required' using errcode = '42501';
  end if;

  v_name := btrim(coalesce(p_name, ''));
  v_slug := lower(btrim(coalesce(p_slug, '')));
  v_language := lower(btrim(coalesce(p_default_language, 'ar')));
  v_timezone := coalesce(nullif(btrim(coalesce(p_timezone, '')), ''), 'Asia/Baghdad');
  v_currency := upper(coalesce(nullif(btrim(coalesce(p_currency, '')), ''), 'IQD'));
  v_phone := btrim(coalesce(p_phone, ''));
  v_whatsapp := btrim(coalesce(p_whatsapp, ''));
  v_plan := lower(btrim(coalesce(p_plan, 'internal')));
  v_hostname := v_slug || '.restbr.com';

  if char_length(v_name) < 2 then
    v_errors := v_errors || jsonb_build_array('restaurant_name_required');
  end if;

  if char_length(v_slug) < 2 or char_length(v_slug) > 63 or v_slug !~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' then
    v_errors := v_errors || jsonb_build_array('invalid_slug');
  end if;

  if v_slug in ('www','admin','api','app','dashboard','static','cdn','help','status','mail','support','owner') then
    v_errors := v_errors || jsonb_build_array('reserved_slug');
  end if;

  if v_language not in ('ar','ku','en') then
    v_errors := v_errors || jsonb_build_array('invalid_default_language');
  end if;

  if v_plan not in ('basic','pro','premium','internal') then
    v_errors := v_errors || jsonb_build_array('invalid_plan');
  end if;

  select exists (
    select 1 from public.restaurants r where lower(r.slug) = lower(v_slug)
  ) into v_slug_conflict;

  select exists (
    select 1 from public.restaurant_domains d where lower(d.hostname) = lower(v_hostname)
  ) into v_hostname_conflict;

  if v_slug_conflict then
    v_errors := v_errors || jsonb_build_array('slug_already_exists');
  end if;

  if v_hostname_conflict then
    v_errors := v_errors || jsonb_build_array('hostname_already_exists');
  end if;

  return jsonb_build_object(
    'ok', true,
    'dry_run', true,
    'ready', jsonb_array_length(v_errors) = 0,
    'errors', v_errors,
    'normalized', jsonb_build_object(
      'name', v_name,
      'slug', v_slug,
      'default_language', v_language,
      'timezone', v_timezone,
      'currency', v_currency,
      'phone', v_phone,
      'whatsapp', v_whatsapp,
      'plan', v_plan
    ),
    'target', jsonb_build_object(
      'hostname', v_hostname,
      'url', 'https://' || v_hostname,
      'router_origin', 'https://hamodybr.github.io',
      'router_base_path', '/restbr-menu-app'
    ),
    'conflicts', jsonb_build_object(
      'slug', v_slug_conflict,
      'hostname', v_hostname_conflict
    ),
    'will_create', jsonb_build_object(
      'restaurants', 1,
      'restaurant_settings', 1,
      'restaurant_domains', 1,
      'subscriptions', 1,
      'restaurant_members', 0,
      'categories', 0,
      'products', 0,
      'product_options', 0,
      'storage_files', 0
    ),
    'activation', jsonb_build_object(
      'restaurant_status', 'active',
      'domain_status', 'active',
      'domain_verified', true,
      'subscription_status', 'active'
    ),
    'warnings', jsonb_build_array(
      'Current admin_create_restaurant activates the restaurant and platform subdomain immediately after creation.',
      'No separate restaurant member account is created; current management mode is Super Admin only.'
    )
  );
end;
$$;

revoke all on function public.admin_create_restaurant_preview(text,text,text,text,text,text,text,text) from public;
grant execute on function public.admin_create_restaurant_preview(text,text,text,text,text,text,text,text) to authenticated;

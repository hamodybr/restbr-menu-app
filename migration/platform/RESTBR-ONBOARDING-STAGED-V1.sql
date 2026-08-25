-- RESTBR staged onboarding V1
-- Provision -> Verify -> Activate. Existing admin_create_restaurant() remains unchanged.

create or replace function public.admin_provision_restaurant(
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
  v_preview jsonb;
  v_id uuid;
  v_name text;
  v_slug text;
  v_language text;
  v_timezone text;
  v_currency text;
  v_phone text;
  v_whatsapp text;
  v_plan text;
  v_hostname text;
begin
  if not private.is_platform_admin() then
    raise exception 'platform admin required' using errcode = '42501';
  end if;

  v_preview := public.admin_create_restaurant_preview(
    p_name,p_slug,p_default_language,p_timezone,p_currency,p_phone,p_whatsapp,p_plan
  );

  if coalesce((v_preview->>'ready')::boolean, false) is not true then
    raise exception 'restaurant preflight failed: %', coalesce(v_preview->'errors','[]'::jsonb)::text;
  end if;

  v_name := v_preview->'normalized'->>'name';
  v_slug := v_preview->'normalized'->>'slug';
  v_language := v_preview->'normalized'->>'default_language';
  v_timezone := v_preview->'normalized'->>'timezone';
  v_currency := v_preview->'normalized'->>'currency';
  v_phone := v_preview->'normalized'->>'phone';
  v_whatsapp := v_preview->'normalized'->>'whatsapp';
  v_plan := v_preview->'normalized'->>'plan';
  v_hostname := v_preview->'target'->>'hostname';

  insert into public.restaurants (
    name,slug,status,default_language,timezone,currency,router_origin,router_base_path,metadata
  ) values (
    v_name,v_slug,'draft',v_language,v_timezone,v_currency,
    'https://hamodybr.github.io','/restbr-menu-app',
    jsonb_build_object(
      'created_via','restbr-admin-staged-v1',
      'provision_state','draft',
      'provisioned_at',now()
    )
  ) returning id into v_id;

  insert into public.restaurant_settings (
    restaurant_id,
    restaurant_name_ar,restaurant_name_ku,restaurant_name_en,
    subtitle_ar,subtitle_ku,subtitle_en,
    phone,whatsapp,languages,announcement_enabled,
    branding,ui_design_settings,features
  ) values (
    v_id,
    v_name,v_name,v_name,
    'اكتشف منيو {name}',
    'مێنیوی {name} ببینە',
    'Discover {name} Menu',
    nullif(v_phone,''),
    nullif(v_whatsapp,''),
    array['ar','ku','en']::text[],
    false,
    jsonb_build_object(
      'name_ar',v_name,'name_ku',v_name,'name_en',v_name,
      'show_logo',true,'show_menu_title',true,'show_subtitle',true,
      'show_language_switch',true,'show_category_nav',true,
      'show_footer',true,'show_footer_brand',true,'show_footer_location',true,
      'show_footer_phone',true,'show_footer_socials',true,'show_footer_copy',true,
      'intro_enabled',true,
      'custom_top_actions','[]'::jsonb,
      'custom_footer_actions','[]'::jsonb,
      'custom_social_links','[]'::jsonb
    ),
    jsonb_build_object(
      'design_system_version',1.2,
      'card_gap',10,'logo_size',84,'card_height',160,'card_radius',18,
      'image_percent',40,'info_padding',10,
      'product_name_font',13,'option_font',12,'price_font',12,
      'section_title_font',22,'category_font',12,'category_height',41,
      'menu_title_font',26,'subtitle_font',12,'top_action_height',48,'top_action_font',11,
      'cart_width',160,'cart_height',43,'cart_font',10,'cart_bottom',16,
      'card_glass_opacity',14,'card_glass_blur',18,'card_glass_color','#080604',
      'footer_glass_opacity',14,'footer_glass_blur',18,'footer_glass_color','#080604'
    ),
    jsonb_build_object(
      'menu_enabled',true,'orders_enabled',true,'delivery_enabled',true,
      'pickup_enabled',true,'is_open',true,'intro_enabled',true,
      'background_video_enabled',true,
      'top_location_enabled',false,'top_call_enabled',nullif(v_phone,'') is not null,
      'top_whatsapp_enabled',nullif(v_whatsapp,'') is not null,
      'footer_location_enabled',false,'footer_call_enabled',nullif(v_phone,'') is not null,
      'footer_whatsapp_enabled',nullif(v_whatsapp,'') is not null
    )
  );

  insert into public.restaurant_domains (
    restaurant_id,hostname,kind,status,is_verified,is_primary,verified_at
  ) values (
    v_id,v_hostname,'platform_subdomain','pending',false,true,null
  );

  insert into public.subscriptions (restaurant_id,plan,status,starts_at,notes)
  values (v_id,v_plan,'active',now(),'Created from RESTBR staged onboarding V1');

  return jsonb_build_object(
    'ok',true,
    'provisioned',true,
    'activated',false,
    'restaurant_id',v_id,
    'name',v_name,
    'slug',v_slug,
    'hostname',v_hostname,
    'url','https://' || v_hostname,
    'restaurant_status','draft',
    'domain_status','pending',
    'plan',v_plan
  );
end;
$$;

create or replace function public.admin_restaurant_provision_status(p_restaurant_id uuid)
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
  v_ready boolean := false;
  v_errors jsonb := '[]'::jsonb;
begin
  if not private.is_platform_admin() then
    raise exception 'platform admin required' using errcode = '42501';
  end if;

  select * into v_restaurant
  from public.restaurants
  where id = p_restaurant_id;

  if not found then
    raise exception 'restaurant not found';
  end if;

  v_expected_hostname := v_restaurant.slug || '.restbr.com';

  select exists(
    select 1 from public.restaurant_settings s where s.restaurant_id = p_restaurant_id
  ) into v_has_settings;

  select * into v_domain
  from public.restaurant_domains d
  where d.restaurant_id = p_restaurant_id
    and d.is_primary = true
  limit 1;

  select * into v_subscription
  from public.subscriptions s
  where s.restaurant_id = p_restaurant_id
  limit 1;

  if v_restaurant.status <> 'draft' then
    v_errors := v_errors || jsonb_build_array('restaurant_not_draft');
  end if;

  if not v_has_settings then
    v_errors := v_errors || jsonb_build_array('settings_missing');
  end if;

  if v_domain.id is null then
    v_errors := v_errors || jsonb_build_array('primary_domain_missing');
  else
    if lower(v_domain.hostname) <> lower(v_expected_hostname) then
      v_errors := v_errors || jsonb_build_array('hostname_mismatch');
    end if;
    if v_domain.kind <> 'platform_subdomain' then
      v_errors := v_errors || jsonb_build_array('domain_kind_invalid');
    end if;
    if v_domain.status <> 'pending' then
      v_errors := v_errors || jsonb_build_array('domain_not_pending');
    end if;
  end if;

  if v_subscription.id is null then
    v_errors := v_errors || jsonb_build_array('subscription_missing');
  elsif v_subscription.status not in ('active','trial') then
    v_errors := v_errors || jsonb_build_array('subscription_inactive');
  end if;

  if v_restaurant.router_origin <> 'https://hamodybr.github.io' then
    v_errors := v_errors || jsonb_build_array('router_origin_mismatch');
  end if;

  if v_restaurant.router_base_path <> '/restbr-menu-app' then
    v_errors := v_errors || jsonb_build_array('router_base_path_mismatch');
  end if;

  v_ready := jsonb_array_length(v_errors) = 0;

  return jsonb_build_object(
    'ok',true,
    'ready',v_ready,
    'errors',v_errors,
    'restaurant',jsonb_build_object(
      'id',v_restaurant.id,
      'name',v_restaurant.name,
      'slug',v_restaurant.slug,
      'status',v_restaurant.status,
      'router_origin',v_restaurant.router_origin,
      'router_base_path',v_restaurant.router_base_path
    ),
    'settings',jsonb_build_object('exists',v_has_settings),
    'domain',jsonb_build_object(
      'exists',v_domain.id is not null,
      'hostname',v_domain.hostname,
      'expected_hostname',v_expected_hostname,
      'kind',v_domain.kind,
      'status',v_domain.status,
      'is_verified',v_domain.is_verified,
      'is_primary',v_domain.is_primary
    ),
    'subscription',jsonb_build_object(
      'exists',v_subscription.id is not null,
      'plan',v_subscription.plan,
      'status',v_subscription.status
    ),
    'menu_seed',jsonb_build_object(
      'categories',(select count(*) from public.categories c where c.restaurant_id=p_restaurant_id),
      'products',(select count(*) from public.products p where p.restaurant_id=p_restaurant_id),
      'product_options',(select count(*) from public.product_options o where o.restaurant_id=p_restaurant_id)
    )
  );
end;
$$;

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

  if not found then
    raise exception 'restaurant not found';
  end if;

  if v_restaurant.status <> 'draft' then
    raise exception 'restaurant must be draft before activation';
  end if;

  v_expected_hostname := v_restaurant.slug || '.restbr.com';

  select * into v_domain
  from public.restaurant_domains d
  where d.restaurant_id = p_restaurant_id
    and d.is_primary = true
  for update;

  if not found then
    raise exception 'primary domain missing';
  end if;

  select * into v_subscription
  from public.subscriptions s
  where s.restaurant_id = p_restaurant_id
  for update;

  if not found then
    raise exception 'subscription missing';
  end if;

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

revoke all on function public.admin_provision_restaurant(text,text,text,text,text,text,text,text) from public;
revoke all on function public.admin_restaurant_provision_status(uuid) from public;
revoke all on function public.admin_activate_restaurant(uuid) from public;

grant execute on function public.admin_provision_restaurant(text,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.admin_restaurant_provision_status(uuid) to authenticated;
grant execute on function public.admin_activate_restaurant(uuid) to authenticated;

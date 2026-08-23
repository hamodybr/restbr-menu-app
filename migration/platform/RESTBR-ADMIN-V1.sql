-- ============================================================
-- RESTBR ADMIN V1.2 — atomic restaurant creation RPC
-- Tenant-neutral defaults: no restaurant inherits another brand/text/actions.
-- ============================================================

create or replace function public.admin_create_restaurant(
  p_name text,
  p_slug text,
  p_default_language text default 'ar',
  p_timezone text default 'Asia/Baghdad',
  p_currency text default 'IQD',
  p_phone text default '',
  p_whatsapp text default '',
  p_plan text default 'basic'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_slug text;
  v_hostname text;
  v_name text;
  v_language text;
  v_plan text;
begin
  if not private.is_platform_admin() then
    raise exception 'platform admin required' using errcode = '42501';
  end if;

  v_name := btrim(coalesce(p_name, ''));
  v_slug := lower(btrim(coalesce(p_slug, '')));
  v_language := lower(btrim(coalesce(p_default_language, 'ar')));
  v_plan := lower(btrim(coalesce(p_plan, 'basic')));

  if char_length(v_name) < 2 then raise exception 'restaurant name is required'; end if;
  if char_length(v_slug) < 2 or char_length(v_slug) > 63 or v_slug !~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' then raise exception 'invalid slug'; end if;
  if v_slug in ('www','admin','api','app','dashboard','static','cdn','help','status','mail','support','owner') then raise exception 'reserved slug'; end if;
  if v_language not in ('ar','ku','en') then raise exception 'invalid default language'; end if;
  if v_plan not in ('basic','pro','premium','internal') then raise exception 'invalid plan'; end if;

  v_hostname := v_slug || '.restbr.com';

  insert into public.restaurants (
    name,slug,status,default_language,timezone,currency,router_origin,router_base_path,metadata
  ) values (
    v_name,v_slug,'active',v_language,
    coalesce(nullif(btrim(p_timezone), ''), 'Asia/Baghdad'),
    upper(coalesce(nullif(btrim(p_currency), ''), 'IQD')),
    'https://hamodybr.github.io','/restbr-menu-app',
    jsonb_build_object('created_via','restbr-admin-v1.2')
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
    nullif(btrim(coalesce(p_phone, '')), ''),
    nullif(btrim(coalesce(p_whatsapp, '')), ''),
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
      'top_location_enabled',false,'top_call_enabled',nullif(btrim(coalesce(p_phone,'')),'') is not null,
      'top_whatsapp_enabled',nullif(btrim(coalesce(p_whatsapp,'')),'') is not null,
      'footer_location_enabled',false,'footer_call_enabled',nullif(btrim(coalesce(p_phone,'')),'') is not null,
      'footer_whatsapp_enabled',nullif(btrim(coalesce(p_whatsapp,'')),'') is not null
    )
  );

  insert into public.restaurant_domains (
    restaurant_id,hostname,kind,status,is_verified,is_primary,verified_at
  ) values (
    v_id,v_hostname,'platform_subdomain','active',true,true,now()
  );

  insert into public.subscriptions (restaurant_id,plan,status,starts_at,notes)
  values (v_id,v_plan,'active',now(),'Created from RESTBR Super Admin V1.2');

  return jsonb_build_object(
    'ok',true,'restaurant_id',v_id,'name',v_name,'slug',v_slug,
    'hostname',v_hostname,'url','https://'||v_hostname,'plan',v_plan
  );
end;
$$;

revoke all on function public.admin_create_restaurant(text,text,text,text,text,text,text,text) from public, anon;
grant execute on function public.admin_create_restaurant(text,text,text,text,text,text,text,text) to authenticated, service_role;

-- ============================================================
-- RESTBR SCOPED BACKUP V1
-- Settings-only, menu-only, and single-category restore helpers.
-- All functions are SECURITY INVOKER and remain subject to normal RLS.
-- ============================================================

create or replace function public.owner_restore_settings_backup(
  p_restaurant_id uuid,
  p_settings jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not private.can_manage_restaurant(p_restaurant_id) then
    raise exception 'restaurant manager required' using errcode='42501';
  end if;
  if p_settings is null or jsonb_typeof(p_settings) <> 'object' then
    raise exception 'invalid settings backup';
  end if;
  if coalesce(p_settings->>'restaurant_id','') <> p_restaurant_id::text then
    raise exception 'backup restaurant mismatch';
  end if;

  update public.restaurant_settings s
  set
    restaurant_name_ar = p_settings ->> 'restaurant_name_ar',
    restaurant_name_ku = p_settings ->> 'restaurant_name_ku',
    restaurant_name_en = p_settings ->> 'restaurant_name_en',
    subtitle_ar = p_settings ->> 'subtitle_ar',
    subtitle_ku = p_settings ->> 'subtitle_ku',
    subtitle_en = p_settings ->> 'subtitle_en',
    phone = p_settings ->> 'phone',
    whatsapp = p_settings ->> 'whatsapp',
    address_ar = p_settings ->> 'address_ar',
    address_ku = p_settings ->> 'address_ku',
    address_en = p_settings ->> 'address_en',
    logo_url = p_settings ->> 'logo_url',
    background_url = p_settings ->> 'background_url',
    announcement_enabled = coalesce((p_settings ->> 'announcement_enabled')::boolean,false),
    announcement_ar = p_settings ->> 'announcement_ar',
    announcement_ku = p_settings ->> 'announcement_ku',
    announcement_en = p_settings ->> 'announcement_en',
    languages = case when jsonb_typeof(p_settings->'languages')='array'
      then array(select jsonb_array_elements_text(p_settings->'languages'))
      else array['ar']::text[] end,
    branding = coalesce(p_settings -> 'branding','{}'::jsonb),
    ui_design_settings = coalesce(p_settings -> 'ui_design_settings','{}'::jsonb),
    social_links = coalesce(p_settings -> 'social_links','[]'::jsonb),
    top_actions = coalesce(p_settings -> 'top_actions','[]'::jsonb),
    footer_actions = coalesce(p_settings -> 'footer_actions','[]'::jsonb),
    features = coalesce(p_settings -> 'features','{}'::jsonb),
    updated_at = now()
  where s.restaurant_id=p_restaurant_id;

  if not found then raise exception 'restaurant settings row not found'; end if;
  return jsonb_build_object('ok',true,'scope','settings','restaurant_id',p_restaurant_id);
end;
$$;

create or replace function public.owner_restore_menu_backup(
  p_restaurant_id uuid,
  p_categories jsonb,
  p_products jsonb,
  p_options jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare v_settings jsonb;
begin
  if not private.can_manage_restaurant(p_restaurant_id) then
    raise exception 'restaurant manager required' using errcode='42501';
  end if;
  select to_jsonb(s) into v_settings from public.restaurant_settings s where s.restaurant_id=p_restaurant_id;
  if v_settings is null then raise exception 'restaurant settings row not found'; end if;
  return public.owner_restore_restaurant_backup(p_restaurant_id,v_settings,p_categories,p_products,p_options)
    || jsonb_build_object('scope','menu');
end;
$$;

create or replace function public.owner_restore_category_backup(
  p_restaurant_id uuid,
  p_category jsonb,
  p_products jsonb,
  p_options jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_category_id uuid;
  v_product_count integer := 0;
  v_option_count integer := 0;
begin
  if not private.can_manage_restaurant(p_restaurant_id) then
    raise exception 'restaurant manager required' using errcode='42501';
  end if;
  if p_category is null or jsonb_typeof(p_category)<>'object' then raise exception 'invalid category backup'; end if;
  if jsonb_typeof(coalesce(p_products,'[]'::jsonb))<>'array' or jsonb_typeof(coalesce(p_options,'[]'::jsonb))<>'array' then raise exception 'invalid category backup arrays'; end if;
  if coalesce(p_category->>'restaurant_id','')<>p_restaurant_id::text then raise exception 'backup restaurant mismatch'; end if;
  v_category_id := (p_category->>'id')::uuid;

  if exists(
    select 1 from jsonb_array_elements(coalesce(p_products,'[]'::jsonb)) x
    where coalesce(x->>'restaurant_id','')<>p_restaurant_id::text
       or coalesce(x->>'category_id','')<>v_category_id::text
  ) then raise exception 'category backup contains invalid product references'; end if;

  if exists(
    select 1 from jsonb_array_elements(coalesce(p_options,'[]'::jsonb)) x
    where coalesce(x->>'restaurant_id','')<>p_restaurant_id::text
       or not exists(
         select 1 from jsonb_array_elements(coalesce(p_products,'[]'::jsonb)) p
         where p->>'id'=x->>'product_id'
       )
  ) then raise exception 'category backup contains invalid option references'; end if;

  delete from public.product_options o
  where o.restaurant_id=p_restaurant_id
    and exists(select 1 from public.products p where p.id=o.product_id and p.restaurant_id=p_restaurant_id and p.category_id=v_category_id);
  delete from public.products where restaurant_id=p_restaurant_id and category_id=v_category_id;

  insert into public.categories(
    id,restaurant_id,slug,name_ar,name_ku,name_en,sort_order,is_active,is_visible,
    availability_schedule_enabled,available_from,available_to,metadata,created_at,updated_at
  ) values (
    v_category_id,p_restaurant_id,p_category->>'slug',p_category->>'name_ar',p_category->>'name_ku',p_category->>'name_en',
    coalesce((p_category->>'sort_order')::integer,0),coalesce((p_category->>'is_active')::boolean,true),coalesce((p_category->>'is_visible')::boolean,true),
    coalesce((p_category->>'availability_schedule_enabled')::boolean,false),
    nullif(p_category->>'available_from','')::time,nullif(p_category->>'available_to','')::time,
    coalesce(p_category->'metadata','{}'::jsonb),coalesce((p_category->>'created_at')::timestamptz,now()),now()
  ) on conflict(id) do update set
    slug=excluded.slug,name_ar=excluded.name_ar,name_ku=excluded.name_ku,name_en=excluded.name_en,
    sort_order=excluded.sort_order,is_active=excluded.is_active,is_visible=excluded.is_visible,
    availability_schedule_enabled=excluded.availability_schedule_enabled,available_from=excluded.available_from,
    available_to=excluded.available_to,metadata=excluded.metadata,updated_at=now();

  insert into public.products(
    id,restaurant_id,category_id,name_ar,name_ku,name_en,description_ar,description_ku,description_en,
    image_url,base_price,sort_order,is_available,is_visible,availability_schedule_enabled,available_from,available_to,metadata,created_at,updated_at
  )
  select x.id,p_restaurant_id,v_category_id,x.name_ar,x.name_ku,x.name_en,x.description_ar,x.description_ku,x.description_en,
    x.image_url,coalesce(x.base_price,0),coalesce(x.sort_order,0),coalesce(x.is_available,true),coalesce(x.is_visible,true),
    coalesce(x.availability_schedule_enabled,false),x.available_from,x.available_to,coalesce(x.metadata,'{}'::jsonb),coalesce(x.created_at,now()),now()
  from jsonb_to_recordset(coalesce(p_products,'[]'::jsonb)) as x(
    id uuid,restaurant_id uuid,category_id uuid,name_ar text,name_ku text,name_en text,description_ar text,description_ku text,description_en text,
    image_url text,base_price numeric,sort_order integer,is_available boolean,is_visible boolean,availability_schedule_enabled boolean,
    available_from time,available_to time,metadata jsonb,created_at timestamptz,updated_at timestamptz
  );
  get diagnostics v_product_count=row_count;

  insert into public.product_options(id,restaurant_id,product_id,name_ar,name_ku,name_en,price,sort_order,is_active,metadata,created_at,updated_at)
  select x.id,p_restaurant_id,x.product_id,x.name_ar,x.name_ku,x.name_en,coalesce(x.price,0),coalesce(x.sort_order,0),coalesce(x.is_active,true),
    coalesce(x.metadata,'{}'::jsonb),coalesce(x.created_at,now()),now()
  from jsonb_to_recordset(coalesce(p_options,'[]'::jsonb)) as x(
    id uuid,restaurant_id uuid,product_id uuid,name_ar text,name_ku text,name_en text,price numeric,sort_order integer,is_active boolean,
    metadata jsonb,created_at timestamptz,updated_at timestamptz
  );
  get diagnostics v_option_count=row_count;

  return jsonb_build_object('ok',true,'scope','category','restaurant_id',p_restaurant_id,'category_id',v_category_id,'products',v_product_count,'options',v_option_count);
end;
$$;

revoke all on function public.owner_restore_settings_backup(uuid,jsonb) from public,anon;
revoke all on function public.owner_restore_menu_backup(uuid,jsonb,jsonb,jsonb) from public,anon;
revoke all on function public.owner_restore_category_backup(uuid,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.owner_restore_settings_backup(uuid,jsonb) to authenticated,service_role;
grant execute on function public.owner_restore_menu_backup(uuid,jsonb,jsonb,jsonb) to authenticated,service_role;
grant execute on function public.owner_restore_category_backup(uuid,jsonb,jsonb,jsonb) to authenticated,service_role;

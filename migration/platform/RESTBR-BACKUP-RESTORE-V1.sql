-- ============================================================
-- RESTBR BACKUP / RESTORE V1.1
-- Atomic Owner/Manager restore + atomic menu clear.
-- Rejects cross-tenant/tampered category-product-option references.
-- ============================================================

create or replace function public.owner_restore_restaurant_backup(
  p_restaurant_id uuid,p_settings jsonb,p_categories jsonb,p_products jsonb,p_options jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_category_count integer:=0;
  v_product_count integer:=0;
  v_option_count integer:=0;
begin
  if not private.can_manage_restaurant(p_restaurant_id) then raise exception 'restaurant manager required' using errcode='42501'; end if;
  if p_settings is null or jsonb_typeof(p_settings)<>'object' then raise exception 'invalid restaurant settings backup'; end if;
  if coalesce(p_settings->>'restaurant_id','')<>p_restaurant_id::text then raise exception 'backup restaurant mismatch'; end if;
  if jsonb_typeof(coalesce(p_categories,'[]'::jsonb))<>'array' or jsonb_typeof(coalesce(p_products,'[]'::jsonb))<>'array' or jsonb_typeof(coalesce(p_options,'[]'::jsonb))<>'array' then raise exception 'invalid menu backup arrays'; end if;

  if exists(
    select 1 from jsonb_to_recordset(coalesce(p_products,'[]'::jsonb)) p(id uuid,category_id uuid)
    where p.id is null or p.category_id is null or not exists(
      select 1 from jsonb_to_recordset(coalesce(p_categories,'[]'::jsonb)) c(id uuid) where c.id=p.category_id
    )
  ) then raise exception 'backup contains product/category references outside this backup'; end if;

  if exists(
    select 1 from jsonb_to_recordset(coalesce(p_options,'[]'::jsonb)) o(id uuid,product_id uuid)
    where o.id is null or o.product_id is null or not exists(
      select 1 from jsonb_to_recordset(coalesce(p_products,'[]'::jsonb)) p(id uuid) where p.id=o.product_id
    )
  ) then raise exception 'backup contains option/product references outside this backup'; end if;

  delete from public.product_options where restaurant_id=p_restaurant_id;
  delete from public.products where restaurant_id=p_restaurant_id;
  delete from public.categories where restaurant_id=p_restaurant_id;

  insert into public.categories(id,restaurant_id,slug,name_ar,name_ku,name_en,sort_order,is_active,is_visible,availability_schedule_enabled,available_from,available_to,metadata,created_at,updated_at)
  select x.id,p_restaurant_id,x.slug,x.name_ar,x.name_ku,x.name_en,coalesce(x.sort_order,0),coalesce(x.is_active,true),coalesce(x.is_visible,true),coalesce(x.availability_schedule_enabled,false),x.available_from,x.available_to,coalesce(x.metadata,'{}'::jsonb),coalesce(x.created_at,now()),now()
  from jsonb_to_recordset(coalesce(p_categories,'[]'::jsonb)) as x(id uuid,restaurant_id uuid,slug text,name_ar text,name_ku text,name_en text,sort_order integer,is_active boolean,is_visible boolean,availability_schedule_enabled boolean,available_from time,available_to time,metadata jsonb,created_at timestamptz,updated_at timestamptz);
  get diagnostics v_category_count=row_count;

  insert into public.products(id,restaurant_id,category_id,name_ar,name_ku,name_en,description_ar,description_ku,description_en,image_url,base_price,sort_order,is_available,is_visible,availability_schedule_enabled,available_from,available_to,metadata,created_at,updated_at)
  select x.id,p_restaurant_id,x.category_id,x.name_ar,x.name_ku,x.name_en,x.description_ar,x.description_ku,x.description_en,x.image_url,coalesce(x.base_price,0),coalesce(x.sort_order,0),coalesce(x.is_available,true),coalesce(x.is_visible,true),coalesce(x.availability_schedule_enabled,false),x.available_from,x.available_to,coalesce(x.metadata,'{}'::jsonb),coalesce(x.created_at,now()),now()
  from jsonb_to_recordset(coalesce(p_products,'[]'::jsonb)) as x(id uuid,restaurant_id uuid,category_id uuid,name_ar text,name_ku text,name_en text,description_ar text,description_ku text,description_en text,image_url text,base_price numeric,sort_order integer,is_available boolean,is_visible boolean,availability_schedule_enabled boolean,available_from time,available_to time,metadata jsonb,created_at timestamptz,updated_at timestamptz);
  get diagnostics v_product_count=row_count;

  insert into public.product_options(id,restaurant_id,product_id,name_ar,name_ku,name_en,price,sort_order,is_active,metadata,created_at,updated_at)
  select x.id,p_restaurant_id,x.product_id,x.name_ar,x.name_ku,x.name_en,coalesce(x.price,0),coalesce(x.sort_order,0),coalesce(x.is_active,true),coalesce(x.metadata,'{}'::jsonb),coalesce(x.created_at,now()),now()
  from jsonb_to_recordset(coalesce(p_options,'[]'::jsonb)) as x(id uuid,restaurant_id uuid,product_id uuid,name_ar text,name_ku text,name_en text,price numeric,sort_order integer,is_active boolean,metadata jsonb,created_at timestamptz,updated_at timestamptz);
  get diagnostics v_option_count=row_count;

  update public.restaurant_settings s set
    restaurant_name_ar=p_settings->>'restaurant_name_ar',restaurant_name_ku=p_settings->>'restaurant_name_ku',restaurant_name_en=p_settings->>'restaurant_name_en',
    subtitle_ar=p_settings->>'subtitle_ar',subtitle_ku=p_settings->>'subtitle_ku',subtitle_en=p_settings->>'subtitle_en',phone=p_settings->>'phone',whatsapp=p_settings->>'whatsapp',
    address_ar=p_settings->>'address_ar',address_ku=p_settings->>'address_ku',address_en=p_settings->>'address_en',logo_url=p_settings->>'logo_url',background_url=p_settings->>'background_url',
    announcement_enabled=coalesce((p_settings->>'announcement_enabled')::boolean,false),announcement_ar=p_settings->>'announcement_ar',announcement_ku=p_settings->>'announcement_ku',announcement_en=p_settings->>'announcement_en',
    languages=case when jsonb_typeof(p_settings->'languages')='array' then array(select jsonb_array_elements_text(p_settings->'languages')) else array['ar']::text[] end,
    branding=coalesce(p_settings->'branding','{}'::jsonb),ui_design_settings=coalesce(p_settings->'ui_design_settings','{}'::jsonb),social_links=coalesce(p_settings->'social_links','[]'::jsonb),top_actions=coalesce(p_settings->'top_actions','[]'::jsonb),footer_actions=coalesce(p_settings->'footer_actions','[]'::jsonb),features=coalesce(p_settings->'features','{}'::jsonb),updated_at=now()
  where s.restaurant_id=p_restaurant_id;
  if not found then raise exception 'restaurant settings row not found'; end if;

  return jsonb_build_object('ok',true,'restaurant_id',p_restaurant_id,'categories',v_category_count,'products',v_product_count,'options',v_option_count);
end;
$$;

create or replace function public.owner_clear_restaurant_menu(p_restaurant_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_categories integer;v_products integer;v_options integer;
begin
  if not private.can_manage_restaurant(p_restaurant_id) then raise exception 'restaurant manager required' using errcode='42501'; end if;
  select count(*)::integer into v_options from public.product_options where restaurant_id=p_restaurant_id;
  select count(*)::integer into v_products from public.products where restaurant_id=p_restaurant_id;
  select count(*)::integer into v_categories from public.categories where restaurant_id=p_restaurant_id;
  delete from public.product_options where restaurant_id=p_restaurant_id;
  delete from public.products where restaurant_id=p_restaurant_id;
  delete from public.categories where restaurant_id=p_restaurant_id;
  return jsonb_build_object('ok',true,'restaurant_id',p_restaurant_id,'deleted_categories',v_categories,'deleted_products',v_products,'deleted_options',v_options);
end;
$$;

revoke all on function public.owner_restore_restaurant_backup(uuid,jsonb,jsonb,jsonb,jsonb) from public,anon;
revoke all on function public.owner_clear_restaurant_menu(uuid) from public,anon;
grant execute on function public.owner_restore_restaurant_backup(uuid,jsonb,jsonb,jsonb,jsonb) to authenticated,service_role;
grant execute on function public.owner_clear_restaurant_menu(uuid) to authenticated,service_role;

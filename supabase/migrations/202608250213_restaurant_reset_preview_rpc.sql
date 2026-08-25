create or replace function public.restaurant_reset_preview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_categories bigint;
  v_products bigint;
  v_options bigint;
  v_discounts bigint;
  v_orders bigint;
  v_order_items bigint;
  v_analytics bigint;
  v_settings bigint;
  v_admin_users bigint;
  v_storage bigint;
  v_restaurant jsonb;
begin
  v_role := public.current_admin_role();
  if v_role is distinct from 'super_admin' then
    raise exception 'Super admin access required' using errcode = '42501';
  end if;

  select count(*) into v_categories from public.categories;
  select count(*) into v_products from public.products;
  select count(*) into v_options from public.product_options;
  select count(*) into v_discounts from public.discounts;
  select count(*) into v_orders from public.orders;
  select count(*) into v_order_items from public.order_items;
  select count(*) into v_analytics from public.menu_analytics_daily;
  select count(*) into v_settings from public.restaurant_settings;
  select count(*) into v_admin_users from public.admin_users;
  select count(*) into v_storage from storage.objects where bucket_id = 'menu-images';

  select jsonb_build_object(
    'name_ar', coalesce(rs.restaurant_name_ar, rs.name_ar, ''),
    'name_ku', coalesce(rs.restaurant_name_ku, rs.name_ku, ''),
    'name_en', coalesce(rs.restaurant_name_en, rs.name_en, ''),
    'phone', coalesce(rs.phone, ''),
    'whatsapp', coalesce(rs.whatsapp, rs.whatsapp_number, ''),
    'logo_url', coalesce(rs.logo_url, '')
  )
  into v_restaurant
  from public.restaurant_settings rs
  order by rs.created_at asc nulls last
  limit 1;

  return jsonb_build_object(
    'ok', true,
    'dry_run', true,
    'restaurant', coalesce(v_restaurant, '{}'::jsonb),
    'counts', jsonb_build_object(
      'categories', v_categories,
      'products', v_products,
      'product_options', v_options,
      'discounts', v_discounts,
      'orders', v_orders,
      'order_items', v_order_items,
      'menu_analytics_daily', v_analytics,
      'storage_files', v_storage,
      'restaurant_settings', v_settings,
      'admin_users', v_admin_users
    ),
    'plan', jsonb_build_object(
      'delete_total', v_categories + v_products + v_options + v_discounts + v_orders + v_order_items + v_analytics + v_storage,
      'reset_settings_rows', v_settings,
      'protected_admin_users', v_admin_users,
      'storage_bucket', 'menu-images'
    )
  );
end;
$$;

revoke all on function public.restaurant_reset_preview() from public;
grant execute on function public.restaurant_reset_preview() to authenticated;

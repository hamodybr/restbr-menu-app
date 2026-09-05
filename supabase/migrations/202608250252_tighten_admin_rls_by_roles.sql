begin;

create or replace function public.can_access_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_admin_role(
    array['super_admin','owner','manager','menu_editor','viewer']::text[]
  );
$$;

create or replace function public.can_manage_discounts()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_admin_role(
    array['super_admin','owner','manager']::text[]
  );
$$;

create or replace function public.can_view_reports()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_admin_role(
    array['super_admin','owner','manager','viewer']::text[]
  );
$$;

create or replace function public.can_manage_orders()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_admin_role(
    array['super_admin','owner','manager']::text[]
  );
$$;

create or replace function public.is_restbr_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.can_access_admin();
$$;

revoke all on function public.current_admin_role() from public;
revoke all on function public.has_admin_role(text[]) from public;
revoke all on function public.can_manage_menu() from public;
revoke all on function public.can_manage_restaurant_settings() from public;
revoke all on function public.can_manage_users() from public;
revoke all on function public.can_access_admin() from public;
revoke all on function public.can_manage_discounts() from public;
revoke all on function public.can_view_reports() from public;
revoke all on function public.can_manage_orders() from public;
revoke all on function public.is_restbr_admin() from public;

grant execute on function public.current_admin_role() to authenticated;
grant execute on function public.has_admin_role(text[]) to authenticated;
grant execute on function public.can_manage_menu() to authenticated;
grant execute on function public.can_manage_restaurant_settings() to authenticated;
grant execute on function public.can_manage_users() to authenticated;
grant execute on function public.can_access_admin() to authenticated;
grant execute on function public.can_manage_discounts() to authenticated;
grant execute on function public.can_view_reports() to authenticated;
grant execute on function public.can_manage_orders() to authenticated;
grant execute on function public.is_restbr_admin() to authenticated;

-- Replace any previous category policies with the role-based RESTBR policies.
drop policy if exists restbr_categories_insert on public.categories;
drop policy if exists restbr_categories_update on public.categories;
drop policy if exists restbr_categories_delete on public.categories;
create policy restbr_categories_insert
on public.categories for insert to authenticated
with check ((select public.can_manage_menu()));
create policy restbr_categories_update
on public.categories for update to authenticated
using ((select public.can_manage_menu()))
with check ((select public.can_manage_menu()));
create policy restbr_categories_delete
on public.categories for delete to authenticated
using ((select public.has_admin_role(array['super_admin','owner','manager']::text[])));

-- Replace any previous product policies with the role-based RESTBR policies.
drop policy if exists restbr_products_insert on public.products;
drop policy if exists restbr_products_update on public.products;
drop policy if exists restbr_products_delete on public.products;
create policy restbr_products_insert
on public.products for insert to authenticated
with check ((select public.can_manage_menu()));
create policy restbr_products_update
on public.products for update to authenticated
using ((select public.can_manage_menu()))
with check ((select public.can_manage_menu()));
create policy restbr_products_delete
on public.products for delete to authenticated
using ((select public.has_admin_role(array['super_admin','owner','manager']::text[])));

-- Replace any previous product-option policies with the role-based RESTBR policies.
drop policy if exists restbr_product_options_insert on public.product_options;
drop policy if exists restbr_product_options_update on public.product_options;
drop policy if exists restbr_product_options_delete on public.product_options;
create policy restbr_product_options_insert
on public.product_options for insert to authenticated
with check ((select public.can_manage_menu()));
create policy restbr_product_options_update
on public.product_options for update to authenticated
using ((select public.can_manage_menu()))
with check ((select public.can_manage_menu()));
create policy restbr_product_options_delete
on public.product_options for delete to authenticated
using ((select public.has_admin_role(array['super_admin','owner','manager']::text[])));

drop policy if exists "Authenticated can read discounts" on public.discounts;
drop policy if exists "Authenticated can insert discounts" on public.discounts;
drop policy if exists "Authenticated can update discounts" on public.discounts;
drop policy if exists "Authenticated can delete discounts" on public.discounts;
drop policy if exists restbr_discounts_admin_read on public.discounts;
drop policy if exists restbr_discounts_insert on public.discounts;
drop policy if exists restbr_discounts_update on public.discounts;
drop policy if exists restbr_discounts_delete on public.discounts;
create policy restbr_discounts_admin_read
on public.discounts for select to authenticated
using ((select public.can_access_admin()));
create policy restbr_discounts_insert
on public.discounts for insert to authenticated
with check ((select public.can_manage_discounts()));
create policy restbr_discounts_update
on public.discounts for update to authenticated
using ((select public.can_manage_discounts()))
with check ((select public.can_manage_discounts()));
create policy restbr_discounts_delete
on public.discounts for delete to authenticated
using ((select public.can_manage_discounts()));

drop policy if exists "Admins manage restaurant settings" on public.restaurant_settings;
drop policy if exists restbr_settings_insert on public.restaurant_settings;
drop policy if exists restbr_settings_update on public.restaurant_settings;
create policy restbr_settings_insert
on public.restaurant_settings for insert to authenticated
with check ((select public.can_manage_restaurant_settings()));
create policy restbr_settings_update
on public.restaurant_settings for update to authenticated
using ((select public.can_manage_restaurant_settings()))
with check ((select public.can_manage_restaurant_settings()));

drop policy if exists analytics_admin_read on public.menu_analytics_daily;
drop policy if exists restbr_analytics_read on public.menu_analytics_daily;
create policy restbr_analytics_read
on public.menu_analytics_daily for select to authenticated
using ((select public.can_view_reports()));

drop policy if exists "Admins read orders" on public.orders;
drop policy if exists "Admins update orders" on public.orders;
drop policy if exists restbr_orders_read on public.orders;
drop policy if exists restbr_orders_update on public.orders;
create policy restbr_orders_read
on public.orders for select to authenticated
using ((select public.can_view_reports()));
create policy restbr_orders_update
on public.orders for update to authenticated
using ((select public.can_manage_orders()))
with check ((select public.can_manage_orders()));

drop policy if exists "Admins read order items" on public.order_items;
drop policy if exists restbr_order_items_read on public.order_items;
create policy restbr_order_items_read
on public.order_items for select to authenticated
using ((select public.can_view_reports()));

drop policy if exists "Authenticated menu image uploads 1xs2w12_0" on storage.objects;
drop policy if exists restbr_menu_images_insert on storage.objects;
create policy restbr_menu_images_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'menu-images'
  and (select public.can_manage_menu())
);

alter function public.adjust_menu_prices(uuid,numeric) security invoker;
alter function public.adjust_menu_prices_mode(uuid,numeric,text) security invoker;
revoke all on function public.adjust_menu_prices(uuid,numeric) from public;
revoke all on function public.adjust_menu_prices_mode(uuid,numeric,text) from public;
grant execute on function public.adjust_menu_prices(uuid,numeric) to authenticated;
grant execute on function public.adjust_menu_prices_mode(uuid,numeric,text) to authenticated;

commit;

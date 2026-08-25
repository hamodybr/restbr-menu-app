-- RestBr reset preview needs read-only service-role access to count protected restaurant data.
-- No insert/update/delete privileges are granted here.

grant select on table public.categories to service_role;
grant select on table public.products to service_role;
grant select on table public.product_options to service_role;
grant select on table public.discounts to service_role;
grant select on table public.orders to service_role;
grant select on table public.order_items to service_role;
grant select on table public.menu_analytics_daily to service_role;
grant select on table public.restaurant_settings to service_role;
grant select on table public.admin_users to service_role;

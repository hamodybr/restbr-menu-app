-- RESTBR security hardening: public API callers must not be able to read
-- hidden/inactive menu records directly. Admins keep full read access.

-- Categories: visitors see only active + visible rows.
drop policy if exists restbr_categories_public_read on public.categories;
drop policy if exists restbr_categories_admin_read on public.categories;

create policy restbr_categories_public_read
on public.categories
for select
to anon, authenticated
using (
  is_active = true
  and is_visible = true
);

create policy restbr_categories_admin_read
on public.categories
for select
to authenticated
using ((select private.can_access_admin()));

-- Products: visitors see only active + visible products whose category is
-- itself active + visible. Admins keep full read access.
drop policy if exists restbr_products_public_read on public.products;
drop policy if exists restbr_products_admin_read on public.products;

create policy restbr_products_public_read
on public.products
for select
to anon, authenticated
using (
  is_active = true
  and is_visible = true
  and exists (
    select 1
    from public.categories c
    where c.id = products.category_id
      and c.is_active = true
      and c.is_visible = true
  )
);

create policy restbr_products_admin_read
on public.products
for select
to authenticated
using ((select private.can_access_admin()));

-- Product options: visitors see active options only when the parent product
-- and its category are public. is_available is intentionally NOT filtered so
-- the menu can still show temporarily unavailable choices correctly.
drop policy if exists restbr_product_options_public_read on public.product_options;
drop policy if exists restbr_product_options_admin_read on public.product_options;

create policy restbr_product_options_public_read
on public.product_options
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.products p
    join public.categories c on c.id = p.category_id
    where p.id = product_options.product_id
      and p.is_active = true
      and p.is_visible = true
      and c.is_active = true
      and c.is_visible = true
  )
);

create policy restbr_product_options_admin_read
on public.product_options
for select
to authenticated
using ((select private.can_access_admin()));

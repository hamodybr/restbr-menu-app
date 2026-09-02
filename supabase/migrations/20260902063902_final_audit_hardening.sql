-- RESTBR final audit hardening.
-- Removes inherited non-DML privileges, consolidates public/admin reads,
-- bounds the intentional public analytics endpoint, and adds missing FK indexes.

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

revoke truncate, references, trigger on all tables in schema public
  from anon, authenticated, service_role;

-- Edge Functions use the service role, so grant only their current table needs.
grant select on all tables in schema public to service_role;
grant insert, update, delete on public.admin_users to service_role;
grant update on public.products to service_role;

create index if not exists order_items_product_id_idx
  on public.order_items(product_id);
create index if not exists order_items_option_id_idx
  on public.order_items(option_id);

drop policy if exists restbr_categories_public_read on public.categories;
drop policy if exists restbr_categories_admin_read on public.categories;
drop policy if exists restbr_categories_authenticated_read on public.categories;
create policy restbr_categories_public_read
on public.categories for select to anon
using (is_active = true and is_visible = true);
create policy restbr_categories_authenticated_read
on public.categories for select to authenticated
using (
  (is_active = true and is_visible = true)
  or (select private.can_access_admin())
);

drop policy if exists restbr_products_public_read on public.products;
drop policy if exists restbr_products_admin_read on public.products;
drop policy if exists restbr_products_authenticated_read on public.products;
create policy restbr_products_public_read
on public.products for select to anon
using (
  is_active = true
  and is_visible = true
  and exists (
    select 1 from public.categories c
    where c.id = products.category_id
      and c.is_active = true
      and c.is_visible = true
  )
);
create policy restbr_products_authenticated_read
on public.products for select to authenticated
using (
  (
    is_active = true
    and is_visible = true
    and exists (
      select 1 from public.categories c
      where c.id = products.category_id
        and c.is_active = true
        and c.is_visible = true
    )
  )
  or (select private.can_access_admin())
);

drop policy if exists restbr_product_options_public_read on public.product_options;
drop policy if exists restbr_product_options_admin_read on public.product_options;
drop policy if exists restbr_product_options_authenticated_read on public.product_options;
create policy restbr_product_options_public_read
on public.product_options for select to anon
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
create policy restbr_product_options_authenticated_read
on public.product_options for select to authenticated
using (
  (
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
  )
  or (select private.can_access_admin())
);

drop policy if exists restbr_discounts_public_read on public.discounts;
drop policy if exists restbr_discounts_admin_read on public.discounts;
drop policy if exists restbr_discounts_authenticated_read on public.discounts;
create policy restbr_discounts_public_read
on public.discounts for select to anon
using (is_active = true);
create policy restbr_discounts_authenticated_read
on public.discounts for select to authenticated
using (is_active = true or (select private.can_access_admin()));

create or replace function public.track_menu_event(
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
  v_type text := lower(left(coalesce(p_event_type, ''), 40));
  v_ref text := lower(left(coalesce(p_ref_id, ''), 100));
  v_language text := lower(left(coalesce(p_language, ''), 5));
  v_date date := (now() at time zone 'Asia/Baghdad')::date;
  v_uuid_pattern constant text :=
    '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
begin
  if v_type not in (
    'menu_view', 'category_view', 'product_interest', 'search_use',
    'share_product', 'share_category', 'language_change'
  ) then
    raise exception 'Unsupported analytics event';
  end if;

  if v_language not in ('', 'ar', 'ku', 'en') then
    v_language := '';
  end if;

  if v_type in ('category_view', 'share_category') then
    if v_ref !~ v_uuid_pattern then
      raise exception 'Invalid analytics category reference';
    end if;
    if not exists (
        select 1
        from public.categories c
        where c.id = v_ref::uuid
          and c.is_active = true
          and c.is_visible = true
      ) then
      raise exception 'Invalid analytics category reference';
    end if;
  elsif v_type in ('product_interest', 'share_product') then
    if v_ref !~ v_uuid_pattern then
      raise exception 'Invalid analytics product reference';
    end if;
    if not exists (
        select 1
        from public.products p
        join public.categories c on c.id = p.category_id
        where p.id = v_ref::uuid
          and p.is_active = true
          and p.is_visible = true
          and c.is_active = true
          and c.is_visible = true
      ) then
      raise exception 'Invalid analytics product reference';
    end if;
  else
    v_ref := '';
  end if;

  insert into public.menu_analytics_daily(
    event_date, event_type, ref_id, language, count, updated_at
  )
  values (v_date, v_type, v_ref, v_language, 1, now())
  on conflict (event_date, event_type, ref_id, language)
  do update set
    count = public.menu_analytics_daily.count + 1,
    updated_at = now();
end;
$$;

revoke all on function public.track_menu_event(text,text,text) from public;
grant execute on function public.track_menu_event(text,text,text) to anon, authenticated;
comment on function public.track_menu_event(text,text,text) is
  'Intentional public analytics endpoint. Inputs and references are allow-listed; the analytics table remains private to browser roles.';

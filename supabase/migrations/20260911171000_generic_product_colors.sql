begin;

create table if not exists public.product_colors (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name_ar text not null,
  name_ku text,
  name_en text,
  hex_color text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_colors_name_ar_not_blank
    check (length(trim(name_ar)) between 1 and 80),
  constraint product_colors_name_ku_length
    check (name_ku is null or length(name_ku) <= 80),
  constraint product_colors_name_en_length
    check (name_en is null or length(name_en) <= 80),
  constraint product_colors_hex_format
    check (hex_color is null or hex_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint product_colors_image_length
    check (image_url is null or length(image_url) <= 1000)
);

create index if not exists product_colors_product_id_idx
  on public.product_colors(product_id);
create index if not exists product_colors_product_sort_idx
  on public.product_colors(product_id, sort_order, id);

-- Snapshot the selected color on order rows. These columns are intentionally
-- independent from the live catalog so historical orders remain readable even
-- after a color is renamed or deleted.
alter table public.order_items
  add column if not exists selected_color_id uuid references public.product_colors(id) on delete set null,
  add column if not exists selected_color_name text,
  add column if not exists selected_color_hex text,
  add column if not exists selected_color_image_url text;

create index if not exists order_items_selected_color_id_idx
  on public.order_items(selected_color_id);

-- Reuse the shared timestamp trigger when the database came from the RESTBR
-- bootstrap. The migration remains safe to run more than once.
do $$
begin
  if to_regprocedure('private.set_updated_at()') is not null then
    execute 'drop trigger if exists product_colors_updated_at on public.product_colors';
    execute 'create trigger product_colors_updated_at before update on public.product_colors for each row execute function private.set_updated_at()';
  end if;
end;
$$;

alter table public.product_colors enable row level security;

drop policy if exists restbr_product_colors_public_read on public.product_colors;
create policy restbr_product_colors_public_read
on public.product_colors for select to anon
using (
  is_active = true
  and exists (
    select 1
    from public.products p
    join public.categories c on c.id = p.category_id
    where p.id = product_colors.product_id
      and p.is_active = true
      and p.is_visible = true
      and c.is_active = true
      and c.is_visible = true
  )
);

drop policy if exists restbr_product_colors_authenticated_read on public.product_colors;
create policy restbr_product_colors_authenticated_read
on public.product_colors for select to authenticated
using (
  (
    is_active = true
    and exists (
      select 1
      from public.products p
      join public.categories c on c.id = p.category_id
      where p.id = product_colors.product_id
        and p.is_active = true
        and p.is_visible = true
        and c.is_active = true
        and c.is_visible = true
    )
  )
  or (select private.can_access_admin())
);

drop policy if exists restbr_product_colors_insert on public.product_colors;
create policy restbr_product_colors_insert
on public.product_colors for insert to authenticated
with check ((select private.can_manage_menu()));

drop policy if exists restbr_product_colors_update on public.product_colors;
create policy restbr_product_colors_update
on public.product_colors for update to authenticated
using ((select private.can_manage_menu()))
with check ((select private.can_manage_menu()));

drop policy if exists restbr_product_colors_delete on public.product_colors;
create policy restbr_product_colors_delete
on public.product_colors for delete to authenticated
using ((select private.has_admin_role(array['super_admin','owner','manager']::text[])));

revoke all on public.product_colors from public, anon, authenticated;
grant select on public.product_colors to anon, authenticated;
grant insert, update, delete on public.product_colors to authenticated;
grant select on public.product_colors to service_role;

-- Browser roles never need schema-changing rights.
revoke truncate, references, trigger on public.product_colors
  from anon, authenticated, service_role;

comment on table public.product_colors is
  'Generic RESTBR product colors. A product may have zero or more named colors, each with its own swatch and optional image.';
comment on column public.order_items.selected_color_name is
  'Snapshot of the selected color name at order creation time.';

commit;

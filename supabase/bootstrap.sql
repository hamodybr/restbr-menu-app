-- RESTBR single-restaurant bootstrap
-- Run once in a NEW Supabase project after creating the restaurant owner in Auth.
-- This script never creates or exposes a service_role key.

begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- New API objects start private. Every browser/server permission is granted
-- explicitly later in this bootstrap.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

create table if not exists public.restaurant_settings (
  id uuid primary key default gen_random_uuid(),
  restaurant_name_ar text default 'المطعم',
  restaurant_name_ku text default 'Restaurant',
  restaurant_name_en text default 'Restaurant',
  phone text,
  whatsapp text,
  address_ar text,
  address_ku text,
  address_en text,
  location_url text,
  instagram_url text,
  facebook_url text,
  tiktok_url text,
  snapchat_url text,
  logo_url text,
  background_video_url text,
  currency text not null default 'د.ع',
  delivery_enabled boolean not null default true,
  pickup_enabled boolean not null default true,
  menu_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name_ar text,
  name_ku text,
  name_en text,
  subtitle_ar text,
  subtitle_ku text,
  subtitle_en text,
  whatsapp_number text,
  location text,
  footer_location_ar text,
  footer_location_ku text,
  footer_location_en text,
  background_video text,
  is_open boolean not null default true,
  orders_enabled boolean not null default true,
  delivery_info_ar text,
  delivery_info_ku text,
  delivery_info_en text,
  announcement_enabled boolean default false,
  announcement_ar text,
  announcement_ku text,
  announcement_en text,
  closed_message_ar text,
  closed_message_ku text,
  closed_message_en text,
  top_location_enabled boolean default true,
  top_call_enabled boolean default true,
  top_whatsapp_enabled boolean default true,
  top_location_label_ar text,
  top_location_label_ku text,
  top_location_label_en text,
  top_call_label_ar text,
  top_call_label_ku text,
  top_call_label_en text,
  top_whatsapp_label_ar text,
  top_whatsapp_label_ku text,
  top_whatsapp_label_en text,
  show_menu_title boolean default true,
  show_logo boolean default true,
  show_subtitle boolean default true,
  show_language_switch boolean default true,
  show_category_nav boolean default true,
  show_back_to_top boolean default true,
  intro_enabled boolean default true,
  background_video_enabled boolean default true,
  delivery_info_enabled boolean default true,
  show_footer boolean default true,
  show_footer_brand boolean default true,
  show_footer_location boolean default true,
  show_footer_phone boolean default true,
  show_footer_socials boolean default true,
  show_footer_copy boolean default true,
  footer_location_enabled boolean default true,
  footer_call_enabled boolean default true,
  footer_whatsapp_enabled boolean default true,
  instagram_enabled boolean default true,
  facebook_enabled boolean default true,
  tiktok_enabled boolean default true,
  snapchat_enabled boolean default true,
  custom_social_links jsonb not null default '[]'::jsonb,
  custom_top_actions jsonb not null default '[]'::jsonb,
  custom_footer_actions jsonb not null default '[]'::jsonb,
  ui_design_settings jsonb not null default '{}'::jsonb,
  theme_default text not null default 'dark'
    check (theme_default in ('dark', 'light')),
  show_theme_toggle boolean default true,
  intro_duration_ms integer not null default 900,
  enabled_languages jsonb not null default '["ar","ku","en"]'::jsonb,
  dining_gate_texts jsonb not null default '{}'::jsonb,
  restaurant_schedule_mode text not null default 'always'
    check (restaurant_schedule_mode in ('always', 'daily', 'weekly')),
  restaurant_schedule jsonb not null
    default '{"timezone":"Asia/Baghdad"}'::jsonb
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_ku text,
  name_en text,
  slug text unique,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  availability_schedule_enabled boolean not null default false,
  available_from time,
  available_to time
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name_ar text not null,
  name_ku text,
  name_en text,
  description_ar text,
  description_ku text,
  description_en text,
  image_url text,
  base_price numeric check (base_price is null or base_price >= 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_visible boolean not null default true,
  is_available boolean not null default true,
  has_options boolean not null default false,
  is_popular boolean not null default false,
  is_new boolean not null default false,
  is_hot boolean not null default false,
  is_offer boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  availability_schedule_enabled boolean not null default false,
  available_from time,
  available_to time
);

create table if not exists public.product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name_ar text not null,
  name_ku text,
  name_en text,
  price numeric not null check (price >= 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  takeaway_price numeric check (takeaway_price is null or takeaway_price >= 0)
);

-- Give every new restaurant a complete editable starter menu. This block is
-- idempotent and only runs when the menu is still empty.
do $$
declare
  category_id uuid;
  product_id uuid;
  category_number integer;
  product_number integer;
  base_price_value numeric;
begin
  if exists (select 1 from public.categories)
     or exists (select 1 from public.products) then
    return;
  end if;

  for category_number in 1..15 loop
    insert into public.categories (
      name_ar, name_ku, name_en, slug, sort_order,
      is_active, is_visible, availability_schedule_enabled
    ) values (
      'قسم تجريبي ' || category_number,
      'بەشی تاقیکردنەوە ' || category_number,
      'Demo Category ' || category_number,
      'demo-category-' || category_number,
      category_number, true, true, false
    ) returning id into category_id;

    for product_number in 1..2 loop
      base_price_value := 5000
        + ((category_number - 1) * 500)
        + ((product_number - 1) * 1000);

      insert into public.products (
        category_id, name_ar, name_ku, name_en, description_ar,
        base_price, sort_order, is_active, is_visible, is_available, has_options
      ) values (
        category_id,
        'صنف تجريبي ' || category_number || ' - ' || product_number,
        'بەرهەمی تاقیکردنەوە ' || category_number || ' - ' || product_number,
        'Demo Item ' || category_number || ' - ' || product_number,
        'عدّل الاسم والوصف والسعر من لوحة الإدارة.',
        base_price_value, product_number, true, true, true, true
      ) returning id into product_id;

      insert into public.product_options (
        product_id, name_ar, name_ku, name_en, price, takeaway_price,
        sort_order, is_active, is_available
      ) values
        (
          product_id, 'صغير', 'بچووک', 'Small',
          base_price_value, base_price_value + 500, 1, true, true
        ),
        (
          product_id, 'كبير', 'گەورە', 'Large',
          base_price_value + 2000, base_price_value + 2500, 2, true, true
        );
    end loop;
  end loop;
end;
$$;

create table if not exists public.discounts (
  id uuid primary key default gen_random_uuid(),
  discount_percent numeric not null check (discount_percent > 0 and discount_percent <= 100),
  price_mode text not null default 'both'
    check (price_mode in ('dinein', 'takeaway', 'both')),
  scope_type text not null default 'restaurant'
    check (scope_type in ('restaurant', 'category', 'product')),
  target_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (scope_type = 'restaurant' and target_id is null)
    or (scope_type in ('category', 'product') and target_id is not null)
  )
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null,
  customer_phone text not null,
  order_type text not null check (order_type in ('delivery', 'pickup')),
  address text,
  location_url text,
  notes text,
  status text not null default 'new'
    check (status in ('new', 'confirmed', 'preparing', 'ready', 'delivering', 'completed', 'cancelled')),
  subtotal numeric not null default 0 check (subtotal >= 0),
  delivery_fee numeric not null default 0 check (delivery_fee >= 0),
  total numeric not null default 0 check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  option_id uuid references public.product_options(id) on delete set null,
  product_name text not null,
  option_name text,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric not null check (unit_price >= 0),
  line_total numeric not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.menu_analytics_daily (
  event_date date not null,
  event_type text not null,
  ref_id text not null default '',
  language text not null default '',
  count bigint not null default 0 check (count >= 0),
  updated_at timestamptz not null default now(),
  primary key (event_date, event_type, ref_id, language)
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'owner'
    check (role in ('super_admin', 'owner', 'manager', 'menu_editor', 'viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists categories_sort_order_idx on public.categories(sort_order);
create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists products_sort_order_idx on public.products(sort_order);
create index if not exists product_options_product_id_idx on public.product_options(product_id);
create index if not exists product_options_sort_order_idx on public.product_options(sort_order);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists order_items_product_id_idx on public.order_items(product_id);
create index if not exists order_items_option_id_idx on public.order_items(option_id);
create index if not exists menu_analytics_daily_type_date_idx
  on public.menu_analytics_daily(event_type, event_date desc);
create index if not exists admin_users_active_role_idx
  on public.admin_users(is_active, role);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists restaurant_settings_updated_at on public.restaurant_settings;
create trigger restaurant_settings_updated_at
before update on public.restaurant_settings
for each row execute function private.set_updated_at();

drop trigger if exists categories_updated_at on public.categories;
create trigger categories_updated_at
before update on public.categories
for each row execute function private.set_updated_at();

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
before update on public.products
for each row execute function private.set_updated_at();

drop trigger if exists product_options_updated_at on public.product_options;
create trigger product_options_updated_at
before update on public.product_options
for each row execute function private.set_updated_at();

drop trigger if exists discounts_updated_at on public.discounts;
create trigger discounts_updated_at
before update on public.discounts
for each row execute function private.set_updated_at();

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at
before update on public.orders
for each row execute function private.set_updated_at();

create or replace function private.current_admin_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select au.role
  from public.admin_users au
  where au.user_id = (select auth.uid())
    and au.is_active = true
  limit 1;
$$;

create or replace function private.has_admin_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = (select auth.uid())
      and au.is_active = true
      and au.role = any(allowed_roles)
  );
$$;

create or replace function private.can_access_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select private.has_admin_role(array['super_admin','owner','manager','menu_editor','viewer']::text[]); $$;

create or replace function private.can_manage_menu()
returns boolean language sql stable security definer set search_path = ''
as $$ select private.has_admin_role(array['super_admin','owner','manager','menu_editor']::text[]); $$;

create or replace function private.can_manage_restaurant_settings()
returns boolean language sql stable security definer set search_path = ''
as $$ select private.has_admin_role(array['super_admin','owner']::text[]); $$;

create or replace function private.can_manage_users()
returns boolean language sql stable security definer set search_path = ''
as $$ select private.has_admin_role(array['super_admin','owner']::text[]); $$;

create or replace function private.can_manage_discounts()
returns boolean language sql stable security definer set search_path = ''
as $$ select private.has_admin_role(array['super_admin','owner','manager']::text[]); $$;

create or replace function private.can_view_reports()
returns boolean language sql stable security definer set search_path = ''
as $$ select private.has_admin_role(array['super_admin','owner','manager','viewer']::text[]); $$;

create or replace function private.can_manage_orders()
returns boolean language sql stable security definer set search_path = ''
as $$ select private.has_admin_role(array['super_admin','owner','manager']::text[]); $$;

revoke all on all functions in schema private from public;
grant execute on function private.current_admin_role() to authenticated;
grant execute on function private.has_admin_role(text[]) to authenticated;
grant execute on function private.can_access_admin() to authenticated;
grant execute on function private.can_manage_menu() to authenticated;
grant execute on function private.can_manage_restaurant_settings() to authenticated;
grant execute on function private.can_manage_users() to authenticated;
grant execute on function private.can_manage_discounts() to authenticated;
grant execute on function private.can_view_reports() to authenticated;
grant execute on function private.can_manage_orders() to authenticated;

-- Compatibility wrappers used by the dashboard and optional migrations.
create or replace function public.current_admin_role()
returns text language sql stable security invoker set search_path = ''
as $$ select private.current_admin_role(); $$;

create or replace function public.has_admin_role(allowed_roles text[])
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.has_admin_role(allowed_roles); $$;

create or replace function public.can_access_admin()
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.can_access_admin(); $$;

create or replace function public.can_manage_menu()
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.can_manage_menu(); $$;

create or replace function public.can_manage_restaurant_settings()
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.can_manage_restaurant_settings(); $$;

create or replace function public.can_manage_users()
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.can_manage_users(); $$;

create or replace function public.can_manage_discounts()
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.can_manage_discounts(); $$;

create or replace function public.can_view_reports()
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.can_view_reports(); $$;

create or replace function public.can_manage_orders()
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.can_manage_orders(); $$;

create or replace function public.is_restbr_admin()
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.can_access_admin(); $$;

revoke all on function public.current_admin_role() from public;
revoke all on function public.has_admin_role(text[]) from public;
revoke all on function public.can_access_admin() from public;
revoke all on function public.can_manage_menu() from public;
revoke all on function public.can_manage_restaurant_settings() from public;
revoke all on function public.can_manage_users() from public;
revoke all on function public.can_manage_discounts() from public;
revoke all on function public.can_view_reports() from public;
revoke all on function public.can_manage_orders() from public;
revoke all on function public.is_restbr_admin() from public;

grant execute on function public.current_admin_role() to authenticated;
grant execute on function public.has_admin_role(text[]) to authenticated;
grant execute on function public.can_access_admin() to authenticated;
grant execute on function public.can_manage_menu() to authenticated;
grant execute on function public.can_manage_restaurant_settings() to authenticated;
grant execute on function public.can_manage_users() to authenticated;
grant execute on function public.can_manage_discounts() to authenticated;
grant execute on function public.can_view_reports() to authenticated;
grant execute on function public.can_manage_orders() to authenticated;
grant execute on function public.is_restbr_admin() to authenticated;

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

create or replace function public.adjust_menu_prices_mode(
  p_category_id uuid,
  p_delta numeric,
  p_price_mode text default 'dinein'
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_mode text := lower(coalesce(p_price_mode, 'dinein'));
  v_products integer := 0;
  v_options integer := 0;
  v_takeaway integer := 0;
begin
  if not private.can_manage_menu() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_delta is null or p_delta <> trunc(p_delta) then
    raise exception 'Price change must be a whole number';
  end if;
  if v_mode not in ('dinein', 'takeaway', 'both') then
    raise exception 'Unsupported price mode';
  end if;

  if v_mode in ('takeaway', 'both') then
    if exists (
      select 1
      from public.product_options po
      join public.products p on p.id = po.product_id
      where (p_category_id is null or p.category_id = p_category_id)
        and coalesce(po.takeaway_price, po.price) + p_delta < 0
    ) then
      raise exception 'A takeaway price would become negative';
    end if;

    update public.product_options po
    set takeaway_price = coalesce(po.takeaway_price, po.price) + p_delta
    from public.products p
    where p.id = po.product_id
      and (p_category_id is null or p.category_id = p_category_id);
    get diagnostics v_takeaway = row_count;
  end if;

  if v_mode in ('dinein', 'both') then
    if exists (
      select 1 from public.products p
      where (p_category_id is null or p.category_id = p_category_id)
        and p.base_price is not null
        and p.base_price + p_delta < 0
    ) or exists (
      select 1
      from public.product_options po
      join public.products p on p.id = po.product_id
      where (p_category_id is null or p.category_id = p_category_id)
        and po.price + p_delta < 0
    ) then
      raise exception 'A dine-in price would become negative';
    end if;

    update public.products p
    set base_price = base_price + p_delta
    where base_price is not null
      and (p_category_id is null or p.category_id = p_category_id);
    get diagnostics v_products = row_count;

    update public.product_options po
    set price = po.price + p_delta
    from public.products p
    where p.id = po.product_id
      and (p_category_id is null or p.category_id = p_category_id);
    get diagnostics v_options = row_count;
  end if;

  return jsonb_build_object(
    'ok', true,
    'mode', v_mode,
    'products', v_products,
    'options', v_options,
    'takeaway_options', v_takeaway
  );
end;
$$;

create or replace function public.adjust_menu_prices(
  p_category_id uuid,
  p_delta numeric
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select public.adjust_menu_prices_mode(p_category_id, p_delta, 'dinein');
$$;

revoke all on function public.adjust_menu_prices_mode(uuid,numeric,text) from public;
revoke all on function public.adjust_menu_prices(uuid,numeric) from public;
grant execute on function public.adjust_menu_prices_mode(uuid,numeric,text) to authenticated;
grant execute on function public.adjust_menu_prices(uuid,numeric) to authenticated;

alter table public.restaurant_settings enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_options enable row level security;
alter table public.discounts enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.menu_analytics_daily enable row level security;
alter table public.admin_users enable row level security;

drop policy if exists restbr_settings_public_read on public.restaurant_settings;
create policy restbr_settings_public_read
on public.restaurant_settings for select to anon, authenticated using (true);
drop policy if exists restbr_settings_insert on public.restaurant_settings;
create policy restbr_settings_insert
on public.restaurant_settings for insert to authenticated
with check ((select private.can_manage_restaurant_settings()));
drop policy if exists restbr_settings_update on public.restaurant_settings;
create policy restbr_settings_update
on public.restaurant_settings for update to authenticated
using ((select private.can_manage_restaurant_settings()))
with check ((select private.can_manage_restaurant_settings()));

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
drop policy if exists restbr_categories_insert on public.categories;
create policy restbr_categories_insert
on public.categories for insert to authenticated
with check ((select private.can_manage_menu()));
drop policy if exists restbr_categories_update on public.categories;
create policy restbr_categories_update
on public.categories for update to authenticated
using ((select private.can_manage_menu()))
with check ((select private.can_manage_menu()));
drop policy if exists restbr_categories_delete on public.categories;
create policy restbr_categories_delete
on public.categories for delete to authenticated
using ((select private.has_admin_role(array['super_admin','owner','manager']::text[])));

drop policy if exists restbr_products_public_read on public.products;
drop policy if exists restbr_products_admin_read on public.products;
drop policy if exists restbr_products_authenticated_read on public.products;
create policy restbr_products_public_read
on public.products for select to anon
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
create policy restbr_products_authenticated_read
on public.products for select to authenticated
using (
  (
    is_active = true
    and is_visible = true
    and exists (
      select 1
      from public.categories c
      where c.id = products.category_id
        and c.is_active = true
        and c.is_visible = true
    )
  )
  or (select private.can_access_admin())
);
drop policy if exists restbr_products_insert on public.products;
create policy restbr_products_insert
on public.products for insert to authenticated
with check ((select private.can_manage_menu()));
drop policy if exists restbr_products_update on public.products;
create policy restbr_products_update
on public.products for update to authenticated
using ((select private.can_manage_menu()))
with check ((select private.can_manage_menu()));
drop policy if exists restbr_products_delete on public.products;
create policy restbr_products_delete
on public.products for delete to authenticated
using ((select private.has_admin_role(array['super_admin','owner','manager']::text[])));

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
drop policy if exists restbr_product_options_insert on public.product_options;
create policy restbr_product_options_insert
on public.product_options for insert to authenticated
with check ((select private.can_manage_menu()));
drop policy if exists restbr_product_options_update on public.product_options;
create policy restbr_product_options_update
on public.product_options for update to authenticated
using ((select private.can_manage_menu()))
with check ((select private.can_manage_menu()));
drop policy if exists restbr_product_options_delete on public.product_options;
create policy restbr_product_options_delete
on public.product_options for delete to authenticated
using ((select private.has_admin_role(array['super_admin','owner','manager']::text[])));

drop policy if exists restbr_discounts_public_read on public.discounts;
create policy restbr_discounts_public_read
on public.discounts for select to anon using (is_active = true);
drop policy if exists restbr_discounts_admin_read on public.discounts;
drop policy if exists restbr_discounts_authenticated_read on public.discounts;
create policy restbr_discounts_authenticated_read
on public.discounts for select to authenticated
using (is_active = true or (select private.can_access_admin()));
drop policy if exists restbr_discounts_insert on public.discounts;
create policy restbr_discounts_insert
on public.discounts for insert to authenticated
with check ((select private.can_manage_discounts()));
drop policy if exists restbr_discounts_update on public.discounts;
create policy restbr_discounts_update
on public.discounts for update to authenticated
using ((select private.can_manage_discounts()))
with check ((select private.can_manage_discounts()));
drop policy if exists restbr_discounts_delete on public.discounts;
create policy restbr_discounts_delete
on public.discounts for delete to authenticated
using ((select private.can_manage_discounts()));

drop policy if exists restbr_admin_users_read on public.admin_users;
create policy restbr_admin_users_read
on public.admin_users for select to authenticated
using (
  user_id = (select auth.uid())
  or (select private.can_manage_users())
);

drop policy if exists restbr_analytics_read on public.menu_analytics_daily;
create policy restbr_analytics_read
on public.menu_analytics_daily for select to authenticated
using ((select private.can_view_reports()));

drop policy if exists restbr_orders_read on public.orders;
create policy restbr_orders_read
on public.orders for select to authenticated
using ((select private.can_view_reports()));
drop policy if exists restbr_orders_update on public.orders;
create policy restbr_orders_update
on public.orders for update to authenticated
using ((select private.can_manage_orders()))
with check ((select private.can_manage_orders()));

drop policy if exists restbr_order_items_read on public.order_items;
create policy restbr_order_items_read
on public.order_items for select to authenticated
using ((select private.can_view_reports()));

grant usage on schema public to anon, authenticated;
grant select on public.restaurant_settings to anon, authenticated;
grant select on public.categories to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select on public.product_options to anon, authenticated;
grant select on public.discounts to anon, authenticated;
grant select, insert, update on public.restaurant_settings to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.product_options to authenticated;
grant select, insert, update, delete on public.discounts to authenticated;
grant select, update on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant select on public.menu_analytics_daily to authenticated;
grant select on public.admin_users to authenticated;

-- RLS governs DML; browser roles never need schema-changing table rights.
revoke truncate, references, trigger on all tables in schema public
  from anon, authenticated, service_role;

-- Exact server-side needs used by the RESTBR Edge Functions.
grant select on all tables in schema public to service_role;
grant insert, update, delete on public.admin_users to service_role;
grant update on public.products to service_role;

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'menu-images',
  'menu-images',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif']::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists restbr_menu_images_insert on storage.objects;
create policy restbr_menu_images_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'menu-images'
  and (select private.can_manage_menu())
);

drop policy if exists restbr_menu_images_super_admin_read on storage.objects;
create policy restbr_menu_images_super_admin_read
on storage.objects for select to authenticated
using (
  bucket_id = 'menu-images'
  and (select private.current_admin_role()) = 'super_admin'
);

drop policy if exists restbr_menu_images_super_admin_delete on storage.objects;
create policy restbr_menu_images_super_admin_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'menu-images'
  and (select private.current_admin_role()) = 'super_admin'
);

insert into public.restaurant_settings (
  restaurant_name_ar,
  restaurant_name_ku,
  restaurant_name_en,
  name_ar,
  name_ku,
  name_en,
  phone,
  whatsapp,
  whatsapp_number,
  orders_enabled
)
select
  'المطعم',
  'Restaurant',
  'Restaurant',
  'المطعم',
  'Restaurant',
  'Restaurant',
  '',
  '',
  '',
  false
where not exists (select 1 from public.restaurant_settings);

-- The first Auth user becomes the protected project administrator.
insert into public.admin_users (user_id, display_name, role, is_active)
select
  u.id,
  coalesce(
    nullif(u.raw_user_meta_data ->> 'display_name', ''),
    nullif(split_part(u.email, '@', 1), ''),
    'Restaurant Admin'
  ),
  'super_admin',
  true
from auth.users u
where u.id = (
  select id from auth.users order by created_at asc limit 1
)
on conflict (user_id) do update
set role = 'super_admin', is_active = true;

-- Defensive compatibility hardening: older RESTBR databases may contain this
-- SECURITY DEFINER helper. Fresh databases do not create it, but if it exists
-- it must never be executable by public browser roles.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;

commit;

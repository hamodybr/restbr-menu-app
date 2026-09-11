begin;

-- P0-C: server-authoritative order persistence for the public menu.
-- The browser never receives INSERT privileges on orders/order_items. Anonymous
-- checkout can only call the validated SECURITY DEFINER RPC below.

alter table public.restaurant_settings
  add column if not exists delivery_fee numeric not null default 0;

alter table public.restaurant_settings
  drop constraint if exists restaurant_settings_delivery_fee_nonnegative;
alter table public.restaurant_settings
  add constraint restaurant_settings_delivery_fee_nonnegative
  check (delivery_fee >= 0 and delivery_fee <= 1000000000);

alter table public.orders
  add column if not exists client_token uuid,
  add column if not exists price_mode text not null default 'takeaway',
  add column if not exists language text not null default 'ar';

alter table public.orders
  drop constraint if exists orders_price_mode_check;
alter table public.orders
  add constraint orders_price_mode_check
  check (price_mode in ('dinein','takeaway'));

alter table public.orders
  drop constraint if exists orders_language_check;
alter table public.orders
  add constraint orders_language_check
  check (language in ('ar','ku','en'));

create unique index if not exists orders_client_token_uidx
  on public.orders(client_token)
  where client_token is not null;

create or replace function private.restbr_time_window_open(
  p_from time,
  p_to time,
  p_now time default (now() at time zone 'Asia/Baghdad')::time
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case
    when p_from is null or p_to is null then true
    when p_from = p_to then true
    when p_from < p_to then p_now >= p_from and p_now < p_to
    else p_now >= p_from or p_now < p_to
  end;
$$;

create or replace function private.restbr_order_response(
  p_order_id uuid,
  p_duplicate boolean default false
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'ok', true,
    'duplicate', coalesce(p_duplicate, false),
    'order_id', o.id,
    'order_number', o.order_number,
    'order_type', o.order_type,
    'price_mode', o.price_mode,
    'language', o.language,
    'subtotal', o.subtotal,
    'delivery_fee', o.delivery_fee,
    'total', o.total,
    'created_at', o.created_at,
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'product_id', oi.product_id,
          'option_id', oi.option_id,
          'product_name', oi.product_name,
          'option_name', oi.option_name,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'line_total', oi.line_total,
          'color_id', oi.selected_color_id,
          'color_name', oi.selected_color_name,
          'color_hex', oi.selected_color_hex,
          'color_image_url', oi.selected_color_image_url
        )
        order by oi.created_at, oi.id
      )
      from public.order_items oi
      where oi.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.id = p_order_id;
$$;

revoke all on function private.restbr_time_window_open(time,time,time) from public;
revoke all on function private.restbr_order_response(uuid,boolean) from public;

create or replace function public.submit_order(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.restaurant_settings%rowtype;
  v_client_token uuid;
  v_existing_order_id uuid;
  v_order_id uuid := gen_random_uuid();
  v_order_number text;
  v_order_type text;
  v_price_mode text;
  v_language text;
  v_prefix text;
  v_customer_name text;
  v_customer_phone text;
  v_address text;
  v_location_url text;
  v_notes text;
  v_items jsonb;
  v_item jsonb;
  v_product_id uuid;
  v_option_id uuid;
  v_color_id uuid;
  v_quantity integer;
  v_product public.products%rowtype;
  v_category public.categories%rowtype;
  v_option public.product_options%rowtype;
  v_color public.product_colors%rowtype;
  v_base_price numeric;
  v_discount_percent numeric;
  v_unit_price numeric;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_delivery_fee numeric := 0;
  v_product_name text;
  v_option_name text;
  v_color_name text;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Invalid order payload' using errcode = '22023';
  end if;

  begin
    v_client_token := nullif(trim(p_payload->>'client_token'), '')::uuid;
  exception when others then
    raise exception 'Invalid client token' using errcode = '22023';
  end;

  if v_client_token is null then
    raise exception 'Client token is required' using errcode = '22023';
  end if;

  -- Idempotency: a repeated tap/retry with the same token returns the original
  -- order instead of creating a duplicate.
  select o.id into v_existing_order_id
  from public.orders o
  where o.client_token = v_client_token
  limit 1;

  if v_existing_order_id is not null then
    return private.restbr_order_response(v_existing_order_id, true);
  end if;

  select * into v_settings
  from public.restaurant_settings
  order by updated_at desc
  limit 1;

  if not found then
    raise exception 'Restaurant settings are unavailable' using errcode = 'P0001';
  end if;

  if v_settings.menu_enabled is false
     or v_settings.orders_enabled is false
     or v_settings.is_open is false then
    raise exception 'Ordering is currently unavailable' using errcode = 'P0001';
  end if;

  v_order_type := lower(trim(coalesce(p_payload->>'order_type', '')));
  if v_order_type not in ('delivery','pickup') then
    raise exception 'Unsupported order type' using errcode = '22023';
  end if;

  if v_order_type = 'delivery' and v_settings.delivery_enabled is false then
    raise exception 'Delivery is currently unavailable' using errcode = 'P0001';
  end if;

  if v_order_type = 'pickup' and v_settings.pickup_enabled is false then
    raise exception 'Pickup is currently unavailable' using errcode = 'P0001';
  end if;

  v_price_mode := lower(trim(coalesce(p_payload->>'price_mode', 'takeaway')));
  if v_price_mode not in ('dinein','takeaway') then
    raise exception 'Unsupported price mode' using errcode = '22023';
  end if;

  v_language := lower(trim(coalesce(p_payload->>'language', 'ar')));
  if v_language not in ('ar','ku','en') then
    v_language := 'ar';
  end if;

  v_customer_name := trim(coalesce(p_payload->>'customer_name', ''));
  v_customer_phone := regexp_replace(trim(coalesce(p_payload->>'customer_phone', '')), '\s+', '', 'g');
  v_address := nullif(trim(coalesce(p_payload->>'address', '')), '');
  v_location_url := nullif(trim(coalesce(p_payload->>'location_url', '')), '');
  v_notes := nullif(trim(coalesce(p_payload->>'notes', '')), '');

  if length(v_customer_name) not between 1 and 80 then
    raise exception 'Customer name is required' using errcode = '22023';
  end if;

  if length(v_customer_phone) not between 7 and 20
     or v_customer_phone !~ '^[+0-9().-]+$' then
    raise exception 'Invalid customer phone' using errcode = '22023';
  end if;

  if v_address is not null and length(v_address) > 300 then
    raise exception 'Address is too long' using errcode = '22023';
  end if;

  if v_order_type = 'delivery' and v_address is null then
    raise exception 'Delivery address is required' using errcode = '22023';
  end if;

  if v_location_url is not null then
    if length(v_location_url) > 1000 or v_location_url !~* '^https://' then
      raise exception 'Invalid location URL' using errcode = '22023';
    end if;
  end if;

  if v_notes is not null and length(v_notes) > 500 then
    raise exception 'Order notes are too long' using errcode = '22023';
  end if;

  v_items := p_payload->'items';
  if jsonb_typeof(v_items) <> 'array'
     or jsonb_array_length(v_items) < 1
     or jsonb_array_length(v_items) > 100 then
    raise exception 'Order must contain between 1 and 100 items' using errcode = '22023';
  end if;

  v_prefix := upper(regexp_replace(coalesce(p_payload->>'order_prefix', 'ORD'), '[^A-Za-z0-9]', '', 'g'));
  v_prefix := left(v_prefix, 8);
  if v_prefix = '' then v_prefix := 'ORD'; end if;

  v_order_number :=
    v_prefix || '-' ||
    to_char(now() at time zone 'Asia/Baghdad', 'YYMMDD') || '-' ||
    upper(substr(replace(v_client_token::text, '-', ''), 1, 8));

  v_delivery_fee := case
    when v_order_type = 'delivery' then greatest(coalesce(v_settings.delivery_fee, 0), 0)
    else 0
  end;

  begin
    insert into public.orders (
      id, order_number, client_token, customer_name, customer_phone,
      order_type, address, location_url, notes, status,
      subtotal, delivery_fee, total, price_mode, language
    ) values (
      v_order_id, v_order_number, v_client_token, v_customer_name, v_customer_phone,
      v_order_type, v_address, v_location_url, v_notes, 'new',
      0, v_delivery_fee, v_delivery_fee, v_price_mode, v_language
    );
  exception when unique_violation then
    select o.id into v_existing_order_id
    from public.orders o
    where o.client_token = v_client_token
    limit 1;

    if v_existing_order_id is not null then
      return private.restbr_order_response(v_existing_order_id, true);
    end if;
    raise;
  end;

  for v_item in select value from jsonb_array_elements(v_items)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Invalid order item' using errcode = '22023';
    end if;

    begin
      v_product_id := nullif(trim(v_item->>'product_id'), '')::uuid;
    exception when others then
      raise exception 'Invalid product reference' using errcode = '22023';
    end;

    begin
      v_option_id := nullif(trim(v_item->>'option_id'), '')::uuid;
    exception when others then
      v_option_id := null;
    end;

    begin
      v_color_id := nullif(trim(v_item->>'selected_color_id'), '')::uuid;
    exception when others then
      raise exception 'Invalid color reference' using errcode = '22023';
    end;

    begin
      v_quantity := (v_item->>'quantity')::integer;
    exception when others then
      raise exception 'Invalid quantity' using errcode = '22023';
    end;

    if v_product_id is null or v_quantity not between 1 and 99 then
      raise exception 'Invalid order item quantity' using errcode = '22023';
    end if;

    select p.* into v_product
    from public.products p
    where p.id = v_product_id
      and p.is_active = true
      and p.is_visible = true
      and p.is_available = true;

    if not found then
      raise exception 'A product is not available' using errcode = 'P0001';
    end if;

    select c.* into v_category
    from public.categories c
    where c.id = v_product.category_id
      and c.is_active = true
      and c.is_visible = true;

    if not found then
      raise exception 'A product category is not available' using errcode = 'P0001';
    end if;

    if v_product.availability_schedule_enabled
       and not private.restbr_time_window_open(v_product.available_from, v_product.available_to) then
      raise exception 'A product is outside its availability hours' using errcode = 'P0001';
    end if;

    if v_category.availability_schedule_enabled
       and not private.restbr_time_window_open(v_category.available_from, v_category.available_to) then
      raise exception 'A category is outside its availability hours' using errcode = 'P0001';
    end if;

    if v_price_mode = 'takeaway' and v_product.service_mode = 'dinein' then
      raise exception 'A product is not available for takeaway' using errcode = 'P0001';
    end if;

    if v_price_mode = 'dinein' and v_product.service_mode = 'takeaway' then
      raise exception 'A product is not available for dine-in' using errcode = 'P0001';
    end if;

    if v_option_id is not null then
      select po.* into v_option
      from public.product_options po
      where po.id = v_option_id
        and po.product_id = v_product_id
        and po.is_active = true
        and po.is_available = true;

      if not found then
        raise exception 'A product option is not available' using errcode = 'P0001';
      end if;

      v_base_price := case
        when v_price_mode = 'takeaway' then coalesce(v_option.takeaway_price, v_option.price)
        else v_option.price
      end;
    else
      v_option := null;
      if v_product.base_price is null then
        raise exception 'A product option is required' using errcode = '22023';
      end if;
      v_base_price := v_product.base_price;
    end if;

    -- If a product has active colors, a valid available color is mandatory.
    if exists (
      select 1 from public.product_colors pc
      where pc.product_id = v_product_id
        and pc.is_active = true
        and pc.is_available = true
    ) then
      if v_color_id is null then
        raise exception 'A product color is required' using errcode = '22023';
      end if;
    end if;

    v_color := null;
    if v_color_id is not null then
      select pc.* into v_color
      from public.product_colors pc
      where pc.id = v_color_id
        and pc.product_id = v_product_id
        and pc.is_active = true
        and pc.is_available = true;

      if not found then
        raise exception 'A product color is not available' using errcode = 'P0001';
      end if;
    end if;

    select coalesce(d.discount_percent, 0)
    into v_discount_percent
    from (
      select d.discount_percent
      from public.discounts d
      where d.is_active = true
        and d.price_mode in ('both', v_price_mode)
        and (
          d.scope_type = 'restaurant'
          or (d.scope_type = 'category' and d.target_id = v_product.category_id)
          or (d.scope_type = 'product' and d.target_id = v_product_id)
        )
      order by
        case d.scope_type when 'product' then 3 when 'category' then 2 else 1 end desc,
        d.discount_percent desc
      limit 1
    ) d;

    v_discount_percent := coalesce(v_discount_percent, 0);
    v_unit_price := greatest(0, round(v_base_price * (100 - v_discount_percent) / 100));
    v_line_total := v_unit_price * v_quantity;
    v_subtotal := v_subtotal + v_line_total;

    v_product_name := case v_language
      when 'en' then coalesce(nullif(v_product.name_en,''), nullif(v_product.name_ar,''), v_product.name_ku, '')
      when 'ku' then coalesce(nullif(v_product.name_ku,''), nullif(v_product.name_ar,''), v_product.name_en, '')
      else coalesce(nullif(v_product.name_ar,''), nullif(v_product.name_ku,''), v_product.name_en, '')
    end;

    if v_option_id is not null then
      v_option_name := case v_language
        when 'en' then coalesce(nullif(v_option.name_en,''), nullif(v_option.name_ar,''), v_option.name_ku, '')
        when 'ku' then coalesce(nullif(v_option.name_ku,''), nullif(v_option.name_ar,''), v_option.name_en, '')
        else coalesce(nullif(v_option.name_ar,''), nullif(v_option.name_ku,''), v_option.name_en, '')
      end;
    else
      v_option_name := null;
    end if;

    if v_color_id is not null then
      v_color_name := case v_language
        when 'en' then coalesce(nullif(v_color.name_en,''), nullif(v_color.name_ar,''), v_color.name_ku, '')
        when 'ku' then coalesce(nullif(v_color.name_ku,''), nullif(v_color.name_ar,''), v_color.name_en, '')
        else coalesce(nullif(v_color.name_ar,''), nullif(v_color.name_ku,''), v_color.name_en, '')
      end;
    else
      v_color_name := null;
    end if;

    insert into public.order_items (
      order_id, product_id, option_id, product_name, option_name,
      quantity, unit_price, line_total,
      selected_color_id, selected_color_name, selected_color_hex,
      selected_color_image_url
    ) values (
      v_order_id, v_product_id, v_option_id, v_product_name, v_option_name,
      v_quantity, v_unit_price, v_line_total,
      v_color_id, v_color_name,
      case when v_color_id is null then null else v_color.hex_color end,
      case when v_color_id is null then null else v_color.image_url end
    );
  end loop;

  update public.orders
  set subtotal = v_subtotal,
      delivery_fee = v_delivery_fee,
      total = v_subtotal + v_delivery_fee
  where id = v_order_id;

  return private.restbr_order_response(v_order_id, false);
end;
$$;

revoke all on function public.submit_order(jsonb) from public;
grant execute on function public.submit_order(jsonb) to anon, authenticated;

comment on function public.submit_order(jsonb) is
  'Validated public checkout RPC. Prices, discounts, availability, color snapshots, delivery fee and totals are calculated server-side; direct anonymous inserts remain forbidden.';

commit;

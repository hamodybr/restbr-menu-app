begin;

-- P0-D: explicit admin actions for order status and deletion. Browser roles do
-- not receive broad DELETE rights; these RPCs perform the existing RESTBR role
-- checks before mutating order data.

create or replace function public.set_order_status(
  p_order_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text := lower(trim(coalesce(p_status, '')));
  v_order public.orders%rowtype;
begin
  if not private.can_manage_orders() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  if v_status not in (
    'new','confirmed','preparing','ready','delivering','completed','cancelled'
  ) then
    raise exception 'Unsupported order status' using errcode = '22023';
  end if;

  update public.orders
  set status = v_status
  where id = p_order_id
  returning * into v_order;

  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', v_order.id,
    'order_number', v_order.order_number,
    'status', v_order.status,
    'updated_at', v_order.updated_at
  );
end;
$$;

create or replace function public.delete_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_number text;
begin
  if not private.can_manage_orders() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  delete from public.orders
  where id = p_order_id
  returning order_number into v_number;

  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'ok', true,
    'order_id', p_order_id,
    'order_number', v_number
  );
end;
$$;

revoke all on function public.set_order_status(uuid,text) from public;
revoke all on function public.delete_order(uuid) from public;
grant execute on function public.set_order_status(uuid,text) to authenticated;
grant execute on function public.delete_order(uuid) to authenticated;

-- Use realtime for fresh incoming orders when the standard Supabase publication
-- exists. The admin runtime also has a low-frequency visible-page fallback.
do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    execute 'alter publication supabase_realtime add table public.orders';
  end if;
end;
$$;

commit;

begin;

-- Keep restaurant opening hours authoritative on the database too. The public
-- UI already blocks checkout while closed, but this trigger prevents a crafted
-- RPC request from bypassing the daily/weekly schedule.

create or replace function private.restbr_schedule_slot_values(
  p_slot jsonb,
  out enabled boolean,
  out start_minute integer,
  out end_minute integer
)
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_open text := trim(coalesce(p_slot->>'open', ''));
  v_close text := trim(coalesce(p_slot->>'close', ''));
begin
  enabled := lower(coalesce(p_slot->>'enabled', 'true')) <> 'false';
  start_minute := null;
  end_minute := null;

  if v_open !~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$'
     or v_close !~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$' then
    return;
  end if;

  start_minute := substring(v_open from 1 for 2)::integer * 60
    + substring(v_open from 4 for 2)::integer;
  end_minute := substring(v_close from 1 for 2)::integer * 60
    + substring(v_close from 4 for 2)::integer;
end;
$$;

create or replace function private.restbr_restaurant_schedule_open(
  p_mode text,
  p_schedule jsonb,
  p_at timestamptz default now()
)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  v_mode text := lower(coalesce(p_mode, 'always'));
  v_schedule jsonb := coalesce(p_schedule, '{}'::jsonb);
  v_local timestamp := p_at at time zone 'Asia/Baghdad';
  v_now_minute integer;
  v_dow integer;
  v_day_keys text[] := array['sun','mon','tue','wed','thu','fri','sat'];
  v_today_key text;
  v_prev_key text;
  v_slot jsonb;
  v_prev_slot jsonb;
  v_enabled boolean;
  v_start integer;
  v_end integer;
  v_prev_enabled boolean;
  v_prev_start integer;
  v_prev_end integer;
begin
  if v_mode = 'always' then
    return true;
  end if;

  v_now_minute := extract(hour from v_local)::integer * 60
    + extract(minute from v_local)::integer;
  v_dow := extract(dow from v_local)::integer;
  v_today_key := v_day_keys[v_dow + 1];
  v_prev_key := v_day_keys[((v_dow + 6) % 7) + 1];

  if v_mode = 'daily' then
    v_slot := coalesce(v_schedule->'daily', '{}'::jsonb);
    select enabled, start_minute, end_minute
      into v_enabled, v_start, v_end
    from private.restbr_schedule_slot_values(v_slot);

    if not coalesce(v_enabled, false) or v_start is null or v_end is null then
      return false;
    end if;
    if v_start = v_end then return true; end if;
    if v_start < v_end then
      return v_now_minute >= v_start and v_now_minute < v_end;
    end if;
    return v_now_minute >= v_start or v_now_minute < v_end;
  end if;

  if v_mode = 'weekly' then
    v_slot := coalesce(v_schedule->'weekly'->v_today_key, '{}'::jsonb);
    select enabled, start_minute, end_minute
      into v_enabled, v_start, v_end
    from private.restbr_schedule_slot_values(v_slot);

    if coalesce(v_enabled, false) and v_start is not null and v_end is not null then
      if v_start = v_end then return true; end if;
      if v_start < v_end and v_now_minute >= v_start and v_now_minute < v_end then
        return true;
      end if;
      if v_start > v_end and v_now_minute >= v_start then
        return true;
      end if;
    end if;

    -- An overnight shift belongs to the previous weekday after midnight.
    v_prev_slot := coalesce(v_schedule->'weekly'->v_prev_key, '{}'::jsonb);
    select enabled, start_minute, end_minute
      into v_prev_enabled, v_prev_start, v_prev_end
    from private.restbr_schedule_slot_values(v_prev_slot);

    return coalesce(v_prev_enabled, false)
      and v_prev_start is not null
      and v_prev_end is not null
      and v_prev_start > v_prev_end
      and v_now_minute < v_prev_end;
  end if;

  -- Unknown modes fail closed instead of accepting a crafted value.
  return false;
end;
$$;

create or replace function private.enforce_restbr_order_open_hours()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.restaurant_settings%rowtype;
begin
  select * into v_settings
  from public.restaurant_settings
  order by updated_at desc
  limit 1;

  if not found
     or v_settings.menu_enabled is false
     or v_settings.orders_enabled is false
     or v_settings.is_open is false then
    raise exception 'Ordering is currently unavailable' using errcode = 'P0001';
  end if;

  if not private.restbr_restaurant_schedule_open(
    v_settings.restaurant_schedule_mode,
    v_settings.restaurant_schedule,
    now()
  ) then
    raise exception 'Restaurant is closed according to opening hours' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function private.restbr_schedule_slot_values(jsonb) from public;
revoke all on function private.restbr_restaurant_schedule_open(text,jsonb,timestamptz) from public;
revoke all on function private.enforce_restbr_order_open_hours() from public;

drop trigger if exists restbr_orders_open_hours_guard on public.orders;
create trigger restbr_orders_open_hours_guard
before insert on public.orders
for each row execute function private.enforce_restbr_order_open_hours();

commit;

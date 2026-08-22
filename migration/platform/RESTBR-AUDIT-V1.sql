-- ============================================================
-- RESTBR AUDIT LOG V1
-- Tenant-scoped change history for platform/menu management tables.
-- Owner/Manager can read their restaurant log; Platform Admin can read all.
-- Writes are trigger-only.
-- ============================================================

begin;

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  actor_user_id uuid null,
  table_name text not null,
  record_id text not null default '',
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  old_data jsonb null,
  new_data jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_restaurant_created_idx
  on public.audit_logs(restaurant_id, created_at desc);

create index if not exists audit_logs_actor_created_idx
  on public.audit_logs(actor_user_id, created_at desc)
  where actor_user_id is not null;

alter table public.audit_logs enable row level security;

drop policy if exists audit_logs_manager_read on public.audit_logs;
create policy audit_logs_manager_read
on public.audit_logs
for select
to authenticated
using (private.can_manage_restaurant(restaurant_id));

revoke all on table public.audit_logs from public, anon, authenticated;
grant select on table public.audit_logs to authenticated;

create or replace function private.log_restbr_audit_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_restaurant_id uuid;
  v_record_id text;
begin
  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;

  if tg_table_name = 'restaurants' then
    v_restaurant_id := nullif(v_row ->> 'id', '')::uuid;
  else
    v_restaurant_id := nullif(v_row ->> 'restaurant_id', '')::uuid;
  end if;

  if v_restaurant_id is null then
    return null;
  end if;

  v_record_id := coalesce(v_row ->> 'id', v_row ->> 'restaurant_id', '');

  insert into public.audit_logs(
    restaurant_id,
    actor_user_id,
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    created_at
  ) values (
    v_restaurant_id,
    (select auth.uid()),
    tg_table_name,
    v_record_id,
    tg_op,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end,
    now()
  );

  return null;
end;
$$;

revoke all on function private.log_restbr_audit_change() from public, anon, authenticated;

do $$
declare
  v_table text;
  v_trigger text;
begin
  foreach v_table in array array[
    'restaurants',
    'restaurant_settings',
    'categories',
    'products',
    'product_options',
    'restaurant_domains',
    'restaurant_members',
    'subscriptions'
  ]
  loop
    v_trigger := 'trg_restbr_audit_' || v_table;
    execute format('drop trigger if exists %I on public.%I', v_trigger, v_table);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function private.log_restbr_audit_change()',
      v_trigger,
      v_table
    );
  end loop;
end;
$$;

commit;

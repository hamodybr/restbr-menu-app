-- RESTBR audit tenant deletion V1
-- Preserve original tenant identity in audit history while allowing restaurant deletion.

alter table public.audit_logs
  add column if not exists tenant_id_snapshot uuid;

update public.audit_logs
set tenant_id_snapshot = restaurant_id
where tenant_id_snapshot is null
  and restaurant_id is not null;

alter table public.audit_logs
  alter column restaurant_id drop not null;

alter table public.audit_logs
  drop constraint if exists audit_logs_restaurant_id_fkey;

alter table public.audit_logs
  add constraint audit_logs_restaurant_id_fkey
  foreign key (restaurant_id)
  references public.restaurants(id)
  on delete set null;

create index if not exists audit_logs_tenant_id_snapshot_idx
  on public.audit_logs(tenant_id_snapshot, created_at desc);

create or replace function private.log_restbr_audit_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_restaurant_id uuid;
  v_live_restaurant_id uuid;
  v_record_id text;
begin
  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;

  if tg_table_name = 'restaurants' then
    v_restaurant_id := nullif(v_row->>'id','')::uuid;
  else
    v_restaurant_id := nullif(v_row->>'restaurant_id','')::uuid;
  end if;

  if v_restaurant_id is null then
    return null;
  end if;

  select r.id
  into v_live_restaurant_id
  from public.restaurants r
  where r.id = v_restaurant_id;

  v_record_id := coalesce(v_row->>'id', v_row->>'restaurant_id', '');

  insert into public.audit_logs(
    restaurant_id,
    tenant_id_snapshot,
    actor_user_id,
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    created_at
  ) values (
    v_live_restaurant_id,
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

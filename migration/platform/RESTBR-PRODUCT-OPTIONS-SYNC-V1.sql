-- ============================================================
-- RESTBR PRODUCT OPTION STATE SYNC V1.1
-- Keeps products.metadata.has_options synchronized with usable option rows.
--
-- IMPORTANT:
-- RESTBR platform stores has_options inside products.metadata JSONB.
-- product_options availability is stored inside option.metadata.is_available.
-- Run once in restbr-platform > Supabase SQL Editor.
-- ============================================================

begin;

create or replace function public.sync_product_has_options()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product_id uuid;
  v_old_product_id uuid;
  v_has_options boolean;
begin
  if tg_op = 'DELETE' then
    v_product_id := old.product_id;
  else
    v_product_id := new.product_id;
  end if;

  if tg_op = 'UPDATE' then
    v_old_product_id := old.product_id;
  end if;

  if v_product_id is not null then
    select exists (
      select 1
      from public.product_options po
      where po.product_id = v_product_id
        and po.is_active is not false
        and coalesce((po.metadata ->> 'is_available')::boolean, true) is not false
    ) into v_has_options;

    update public.products p
    set
      metadata = jsonb_set(
        coalesce(p.metadata, '{}'::jsonb),
        '{has_options}',
        to_jsonb(v_has_options),
        true
      ),
      updated_at = now()
    where p.id = v_product_id;
  end if;

  if v_old_product_id is not null
     and v_old_product_id is distinct from v_product_id then
    select exists (
      select 1
      from public.product_options po
      where po.product_id = v_old_product_id
        and po.is_active is not false
        and coalesce((po.metadata ->> 'is_available')::boolean, true) is not false
    ) into v_has_options;

    update public.products p
    set
      metadata = jsonb_set(
        coalesce(p.metadata, '{}'::jsonb),
        '{has_options}',
        to_jsonb(v_has_options),
        true
      ),
      updated_at = now()
    where p.id = v_old_product_id;
  end if;

  -- Return value is ignored for AFTER row triggers.
  return null;
end;
$$;

drop trigger if exists trg_sync_product_has_options on public.product_options;

create trigger trg_sync_product_has_options
after insert or delete or update of product_id, is_active, metadata
on public.product_options
for each row
execute function public.sync_product_has_options();

-- One-time repair for every existing product.
update public.products p
set
  metadata = jsonb_set(
    coalesce(p.metadata, '{}'::jsonb),
    '{has_options}',
    to_jsonb(
      exists (
        select 1
        from public.product_options po
        where po.product_id = p.id
          and po.is_active is not false
          and coalesce((po.metadata ->> 'is_available')::boolean, true) is not false
      )
    ),
    true
  ),
  updated_at = now();

commit;

-- Verification:
-- select
--   p.id,
--   p.name_ar,
--   coalesce((p.metadata ->> 'has_options')::boolean, false) as has_options,
--   count(po.id) filter (
--     where po.is_active is not false
--       and coalesce((po.metadata ->> 'is_available')::boolean, true) is not false
--   ) as usable_options
-- from public.products p
-- left join public.product_options po on po.product_id = p.id
-- group by p.id, p.name_ar, p.metadata
-- order by p.name_ar;

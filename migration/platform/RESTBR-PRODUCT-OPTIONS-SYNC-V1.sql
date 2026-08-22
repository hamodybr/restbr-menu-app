-- ============================================================
-- RESTBR PRODUCT OPTION STATE SYNC V1
-- Keeps products.has_options synchronized with active option rows.
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
    update public.products p
    set
      has_options = exists (
        select 1
        from public.product_options po
        where po.product_id = v_product_id
          and po.is_active is not false
      ),
      updated_at = now()
    where p.id = v_product_id;
  end if;

  if v_old_product_id is not null
     and v_old_product_id is distinct from v_product_id then
    update public.products p
    set
      has_options = exists (
        select 1
        from public.product_options po
        where po.product_id = v_old_product_id
          and po.is_active is not false
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
after insert or delete or update of product_id, is_active
on public.product_options
for each row
execute function public.sync_product_has_options();

-- One-time repair for existing rows.
update public.products p
set
  has_options = exists (
    select 1
    from public.product_options po
    where po.product_id = p.id
      and po.is_active is not false
  ),
  updated_at = now();

commit;

-- Verification:
-- select p.id, p.name_ar, p.has_options,
--        count(po.id) filter (where po.is_active is not false) as active_options
-- from public.products p
-- left join public.product_options po on po.product_id = p.id
-- group by p.id, p.name_ar, p.has_options
-- order by p.name_ar;

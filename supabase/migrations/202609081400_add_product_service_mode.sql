begin;

alter table public.products
  add column if not exists service_mode text;

update public.products
set service_mode = 'both'
where service_mode is null
   or service_mode not in ('both', 'dinein', 'takeaway');

alter table public.products
  alter column service_mode set default 'both';

alter table public.products
  alter column service_mode set not null;

alter table public.products
  drop constraint if exists products_service_mode_check;

alter table public.products
  add constraint products_service_mode_check
  check (service_mode in ('both', 'dinein', 'takeaway'));

comment on column public.products.service_mode is
  'Controls menu visibility after order-mode selection: both, dinein, or takeaway.';

commit;

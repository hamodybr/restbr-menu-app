alter table public.products
  add column if not exists is_popular boolean not null default false,
  add column if not exists is_new boolean not null default false,
  add column if not exists is_hot boolean not null default false,
  add column if not exists is_offer boolean not null default false;

comment on column public.products.is_popular is 'Shows the localized most-popular badge on the public menu.';
comment on column public.products.is_new is 'Shows the localized new-item badge on the public menu.';
comment on column public.products.is_hot is 'Shows the localized spicy badge on the public menu.';
comment on column public.products.is_offer is 'Shows a manual offer badge; percentage discount badges come from public.discounts.';

-- RESTBR demo menu price upgrade
-- Updates only products that belong to demo-category-* categories.
-- Safe for restaurant projects that may also contain real menu data.

begin;

create temp table restbr_demo_products on commit drop as
select
  p.id as product_id,
  (
    5000
    + ((greatest(coalesce(c.sort_order, 1), 1) - 1) * 500)
    + ((greatest(coalesce(p.sort_order, 1), 1) - 1) * 1000)
  )::numeric as base_price_value
from public.products p
join public.categories c on c.id = p.category_id
where c.slug like 'demo-category-%';

update public.products p
set base_price = d.base_price_value, has_options = true, updated_at = now()
from restbr_demo_products d
where p.id = d.product_id;

with ranked_options as (
  select po.id, po.product_id,
    row_number() over (partition by po.product_id order by po.sort_order, po.id) as option_number
  from public.product_options po
  join restbr_demo_products d on d.product_id = po.product_id
)
update public.product_options po
set
  name_ar = case when r.option_number = 1 then 'صغير' else 'كبير' end,
  name_ku = case when r.option_number = 1 then 'بچووک' else 'گەورە' end,
  name_en = case when r.option_number = 1 then 'Small' else 'Large' end,
  price = case when r.option_number = 1 then d.base_price_value else d.base_price_value + 2000 end,
  takeaway_price = case when r.option_number = 1 then d.base_price_value + 500 else d.base_price_value + 2500 end,
  sort_order = r.option_number, is_active = true, is_available = true, updated_at = now()
from ranked_options r
join restbr_demo_products d on d.product_id = r.product_id
where po.id = r.id and r.option_number <= 2;

insert into public.product_options (
  product_id, name_ar, name_ku, name_en, price, takeaway_price,
  sort_order, is_active, is_available
)
select product_id, 'صغير', 'بچووک', 'Small',
  base_price_value, base_price_value + 500, 1, true, true
from restbr_demo_products d
where not exists (select 1 from public.product_options po where po.product_id = d.product_id);

insert into public.product_options (
  product_id, name_ar, name_ku, name_en, price, takeaway_price,
  sort_order, is_active, is_available
)
select product_id, 'كبير', 'گەورە', 'Large',
  base_price_value + 2000, base_price_value + 2500, 2, true, true
from restbr_demo_products d
where (select count(*) from public.product_options po where po.product_id = d.product_id) < 2;

commit;

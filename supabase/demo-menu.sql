-- RESTBR starter demo menu
-- Safe to run on a fresh restaurant project. It does nothing when menu data
-- already exists, so it cannot overwrite a restaurant's real menu.

begin;

do $$
declare
  category_id uuid;
  product_id uuid;
  category_number integer;
  product_number integer;
begin
  if exists (select 1 from public.categories)
     or exists (select 1 from public.products) then
    return;
  end if;

  for category_number in 1..15 loop
    insert into public.categories (
      name_ar,
      name_ku,
      name_en,
      slug,
      sort_order,
      is_active,
      is_visible,
      availability_schedule_enabled
    ) values (
      'قسم تجريبي ' || category_number,
      'بەشی تاقیکردنەوە ' || category_number,
      'Demo Category ' || category_number,
      'demo-category-' || category_number,
      category_number,
      true,
      true,
      false
    ) returning id into category_id;

    for product_number in 1..2 loop
      insert into public.products (
        category_id,
        name_ar,
        name_ku,
        name_en,
        description_ar,
        base_price,
        sort_order,
        is_active,
        is_visible,
        is_available,
        has_options
      ) values (
        category_id,
        'صنف تجريبي ' || category_number || ' - ' || product_number,
        'بەرهەمی تاقیکردنەوە ' || category_number || ' - ' || product_number,
        'Demo Item ' || category_number || ' - ' || product_number,
        'عدّل الاسم والوصف والسعر من لوحة الإدارة.',
        0,
        product_number,
        true,
        true,
        true,
        false
      ) returning id into product_id;

      -- The menu uses one option row for direct-add products.
      insert into public.product_options (
        product_id,
        name_ar,
        name_ku,
        name_en,
        price,
        sort_order,
        is_active,
        is_available
      ) values (
        product_id,
        'صنف تجريبي ' || category_number || ' - ' || product_number,
        'بەرهەمی تاقیکردنەوە ' || category_number || ' - ' || product_number,
        'Demo Item ' || category_number || ' - ' || product_number,
        0,
        1,
        true,
        true
      );
    end loop;
  end loop;
end;
$$;

commit;

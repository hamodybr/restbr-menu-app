-- ============================================================
-- RESTBR DESIGN SYSTEM V1.1
-- Animated background test for YourCoffee Test ONLY
-- SHORASH is NOT modified.
-- ============================================================

begin;

update public.restaurant_settings rs
set ui_design_settings =
  coalesce(rs.ui_design_settings, '{}'::jsonb)
  || jsonb_build_object(
    'design_system_version', 1.1,
    'background_effect', 'coffee-aurora',

    -- Make the glass effect intentionally obvious for testing:
    'card_glass_opacity', 14,
    'card_glass_blur', 22,
    'card_shadow_strength', 48,
    'card_border_color', 'rgba(197,138,82,.64)',
    'button_border_color', 'rgba(197,138,82,.68)'
  )
from public.restaurants r
where r.id = rs.restaurant_id
  and r.slug = 'yourcoffee-test';

commit;

select
  r.slug,
  rs.ui_design_settings->>'background_effect' as background_effect,
  rs.ui_design_settings->>'card_glass_opacity' as card_glass_opacity,
  rs.ui_design_settings->>'card_glass_blur' as card_glass_blur
from public.restaurant_settings rs
join public.restaurants r on r.id = rs.restaurant_id
where r.slug in ('shorash', 'yourcoffee-test')
order by r.slug;

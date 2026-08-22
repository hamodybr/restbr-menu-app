-- ============================================================
-- RESTBR DESIGN SYSTEM V1
-- Safe tenant-specific design test for YourCoffee Test only.
-- Does NOT change SHORASH.
-- Run in restbr-platform > SQL Editor.
-- ============================================================

begin;

update public.restaurant_settings rs
set ui_design_settings =
  coalesce(rs.ui_design_settings, '{}'::jsonb)
  || jsonb_build_object(
    'design_system_version', 1,
    'preset', 'coffee-luxury',
    'accent_color', '#C58A52',
    'text_primary', '#FFF7ED',
    'text_muted', 'rgba(255,247,237,.72)',

    'card_glass_color', '#120B07',
    'card_glass_opacity', 22,
    'card_glass_blur', 18,
    'card_border_color', 'rgba(197,138,82,.52)',
    'button_border_color', 'rgba(197,138,82,.58)',
    'card_shadow_strength', 42,
    'background_overlay_opacity', 14,

    'card_height', 170,
    'image_percent', 44,
    'card_radius', 24,
    'card_gap', 14,
    'info_padding', 12,

    'product_name_font', 15,
    'option_font', 11,
    'price_font', 12,
    'section_title_font', 24,

    'category_height', 43,
    'category_font', 12,
    'top_action_height', 50,
    'top_action_font', 11,

    'cart_width', 190,
    'cart_height', 58,
    'cart_font', 14,
    'cart_bottom', 16,

    'logo_size', 92,
    'menu_title_font', 28,
    'subtitle_font', 12,

    'footer_title_font', 18,
    'footer_action_font', 11,
    'footer_phone_font', 18
  )
from public.restaurants r
where r.id = rs.restaurant_id
  and r.slug = 'yourcoffee-test';

commit;

-- Verify:
select
  r.slug,
  rs.ui_design_settings
from public.restaurant_settings rs
join public.restaurants r on r.id = rs.restaurant_id
where r.slug in ('shorash','yourcoffee-test')
order by r.slug;

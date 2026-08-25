create schema if not exists restbr_private;
revoke all on schema restbr_private from public;

create table if not exists restbr_private.restaurant_reset_challenges (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  backup_id text not null,
  expected_counts jsonb not null,
  restaurant_snapshot jsonb not null default '{}'::jsonb,
  delete_total bigint not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  used_at timestamptz null
);

revoke all on table restbr_private.restaurant_reset_challenges from public, anon, authenticated;
create index if not exists restaurant_reset_challenges_user_idx
  on restbr_private.restaurant_reset_challenges (user_id, expires_at desc);

create or replace function public.restaurant_reset_prepare(
  p_backup_id text,
  p_expected_counts jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_role text;
  v_preview jsonb;
  v_current jsonb;
  v_expected jsonb;
  v_token uuid;
  v_expires timestamptz;
  v_delete_total bigint;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  v_role := public.current_admin_role();
  if v_role is distinct from 'super_admin' then
    raise exception 'Super admin access required' using errcode = '42501';
  end if;

  if length(trim(coalesce(p_backup_id, ''))) < 8 then
    raise exception 'Valid backup id required' using errcode = '22023';
  end if;

  v_preview := public.restaurant_reset_preview();
  v_current := jsonb_build_object(
    'categories', coalesce((v_preview->'counts'->>'categories')::bigint, 0),
    'products', coalesce((v_preview->'counts'->>'products')::bigint, 0),
    'product_options', coalesce((v_preview->'counts'->>'product_options')::bigint, 0),
    'discounts', coalesce((v_preview->'counts'->>'discounts')::bigint, 0),
    'orders', coalesce((v_preview->'counts'->>'orders')::bigint, 0),
    'order_items', coalesce((v_preview->'counts'->>'order_items')::bigint, 0),
    'menu_analytics_daily', coalesce((v_preview->'counts'->>'menu_analytics_daily')::bigint, 0),
    'restaurant_settings', coalesce((v_preview->'counts'->>'restaurant_settings')::bigint, 0),
    'storage_files', coalesce((v_preview->'counts'->>'storage_files')::bigint, 0)
  );

  v_expected := jsonb_build_object(
    'categories', coalesce((p_expected_counts->>'categories')::bigint, -1),
    'products', coalesce((p_expected_counts->>'products')::bigint, -1),
    'product_options', coalesce((p_expected_counts->>'product_options')::bigint, -1),
    'discounts', coalesce((p_expected_counts->>'discounts')::bigint, -1),
    'orders', coalesce((p_expected_counts->>'orders')::bigint, -1),
    'order_items', coalesce((p_expected_counts->>'order_items')::bigint, -1),
    'menu_analytics_daily', coalesce((p_expected_counts->>'menu_analytics_daily')::bigint, -1),
    'restaurant_settings', coalesce((p_expected_counts->>'restaurant_settings')::bigint, -1),
    'storage_files', coalesce((p_expected_counts->>'storage_files')::bigint, -1)
  );

  if v_expected is distinct from v_current then
    raise exception 'Backup counts no longer match current restaurant data' using errcode = '40001';
  end if;

  v_delete_total := coalesce((v_preview->'plan'->>'delete_total')::bigint, 0);

  delete from restbr_private.restaurant_reset_challenges
  where user_id = v_user
    and (expires_at <= now() or used_at is not null);

  insert into restbr_private.restaurant_reset_challenges (
    user_id, backup_id, expected_counts, restaurant_snapshot, delete_total
  ) values (
    v_user,
    trim(p_backup_id),
    v_current,
    coalesce(v_preview->'restaurant', '{}'::jsonb),
    v_delete_total
  )
  returning token, expires_at into v_token, v_expires;

  return jsonb_build_object(
    'ok', true,
    'armed', true,
    'challenge_token', v_token,
    'expires_at', v_expires,
    'delete_total', v_delete_total,
    'confirmation_phrase', 'RESET ' || v_delete_total,
    'restaurant', coalesce(v_preview->'restaurant', '{}'::jsonb),
    'counts', v_current,
    'storage_bucket', 'menu-images'
  );
end;
$$;

revoke all on function public.restaurant_reset_prepare(text, jsonb) from public;
grant execute on function public.restaurant_reset_prepare(text, jsonb) to authenticated;

create or replace function public.restaurant_reset_execute(
  p_challenge_token uuid,
  p_confirmation text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_role text;
  v_challenge restbr_private.restaurant_reset_challenges%rowtype;
  v_preview jsonb;
  v_current jsonb;
  v_expected_phrase text;
  v_deleted_order_items bigint := 0;
  v_deleted_orders bigint := 0;
  v_deleted_analytics bigint := 0;
  v_deleted_discounts bigint := 0;
  v_deleted_options bigint := 0;
  v_deleted_products bigint := 0;
  v_deleted_categories bigint := 0;
  v_deleted_settings bigint := 0;
  v_settings_id uuid;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  v_role := public.current_admin_role();
  if v_role is distinct from 'super_admin' then
    raise exception 'Super admin access required' using errcode = '42501';
  end if;

  select * into v_challenge
  from restbr_private.restaurant_reset_challenges
  where token = p_challenge_token
    and user_id = v_user
    and used_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Reset challenge is missing, expired, or already used' using errcode = '22023';
  end if;

  v_expected_phrase := 'RESET ' || v_challenge.delete_total;
  if coalesce(p_confirmation, '') is distinct from v_expected_phrase then
    raise exception 'Final confirmation phrase does not match' using errcode = '22023';
  end if;

  lock table
    public.order_items,
    public.orders,
    public.menu_analytics_daily,
    public.discounts,
    public.product_options,
    public.products,
    public.categories,
    public.restaurant_settings
  in access exclusive mode;

  v_preview := public.restaurant_reset_preview();
  v_current := jsonb_build_object(
    'categories', coalesce((v_preview->'counts'->>'categories')::bigint, 0),
    'products', coalesce((v_preview->'counts'->>'products')::bigint, 0),
    'product_options', coalesce((v_preview->'counts'->>'product_options')::bigint, 0),
    'discounts', coalesce((v_preview->'counts'->>'discounts')::bigint, 0),
    'orders', coalesce((v_preview->'counts'->>'orders')::bigint, 0),
    'order_items', coalesce((v_preview->'counts'->>'order_items')::bigint, 0),
    'menu_analytics_daily', coalesce((v_preview->'counts'->>'menu_analytics_daily')::bigint, 0),
    'restaurant_settings', coalesce((v_preview->'counts'->>'restaurant_settings')::bigint, 0),
    'storage_files', coalesce((v_preview->'counts'->>'storage_files')::bigint, 0)
  );

  if v_current is distinct from v_challenge.expected_counts then
    raise exception 'Restaurant data changed after reset was armed; create a new full backup' using errcode = '40001';
  end if;

  delete from public.order_items;
  get diagnostics v_deleted_order_items = row_count;
  delete from public.orders;
  get diagnostics v_deleted_orders = row_count;
  delete from public.menu_analytics_daily;
  get diagnostics v_deleted_analytics = row_count;
  delete from public.discounts;
  get diagnostics v_deleted_discounts = row_count;
  delete from public.product_options;
  get diagnostics v_deleted_options = row_count;
  delete from public.products;
  get diagnostics v_deleted_products = row_count;
  delete from public.categories;
  get diagnostics v_deleted_categories = row_count;
  delete from public.restaurant_settings;
  get diagnostics v_deleted_settings = row_count;

  insert into public.restaurant_settings (
    restaurant_name_ar, restaurant_name_ku, restaurant_name_en,
    phone, whatsapp, currency,
    delivery_enabled, pickup_enabled, menu_enabled,
    name_ar, name_ku, name_en, whatsapp_number,
    is_open, orders_enabled, announcement_enabled,
    top_location_enabled, top_call_enabled, top_whatsapp_enabled,
    show_logo, show_subtitle, intro_enabled,
    background_video_enabled, delivery_info_enabled,
    show_footer_brand, show_footer_location, show_footer_phone, show_footer_socials,
    footer_location_enabled, footer_call_enabled, footer_whatsapp_enabled,
    instagram_enabled, facebook_enabled, tiktok_enabled, snapchat_enabled,
    custom_social_links, custom_top_actions, custom_footer_actions, ui_design_settings
  ) values (
    '', '', '', '', '', 'د.ع',
    false, false, false,
    '', '', '', '',
    false, false, false,
    false, false, false,
    false, false, false,
    false, false,
    false, false, false, false,
    false, false, false,
    false, false, false, false,
    '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '{}'::jsonb
  )
  returning id into v_settings_id;

  update restbr_private.restaurant_reset_challenges
  set used_at = now()
  where token = v_challenge.token;

  return jsonb_build_object(
    'ok', true,
    'database_reset', true,
    'backup_id', v_challenge.backup_id,
    'challenge_token', v_challenge.token,
    'deleted', jsonb_build_object(
      'order_items', v_deleted_order_items,
      'orders', v_deleted_orders,
      'menu_analytics_daily', v_deleted_analytics,
      'discounts', v_deleted_discounts,
      'product_options', v_deleted_options,
      'products', v_deleted_products,
      'categories', v_deleted_categories,
      'restaurant_settings', v_deleted_settings
    ),
    'new_settings_id', v_settings_id,
    'storage_pending', coalesce((v_challenge.expected_counts->>'storage_files')::bigint, 0),
    'protected_admin_users', coalesce((v_preview->'counts'->>'admin_users')::bigint, 0),
    'next_step', 'Delete menu-images through the Storage API, then verify zero storage files.'
  );
end;
$$;

revoke all on function public.restaurant_reset_execute(uuid, text) from public;
grant execute on function public.restaurant_reset_execute(uuid, text) to authenticated;

drop policy if exists restbr_menu_images_super_admin_delete on storage.objects;
create policy restbr_menu_images_super_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'menu-images'
  and (select public.current_admin_role()) = 'super_admin'
);

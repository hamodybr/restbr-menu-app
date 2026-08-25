drop policy if exists restbr_menu_images_super_admin_read on storage.objects;

create policy restbr_menu_images_super_admin_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'menu-images'
  and (select public.current_admin_role()) = 'super_admin'
);

-- Cleanup for the temporary manifest RPC used during 4B debugging.
drop function if exists public.restaurant_reset_storage_manifest();

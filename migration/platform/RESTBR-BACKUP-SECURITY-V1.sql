-- RESTBR BACKUP SECURITY V1
-- Backup/clear remain atomic RPCs but execute as the signed-in caller so the
-- normal restaurant RLS policies are always enforced on every affected row.
alter function public.owner_restore_restaurant_backup(uuid,jsonb,jsonb,jsonb,jsonb) security invoker;
alter function public.owner_clear_restaurant_menu(uuid) security invoker;

-- Allow authenticated dashboard users to query admin_users through RLS.
-- RLS still limits normal admins to their own row and allows Owner/Super Admin to view the full directory.
grant select on table public.admin_users to authenticated;

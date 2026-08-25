-- Edge Functions manage Auth users server-side. Keep these table privileges restricted to service_role.
grant select, insert, update, delete on table public.admin_users to service_role;

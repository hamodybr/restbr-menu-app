-- RESTBR security hardening for databases created from older revisions.
-- No-op when public.rls_auto_enable() does not exist.

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;

-- =====================================================
-- Rename generic objects to linkedin_ prefix so this schema can
-- safely share a Supabase project with other apps (e.g. fotofocinho).
-- Tables already carrying the linkedin_ prefix are untouched.
-- =====================================================

-- Tables (ALTER TABLE IF EXISTS is valid in PG)
alter table if exists public.users_meta rename to linkedin_users_meta;
alter table if exists public.payments rename to linkedin_payments;
alter table if exists public.sync_log rename to linkedin_sync_log;

-- Functions (ALTER FUNCTION has no IF EXISTS — guard with a DO block)
do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'handle_new_user'
  ) then
    alter function public.handle_new_user() rename to linkedin_handle_new_user;
  end if;

  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'user_active_plan'
  ) then
    alter function public.user_active_plan(uuid) rename to linkedin_user_active_plan;
  end if;
end $$;

-- Recreate the signup trigger with a prefixed name pointing at the renamed function.
-- (Trigger names on auth.users are global, so a generic name risks colliding with
-- other apps sharing this project.)
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists linkedin_on_auth_user_created on auth.users;
create trigger linkedin_on_auth_user_created
  after insert on auth.users
  for each row execute function public.linkedin_handle_new_user();

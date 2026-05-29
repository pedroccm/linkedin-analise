-- =====================================================
-- Fix: the signup trigger function still referenced the pre-rename
-- table name `users_meta`, which no longer exists after the prefix
-- migration. That made INSERTs into auth.users fail with
-- "Database error saving new user" — breaking ALL signups on the
-- shared database. Recreate the function body to target the renamed table.
-- =====================================================

create or replace function public.linkedin_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.linkedin_users_meta (user_id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

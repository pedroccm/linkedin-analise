-- Per-user language preference (overrides geo/cookie detection when set).
alter table public.linkedin_users_meta
  add column if not exists locale text check (locale in ('pt', 'en'));

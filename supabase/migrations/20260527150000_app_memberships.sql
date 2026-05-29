-- =====================================================
-- Multi-app identity model.
-- auth.users stays the single shared identity (SSO across products).
-- app_users records which product each identity actually uses, so each
-- app only "sees" its own members instead of every auth row.
-- =====================================================

create table if not exists public.app_users (
  user_id uuid not null references auth.users(id) on delete cascade,
  app text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, app)
);

create index if not exists app_users_app_idx on public.app_users (app);

alter table public.app_users enable row level security;

create policy "users see own memberships" on public.app_users
  for select using (user_id = auth.uid());
create policy "users create own memberships" on public.app_users
  for insert with check (user_id = auth.uid());

-- Let authenticated users self-provision their own LIA meta row (lazy creation
-- replaces the blanket signup trigger).
drop policy if exists "users create own meta" on public.linkedin_users_meta;
create policy "users create own meta" on public.linkedin_users_meta
  for insert with check (user_id = auth.uid());

-- Stop auto-joining every auth signup into LIA. Membership is created lazily on
-- first LIA use instead.
drop trigger if exists linkedin_on_auth_user_created on auth.users;

-- Clear the earlier blanket backfill: rows for users who aren't LIA members yet.
-- app_users is empty at this point, so this removes the non-LIA meta rows;
-- real users get a fresh row the first time they open the app.
delete from public.linkedin_users_meta m
where not exists (
  select 1 from public.app_users a
  where a.user_id = m.user_id and a.app = 'lia'
);

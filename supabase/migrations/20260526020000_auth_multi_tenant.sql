-- =====================================================
-- Auth + multi-tenancy
-- Each user only sees their own profiles. Open RLS removed.
-- users_meta holds credit balance for the managed-Apify model.
-- =====================================================

-- 1) Wipe legacy un-scoped data (test data, no real users yet)
truncate table public.linkedin_profile_reactions cascade;
truncate table public.linkedin_profile_comments cascade;
truncate table public.linkedin_posts cascade;
truncate table public.linkedin_profiles cascade;

-- 2) Add user_id with default = auth.uid() so app code doesn't have to set it
alter table public.linkedin_profiles
  add column user_id uuid not null default auth.uid()
  references auth.users(id) on delete cascade;

alter table public.linkedin_posts
  add column user_id uuid not null default auth.uid()
  references auth.users(id) on delete cascade;

alter table public.linkedin_profile_reactions
  add column user_id uuid not null default auth.uid()
  references auth.users(id) on delete cascade;

alter table public.linkedin_profile_comments
  add column user_id uuid not null default auth.uid()
  references auth.users(id) on delete cascade;

create index on public.linkedin_profiles (user_id);
create index on public.linkedin_posts (user_id);
create index on public.linkedin_profile_reactions (user_id);
create index on public.linkedin_profile_comments (user_id);

-- 3) profile_url unique PER USER (was unique globally — two users could track the same person)
alter table public.linkedin_profiles drop constraint linkedin_profiles_profile_url_key;
alter table public.linkedin_profiles
  add constraint linkedin_profiles_user_profile_url_unique unique (user_id, profile_url);

-- 4) Drop open RLS policies
drop policy if exists "anon can read profiles" on public.linkedin_profiles;
drop policy if exists "anon can write profiles" on public.linkedin_profiles;
drop policy if exists "anon can read posts" on public.linkedin_posts;
drop policy if exists "anon can write posts" on public.linkedin_posts;
drop policy if exists "anon can read reactions" on public.linkedin_profile_reactions;
drop policy if exists "anon can write reactions" on public.linkedin_profile_reactions;
drop policy if exists "anon can read comments" on public.linkedin_profile_comments;
drop policy if exists "anon can write comments" on public.linkedin_profile_comments;

-- 5) Per-user RLS
create policy "users own profiles" on public.linkedin_profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "users own posts" on public.linkedin_posts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "users own reactions" on public.linkedin_profile_reactions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "users own comments" on public.linkedin_profile_comments
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 6) users_meta — extends auth.users with credit balance for managed-Apify model
create table public.users_meta (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  credits_balance integer not null default 0,
  total_spent_cents integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users_meta enable row level security;

create policy "users own meta" on public.users_meta
  for select using (user_id = auth.uid());

create policy "users update own meta" on public.users_meta
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 7) Auto-create users_meta row on signup so the app always has somewhere to read credits from
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users_meta (user_id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 8) Credit ledger — audit trail of every credit change (purchase / spend / refund)
create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null,
  reason text not null,
  ref_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index credit_ledger_user_idx on public.credit_ledger (user_id, created_at desc);

alter table public.credit_ledger enable row level security;

create policy "users see own ledger" on public.credit_ledger
  for select using (user_id = auth.uid());

-- (insert into ledger happens via service-role server code only — no insert policy for anon/authenticated)

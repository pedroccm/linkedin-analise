-- =====================================================
-- LinkedIn Analysis initial schema
-- =====================================================

create extension if not exists "pgcrypto";

-- Profiles: a LinkedIn profile we want to track
create table public.linkedin_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_url text unique not null,
  handle text,
  full_name text,
  headline text,
  avatar_url text,
  notes text,
  last_synced_at timestamptz,
  posts_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index linkedin_profiles_created_at_idx
  on public.linkedin_profiles (created_at desc);

-- Posts: one row per LinkedIn post fetched from Apify
create table public.linkedin_posts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.linkedin_profiles(id) on delete cascade,
  apify_post_id text,
  post_url text,
  posted_at timestamptz,
  text_content text,
  post_type text,
  reactions_count integer default 0,
  comments_count integer default 0,
  reposts_count integer default 0,
  media_urls jsonb default '[]'::jsonb,
  raw jsonb,
  fetched_at timestamptz not null default now(),
  unique (profile_id, apify_post_id)
);

create index linkedin_posts_profile_idx
  on public.linkedin_posts (profile_id, posted_at desc);

-- No auth in this project: open RLS so the anon key can read/write directly.
alter table public.linkedin_profiles enable row level security;
alter table public.linkedin_posts enable row level security;

create policy "anon can read profiles" on public.linkedin_profiles
  for select using (true);
create policy "anon can write profiles" on public.linkedin_profiles
  for all using (true) with check (true);

create policy "anon can read posts" on public.linkedin_posts
  for select using (true);
create policy "anon can write posts" on public.linkedin_posts
  for all using (true) with check (true);

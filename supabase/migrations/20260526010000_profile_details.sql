-- =====================================================
-- Profile details + reactions + comments
-- =====================================================

-- Extra columns on linkedin_profiles
alter table public.linkedin_profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists about text,
  add column if not exists cover_url text,
  add column if not exists connections_count integer,
  add column if not exists followers_count integer,
  add column if not exists location_text text,
  add column if not exists location_city text,
  add column if not exists location_country text,
  add column if not exists location_country_code text,
  add column if not exists open_to_work boolean,
  add column if not exists hiring boolean,
  add column if not exists premium boolean,
  add column if not exists influencer boolean,
  add column if not exists creator boolean,
  add column if not exists verified boolean,
  add column if not exists details_synced_at timestamptz,
  add column if not exists reactions_synced_at timestamptz,
  add column if not exists comments_synced_at timestamptz,
  add column if not exists reactions_count_total integer not null default 0,
  add column if not exists comments_count_total integer not null default 0,
  add column if not exists raw_profile jsonb;

-- Reactions THIS profile gave to other posts
create table if not exists public.linkedin_profile_reactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.linkedin_profiles(id) on delete cascade,
  apify_reaction_id text,
  reaction_url text,
  action_text text,
  reacted_at timestamptz,
  post_id text,
  post_url text,
  post_content text,
  post_author_name text,
  post_author_url text,
  post_author_avatar text,
  post_posted_at timestamptz,
  post_likes integer default 0,
  post_comments integer default 0,
  post_shares integer default 0,
  raw jsonb,
  fetched_at timestamptz not null default now(),
  unique (profile_id, apify_reaction_id)
);

create index if not exists linkedin_profile_reactions_profile_idx
  on public.linkedin_profile_reactions (profile_id, reacted_at desc);

-- Comments THIS profile made on other posts
create table if not exists public.linkedin_profile_comments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.linkedin_profiles(id) on delete cascade,
  apify_comment_id text,
  comment_url text,
  commentary text,
  commented_at timestamptz,
  likes integer default 0,
  replies integer default 0,
  parent_post_id text,
  parent_post_url text,
  parent_post_content text,
  parent_post_author_name text,
  parent_post_author_url text,
  raw jsonb,
  fetched_at timestamptz not null default now(),
  unique (profile_id, apify_comment_id)
);

create index if not exists linkedin_profile_comments_profile_idx
  on public.linkedin_profile_comments (profile_id, commented_at desc);

-- RLS open (same pattern as posts)
alter table public.linkedin_profile_reactions enable row level security;
alter table public.linkedin_profile_comments enable row level security;

create policy "anon can read reactions" on public.linkedin_profile_reactions
  for select using (true);
create policy "anon can write reactions" on public.linkedin_profile_reactions
  for all using (true) with check (true);

create policy "anon can read comments" on public.linkedin_profile_comments
  for select using (true);
create policy "anon can write comments" on public.linkedin_profile_comments
  for all using (true) with check (true);

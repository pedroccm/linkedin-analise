-- =====================================================
-- User-defined tags for profiles (e.g. Prospect, Cliente, Concorrente)
-- =====================================================

create table if not exists public.linkedin_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists linkedin_tags_user_idx on public.linkedin_tags (user_id);

create table if not exists public.linkedin_profile_tags (
  profile_id uuid not null references public.linkedin_profiles(id) on delete cascade,
  tag_id uuid not null references public.linkedin_tags(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, tag_id)
);

create index if not exists linkedin_profile_tags_tag_idx on public.linkedin_profile_tags (tag_id);
create index if not exists linkedin_profile_tags_profile_idx on public.linkedin_profile_tags (profile_id);

alter table public.linkedin_tags enable row level security;
alter table public.linkedin_profile_tags enable row level security;

create policy "users own tags" on public.linkedin_tags
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "users own profile_tags" on public.linkedin_profile_tags
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

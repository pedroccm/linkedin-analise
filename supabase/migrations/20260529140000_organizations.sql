-- =====================================================
-- Organizations: corporate plan with shared data.
-- A member's "workspace" resolves to the org owner's user_id, so all org
-- members read/write the same data. Solo users are unaffected (their workspace
-- is just themselves), keeping this fully backward-compatible.
-- =====================================================

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.org_members (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index if not exists org_members_user_idx on public.org_members (user_id);

create table if not exists public.org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  token text not null unique,
  role text not null default 'member' check (role in ('admin', 'member')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now()
);

create index if not exists org_invites_org_idx on public.org_invites (org_id);

-- The set of user_ids whose data the current user can access:
-- themselves + the owner of any org they belong to.
create or replace function public.lia_workspace_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid()
  union
  select o.owner_id
  from public.org_members m
  join public.organizations o on o.id = m.org_id
  where m.user_id = auth.uid();
$$;

-- RLS for org tables
alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
alter table public.org_invites enable row level security;

-- Members can see their org(s); owner can see theirs.
create policy "see own orgs" on public.organizations
  for select using (
    owner_id = auth.uid()
    or id in (select org_id from public.org_members where user_id = auth.uid())
  );
create policy "owner manages org" on public.organizations
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "see own memberships" on public.org_members
  for select using (
    user_id = auth.uid()
    or org_id in (select id from public.organizations where owner_id = auth.uid())
  );
-- Inserts/removals of members happen via service-role in server actions.

create policy "owner sees invites" on public.org_invites
  for select using (
    org_id in (select id from public.organizations where owner_id = auth.uid())
  );

-- =====================================================
-- Widen data-table RLS from "own rows" to "workspace rows".
-- Equivalent to the old policy for solo users (workspace = self).
-- =====================================================

drop policy if exists "users own profiles" on public.linkedin_profiles;
create policy "workspace profiles" on public.linkedin_profiles
  for all using (user_id in (select public.lia_workspace_ids()))
  with check (user_id in (select public.lia_workspace_ids()));

drop policy if exists "users own posts" on public.linkedin_posts;
create policy "workspace posts" on public.linkedin_posts
  for all using (user_id in (select public.lia_workspace_ids()))
  with check (user_id in (select public.lia_workspace_ids()));

drop policy if exists "users own reactions" on public.linkedin_profile_reactions;
create policy "workspace reactions" on public.linkedin_profile_reactions
  for all using (user_id in (select public.lia_workspace_ids()))
  with check (user_id in (select public.lia_workspace_ids()));

drop policy if exists "users own comments" on public.linkedin_profile_comments;
create policy "workspace comments" on public.linkedin_profile_comments
  for all using (user_id in (select public.lia_workspace_ids()))
  with check (user_id in (select public.lia_workspace_ids()));

drop policy if exists "users own company employees" on public.linkedin_company_employees;
create policy "workspace company employees" on public.linkedin_company_employees
  for all using (user_id in (select public.lia_workspace_ids()))
  with check (user_id in (select public.lia_workspace_ids()));

drop policy if exists "users own tags" on public.linkedin_tags;
create policy "workspace tags" on public.linkedin_tags
  for all using (user_id in (select public.lia_workspace_ids()))
  with check (user_id in (select public.lia_workspace_ids()));

drop policy if exists "users own profile_tags" on public.linkedin_profile_tags;
create policy "workspace profile_tags" on public.linkedin_profile_tags
  for all using (user_id in (select public.lia_workspace_ids()))
  with check (user_id in (select public.lia_workspace_ids()));

-- =====================================================
-- Company support: track both /in/ (person) and /company/ profiles
-- Plus a separate table for company employees
-- =====================================================

-- 1) Discriminator column on linkedin_profiles
alter table public.linkedin_profiles
  add column if not exists profile_type text not null default 'person'
    check (profile_type in ('person', 'company'));

-- 2) Company-specific columns (all nullable, only used when profile_type = 'company')
alter table public.linkedin_profiles
  add column if not exists industry text,
  add column if not exists employee_count_range text,
  add column if not exists employee_count integer,
  add column if not exists founded_year integer,
  add column if not exists website text,
  add column if not exists tagline text,
  add column if not exists employees_synced_at timestamptz,
  add column if not exists employees_count_total integer not null default 0;

-- 3) Employees of companies we track
create table if not exists public.linkedin_company_employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  profile_id uuid not null references public.linkedin_profiles(id) on delete cascade,
  apify_employee_id text,
  linkedin_url text,
  public_identifier text,
  first_name text,
  last_name text,
  full_name text,
  headline text,
  position_title text,
  location_text text,
  picture_url text,
  raw jsonb,
  fetched_at timestamptz not null default now(),
  unique (profile_id, apify_employee_id)
);

create index if not exists linkedin_company_employees_profile_idx
  on public.linkedin_company_employees (profile_id);
create index if not exists linkedin_company_employees_user_idx
  on public.linkedin_company_employees (user_id);

alter table public.linkedin_company_employees enable row level security;

create policy "users own company employees" on public.linkedin_company_employees
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 4) Allow 'company_employees' in sync_log
alter table public.sync_log drop constraint if exists sync_log_sync_type_check;
alter table public.sync_log
  add constraint sync_log_sync_type_check
  check (sync_type in ('details_posts', 'reactions', 'comments', 'company_employees'));

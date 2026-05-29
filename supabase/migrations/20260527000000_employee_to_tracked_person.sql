-- =====================================================
-- Link a tracked person back to a company we already track
-- so the user can pick "this person works at <company>" or
-- promote an employee row into a tracked person.
-- =====================================================

alter table public.linkedin_profiles
  add column if not exists company_profile_id uuid
    references public.linkedin_profiles(id) on delete set null;

create index if not exists linkedin_profiles_company_idx
  on public.linkedin_profiles (company_profile_id)
  where company_profile_id is not null;

-- A "promoted_to_profile_id" reverse pointer on the employee row
-- so the UI can show ✓ Tracked instead of + Track when revisiting.
alter table public.linkedin_company_employees
  add column if not exists tracked_profile_id uuid
    references public.linkedin_profiles(id) on delete set null;

create index if not exists linkedin_company_employees_tracked_idx
  on public.linkedin_company_employees (tracked_profile_id)
  where tracked_profile_id is not null;

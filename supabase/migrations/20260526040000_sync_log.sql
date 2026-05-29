-- =====================================================
-- Sync activity log + per-sync cost tracking
-- Used by admin dashboard. Not exposed to regular users.
-- =====================================================

create table if not exists public.sync_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.linkedin_profiles(id) on delete set null,
  sync_type text not null check (sync_type in ('details_posts', 'reactions', 'comments')),
  items_returned integer not null default 0,
  cost_micro_usd integer not null default 0,
  created_at timestamptz not null default now()
);

create index sync_log_user_idx on public.sync_log (user_id, created_at desc);
create index sync_log_created_idx on public.sync_log (created_at desc);

-- Users can see their own sync_log entries; admin queries use service-role bypass.
alter table public.sync_log enable row level security;
create policy "users see own sync log" on public.sync_log
  for select using (user_id = auth.uid());

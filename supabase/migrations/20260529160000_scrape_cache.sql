-- =====================================================
-- Global scrape cache: one row per (canonical LinkedIn URL, sync type).
-- When any user syncs a profile, the raw Apify result is cached here. The next
-- user (in any workspace) reuses it within the TTL instead of paying Apify again.
-- Touched only via service-role in sync-core; RLS on with no policies.
-- =====================================================

create table if not exists public.linkedin_scrape_cache (
  canonical_url text not null,
  sync_type text not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (canonical_url, sync_type)
);

create index if not exists linkedin_scrape_cache_fetched_idx
  on public.linkedin_scrape_cache (fetched_at);

alter table public.linkedin_scrape_cache enable row level security;
-- No policies: regular clients can't read/write it; only service-role (sync-core).

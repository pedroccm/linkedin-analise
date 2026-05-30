-- =====================================================
-- Daily post monitoring (v1).
-- LIA only DETECTS new posts and ENQUEUES alert events; an external system
-- consumes linkedin_monitor_events and sends the WhatsApp message.
--   * per-profile toggle (shared within a workspace)
--   * one WhatsApp number per user (linkedin_users_meta.whatsapp)
--   * outbox table: one row per (new post, recipient)
-- =====================================================

alter table public.linkedin_profiles
  add column if not exists monitor_enabled boolean not null default false,
  add column if not exists last_monitored_post_id text,
  add column if not exists last_monitored_at timestamptz;

create index if not exists linkedin_profiles_monitor_idx
  on public.linkedin_profiles (monitor_enabled)
  where monitor_enabled;

alter table public.linkedin_users_meta
  add column if not exists whatsapp text;

-- Outbox of alert events. The external sender reads status='pending', sends the
-- WhatsApp message, then sets status='sent' (and sent_at).
create table if not exists public.linkedin_monitor_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.linkedin_profiles(id) on delete cascade,
  profile_name text,
  profile_url text,
  apify_post_id text,
  post_url text,
  post_excerpt text,
  posted_at timestamptz,
  recipient_user_id uuid,
  whatsapp text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  -- Idempotency: never enqueue the same post twice for the same recipient.
  unique (profile_id, apify_post_id, recipient_user_id)
);

create index if not exists linkedin_monitor_events_status_idx
  on public.linkedin_monitor_events (status, created_at);

alter table public.linkedin_monitor_events enable row level security;
-- No policies: only service-role (the cron engine) writes; the external sender
-- reads via service-role / a direct DB connection.

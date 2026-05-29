-- =====================================================
-- Swap from credits model to subscription model
-- Plans: free (1 profile), starter (5), pro (20)
-- Payment: one-shot PIX via AbacatePay, valid 30 days, manual renewal
-- =====================================================

-- Drop the unused credit ledger
drop table if exists public.credit_ledger;

-- Reshape users_meta
alter table public.users_meta
  drop column if exists credits_balance,
  drop column if exists total_spent_cents;

alter table public.users_meta
  add column if not exists plan_tier text not null default 'free'
    check (plan_tier in ('free', 'starter', 'pro')),
  add column if not exists subscription_until timestamptz,
  add column if not exists abacate_customer_id text;

-- Payments table — every PIX charge we create with AbacatePay
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_tier text not null check (plan_tier in ('starter', 'pro')),
  amount_cents integer not null,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'expired', 'cancelled', 'refunded')),
  abacate_pix_id text unique,
  abacate_br_code text,
  abacate_br_code_base64 text,
  pix_expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index payments_user_idx on public.payments (user_id, created_at desc);
create index payments_status_idx on public.payments (status);

alter table public.payments enable row level security;

create policy "users see own payments" on public.payments
  for select using (user_id = auth.uid());

-- Inserts/updates go through server code with service-role; no anon write policy.

-- Helper: is the user on an active paid plan right now?
create or replace function public.user_active_plan(uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when m.subscription_until is null or m.subscription_until < now() then 'free'
    else m.plan_tier
  end
  from public.users_meta m
  where m.user_id = uid;
$$;

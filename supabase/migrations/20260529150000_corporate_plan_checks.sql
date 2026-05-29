-- Allow the new 'corporate' plan tier in the existing check constraints.
alter table public.linkedin_users_meta drop constraint if exists users_meta_plan_tier_check;
alter table public.linkedin_users_meta drop constraint if exists linkedin_users_meta_plan_tier_check;
alter table public.linkedin_users_meta
  add constraint linkedin_users_meta_plan_tier_check
  check (plan_tier in ('free', 'starter', 'pro', 'corporate'));

alter table public.linkedin_payments drop constraint if exists payments_plan_tier_check;
alter table public.linkedin_payments drop constraint if exists linkedin_payments_plan_tier_check;
alter table public.linkedin_payments
  add constraint linkedin_payments_plan_tier_check
  check (plan_tier in ('starter', 'pro', 'corporate'));

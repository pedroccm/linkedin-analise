-- =====================================================
-- Backfill: ensure every existing auth.users row has a
-- linkedin_users_meta row. Users created before the signup
-- trigger existed (e.g. pre-existing accounts on a shared DB)
-- would otherwise crash getSubscriptionStatus()'s .single() call.
-- =====================================================

insert into public.linkedin_users_meta (user_id)
select id from auth.users
on conflict (user_id) do nothing;

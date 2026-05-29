-- Public bucket for self-hosted avatars/logos.
-- We download the LinkedIn image at sync time (while its token is valid) and
-- store it here, so the UI serves a stable URL that never expires.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Public read for objects in this bucket (uploads happen via service-role, which
-- bypasses RLS, so no insert policy is needed).
drop policy if exists "public read avatars" on storage.objects;
create policy "public read avatars" on storage.objects
  for select using (bucket_id = 'avatars');

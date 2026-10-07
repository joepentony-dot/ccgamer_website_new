-- Compact Member Hub: secure per-user avatar uploads.
-- Public bucket is used only for avatar delivery; authenticated writes are
-- restricted to the user's own UUID folder.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  2097152,
  array['image/webp','image/png','image/jpeg']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Members can read own profile avatars" on storage.objects;
drop policy if exists "Members can upload own profile avatars" on storage.objects;
drop policy if exists "Members can update own profile avatars" on storage.objects;
drop policy if exists "Members can delete own profile avatars" on storage.objects;

create policy "Members can read own profile avatars"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-avatars'
  and name = (select auth.uid()::text) || '/avatar.webp'
);

create policy "Members can upload own profile avatars"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-avatars'
  and name = (select auth.uid()::text) || '/avatar.webp'
);

create policy "Members can update own profile avatars"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-avatars'
  and name = (select auth.uid()::text) || '/avatar.webp'
)
with check (
  bucket_id = 'profile-avatars'
  and name = (select auth.uid()::text) || '/avatar.webp'
);

create policy "Members can delete own profile avatars"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-avatars'
  and name = (select auth.uid()::text) || '/avatar.webp'
);

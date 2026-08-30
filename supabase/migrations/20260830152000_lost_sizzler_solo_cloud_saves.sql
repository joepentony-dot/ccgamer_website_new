-- Lost Sizzler standard Solo cloud-save mirror.
-- One private row per authenticated account. Local browser saves remain the
-- gameplay fallback; this table stores only the validated r43 save envelope or
-- a deletion tombstone used to prevent old cloud saves being resurrected.

create table if not exists public.lost_sizzler_solo_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schema_name text not null default 'ccg-lost-sizzler-solo-save',
  schema_version smallint not null default 2,
  game_version text not null default 'V10.41',
  save_envelope jsonb,
  save_checksum text,
  save_saved_at timestamptz,
  client_revision_ms bigint not null default 0,
  deleted_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint lost_sizzler_solo_saves_schema_version_check check (schema_version > 0),
  constraint lost_sizzler_solo_saves_revision_check check (client_revision_ms >= 0),
  constraint lost_sizzler_solo_saves_payload_shape_check check (
    (deleted_at is null and save_envelope is not null and save_checksum is not null and save_saved_at is not null)
    or
    (deleted_at is not null and save_envelope is null and save_checksum is null and save_saved_at is null)
  ),
  constraint lost_sizzler_solo_saves_envelope_object_check check (
    save_envelope is null or jsonb_typeof(save_envelope) = 'object'
  ),
  constraint lost_sizzler_solo_saves_envelope_schema_check check (
    save_envelope is null or save_envelope ->> 'schema' = schema_name
  ),
  constraint lost_sizzler_solo_saves_envelope_version_check check (
    save_envelope is null or save_envelope ->> 'schemaVersion' = schema_version::text
  ),
  constraint lost_sizzler_solo_saves_envelope_checksum_check check (
    save_envelope is null or save_envelope ->> 'checksum' = save_checksum
  ),
  constraint lost_sizzler_solo_saves_envelope_size_check check (
    save_envelope is null or octet_length(save_envelope::text) <= 262144
  )
);

comment on table public.lost_sizzler_solo_saves is
  'Private per-account Lost Sizzler standard Solo floor-entry save mirror. RLS restricts every row to its owner.';

alter table public.lost_sizzler_solo_saves enable row level security;

revoke all on table public.lost_sizzler_solo_saves from anon;
revoke all on table public.lost_sizzler_solo_saves from authenticated;
grant select, insert, update, delete on table public.lost_sizzler_solo_saves to authenticated;

drop policy if exists "Lost Sizzler users read own Solo save" on public.lost_sizzler_solo_saves;
create policy "Lost Sizzler users read own Solo save"
on public.lost_sizzler_solo_saves
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Lost Sizzler users insert own Solo save" on public.lost_sizzler_solo_saves;
create policy "Lost Sizzler users insert own Solo save"
on public.lost_sizzler_solo_saves
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Lost Sizzler users update own Solo save" on public.lost_sizzler_solo_saves;
create policy "Lost Sizzler users update own Solo save"
on public.lost_sizzler_solo_saves
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Lost Sizzler users delete own Solo save" on public.lost_sizzler_solo_saves;
create policy "Lost Sizzler users delete own Solo save"
on public.lost_sizzler_solo_saves
for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.touch_lost_sizzler_solo_save_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists lost_sizzler_solo_saves_touch_updated_at on public.lost_sizzler_solo_saves;
create trigger lost_sizzler_solo_saves_touch_updated_at
before update on public.lost_sizzler_solo_saves
for each row execute function public.touch_lost_sizzler_solo_save_updated_at();

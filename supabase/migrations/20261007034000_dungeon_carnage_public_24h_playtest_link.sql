-- C64 Dungeon Carnage: one public YouTube playtest link with a 24-hour shared window.
-- The token itself is never stored in the repository or database; only its SHA-256 digest is stored.
-- The 24-hour clock begins on the first successful validation, so CI/deployment time does not
-- consume the public test window. Older public-link records are revoked when this pass is installed.

begin;

create table if not exists public.ccg_dungeon_carnage_public_playtest_links (
  id uuid primary key default extensions.gen_random_uuid(),
  token_hash text not null unique,
  label text not null,
  duration_seconds integer not null default 86400 check (duration_seconds between 300 and 604800),
  created_at timestamptz not null default pg_catalog.now(),
  activated_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz,
  validation_count bigint not null default 0
);

alter table public.ccg_dungeon_carnage_public_playtest_links enable row level security;
revoke all on public.ccg_dungeon_carnage_public_playtest_links from anon, authenticated;

-- Supersede any earlier public share-link pass. Owner/member access remains separately governed.
update public.ccg_dungeon_carnage_public_playtest_links
   set revoked_at = coalesce(revoked_at, pg_catalog.now())
 where revoked_at is null
   and token_hash <> 'e58935b17d99f5f44bbc1c8eb32a5b54976e4ccaa486c6f69df795cda8340f82';

insert into public.ccg_dungeon_carnage_public_playtest_links (
  token_hash,
  label,
  duration_seconds
)
values (
  'e58935b17d99f5f44bbc1c8eb32a5b54976e4ccaa486c6f69df795cda8340f82',
  'YouTube public playtest · 2026-10-07',
  86400
)
on conflict (token_hash) do update
  set label = excluded.label,
      duration_seconds = excluded.duration_seconds,
      revoked_at = null;

create or replace function public.ccg_validate_dungeon_carnage_public_playtest(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_hash text;
  v_link public.ccg_dungeon_carnage_public_playtest_links%rowtype;
begin
  if p_token is null or char_length(p_token) < 20 or char_length(p_token) > 256 then
    return pg_catalog.jsonb_build_object('allowed', false, 'reason', 'invalid_token');
  end if;

  v_hash := pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(p_token, 'UTF8'), 'sha256'),
    'hex'
  );

  select *
    into v_link
    from public.ccg_dungeon_carnage_public_playtest_links
   where token_hash = v_hash
   for update;

  if not found or v_link.revoked_at is not null then
    return pg_catalog.jsonb_build_object('allowed', false, 'reason', 'invalid_or_revoked');
  end if;

  if v_link.activated_at is null then
    update public.ccg_dungeon_carnage_public_playtest_links
       set activated_at = v_now,
           expires_at = v_now + pg_catalog.make_interval(secs => duration_seconds),
           last_used_at = v_now,
           validation_count = validation_count + 1
     where id = v_link.id
     returning * into v_link;
  elsif v_link.expires_at is not null and v_now < v_link.expires_at then
    update public.ccg_dungeon_carnage_public_playtest_links
       set last_used_at = v_now,
           validation_count = validation_count + 1
     where id = v_link.id
     returning * into v_link;
  end if;

  if v_link.expires_at is null or v_now >= v_link.expires_at then
    return pg_catalog.jsonb_build_object(
      'allowed', false,
      'reason', 'expired',
      'expires_at', v_link.expires_at
    );
  end if;

  return pg_catalog.jsonb_build_object(
    'allowed', true,
    'reason', 'public_24h_playtest',
    'activated_at', v_link.activated_at,
    'expires_at', v_link.expires_at
  );
end;
$function$;

revoke all on function public.ccg_validate_dungeon_carnage_public_playtest(text) from public;
grant execute on function public.ccg_validate_dungeon_carnage_public_playtest(text) to anon, authenticated;

comment on function public.ccg_validate_dungeon_carnage_public_playtest(text) is
  'Validates the current public C64 Dungeon Carnage share token. The shared 24-hour window begins on first successful validation and expires server-side.';

commit;

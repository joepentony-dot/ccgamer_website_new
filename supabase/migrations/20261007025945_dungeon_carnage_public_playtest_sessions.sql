-- C64 Dungeon Carnage: pseudonymous public playtest sessions and five-minute completion tracking.
-- Raw browser IDs and IP addresses are not stored. Browser IDs are hashed before persistence.

begin;

create table if not exists public.ccg_dungeon_carnage_public_playtest_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  playtest_link_id uuid not null references public.ccg_dungeon_carnage_public_playtest_links(id) on delete cascade,
  tester_hash text not null,
  first_started_at timestamptz not null default pg_catalog.clock_timestamp(),
  last_started_at timestamptz not null default pg_catalog.clock_timestamp(),
  start_count integer not null default 1 check (start_count >= 1),
  completed_at timestamptz,
  feedback_submitted_at timestamptz,
  feedback_count integer not null default 0 check (feedback_count >= 0),
  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  unique (playtest_link_id, tester_hash)
);

alter table public.ccg_dungeon_carnage_public_playtest_sessions enable row level security;
revoke all on table public.ccg_dungeon_carnage_public_playtest_sessions from anon, authenticated;

create index if not exists ccg_dungeon_public_playtest_sessions_link_started_idx
  on public.ccg_dungeon_carnage_public_playtest_sessions (playtest_link_id, first_started_at);

create or replace function public.ccg_register_dungeon_carnage_public_playtest_start(
  p_token text,
  p_tester_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_token_hash text;
  v_tester_hash text;
  v_link public.ccg_dungeon_carnage_public_playtest_links%rowtype;
  v_session public.ccg_dungeon_carnage_public_playtest_sessions%rowtype;
  v_session_expires_at timestamptz;
begin
  if p_token is null or char_length(p_token) < 20 or char_length(p_token) > 256 then
    return pg_catalog.jsonb_build_object('allowed', false, 'reason', 'invalid_token');
  end if;

  if p_tester_id is null
     or char_length(p_tester_id) < 16
     or char_length(p_tester_id) > 128
     or p_tester_id !~ '^[A-Za-z0-9._:-]+$' then
    return pg_catalog.jsonb_build_object('allowed', false, 'reason', 'invalid_tester');
  end if;

  v_token_hash := pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(p_token, 'UTF8'), 'sha256'),
    'hex'
  );
  v_tester_hash := pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(p_tester_id, 'UTF8'), 'sha256'),
    'hex'
  );

  select *
    into v_link
    from public.ccg_dungeon_carnage_public_playtest_links
   where token_hash = v_token_hash
     and revoked_at is null
   limit 1;

  if not found then
    return pg_catalog.jsonb_build_object('allowed', false, 'reason', 'invalid_or_revoked');
  end if;

  if v_link.activated_at is null
     or v_link.expires_at is null
     or v_now >= v_link.expires_at then
    return pg_catalog.jsonb_build_object(
      'allowed', false,
      'reason', 'expired',
      'public_expires_at', v_link.expires_at
    );
  end if;

  insert into public.ccg_dungeon_carnage_public_playtest_sessions (
    playtest_link_id,
    tester_hash,
    first_started_at,
    last_started_at,
    start_count
  )
  values (
    v_link.id,
    v_tester_hash,
    v_now,
    v_now,
    1
  )
  on conflict (playtest_link_id, tester_hash) do update
    set last_started_at = excluded.last_started_at,
        start_count = public.ccg_dungeon_carnage_public_playtest_sessions.start_count + 1
  returning * into v_session;

  v_session_expires_at := v_session.first_started_at + pg_catalog.make_interval(mins => 5);

  return pg_catalog.jsonb_build_object(
    'allowed', v_now < v_session_expires_at and v_now < v_link.expires_at,
    'reason', case
      when v_now >= v_link.expires_at then 'expired'
      when v_now >= v_session_expires_at then 'session_complete'
      else 'public_5m_playtest'
    end,
    'first_started_at', v_session.first_started_at,
    'session_expires_at', v_session_expires_at,
    'public_expires_at', v_link.expires_at,
    'start_count', v_session.start_count
  );
end;
$function$;

create or replace function public.ccg_complete_dungeon_carnage_public_playtest(
  p_token text,
  p_tester_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_token_hash text;
  v_tester_hash text;
  v_link_id uuid;
  v_first_started timestamptz;
  v_completed timestamptz;
begin
  if p_token is null or char_length(p_token) < 20 or char_length(p_token) > 256 then
    return pg_catalog.jsonb_build_object('recorded', false, 'reason', 'invalid_token');
  end if;
  if p_tester_id is null
     or char_length(p_tester_id) < 16
     or char_length(p_tester_id) > 128
     or p_tester_id !~ '^[A-Za-z0-9._:-]+$' then
    return pg_catalog.jsonb_build_object('recorded', false, 'reason', 'invalid_tester');
  end if;

  v_token_hash := pg_catalog.encode(extensions.digest(pg_catalog.convert_to(p_token, 'UTF8'), 'sha256'),'hex');
  v_tester_hash := pg_catalog.encode(extensions.digest(pg_catalog.convert_to(p_tester_id, 'UTF8'), 'sha256'),'hex');

  select id into v_link_id
    from public.ccg_dungeon_carnage_public_playtest_links
   where token_hash = v_token_hash
   limit 1;

  if v_link_id is null then
    return pg_catalog.jsonb_build_object('recorded', false, 'reason', 'invalid_token');
  end if;

  select first_started_at, completed_at
    into v_first_started, v_completed
    from public.ccg_dungeon_carnage_public_playtest_sessions
   where playtest_link_id = v_link_id
     and tester_hash = v_tester_hash
   limit 1;

  if v_first_started is null then
    return pg_catalog.jsonb_build_object('recorded', false, 'reason', 'session_not_found');
  end if;

  if v_now < v_first_started + pg_catalog.make_interval(mins => 5) then
    return pg_catalog.jsonb_build_object(
      'recorded', false,
      'reason', 'too_early',
      'session_expires_at', v_first_started + pg_catalog.make_interval(mins => 5)
    );
  end if;

  if v_completed is null then
    update public.ccg_dungeon_carnage_public_playtest_sessions
       set completed_at = v_now
     where playtest_link_id = v_link_id
       and tester_hash = v_tester_hash;
    v_completed := v_now;
  end if;

  return pg_catalog.jsonb_build_object('recorded', true,'completed_at',v_completed);
end;
$function$;

create or replace function public.ccg_mark_dungeon_carnage_public_playtest_feedback(
  p_token text,
  p_tester_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_token_hash text;
  v_tester_hash text;
  v_link_id uuid;
  v_feedback_count integer;
begin
  if p_token is null or char_length(p_token) < 20 or char_length(p_token) > 256 then
    return pg_catalog.jsonb_build_object('recorded', false, 'reason', 'invalid_token');
  end if;
  if p_tester_id is null
     or char_length(p_tester_id) < 16
     or char_length(p_tester_id) > 128
     or p_tester_id !~ '^[A-Za-z0-9._:-]+$' then
    return pg_catalog.jsonb_build_object('recorded', false, 'reason', 'invalid_tester');
  end if;

  v_token_hash := pg_catalog.encode(extensions.digest(pg_catalog.convert_to(p_token, 'UTF8'), 'sha256'),'hex');
  v_tester_hash := pg_catalog.encode(extensions.digest(pg_catalog.convert_to(p_tester_id, 'UTF8'), 'sha256'),'hex');

  select id into v_link_id
    from public.ccg_dungeon_carnage_public_playtest_links
   where token_hash = v_token_hash
   limit 1;

  if v_link_id is null then
    return pg_catalog.jsonb_build_object('recorded', false, 'reason', 'invalid_token');
  end if;

  update public.ccg_dungeon_carnage_public_playtest_sessions
     set feedback_submitted_at = coalesce(feedback_submitted_at, v_now),
         feedback_count = feedback_count + 1
   where playtest_link_id = v_link_id
     and tester_hash = v_tester_hash
  returning feedback_count into v_feedback_count;

  if v_feedback_count is null then
    return pg_catalog.jsonb_build_object('recorded', false, 'reason', 'session_not_found');
  end if;

  return pg_catalog.jsonb_build_object('recorded', true,'feedback_count',v_feedback_count);
end;
$function$;

revoke all on function public.ccg_register_dungeon_carnage_public_playtest_start(text, text) from public;
revoke all on function public.ccg_complete_dungeon_carnage_public_playtest(text, text) from public;
revoke all on function public.ccg_mark_dungeon_carnage_public_playtest_feedback(text, text) from public;
grant execute on function public.ccg_register_dungeon_carnage_public_playtest_start(text, text) to anon, authenticated;
grant execute on function public.ccg_complete_dungeon_carnage_public_playtest(text, text) to anon, authenticated;
grant execute on function public.ccg_mark_dungeon_carnage_public_playtest_feedback(text, text) to anon, authenticated;

comment on table public.ccg_dungeon_carnage_public_playtest_sessions is
  'Pseudonymous per-browser public playtest sessions for C64 Dungeon Carnage. No IP address or raw browser identifier is stored.';
comment on function public.ccg_register_dungeon_carnage_public_playtest_start(text, text) is
  'Registers a token-validated public tester when actual gameplay begins and enforces the tester five-minute session deadline server-side.';
comment on function public.ccg_complete_dungeon_carnage_public_playtest(text, text) is
  'Marks a public tester session complete only after its server-side five-minute gameplay window has elapsed.';
comment on function public.ccg_mark_dungeon_carnage_public_playtest_feedback(text, text) is
  'Counts successful feedback deliveries for a previously registered public tester session.';

commit;

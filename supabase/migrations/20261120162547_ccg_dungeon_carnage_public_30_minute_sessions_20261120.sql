-- Dungeon Carnage: replace the original five-minute per-browser playtest window with thirty minutes.
-- Preserve the separate 24-hour public invitation window, hashed tokens and tester identity,
-- and existing SECURITY DEFINER/search_path safeguards. No existing user data is modified.

begin;

CREATE OR REPLACE FUNCTION public.ccg_complete_dungeon_carnage_public_playtest(p_token text, p_tester_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

  v_token_hash := pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(p_token, 'UTF8'), 'sha256'),
    'hex'
  );
  v_tester_hash := pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(p_tester_id, 'UTF8'), 'sha256'),
    'hex'
  );

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

  if v_now < v_first_started + pg_catalog.make_interval(mins => 30) then
    return pg_catalog.jsonb_build_object(
      'recorded', false,
      'reason', 'too_early',
      'session_expires_at', v_first_started + pg_catalog.make_interval(mins => 30)
    );
  end if;

  if v_completed is null then
    update public.ccg_dungeon_carnage_public_playtest_sessions
       set completed_at = v_now
     where playtest_link_id = v_link_id
       and tester_hash = v_tester_hash;
    v_completed := v_now;
  end if;

  return pg_catalog.jsonb_build_object(
    'recorded', true,
    'completed_at', v_completed
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.ccg_register_dungeon_carnage_public_playtest_start(p_token text, p_tester_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

  v_session_expires_at := v_session.first_started_at + pg_catalog.make_interval(mins => 30);

  return pg_catalog.jsonb_build_object(
    'allowed', v_now < v_session_expires_at and v_now < v_link.expires_at,
    'reason', case
      when v_now >= v_link.expires_at then 'expired'
      when v_now >= v_session_expires_at then 'session_complete'
      else 'public_30m_playtest'
    end,
    'first_started_at', v_session.first_started_at,
    'session_expires_at', v_session_expires_at,
    'public_expires_at', v_link.expires_at,
    'start_count', v_session.start_count
  );
end;
$function$;

commit;

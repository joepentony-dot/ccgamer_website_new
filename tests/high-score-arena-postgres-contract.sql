-- Ephemeral PostgreSQL 17 contract for crossfire-arena-schema-candidate.sql.
-- Must run only against a throwaway GitHub Actions service database.
-- This deliberately makes no changes to the live CCG Supabase project.

-- Supabase-mocked auth.users is installed by the workflow.
do $$
declare n integer;
begin
  select count(*) into n
  from pg_class c join pg_namespace s on s.oid=c.relnamespace
  where s.nspname='public'
    and c.relname in (
      'ccg_arena_games','ccg_arena_challenges','ccg_arena_attempts',
      'ccg_arena_personal_bests','ccg_arena_alltime_public',
      'ccg_arena_challenge_bests','ccg_arena_challenge_public')
    and c.relrowsecurity;
  if n <> 7 then raise exception 'All 7 Arena tables must enforce RLS, saw %',n; end if;

  select count(*) into n from information_schema.columns
  where table_schema='public'
    and table_name in ('ccg_arena_alltime_public','ccg_arena_challenge_public')
    and column_name in ('user_id','email','nonce_sha256','private_review_note');
  if n <> 0 then raise exception 'Public projection exposed sensitive columns'; end if;

  if exists (
    select 1 from information_schema.role_table_grants
    where grantee in ('anon','authenticated')
      and table_schema='public'
      and table_name like 'ccg_arena_%'
      and privilege_type not in ('SELECT')
  ) then raise exception 'Public roles have an Arena write privilege'; end if;

  if exists (
    select 1 from information_schema.role_table_grants
    where grantee in ('anon','authenticated')
      and table_schema='public'
      and table_name in ('ccg_arena_attempts','ccg_arena_personal_bests',
        'ccg_arena_challenge_bests')
  ) then raise exception 'Private Arena records were granted to browser roles'; end if;

  if (select count(*) from public.ccg_arena_games
      where game_key='c64-crossfire-atlantis'
      and status='pilot'
      and media_entry_id='archive-02121'
      and media_sha256='ddc3ab84c98fc065fd39e69bfe68b7ee6de38ebab4b51b607bbcea64cad570a9') <> 1
  then raise exception 'Exact Crossfire media must remain pilot-only'; end if;
end
$$;

insert into auth.users (id)
values ('11111111-1111-4111-8111-111111111111');

insert into public.ccg_arena_challenges
  (id,game_key,slug,title,status,start_at,end_at,rules_version)
values
  ('44444444-4444-4444-8444-444444444444',
   'c64-crossfire-atlantis','crossfire-weekly-test',
   'Crossfire Test Challenge','draft',now()-interval '1 day',now()+interval '6 days',1);

insert into public.ccg_arena_attempts
  (id,game_key,user_id,nonce_sha256,media_sha256,rules_version,
   status,claimed_score,started_at,finished_at,reviewed_at)
values
  ('22222222-2222-4222-8222-222222222222',
   'c64-crossfire-atlantis','11111111-1111-4111-8111-111111111111',
   repeat('a',64),'ddc3ab84c98fc065fd39e69bfe68b7ee6de38ebab4b51b607bbcea64cad570a9',
   1,'approved',775,now()-interval '5 minutes',
   now()-interval '2 minutes',now()-interval '1 minute');

insert into public.ccg_arena_personal_bests
  (id,game_key,user_id,attempt_id,score,achieved_at)
values
  ('33333333-3333-4333-8333-333333333333',
   'c64-crossfire-atlantis','11111111-1111-4111-8111-111111111111',
   '22222222-2222-4222-8222-222222222222',775,now()-interval '2 minutes');

insert into public.ccg_arena_alltime_public
  (record_id,game_key,player_name,score,achieved_at)
values
  ('33333333-3333-4333-8333-333333333333',
   'c64-crossfire-atlantis','Test Player',775,now()-interval '2 minutes');

insert into public.ccg_arena_challenge_bests
  (id,challenge_id,game_key,user_id,attempt_id,score,achieved_at)
values
  ('55555555-5555-4555-8555-555555555555',
   '44444444-4444-4444-8444-444444444444','c64-crossfire-atlantis',
   '11111111-1111-4111-8111-111111111111',
   '22222222-2222-4222-8222-222222222222',775,now()-interval '2 minutes');

insert into public.ccg_arena_challenge_public
  (best_id,challenge_id,game_key,player_name,score,achieved_at)
values
  ('55555555-5555-4555-8555-555555555555',
   '44444444-4444-4444-8444-444444444444','c64-crossfire-atlantis',
   'Test Player',775,now()-interval '2 minutes');

-- One currently running attempt per account, with a database uniqueness
-- guarantee. A submitted attempt does NOT automatically become a leaderboard
-- record, even when its score is within the accepted bounds.
do $$
declare n integer;
begin
 select count(*) into n from pg_index i
 join pg_class x on x.oid=i.indexrelid
 join pg_namespace s on s.oid=x.relnamespace
 where s.nspname='public'
   and x.relname='ccg_arena_one_active_attempt_per_user_idx'
   and i.indisunique and i.indpred is not null;
 if n<>1 then raise exception 'Missing unique active user attempt index'; end if;
end $$;
insert into public.ccg_arena_attempts
 (id,game_key,user_id,nonce_sha256,media_sha256,rules_version,status)
values
 ('66666666-6666-4666-8666-666666666666','c64-crossfire-atlantis',
  '11111111-1111-4111-8111-111111111111',repeat('b',64),
  'ddc3ab84c98fc065fd39e69bfe68b7ee6de38ebab4b51b607bbcea64cad570a9',
  1,'started');

do $$
begin
  begin
    insert into public.ccg_arena_attempts
      (id,game_key,user_id,nonce_sha256,media_sha256,rules_version,status)
    values
      ('77777777-7777-4777-8777-777777777777','c64-crossfire-atlantis',
       '11111111-1111-4111-8111-111111111111',repeat('c',64),
       'ddc3ab84c98fc065fd39e69bfe68b7ee6de38ebab4b51b607bbcea64cad570a9',
       1,'started');
    raise exception 'Multiple active runs allowed for same user';
  exception when unique_violation then null;
  end;
end $$;

update public.ccg_arena_attempts set status='expired'
 where id='66666666-6666-4666-8666-666666666666';
insert into public.ccg_arena_attempts
 (id,game_key,user_id,nonce_sha256,media_sha256,rules_version,status)
values
 ('77777777-7777-4777-8777-777777777777','c64-crossfire-atlantis',
  '11111111-1111-4111-8111-111111111111',repeat('c',64),
  'ddc3ab84c98fc065fd39e69bfe68b7ee6de38ebab4b51b607bbcea64cad570a9',
  1,'started');
update public.ccg_arena_attempts set status='submitted',
  claimed_score=2325,finished_at=now()
 where id='77777777-7777-4777-8777-777777777777';
do $$
begin
  if exists(select 1 from public.ccg_arena_alltime_public
    where score=2325) then
    raise exception 'Submitted unreviewed scores leaked to public rankings';
  end if;
end $$;

set role anon;
do $$
begin
  if (select count(*) from public.ccg_arena_games) <> 0 or
     (select count(*) from public.ccg_arena_challenges) <> 0 or
     (select count(*) from public.ccg_arena_alltime_public) <> 0 or
     (select count(*) from public.ccg_arena_challenge_public) <> 0 then
    raise exception 'Pilot data leaked to anonymous visitors';
  end if;
  begin
    perform 1 from public.ccg_arena_attempts;
    raise exception 'Anonymous visitor read private attempt data';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.ccg_arena_games (game_key) values ('fake');
    raise exception 'Anonymous visitor was allowed a game write';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

set role authenticated;
do $$
begin
  if (select count(*) from public.ccg_arena_alltime_public) <> 0 then
    raise exception 'Pilot bests leaked to members';
  end if;
  begin
    perform 1 from public.ccg_arena_personal_bests;
    raise exception 'Member read another user personal best';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.ccg_arena_alltime_public (record_id)
      values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    raise exception 'Member was allowed to forge public rankings';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Test publication separately: no player-facing result until game is active,
-- and no challenge results while the challenge remains draft.
update public.ccg_arena_games set status='active'
 where game_key='c64-crossfire-atlantis';

set role anon;
do $$
begin
  if (select count(*) from public.ccg_arena_games) <> 1 or
     (select count(*) from public.ccg_arena_alltime_public) <> 1 then
    raise exception 'Published all-time read projection unavailable';
  end if;
  if (select count(*) from public.ccg_arena_challenges) <> 0 or
     (select count(*) from public.ccg_arena_challenge_public) <> 0 then
    raise exception 'Draft challenge leaked before publication';
  end if;
end $$;
reset role;

update public.ccg_arena_challenges set status='published'
 where id='44444444-4444-4444-8444-444444444444';

set role anon;
do $$
begin
  if (select count(*) from public.ccg_arena_challenges) <> 1 or
     (select count(*) from public.ccg_arena_challenge_public) <> 1 then
    raise exception 'Published challenge records unavailable';
  end if;
end $$;
reset role;

-- Retiring the game hides both permanent and challenge records in the API.
update public.ccg_arena_games set status='retired'
 where game_key='c64-crossfire-atlantis';
set role authenticated;
do $$
begin
  if (select count(*) from public.ccg_arena_games) <> 0 or
     (select count(*) from public.ccg_arena_alltime_public) <> 0 or
     (select count(*) from public.ccg_arena_challenge_public) <> 0 then
    raise exception 'Retired game results still exposed';
  end if;
end $$;
reset role;
select 'CCG Crossfire Arena contract: RLS / private attempts / public projections / publication gates PASS' as result;

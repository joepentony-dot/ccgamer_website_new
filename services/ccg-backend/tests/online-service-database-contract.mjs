import assert from 'node:assert/strict';
import { createDatabase } from '../src/db.mjs';
import { createWeeklyVaultService, weekStartUtc } from '../src/weekly-vault.mjs';

const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!databaseUrl) throw new Error('DATABASE_URL is required for the online-service database contract.');

const database = createDatabase(databaseUrl);
try {
  for (const tableName of [
    'ccq_weekly_leaderboard',
    'ccq_weekly_result_deliveries',
    'game_feedback',
    'game_feedback_replies',
    'game_play_events',
    'lost_sizzler_request_buckets',
  ]) {
    const exists = await database.query(
      `select exists(
         select 1 from information_schema.tables
          where table_schema = 'public' and table_name = $1
       ) as present`,
      [tableName]
    );
    assert.equal(exists.rows[0].present, true, `Missing source-compatible service table: ${tableName}`);
  }

  const userId = 'online-service-contract-user';
  await database.query(
    `insert into ccg_users (user_id) values ($1) on conflict (user_id) do nothing`,
    [userId]
  );

  const attempt = await database.query(
    `insert into ccq_weekly_attempts
      (week_start, user_id, player_name, seed, status, finished_at, score, deepest_floor, duration_ms, level, completed, stats, ghost_path)
     values (date '2026-09-07', $1, 'Online Contract Player', 'CCQ-WEEKLY-20260907', 'finished', now(), 45678, 5, 180000, 8, true, '{"kills":12}'::jsonb, '[]'::jsonb)
     returning id`,
    [userId]
  );
  const attemptId = attempt.rows[0].id;

  await database.query(
    `insert into ccq_weekly_leaderboard
      (attempt_id, week_start, player_name, score, deepest_floor, duration_ms, level, completed)
     values ($1, date '2026-09-07', 'Online Contract Player', 45678, 5, 180000, 8, true)`,
    [attemptId]
  );
  await assert.rejects(
    database.query(
      `insert into ccq_weekly_leaderboard
        (attempt_id, week_start, player_name, score, deepest_floor, duration_ms, level, completed)
       values ($1, date '2026-09-07', 'Duplicate', 1, 1, 1, 1, false)`,
      [attemptId]
    ),
    (error) => error?.code === '23505'
  );

  await database.query(
    `insert into ccq_weekly_result_deliveries
      (week_start, status, emailed, email_failed, discord_sent, completed_at)
     values (date '2026-09-07', 'completed', 3, 0, true, now())`
  );

  const feedback = await database.query(
    `insert into game_feedback
      (feedback_type, message, contact_email, page_url, build, user_agent, email_status)
     values ('bug', 'Contract feedback message', 'player@example.test', 'https://www.cheekycommodoregamer.co.uk/arcade/lost-sizzler/', 'V10.41', 'contract-agent', 'pending')
     returning id`,
  );
  const feedbackId = feedback.rows[0].id;
  await database.query(
    `insert into game_feedback_replies
      (feedback_id, admin_user_id, reply_text, recipient_email, email_status)
     values ($1, $2, 'Contract reply', 'player@example.test', 'pending')`,
    [feedbackId, userId]
  );

  await database.query(
    `insert into game_play_events
      (event_type, player_name, play_mode, device_type, rating, session_token, auth_user_id, build, page_url, user_agent, metadata)
     values ('rating_submitted', 'Online Contract Player', 'solo', 'desktop', 5, 'opaque-contract-session', $1, 'V10.41', 'https://www.cheekycommodoregamer.co.uk/arcade/lost-sizzler/', 'contract-agent', '{"floor":5}'::jsonb)`,
    [userId]
  );

  await database.query(
    `insert into lost_sizzler_request_buckets
      (bucket_key, request_count)
     values ('weekly:read:0123456789abcdef01234567', 1)`
  );

  const counts = await database.query(
    `select
       (select count(*) from ccq_weekly_leaderboard where attempt_id = $1)::int as leaderboard,
       (select count(*) from ccq_weekly_result_deliveries where week_start = date '2026-09-07')::int as deliveries,
       (select count(*) from game_feedback where id = $2)::int as feedback,
       (select count(*) from game_feedback_replies where feedback_id = $2)::int as replies,
       (select count(*) from game_play_events where auth_user_id = $3 and event_type = 'rating_submitted')::int as events,
       (select count(*) from lost_sizzler_request_buckets where bucket_key = 'weekly:read:0123456789abcdef01234567')::int as buckets`,
    [attemptId, feedbackId, userId]
  );
  assert.deepEqual(counts.rows[0], {
    leaderboard: 1,
    deliveries: 1,
    feedback: 1,
    replies: 1,
    events: 1,
    buckets: 1,
  });

  await assert.rejects(
    database.query(
      `insert into game_play_events (event_type, rating) values ('rating_submitted', 6)`
    ),
    (error) => error?.code === '23514'
  );
  await assert.rejects(
    database.query(
      `insert into game_feedback (feedback_type, message) values ('bug', 'short')`
    ),
    (error) => error?.code === '23514'
  );
  await assert.rejects(
    database.query(
      `insert into lost_sizzler_request_buckets (bucket_key) values ($1)`,
      ['x'.repeat(161)]
    ),
    (error) => error?.code === '23514'
  );

  let weeklyNowMs = Date.UTC(2035, 4, 9, 12, 0, 0);
  const weeklyUserA = 'weekly-service-contract-user-a';
  const weeklyUserB = 'weekly-service-contract-user-b';
  const weeklyWeekStart = weekStartUtc(weeklyNowMs);
  await database.query(
    `insert into ccg_users (user_id) values ($1), ($2)
     on conflict (user_id) do nothing`,
    [weeklyUserA, weeklyUserB]
  );
  await database.query(
    `insert into ccg_profiles (user_id, username, display_name, banned)
     values ($1, 'weekly-alpha', 'Weekly Alpha', false),
            ($2, 'weekly-bravo', 'Weekly Bravo', false)
     on conflict (user_id) do update
       set username = excluded.username,
           display_name = excluded.display_name,
           banned = false`,
    [weeklyUserA, weeklyUserB]
  );

  const weeklyVault = createWeeklyVaultService({
    database,
    now: () => weeklyNowMs,
    readLimit: 20,
    startLimit: 10,
    finishLimit: 20,
  });

  const anonymousWeekly = await weeklyVault.status({ fingerprint: 'weekly-anonymous-contract' });
  assert.equal(anonymousWeekly.weekStart, weeklyWeekStart);
  assert.equal(anonymousWeekly.signedIn, false);
  assert.equal(anonymousWeekly.locked, false);

  const beforeWeekly = await weeklyVault.status({ userId: weeklyUserA, fingerprint: 'weekly-alpha-before' });
  assert.equal(beforeWeekly.signedIn, true);
  assert.equal(beforeWeekly.locked, false);
  assert.equal(beforeWeekly.playerName, 'weekly-alpha');

  const startedA = await weeklyVault.start({ userId: weeklyUserA, fingerprint: 'weekly-alpha-start' });
  assert.equal(startedA.locked, true);
  assert.match(startedA.attempt.id, /^[0-9a-f-]{36}$/i);
  await assert.rejects(
    weeklyVault.start({ userId: weeklyUserA, fingerprint: 'weekly-alpha-start-again' }),
    (error) => error?.statusCode === 409 && error?.code === 'weekly_attempt_already_used'
  );

  weeklyNowMs += 180_000;
  await assert.rejects(
    weeklyVault.finish({
      userId: weeklyUserA,
      attemptId: startedA.attempt.id,
      fingerprint: 'weekly-alpha-invalid-finish',
      result: { completed: true, deepestFloor: 4, durationMs: 120_000 },
    }),
    (error) => error?.statusCode === 422 && error?.code === 'weekly_completed_floor_mismatch'
  );

  const finishedA = await weeklyVault.finish({
    userId: weeklyUserA,
    attemptId: startedA.attempt.id,
    fingerprint: 'weekly-alpha-finish',
    result: {
      score: 25_000,
      deepestFloor: 3,
      durationMs: 120_000,
      level: 6,
      completed: false,
      kills: 22,
      secrets: 3,
      ghostPath: [
        { f: 1, x: 20, y: 20, t: 0 },
        { f: 2, x: 40, y: 40, t: 60_000 },
        { f: 3, x: 60, y: 60, t: 119_000 },
      ],
    },
  });
  assert.equal(finishedA.idempotent, false);

  const retryA = await weeklyVault.finish({
    userId: weeklyUserA,
    attemptId: startedA.attempt.id,
    fingerprint: 'weekly-alpha-retry',
    result: { completed: true, deepestFloor: 1, durationMs: 1 },
  });
  assert.equal(retryA.idempotent, true, 'Repeated finish must return the persisted result instead of rewriting it.');

  const startedB = await weeklyVault.start({ userId: weeklyUserB, fingerprint: 'weekly-bravo-start' });
  weeklyNowMs += 180_000;
  const finishedB = await weeklyVault.finish({
    userId: weeklyUserB,
    attemptId: startedB.attempt.id,
    fingerprint: 'weekly-bravo-finish',
    result: {
      score: 40_000,
      deepestFloor: 4,
      durationMs: 150_000,
      level: 8,
      completed: false,
      kills: 30,
      secrets: 4,
      ghostPath: [
        { f: 1, x: 10, y: 10, t: 0 },
        { f: 2, x: 30, y: 30, t: 50_000 },
        { f: 4, x: 70, y: 70, t: 149_000 },
      ],
    },
  });
  assert.equal(finishedB.idempotent, false);

  const afterWeekly = await weeklyVault.status({ userId: weeklyUserA, fingerprint: 'weekly-alpha-after' });
  assert.equal(afterWeekly.locked, true);
  assert.equal(afterWeekly.leaderboard.length, 2);
  assert.equal(afterWeekly.leaderboard[0].player_name, 'weekly-bravo');
  assert.equal(afterWeekly.leaderboard[1].player_name, 'weekly-alpha');
  assert.equal(afterWeekly.ghostReplay.playerName, 'weekly-bravo');

  const weeklyGhost = await weeklyVault.ghost({ userId: weeklyUserA, fingerprint: 'weekly-alpha-ghost' });
  assert.equal(weeklyGhost.ghost.playerName, 'weekly-bravo');

  const weeklyCounts = await database.query(
    `select
       (select count(*) from ccq_weekly_attempts where week_start = $1 and user_id in ($2, $3))::int as attempts,
       (select count(*) from ccq_weekly_leaderboard where week_start = $1 and player_name in ('weekly-alpha', 'weekly-bravo'))::int as leaderboard_rows`,
    [weeklyWeekStart, weeklyUserA, weeklyUserB]
  );
  assert.deepEqual(weeklyCounts.rows[0], { attempts: 2, leaderboard_rows: 2 });

  const rateLimitedWeeklyVault = createWeeklyVaultService({
    database,
    now: () => weeklyNowMs,
    readLimit: 1,
    readWindowSeconds: 300,
  });
  await rateLimitedWeeklyVault.status({ fingerprint: 'weekly-rate-limit-contract' });
  await assert.rejects(
    rateLimitedWeeklyVault.status({ fingerprint: 'weekly-rate-limit-contract' }),
    (error) => error?.statusCode === 429 && error?.code === 'weekly_rate_limited' && error?.retryAfterSeconds > 0
  );

  console.log('CCG online-service PostgreSQL contract passed: source-compatible service tables plus the CCG Weekly Vault one-attempt lock, result integrity, idempotent finish, leaderboard projection, ghost selection and request budgets work without Supabase.');
} finally {
  await database.close();
}

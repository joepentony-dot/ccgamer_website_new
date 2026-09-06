import assert from 'node:assert/strict';
import { createDatabase } from '../src/db.mjs';

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

  console.log('CCG online-service PostgreSQL contract passed: Weekly Vault projections/deliveries, feedback/replies, telemetry/rating history and one-way request-budget state are source-compatible and constraint-checked.');
} finally {
  await database.close();
}

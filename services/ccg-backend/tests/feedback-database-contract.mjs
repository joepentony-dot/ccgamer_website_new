import assert from 'node:assert/strict';
import { createDatabase } from '../src/db.mjs';
import {
  createLostSizzlerFeedbackService,
  requestFingerprintValue,
} from '../src/lost-sizzler-feedback.mjs';

const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!databaseUrl) throw new Error('DATABASE_URL is required for the feedback database contract.');

const database = createDatabase(databaseUrl);
const fixedNow = Date.parse('2036-02-04T12:00:00.000Z');
const service = createLostSizzlerFeedbackService({
  database,
  now: () => fixedNow,
  random: () => 1,
  email: {},
});

try {
  const userId = 'feedback-contract-user';
  await database.query(
    `insert into ccg_users (user_id) values ($1) on conflict (user_id) do nothing`,
    [userId]
  );

  const anonymousStatus = await service.ratingStatus({
    authUserId: null,
    fingerprint: 'feedback-contract-anonymous-status',
  });
  assert.deepEqual(anonymousStatus, {
    success: true,
    authenticated: false,
    rated: false,
  });

  const beforeRating = await service.ratingStatus({
    authUserId: userId,
    fingerprint: 'feedback-contract-user-status',
  });
  assert.equal(beforeRating.authenticated, true);
  assert.equal(beforeRating.rated, false);

  const rating = await service.recordTelemetry({
    authUserId: userId,
    fingerprint: 'feedback-contract-rating',
    userAgent: 'feedback-contract-agent',
    payload: {
      action: 'telemetry',
      event_type: 'rating_submitted',
      rating: 5,
      player_name: 'Contract Player',
      play_mode: 'solo',
      device_type: 'desktop',
      session_token: 'feedback-contract-session',
      build: 'V10.41',
      page_url: 'https://www.cheekycommodoregamer.co.uk/arcade/lost-sizzler/',
      metadata: { floor: 3, ignored: 'not-stored' },
    },
  });
  assert.equal(rating.success, true);
  assert.ok(Number(rating.id) > 0);

  const afterRating = await service.ratingStatus({
    authUserId: userId,
    fingerprint: 'feedback-contract-user-status',
  });
  assert.equal(afterRating.rated, true);

  const clientError = await service.recordTelemetry({
    fingerprint: 'feedback-contract-client-error',
    userAgent: 'feedback-contract-error-agent',
    payload: {
      event_type: 'client_error',
      device_type: 'invalid-device',
      metadata: {
        error_kind: 'TypeError',
        error_message: 'Contract error',
        error_fingerprint: 'contract_error-123',
        source: 'game-main.js',
        line: 77,
        column: 4,
        score: 1200,
        ignored: 'discard-me',
      },
    },
  });
  assert.equal(clientError.success, true);

  const storedError = await database.query(
    `select device_type, rating, auth_user_id, metadata
       from game_play_events
      where id = $1`,
    [clientError.id]
  );
  assert.equal(storedError.rows[0].device_type, 'unknown');
  assert.equal(storedError.rows[0].rating, null);
  assert.equal(storedError.rows[0].auth_user_id, null);
  assert.deepEqual(storedError.rows[0].metadata, {
    score: 1200,
    error_kind: 'typeerror',
    error_message: 'Contract error',
    error_fingerprint: 'contract_error-123',
    source: 'game-main.js',
    line: 77,
    column: 4,
  });

  await assert.rejects(
    service.recordTelemetry({
      fingerprint: 'feedback-contract-invalid-rating',
      payload: { event_type: 'rating_submitted', rating: 6 },
    }),
    (error) => error?.statusCode === 400 && error?.code === 'invalid_rating'
  );
  await assert.rejects(
    service.recordTelemetry({
      fingerprint: 'feedback-contract-invalid-error',
      payload: { event_type: 'client_error', metadata: {} },
    }),
    (error) => error?.statusCode === 400 && error?.code === 'client_error_fingerprint_required'
  );

  const honeypotBefore = await database.query(
    `select count(*)::int as count
       from game_feedback
      where user_agent = 'feedback-contract-honeypot-agent'`
  );
  const honeypot = await service.submitFeedback({
    fingerprint: 'feedback-contract-honeypot',
    userAgent: 'feedback-contract-honeypot-agent',
    payload: {
      website: 'https://spam.example/',
      message: 'short',
    },
  });
  assert.deepEqual(honeypot, { success: true });
  const honeypotAfter = await database.query(
    `select count(*)::int as count
       from game_feedback
      where user_agent = 'feedback-contract-honeypot-agent'`
  );
  assert.equal(honeypotAfter.rows[0].count, honeypotBefore.rows[0].count);

  const submitted = await service.submitFeedback({
    fingerprint: 'feedback-contract-submit',
    userAgent: 'feedback-contract-agent',
    payload: {
      type: 'suggestion',
      message: 'Please add this contract suggestion to the game.',
      email: 'player@example.test',
      build: 'V10.41',
      page_url: 'https://www.cheekycommodoregamer.co.uk/arcade/lost-sizzler/',
    },
  });
  assert.equal(submitted.success, true);
  assert.equal(submitted.email_status, 'failed');

  const storedFeedback = await database.query(
    `select feedback_type, message, contact_email, email_status, email_error
       from game_feedback
      where id = $1`,
    [submitted.id]
  );
  assert.deepEqual(storedFeedback.rows[0], {
    feedback_type: 'suggestion',
    message: 'Please add this contract suggestion to the game.',
    contact_email: 'player@example.test',
    email_status: 'failed',
    email_error: 'RESEND_API_KEY or EMAIL_FROM missing',
  });

  const rawIp = '198.51.100.77';
  const fingerprint = requestFingerprintValue(rawIp, 'rate-limit-contract-agent');
  for (let index = 0; index < 8; index += 1) {
    const result = await service.submitFeedback({
      fingerprint,
      userAgent: 'rate-limit-contract-agent',
      payload: {
        type: 'bug',
        message: `Rate limit contract feedback number ${index + 1}.`,
      },
    });
    assert.equal(result.success, true);
  }
  await assert.rejects(
    service.submitFeedback({
      fingerprint,
      userAgent: 'rate-limit-contract-agent',
      payload: {
        type: 'bug',
        message: 'The ninth request must be rejected by the database-backed budget.',
      },
    }),
    (error) => error?.statusCode === 429
      && error?.code === 'too_many_requests'
      && Number.isSafeInteger(error?.retryAfterSeconds)
  );

  const budget = await database.query(
    `select bucket_key, request_count
       from lost_sizzler_request_buckets
      where bucket_key = $1`,
    [`feedback:${fingerprint}`]
  );
  assert.equal(budget.rows[0].request_count, 9);
  assert.equal(budget.rows[0].bucket_key.includes(rawIp), false);
  assert.match(budget.rows[0].bucket_key, /^feedback:[0-9a-f]{24}$/);

  console.log('Lost Sizzler feedback PostgreSQL contract passed: rating status, telemetry, honeypot, feedback persistence and one-way database-backed rate limiting are source-compatible.');
} finally {
  await database.close();
}

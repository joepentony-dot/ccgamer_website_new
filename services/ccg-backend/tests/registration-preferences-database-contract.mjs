import assert from 'node:assert/strict';
import pg from 'pg';
import { createDatabase } from '../src/db.mjs';
import { createAuthRegistrationService } from '../src/auth-registration.mjs';
import { loadMigrations } from '../scripts/migrate.mjs';

const { Pool } = pg;
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!databaseUrl) {
  console.log('CCG registration preference database contract skipped: DATABASE_URL is not configured.');
  process.exit(0);
}

const bootstrap = new Pool({ connectionString: databaseUrl, ssl: false, max: 1 });
try {
  for (const migration of await loadMigrations()) {
    await bootstrap.query(migration.sql);
  }
} finally {
  await bootstrap.end();
}

const database = createDatabase(databaseUrl);
const sent = [];
const tokens = [
  'A'.repeat(43),
  'B'.repeat(43),
  'C'.repeat(43),
  'D'.repeat(43),
];
const uuids = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
];
const fixedNow = Date.parse('2026-09-06T22:30:00.000Z');

const service = createAuthRegistrationService({
  database,
  emailSender: {
    async sendVerification(payload) {
      sent.push(payload);
    },
  },
  now: () => fixedNow,
  randomUuidImpl: () => {
    const value = uuids.shift();
    if (!value) throw new Error('Unexpected registration UUID request.');
    return value;
  },
  randomTokenImpl: () => {
    const value = tokens.shift();
    if (!value) throw new Error('Unexpected registration token request.');
    return value;
  },
  bcryptCost: 10,
});

try {
  const table = await database.query(
    `select to_regclass('public.ccg_auth_pending_registration_preferences') as relation`
  );
  assert.equal(
    table.rows[0].relation,
    'ccg_auth_pending_registration_preferences',
    'Migration 008 must create the pending registration preference table.'
  );

  const initialPreferences = {
    notify_new_games: true,
    notify_newsletter: false,
    notify_new_games_choice_recorded: true,
    notify_newsletter_choice_recorded: true,
  };
  const first = await service.register({
    email: 'registration-preferences@example.test',
    password: 'registration-password',
    notificationPreferences: initialPreferences,
    fingerprint: 'database-contract',
  });
  assert.deepEqual(first, { accepted: true, verification_required: true });
  assert.equal(sent.length, 1);

  let pending = await database.query(
    `select notify_new_games, notify_newsletter,
            notify_new_games_choice_recorded, notify_newsletter_choice_recorded
       from ccg_auth_pending_registration_preferences
      where user_id = $1`,
    ['11111111-1111-4111-8111-111111111111']
  );
  assert.deepEqual(pending.rows[0], {
    notify_new_games: true,
    notify_newsletter: false,
    notify_new_games_choice_recorded: true,
    notify_newsletter_choice_recorded: true,
  });

  const changedPreferences = {
    notify_new_games: false,
    notify_newsletter: true,
    notify_new_games_choice_recorded: true,
    notify_newsletter_choice_recorded: true,
  };
  await service.register({
    email: 'registration-preferences@example.test',
    password: 'registration-password',
    notificationPreferences: changedPreferences,
    fingerprint: 'database-contract',
  });
  assert.equal(sent.length, 2, 'Retrying an unconfirmed CCG account should issue a fresh verification token.');

  pending = await database.query(
    `select notify_new_games, notify_newsletter,
            notify_new_games_choice_recorded, notify_newsletter_choice_recorded
       from ccg_auth_pending_registration_preferences
      where user_id = $1`,
    ['11111111-1111-4111-8111-111111111111']
  );
  assert.deepEqual(pending.rows[0], {
    notify_new_games: false,
    notify_newsletter: true,
    notify_new_games_choice_recorded: true,
    notify_newsletter_choice_recorded: true,
  }, 'A retry with an explicit recorded choice must replace the pending preference values.');

  await service.register({
    email: 'registration-preferences@example.test',
    password: 'registration-password',
    fingerprint: 'database-contract',
  });
  assert.equal(sent.length, 3);
  pending = await database.query(
    `select notify_new_games, notify_newsletter,
            notify_new_games_choice_recorded, notify_newsletter_choice_recorded
       from ccg_auth_pending_registration_preferences
      where user_id = $1`,
    ['11111111-1111-4111-8111-111111111111']
  );
  assert.deepEqual(pending.rows[0], {
    notify_new_games: false,
    notify_newsletter: true,
    notify_new_games_choice_recorded: true,
    notify_newsletter_choice_recorded: true,
  }, 'A retry with no preference payload must not erase an earlier recorded choice.');

  const confirmed = await service.confirmEmail(sent[2].token);
  assert.deepEqual(confirmed, {
    confirmed: true,
    user_id: '11111111-1111-4111-8111-111111111111',
  });

  const profile = await database.query(
    `select email, notify_new_games, notify_newsletter,
            notify_new_games_choice_recorded, notify_newsletter_choice_recorded,
            notification_preferences_updated_at
       from ccg_profiles
      where user_id = $1`,
    ['11111111-1111-4111-8111-111111111111']
  );
  assert.equal(profile.rows[0].email, 'registration-preferences@example.test');
  assert.equal(profile.rows[0].notify_new_games, false);
  assert.equal(profile.rows[0].notify_newsletter, true);
  assert.equal(profile.rows[0].notify_new_games_choice_recorded, true);
  assert.equal(profile.rows[0].notify_newsletter_choice_recorded, true);
  assert.ok(profile.rows[0].notification_preferences_updated_at instanceof Date);

  const pendingAfterConfirmation = await database.query(
    `select count(*)::int as count
       from ccg_auth_pending_registration_preferences
      where user_id = $1`,
    ['11111111-1111-4111-8111-111111111111']
  );
  assert.equal(pendingAfterConfirmation.rows[0].count, 0, 'Confirmed preferences must be removed from temporary storage.');

  const confirmedAccount = await database.query(
    `select email_confirmed_at from ccg_auth_accounts where user_id = $1`,
    ['11111111-1111-4111-8111-111111111111']
  );
  assert.ok(confirmedAccount.rows[0].email_confirmed_at instanceof Date);

  await service.register({
    email: 'registration-defaults@example.test',
    password: 'registration-password',
    fingerprint: 'database-contract-defaults',
  });
  assert.equal(sent.length, 4);
  await service.confirmEmail(sent[3].token);

  const defaultProfile = await database.query(
    `select notify_new_games, notify_newsletter,
            notify_new_games_choice_recorded, notify_newsletter_choice_recorded,
            notification_preferences_updated_at
       from ccg_profiles
      where user_id = $1`,
    ['22222222-2222-4222-8222-222222222222']
  );
  assert.deepEqual(defaultProfile.rows[0], {
    notify_new_games: false,
    notify_newsletter: false,
    notify_new_games_choice_recorded: false,
    notify_newsletter_choice_recorded: false,
    notification_preferences_updated_at: null,
  }, 'No preference payload must preserve unrecorded profile defaults rather than inventing a user choice.');

  await assert.rejects(
    () => service.register({
      email: 'invalid-preferences@example.test',
      password: 'registration-password',
      notificationPreferences: {
        notify_new_games: true,
        notify_newsletter: false,
        notify_new_games_choice_recorded: false,
        notify_newsletter_choice_recorded: false,
      },
      fingerprint: 'database-contract-invalid',
    }),
    (error) => error?.statusCode === 400 && error?.code === 'invalid_notification_preferences'
  );
  const invalidAccount = await database.query(
    `select count(*)::int as count from ccg_auth_accounts where lower(email) = $1`,
    ['invalid-preferences@example.test']
  );
  assert.equal(invalidAccount.rows[0].count, 0, 'Invalid preferences must fail before account creation.');

  console.log('CCG registration preference database contract passed: recorded choices survive retries and email verification, temporary rows are consumed atomically, and absent choices retain unrecorded profile defaults.');
} finally {
  await database.close();
}

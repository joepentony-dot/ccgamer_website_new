import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import pg from 'pg';
import { createDatabase } from '../src/db.mjs';
import { createCloudSaveStore, hashSavePayload } from '../src/cloud-save.mjs';

const { Pool } = pg;
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!databaseUrl) throw new Error('DATABASE_URL is required for the database contract.');

const bootstrap = new Pool({ connectionString: databaseUrl, ssl: false, max: 1 });
try {
  const migrations = [
    '../migrations/001_initial.sql',
    '../migrations/002_account_profiles.sql',
  ];
  for (const relativePath of migrations) {
    const migration = await fs.readFile(new URL(relativePath, import.meta.url), 'utf8');
    await bootstrap.query(migration);
  }
} finally {
  await bootstrap.end();
}

const database = createDatabase(databaseUrl);
try {
  assert.equal(await database.ping(), true);

  const columns = await database.query(
    `select column_name
       from information_schema.columns
      where table_schema = 'public'
        and table_name = 'lost_sizzler_cloud_saves'
      order by ordinal_position`
  );
  const columnNames = new Set(columns.rows.map((row) => row.column_name));
  for (const required of [
    'user_id',
    'revision',
    'schema_name',
    'schema_version',
    'game_version',
    'save_envelope',
    'save_checksum',
    'payload_sha256',
    'save_saved_at',
    'client_revision_ms',
    'deleted_at',
    'updated_at',
  ]) {
    assert.equal(columnNames.has(required), true, `Missing source-compatible cloud-save column: ${required}`);
  }

  const authColumns = await database.query(
    `select column_name
       from information_schema.columns
      where table_schema = 'public'
        and table_name = 'ccg_auth_accounts'
      order by ordinal_position`
  );
  const authColumnNames = new Set(authColumns.rows.map((row) => row.column_name));
  for (const required of [
    'user_id',
    'email',
    'password_hash',
    'password_hash_algorithm',
    'email_confirmed_at',
    'last_sign_in_at',
    'banned_until',
    'disabled_at',
    'deleted_at',
    'source_provider',
    'source_app_metadata',
    'source_user_metadata',
  ]) {
    assert.equal(authColumnNames.has(required), true, `Missing auth-account migration column: ${required}`);
  }

  const profileColumns = await database.query(
    `select column_name
       from information_schema.columns
      where table_schema = 'public'
        and table_name = 'ccg_profiles'
      order by ordinal_position`
  );
  const profileColumnNames = new Set(profileColumns.rows.map((row) => row.column_name));
  for (const required of [
    'user_id',
    'username',
    'display_name',
    'mode_pref',
    'role',
    'is_admin',
    'banned',
    'preferred_system',
    'public_list_key',
    'supporter_verified',
    'supporter_tier',
    'notify_weekly_challenge',
  ]) {
    assert.equal(profileColumnNames.has(required), true, `Missing profile migration column: ${required}`);
  }

  const accountUserId = 'account-contract-user';
  const profileUserId = 'profile-contract-user';
  await database.query(
    `insert into ccg_users (user_id) values ($1), ($2)`,
    [accountUserId, profileUserId]
  );
  await database.query(
    `insert into ccg_auth_accounts
      (user_id, email, password_hash, password_hash_algorithm, email_confirmed_at, source_provider)
     values
      ($1, $2, $3, 'bcrypt', now(), 'supabase'),
      ($4, $5, $6, 'bcrypt', now(), 'supabase')`,
    [
      accountUserId,
      'AuthOnly@example.com',
      '$2b$12$contracthashplaceholder',
      profileUserId,
      'Profile@example.com',
      '$2b$12$contracthashplaceholder2',
    ]
  );
  await database.query(
    `insert into ccg_auth_identities
      (user_id, provider, provider_subject, email)
     values ($1, 'email', $2, $3), ($4, 'email', $5, $6)`,
    [
      accountUserId,
      'auth-only-subject',
      'AuthOnly@example.com',
      profileUserId,
      'profile-subject',
      'Profile@example.com',
    ]
  );
  await database.query(
    `insert into ccg_profiles
      (user_id, username, display_name, preferred_system, public_list_key, supporter_tier)
     values ($1, 'contract-player', 'Contract Player', 'both', 'played', 'supporter')`,
    [profileUserId]
  );

  const accountCounts = await database.query(
    `select
       (select count(*) from ccg_auth_accounts)::int as accounts,
       (select count(*) from ccg_profiles)::int as profiles,
       (select count(*) from ccg_auth_accounts a left join ccg_profiles p on p.user_id = a.user_id where p.user_id is null)::int as auth_only`
  );
  assert.equal(accountCounts.rows[0].accounts, 2);
  assert.equal(accountCounts.rows[0].profiles, 1);
  assert.equal(accountCounts.rows[0].auth_only, 1, 'Auth-only accounts must remain valid without invented profile rows.');

  await database.query(`insert into ccg_users (user_id) values ('duplicate-email-contract-user')`);
  await assert.rejects(
    database.query(
      `insert into ccg_auth_accounts
        (user_id, email, password_hash, password_hash_algorithm)
       values ('duplicate-email-contract-user', 'profile@EXAMPLE.com', '$2b$12$duplicateplaceholder', 'bcrypt')`
    ),
    (error) => error?.code === '23505'
  );

  const store = createCloudSaveStore(database);
  const userId = 'database-contract-user';
  const envelope = {
    schema: 'ccg-lost-sizzler-solo-save',
    schemaVersion: 2,
    gameVersion: 'V10.41',
    savedAt: 1788321126482,
    reason: 'contract',
    summary: { floor: 3, score: 12345 },
    checkpoint: { run: { floor: 3, seed: 'contract-seed' }, player: { level: 4 } },
    checksum: '1234abcd',
  };
  const firstProof = hashSavePayload(envelope);
  const first = await store.put(userId, {
    expected_revision: 0,
    client_revision_ms: envelope.savedAt,
    payload: envelope,
    payload_sha256: firstProof.sha256,
  });
  assert.equal(first.revision, 1);
  assert.equal(first.schema_name, envelope.schema);
  assert.equal(first.schema_version, envelope.schemaVersion);
  assert.equal(first.game_version, envelope.gameVersion);
  assert.equal(first.save_checksum, envelope.checksum);
  assert.equal(first.client_revision_ms, envelope.savedAt);
  assert.equal(first.payload_sha256, firstProof.sha256);
  assert.equal(first.deleted_at, null);

  const exactRetry = await store.put(userId, {
    expected_revision: 0,
    client_revision_ms: envelope.savedAt,
    payload: envelope,
    payload_sha256: firstProof.sha256,
  });
  assert.equal(exactRetry.revision, 1);
  assert.equal(exactRetry.idempotent, true);

  const changed = { ...envelope, savedAt: envelope.savedAt + 1000, summary: { floor: 3, score: 13000 } };
  const changedProof = hashSavePayload(changed);
  await assert.rejects(
    store.put(userId, {
      expected_revision: 0,
      client_revision_ms: changed.savedAt,
      payload: changed,
      payload_sha256: changedProof.sha256,
    }),
    (error) => error?.statusCode === 409 && error?.code === 'save_revision_conflict'
  );

  const afterConflict = await store.get(userId);
  assert.equal(afterConflict.revision, 1, 'A rejected stale write must leave the remote save revision unchanged.');
  assert.equal(afterConflict.payload_sha256, firstProof.sha256, 'A rejected stale write must leave remote save content unchanged.');

  const second = await store.put(userId, {
    expected_revision: 1,
    client_revision_ms: changed.savedAt,
    payload: changed,
    payload_sha256: changedProof.sha256,
  });
  assert.equal(second.revision, 2);
  assert.equal(second.client_revision_ms, changed.savedAt);
  assert.equal(second.payload_sha256, changedProof.sha256);

  const stored = await store.get(userId);
  assert.equal(stored.revision, 2);
  assert.deepEqual(stored.payload.summary, changed.summary);

  console.log('CCG PostgreSQL contract passed: account/profile separation, case-insensitive account uniqueness, source-compatible Solo saves, transaction serialization, idempotent retry and stale-write rejection work on PostgreSQL 17.');
} finally {
  await database.close();
}

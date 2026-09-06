import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import pg from 'pg';
import { createDatabase } from '../src/db.mjs';
import {
  importMigrationBundle,
  validateMigrationBundle,
} from '../scripts/import-migration-bundle.mjs';
import {
  collectDestinationSummary,
  compareDestinationToSnapshot,
  loadMigrationSnapshot,
} from '../scripts/verify-migration-snapshot.mjs';

const { Pool } = pg;
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!databaseUrl) throw new Error('DATABASE_URL is required for the migration-import contract.');

const snapshot = await loadMigrationSnapshot();

function accountId(index) {
  return `fixture-user-${String(index).padStart(2, '0')}`;
}

function profileId(index) {
  return accountId(index % snapshot.identity.profiles);
}

function buildBundle() {
  const authAccounts = Array.from({ length: snapshot.identity.auth_accounts }, (_, index) => ({
    user_id: accountId(index),
    email: `fixture-${String(index).padStart(2, '0')}@example.invalid`,
    password_hash: `$2b$10$${'A'.repeat(53)}`,
    password_hash_algorithm: 'bcrypt',
    email_confirmed_at: index < snapshot.identity.email_confirmed_accounts ? '2026-09-01T00:00:00.000Z' : null,
    source_provider: 'supabase',
    source_app_metadata: { provider: 'email' },
    source_user_metadata: {},
  }));

  const profiles = Array.from({ length: snapshot.identity.profiles }, (_, index) => ({
    user_id: accountId(index),
    username: `fixture-${index}`,
    display_name: `Fixture ${index}`,
  }));

  return {
    bundle_version: 1,
    source_system: 'supabase-read-only-export',
    captured_date: snapshot.captured_date,
    tables: {
      auth_accounts: authAccounts,
      auth_identities: authAccounts.map((account, index) => ({
        user_id: account.user_id,
        provider: 'email',
        provider_subject: `fixture-subject-${index}`,
        email: account.email,
      })),
      profiles,
      profile_favourites: Array.from({ length: snapshot.cutover_data.profile_favourites }, (_, index) => ({
        profile_id: profileId(index),
        game_slug: `favourite-${index}`,
      })),
      profile_game_library: Array.from({ length: snapshot.cutover_data.profile_game_library }, (_, index) => ({
        profile_id: profileId(index),
        game_slug: `library-${index}`,
        title: `Library ${index}`,
        lists: ['owned'],
        custom_lists: [],
        rating: 8,
        note: '',
      })),
      profile_top_picks: Array.from({ length: snapshot.cutover_data.profile_top_picks }, (_, index) => ({
        profile_id: profileId(index),
        game_slug: `top-pick-${index}`,
      })),
      user_badges: Array.from({ length: snapshot.cutover_data.user_badges }, (_, index) => ({
        user_id: profileId(index),
        badge_code: `fixture-badge-${index}`,
      })),
      user_roles: Array.from({ length: snapshot.cutover_data.user_roles }, (_, index) => ({
        user_id: accountId(index),
        role: 'admin',
      })),
      email_subscriptions: Array.from({ length: snapshot.cutover_data.email_subscriptions }, (_, index) => ({
        profile_id: profileId(index),
        email: `subscriber-${index}@example.invalid`,
        status: 'subscribed',
        unsubscribe_token: `fixture-unsubscribe-${index}`,
      })),
      ccq_weekly_attempts: Array.from({ length: snapshot.cutover_data.ccq_weekly_attempts }, (_, index) => ({
        week_start: '2026-08-31',
        user_id: accountId(index),
        player_name: `Fixture ${index}`,
        seed: `fixture-seed-${String(index).padStart(2, '0')}`,
      })),
      lost_sizzler_cloud_saves: Array.from({ length: snapshot.cutover_data.lost_sizzler_cloud_saves }, (_, index) => ({
        user_id: accountId(index),
        schema_name: 'ccg-lost-sizzler-solo-save',
        schema_version: 2,
        game_version: 'V10.41',
        save_envelope: {
          schema: 'ccg-lost-sizzler-solo-save',
          schemaVersion: 2,
          gameVersion: 'V10.41',
          savedAt: 1788321126000 + index,
          summary: { floor: index + 1, score: 1000 + index },
          checksum: `fixture${index}`,
        },
        save_checksum: `fixture${index}`,
        client_revision_ms: 1788321126000 + index,
      })),
      comments: Array.from({ length: snapshot.cutover_data.comments }, (_, index) => ({
        user_id: accountId(index),
        game_key: 'the-lost-sizzler',
        body: `Fixture comment ${index}`,
      })),
    },
  };
}

const bundle = buildBundle();
const validated = validateMigrationBundle(bundle, snapshot);
assert.equal(validated.tables.auth_accounts.length, 33);
assert.equal(validated.tables.profiles.length, 27);

const wrongHash = structuredClone(bundle);
wrongHash.tables.auth_accounts[0].password_hash = 'not-a-password-hash';
assert.throws(
  () => validateMigrationBundle(wrongHash, snapshot),
  /approved bcrypt hash/
);

const sessionMaterial = structuredClone(bundle);
sessionMaterial.sessions = [{ token: 'must-not-import' }];
assert.throws(
  () => validateMigrationBundle(sessionMaterial, snapshot),
  /forbidden session material/
);

const wrongCount = structuredClone(bundle);
wrongCount.tables.user_badges.pop();
assert.throws(
  () => validateMigrationBundle(wrongCount, snapshot),
  /user_badges count does not match frozen snapshot/
);

const orphanedRow = structuredClone(bundle);
orphanedRow.tables.profile_game_library[0].profile_id = 'unknown-profile';
assert.throws(
  () => validateMigrationBundle(orphanedRow, snapshot),
  /unknown owner/
);

const bootstrap = new Pool({ connectionString: databaseUrl, ssl: false, max: 1 });
try {
  for (const relativePath of [
    '../migrations/001_initial.sql',
    '../migrations/002_account_profiles.sql',
    '../migrations/003_auth_sessions.sql',
    '../migrations/004_profile_owned_state.sql',
  ]) {
    const migration = await fs.readFile(new URL(relativePath, import.meta.url), 'utf8');
    await bootstrap.query(migration);
  }
  await bootstrap.query(`
    truncate table
      ccg_auth_login_buckets,
      ccg_auth_recovery_tokens,
      ccg_auth_sessions,
      comments,
      ccq_weekly_attempts,
      email_subscriptions,
      user_roles,
      user_badges,
      profile_top_picks,
      profile_game_library,
      profile_favourites,
      lost_sizzler_cloud_saves,
      ccg_profiles,
      ccg_auth_identities,
      ccg_auth_accounts,
      ccg_users
    restart identity cascade
  `);
} finally {
  await bootstrap.end();
}

const database = createDatabase(databaseUrl);
try {
  const result = await importMigrationBundle(database, bundle, snapshot);
  assert.deepEqual(result, {
    imported_accounts: snapshot.identity.auth_accounts,
    imported_profiles: snapshot.identity.profiles,
    verified: true,
  });

  const destination = await collectDestinationSummary(database);
  const verification = compareDestinationToSnapshot(snapshot, destination);
  assert.equal(verification.ok, true);
  assert.deepEqual(verification.mismatches, []);

  const saveProofs = await database.query(
    `select count(*)::int as count
       from lost_sizzler_cloud_saves
      where payload_sha256 ~ '^[0-9a-f]{64}$'`
  );
  assert.equal(saveProofs.rows[0].count, snapshot.cutover_data.lost_sizzler_cloud_saves);

  await assert.rejects(
    importMigrationBundle(database, bundle, snapshot),
    /Destination is not pristine/
  );
} finally {
  await database.close();
}

console.log('CCG migration import contract passed: sensitive bundle validation, frozen count parity, owner preservation, session-material refusal, pristine-destination gating, transactional import and pre-commit destination verification work on PostgreSQL 17.');

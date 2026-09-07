import assert from 'node:assert/strict';
import { createDatabase } from '../src/db.mjs';
import { applyMigrations, checkMigrations, loadMigrations } from '../scripts/migrate.mjs';

const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!databaseUrl) throw new Error('DATABASE_URL is required for the migration-runner contract.');

const migrations = await loadMigrations();
assert.equal(migrations.length, 8);
assert.deepEqual(migrations.map((entry) => entry.name), [
  '001_initial.sql',
  '002_account_profiles.sql',
  '003_auth_sessions.sql',
  '004_profile_owned_state.sql',
  '005_online_service_state.sql',
  '006_game_commerce.sql',
  '007_auth_registration.sql',
  '008_registration_preferences.sql',
]);
assert.equal(new Set(migrations.map((entry) => entry.sha256)).size, migrations.length);

const before = await checkMigrations({ databaseUrl, migrations });
assert.equal(before.total, 8);
assert.equal(before.applied, 0, 'A database without migration ledger rows must report all repository migrations as pending.');
assert.deepEqual(before.pending, migrations.map((entry) => entry.name));

const firstApply = await applyMigrations({ databaseUrl, migrations });
assert.deepEqual(firstApply.applied_now, migrations.map((entry) => entry.name));

const after = await checkMigrations({ databaseUrl, migrations });
assert.equal(after.applied, 8);
assert.deepEqual(after.pending, []);

const secondApply = await applyMigrations({ databaseUrl, migrations });
assert.deepEqual(secondApply.applied_now, [], 'Re-running an unchanged migration set must be a no-op.');

const database = createDatabase(databaseUrl);
try {
  const first = migrations[0];
  await database.query(
    `update ccg_schema_migrations set sha256 = $2 where filename = $1`,
    [first.name, '0'.repeat(64)]
  );
  await assert.rejects(
    checkMigrations({ databaseUrl, migrations }),
    /Migration checksum mismatch: 001_initial\.sql/
  );
  await database.query(
    `update ccg_schema_migrations set sha256 = $2 where filename = $1`,
    [first.name, first.sha256]
  );
} finally {
  await database.close();
}

const restored = await checkMigrations({ databaseUrl, migrations });
assert.deepEqual(restored.pending, []);

console.log('CCG migration runner contract passed: explicit apply, no-op replay, eight-migration ledger and checksum drift refusal work on PostgreSQL 17.');

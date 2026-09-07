import assert from 'node:assert/strict';
import {
  TABLE_ENV,
  buildMigrationBundleFromEnvironment,
  validateStagingMigrationEnvironment,
} from '../scripts/import-staging-env-once.mjs';

const safeEnv = {
  CCG_STAGING_MIGRATION_ENABLED: 'true',
  CCG_STAGING_MIGRATION_ACK: 'I_ACCEPT_NON_PRODUCTION_WRITE',
  CCG_LOCAL_AUTH_ISSUER: 'https://ccg-backend-staging.onrender.com/',
  CCG_AUTH_MODE: 'local',
  DATABASE_URL: 'postgres://staging-only.invalid/example',
  CCG_LOCAL_AUTH_REGISTRATION_ENABLED: 'false',
  CCG_LOCAL_AUTH_RECOVERY_ENABLED: 'false',
  CCG_LOST_SIZZLER_REALTIME_ENABLED: 'false',
  CCG_LOST_SIZZLER_COMMERCE_ENABLED: 'false',
};

assert.deepEqual(validateStagingMigrationEnvironment({}), { enabled: false });
assert.deepEqual(validateStagingMigrationEnvironment(safeEnv), { enabled: true });

assert.throws(
  () => validateStagingMigrationEnvironment({ ...safeEnv, CCG_STAGING_MIGRATION_ACK: '' }),
  /I_ACCEPT_NON_PRODUCTION_WRITE/
);
assert.throws(
  () => validateStagingMigrationEnvironment({ ...safeEnv, CCG_LOCAL_AUTH_ISSUER: 'https://www.cheekycommodoregamer.co.uk/' }),
  /non-staging auth issuer/
);
assert.throws(
  () => validateStagingMigrationEnvironment({ ...safeEnv, CCG_LOCAL_AUTH_REGISTRATION_ENABLED: 'true' }),
  /CCG_LOCAL_AUTH_REGISTRATION_ENABLED must remain false/
);
assert.throws(
  () => validateStagingMigrationEnvironment({ ...safeEnv, CCG_LOCAL_AUTH_RECOVERY_ENABLED: 'true' }),
  /CCG_LOCAL_AUTH_RECOVERY_ENABLED must remain false/
);
assert.throws(
  () => validateStagingMigrationEnvironment({ ...safeEnv, CCG_LOST_SIZZLER_REALTIME_ENABLED: 'true' }),
  /CCG_LOST_SIZZLER_REALTIME_ENABLED must remain false/
);
assert.throws(
  () => validateStagingMigrationEnvironment({ ...safeEnv, CCG_LOST_SIZZLER_COMMERCE_ENABLED: 'true' }),
  /CCG_LOST_SIZZLER_COMMERCE_ENABLED must remain false/
);

const payloadEnv = { ...safeEnv };
for (const [index, [table, envName]] of Object.entries(TABLE_ENV).entries()) {
  const row = table === 'ccq_weekly_attempts'
    ? { marker: index, ghost_path: [] }
    : { marker: index };
  payloadEnv[envName] = Buffer.from(JSON.stringify([row]), 'utf8').toString('base64');
}

const bundle = buildMigrationBundleFromEnvironment(payloadEnv);
assert.equal(bundle.bundle_version, 1);
assert.equal(bundle.source_system, 'supabase-read-only-export');
assert.equal(bundle.captured_date, '2026-09-06');
assert.equal(Object.keys(bundle.tables).length, 12);
for (const [index, table] of Object.keys(TABLE_ENV).entries()) {
  const expected = table === 'ccq_weekly_attempts'
    ? [{ marker: index, ghost_path: '[]' }]
    : [{ marker: index }];
  assert.deepEqual(bundle.tables[table], expected);
}

const weeklyPayloadName = TABLE_ENV.ccq_weekly_attempts;
const ghostPath = [
  { f: 1, t: 17, x: 11, y: 10 },
  { f: 1, t: 529, x: 12, y: 10 },
];
const populatedWeeklyEnv = {
  ...payloadEnv,
  [weeklyPayloadName]: Buffer.from(JSON.stringify([{ marker: 9, ghost_path: ghostPath }]), 'utf8').toString('base64'),
};
const populatedBundle = buildMigrationBundleFromEnvironment(populatedWeeklyEnv);
assert.equal(typeof populatedBundle.tables.ccq_weekly_attempts[0].ghost_path, 'string');
assert.deepEqual(JSON.parse(populatedBundle.tables.ccq_weekly_attempts[0].ghost_path), ghostPath);

const invalidWeeklyEnv = {
  ...payloadEnv,
  [weeklyPayloadName]: Buffer.from(JSON.stringify([{ marker: 9, ghost_path: {} }]), 'utf8').toString('base64'),
};
assert.throws(
  () => buildMigrationBundleFromEnvironment(invalidWeeklyEnv),
  /ghost_path must be a JSON array/
);

const firstPayloadName = Object.values(TABLE_ENV)[0];
assert.throws(
  () => buildMigrationBundleFromEnvironment({ ...payloadEnv, [firstPayloadName]: '' }),
  /Missing staging migration payload/
);
assert.throws(
  () => buildMigrationBundleFromEnvironment({ ...payloadEnv, [firstPayloadName]: Buffer.from('{not-json', 'utf8').toString('base64') }),
  /Invalid JSON staging migration payload/
);

console.log('CCG staging migration env contract passed: import is staging-only, fail-closed, feature-locked, preserves Weekly Vault ghost paths as JSONB arrays, and reconstructs only the frozen 12-table bundle.');

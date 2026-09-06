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
for (const [index, envName] of Object.values(TABLE_ENV).entries()) {
  payloadEnv[envName] = Buffer.from(JSON.stringify([{ marker: index }]), 'utf8').toString('base64');
}

const bundle = buildMigrationBundleFromEnvironment(payloadEnv);
assert.equal(bundle.bundle_version, 1);
assert.equal(bundle.source_system, 'supabase-read-only-export');
assert.equal(bundle.captured_date, '2026-09-06');
assert.equal(Object.keys(bundle.tables).length, 12);
for (const [index, table] of Object.keys(TABLE_ENV).entries()) {
  assert.deepEqual(bundle.tables[table], [{ marker: index }]);
}

const firstPayloadName = Object.values(TABLE_ENV)[0];
assert.throws(
  () => buildMigrationBundleFromEnvironment({ ...payloadEnv, [firstPayloadName]: '' }),
  /Missing staging migration payload/
);
assert.throws(
  () => buildMigrationBundleFromEnvironment({ ...payloadEnv, [firstPayloadName]: Buffer.from('{not-json', 'utf8').toString('base64') }),
  /Invalid JSON staging migration payload/
);

console.log('CCG staging migration env contract passed: import is staging-only, fail-closed, feature-locked, and reconstructs only the frozen 12-table bundle.');

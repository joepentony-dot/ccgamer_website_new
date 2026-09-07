import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createDatabase } from '../src/db.mjs';
import { importMigrationBundle } from './import-migration-bundle.mjs';
import { loadMigrationSnapshot } from './verify-migration-snapshot.mjs';

const STAGING_ACK = 'I_ACCEPT_NON_PRODUCTION_WRITE';
const STAGING_ISSUER = 'https://ccg-backend-staging.onrender.com/';

export const TABLE_ENV = Object.freeze({
  auth_accounts: 'CCG_STAGING_MIGRATION_AUTH_ACCOUNTS_B64',
  auth_identities: 'CCG_STAGING_MIGRATION_AUTH_IDENTITIES_B64',
  profiles: 'CCG_STAGING_MIGRATION_PROFILES_B64',
  profile_favourites: 'CCG_STAGING_MIGRATION_PROFILE_FAVOURITES_B64',
  profile_game_library: 'CCG_STAGING_MIGRATION_PROFILE_GAME_LIBRARY_B64',
  profile_top_picks: 'CCG_STAGING_MIGRATION_PROFILE_TOP_PICKS_B64',
  user_badges: 'CCG_STAGING_MIGRATION_USER_BADGES_B64',
  user_roles: 'CCG_STAGING_MIGRATION_USER_ROLES_B64',
  email_subscriptions: 'CCG_STAGING_MIGRATION_EMAIL_SUBSCRIPTIONS_B64',
  ccq_weekly_attempts: 'CCG_STAGING_MIGRATION_CCQ_WEEKLY_ATTEMPTS_B64',
  lost_sizzler_cloud_saves: 'CCG_STAGING_MIGRATION_LOST_SIZZLER_CLOUD_SAVES_B64',
  comments: 'CCG_STAGING_MIGRATION_COMMENTS_B64',
});

function requireFalse(env, key) {
  if (String(env[key] || '').trim().toLowerCase() !== 'false') {
    throw new Error(`${key} must remain false during staging migration import.`);
  }
}

export function validateStagingMigrationEnvironment(env = process.env) {
  const enabled = String(env.CCG_STAGING_MIGRATION_ENABLED || '').trim().toLowerCase() === 'true';
  if (!enabled) return Object.freeze({ enabled: false });

  if (env.CCG_STAGING_MIGRATION_ACK !== STAGING_ACK) {
    throw new Error(`Staging migration requires CCG_STAGING_MIGRATION_ACK=${STAGING_ACK}.`);
  }
  if (String(env.CCG_LOCAL_AUTH_ISSUER || '').trim() !== STAGING_ISSUER) {
    throw new Error('Staging migration importer refuses a non-staging auth issuer.');
  }
  if (String(env.CCG_AUTH_MODE || '').trim() !== 'local') {
    throw new Error('Staging migration importer requires local auth mode.');
  }
  if (!String(env.DATABASE_URL || '').trim()) {
    throw new Error('DATABASE_URL is required for staging migration import.');
  }

  requireFalse(env, 'CCG_LOCAL_AUTH_REGISTRATION_ENABLED');
  requireFalse(env, 'CCG_LOCAL_AUTH_RECOVERY_ENABLED');
  requireFalse(env, 'CCG_LOST_SIZZLER_REALTIME_ENABLED');
  requireFalse(env, 'CCG_LOST_SIZZLER_COMMERCE_ENABLED');

  return Object.freeze({ enabled: true });
}

function decodeTable(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing staging migration payload: ${label}.`);
  }
  let decoded;
  try {
    decoded = Buffer.from(value, 'base64').toString('utf8');
  } catch {
    throw new Error(`Invalid base64 staging migration payload: ${label}.`);
  }
  let rows;
  try {
    rows = JSON.parse(decoded);
  } catch {
    throw new Error(`Invalid JSON staging migration payload: ${label}.`);
  }
  if (!Array.isArray(rows)) throw new Error(`Staging migration payload ${label} must decode to an array.`);
  return rows;
}

function prepareTableRows(table, rows) {
  if (table !== 'ccq_weekly_attempts') return rows;

  return rows.map((row, index) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error(`Staging migration payload ccq_weekly_attempts[${index}] must be an object.`);
    }
    if (!Array.isArray(row.ghost_path)) {
      throw new Error(`Staging migration payload ccq_weekly_attempts[${index}].ghost_path must be a JSON array.`);
    }

    return Object.freeze({
      ...row,
      // node-postgres treats JavaScript arrays as PostgreSQL arrays. Serialize this JSONB
      // array explicitly so PostgreSQL receives an actual JSON array, not a PG array literal.
      ghost_path: JSON.stringify(row.ghost_path),
    });
  });
}

export function buildMigrationBundleFromEnvironment(env = process.env) {
  const tables = {};
  for (const [table, envName] of Object.entries(TABLE_ENV)) {
    tables[table] = prepareTableRows(table, decodeTable(env[envName], envName));
  }
  return Object.freeze({
    bundle_version: 1,
    source_system: 'supabase-read-only-export',
    captured_date: '2026-09-06',
    tables: Object.freeze(tables),
  });
}

export async function importStagingEnvironmentBundle(env = process.env) {
  const gate = validateStagingMigrationEnvironment(env);
  if (!gate.enabled) return Object.freeze({ skipped: true });

  const snapshot = await loadMigrationSnapshot();
  const bundle = buildMigrationBundleFromEnvironment(env);
  const database = createDatabase(String(env.DATABASE_URL).trim());
  try {
    const result = await importMigrationBundle(database, bundle, snapshot);
    return Object.freeze({
      skipped: false,
      imported_accounts: result.imported_accounts,
      imported_profiles: result.imported_profiles,
      destination_verified: result.verified,
    });
  } finally {
    await database.close();
  }
}

async function main() {
  const result = await importStagingEnvironmentBundle(process.env);
  if (result.skipped) {
    process.stdout.write('CCG staging migration import disabled; continuing normal startup.\n');
    return;
  }
  process.stdout.write(`${JSON.stringify({
    ok: true,
    imported_accounts: result.imported_accounts,
    imported_profiles: result.imported_profiles,
    destination_verified: result.destination_verified,
  })}\n`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath && invokedPath === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(`CCG staging migration import failed: ${error.message}`);
    process.exitCode = 1;
  });
}

import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createDatabase } from '../src/db.mjs';
import { hashSavePayload } from '../src/cloud-save.mjs';
import {
  collectDestinationSummary,
  compareDestinationToSnapshot,
  loadMigrationSnapshot,
} from './verify-migration-snapshot.mjs';

const SERVICE_ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const MAX_BUNDLE_BYTES = 16 * 1024 * 1024;
const APPLY_ACK = 'I_ACCEPT_NON_PRODUCTION_WRITE';

const TABLE_KEYS = Object.freeze([
  'auth_accounts',
  'auth_identities',
  'profiles',
  'profile_favourites',
  'profile_game_library',
  'profile_top_picks',
  'user_badges',
  'user_roles',
  'email_subscriptions',
  'ccq_weekly_attempts',
  'lost_sizzler_cloud_saves',
  'comments',
]);

const SNAPSHOT_COUNT_PATH = Object.freeze({
  auth_accounts: ['identity', 'auth_accounts'],
  auth_identities: ['identity', 'email_identities'],
  profiles: ['identity', 'profiles'],
  profile_favourites: ['cutover_data', 'profile_favourites'],
  profile_game_library: ['cutover_data', 'profile_game_library'],
  profile_top_picks: ['cutover_data', 'profile_top_picks'],
  user_badges: ['cutover_data', 'user_badges'],
  user_roles: ['cutover_data', 'user_roles'],
  email_subscriptions: ['cutover_data', 'email_subscriptions'],
  ccq_weekly_attempts: ['cutover_data', 'ccq_weekly_attempts'],
  lost_sizzler_cloud_saves: ['cutover_data', 'lost_sizzler_cloud_saves'],
  comments: ['cutover_data', 'comments'],
});

const INSERT_SPECS = Object.freeze({
  auth_accounts: Object.freeze({
    table: 'ccg_auth_accounts',
    columns: Object.freeze([
      'user_id', 'email', 'password_hash', 'password_hash_algorithm',
      'email_confirmed_at', 'last_sign_in_at', 'banned_until', 'disabled_at', 'deleted_at',
      'source_provider', 'source_app_metadata', 'source_user_metadata', 'created_at', 'updated_at',
    ]),
  }),
  auth_identities: Object.freeze({
    table: 'ccg_auth_identities',
    columns: Object.freeze([
      'identity_id', 'user_id', 'provider', 'provider_subject', 'email', 'identity_metadata',
      'last_sign_in_at', 'created_at', 'updated_at',
    ]),
  }),
  profiles: Object.freeze({
    table: 'ccg_profiles',
    columns: Object.freeze([
      'user_id', 'username', 'created_at', 'last_seen', 'mode_pref', 'role', 'avatar_url',
      'display_name', 'bio', 'updated_at', 'is_admin', 'notify_new_games', 'notify_newsletter',
      'notify_admin', 'banned', 'ban_reason', 'banned_at', 'email', 'preferred_system',
      'is_public', 'public_bio', 'show_top_picks', 'show_badges', 'public_list_key',
      'public_list_title', 'unsub_token', 'notify_new_games_choice_recorded',
      'notify_newsletter_choice_recorded', 'notification_preferences_updated_at',
      'hall_of_fame_opt_in', 'supporter_verified', 'supporter_tier', 'supporter_since',
      'supporter_note', 'supporter_sort_order', 'notify_weekly_challenge',
    ]),
  }),
  profile_favourites: Object.freeze({
    table: 'profile_favourites',
    columns: Object.freeze(['id', 'profile_id', 'game_slug', 'created_at']),
  }),
  profile_game_library: Object.freeze({
    table: 'profile_game_library',
    columns: Object.freeze([
      'id', 'profile_id', 'game_slug', 'title', 'system', 'release_year', 'lists',
      'custom_lists', 'rating', 'note', 'created_at', 'updated_at', 'deleted_at',
    ]),
  }),
  profile_top_picks: Object.freeze({
    table: 'profile_top_picks',
    columns: Object.freeze(['id', 'profile_id', 'game_slug', 'created_at']),
  }),
  user_badges: Object.freeze({
    table: 'user_badges',
    columns: Object.freeze(['id', 'user_id', 'badge_code', 'awarded_at']),
  }),
  user_roles: Object.freeze({
    table: 'user_roles',
    columns: Object.freeze(['user_id', 'role', 'updated_at']),
  }),
  email_subscriptions: Object.freeze({
    table: 'email_subscriptions',
    columns: Object.freeze(['profile_id', 'email', 'status', 'unsubscribe_token', 'updated_at']),
  }),
  ccq_weekly_attempts: Object.freeze({
    table: 'ccq_weekly_attempts',
    columns: Object.freeze([
      'id', 'week_start', 'user_id', 'player_name', 'seed', 'status', 'started_at',
      'finished_at', 'score', 'deepest_floor', 'duration_ms', 'level', 'completed',
      'stats', 'ghost_path',
    ]),
  }),
  comments: Object.freeze({
    table: 'comments',
    columns: Object.freeze([
      'id', 'user_id', 'game_key', 'body', 'created_at', 'deleted', 'updated_at',
      'page_type', 'page_id',
    ]),
  }),
});

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value;
}

function requireString(value, label, { allowEmpty = false } = {}) {
  if (typeof value !== 'string' || (!allowEmpty && value.trim() === '')) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value;
}

function requireArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value;
}

function expectedCount(snapshot, key) {
  const [group, field] = SNAPSHOT_COUNT_PATH[key];
  return Number(snapshot[group][field]);
}

function assertUnique(values, label, normalize = (value) => value) {
  const seen = new Set();
  for (const raw of values) {
    const value = normalize(raw);
    if (seen.has(value)) throw new Error(`${label} contains a duplicate value.`);
    seen.add(value);
  }
}

function assertOwner(rows, field, owners, label, { allowNull = false } = {}) {
  for (const [index, row] of rows.entries()) {
    const value = row[field];
    if (allowNull && (value === null || value === undefined)) continue;
    if (!owners.has(value)) throw new Error(`${label}[${index}].${field} references an unknown owner.`);
  }
}

function validateAccountRows(rows) {
  for (const [index, raw] of rows.entries()) {
    const row = requireObject(raw, `tables.auth_accounts[${index}]`);
    requireString(row.user_id, `tables.auth_accounts[${index}].user_id`);
    const email = requireString(row.email, `tables.auth_accounts[${index}].email`);
    if (!email.includes('@')) throw new Error(`tables.auth_accounts[${index}].email is invalid.`);
    const hash = requireString(row.password_hash, `tables.auth_accounts[${index}].password_hash`);
    if (!/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash)) {
      throw new Error(`tables.auth_accounts[${index}] does not contain an approved bcrypt hash.`);
    }
    if (row.password_hash_algorithm !== 'bcrypt') {
      throw new Error(`tables.auth_accounts[${index}] must declare password_hash_algorithm=bcrypt.`);
    }
  }
  assertUnique(rows.map((row) => row.user_id), 'auth account user IDs');
  assertUnique(rows.map((row) => row.email), 'auth account emails', (value) => String(value).toLowerCase());
}

function validateIdentityRows(rows) {
  for (const [index, raw] of rows.entries()) {
    const row = requireObject(raw, `tables.auth_identities[${index}]`);
    requireString(row.user_id, `tables.auth_identities[${index}].user_id`);
    if (row.provider !== 'email') {
      throw new Error(`tables.auth_identities[${index}] must use the current source provider=email.`);
    }
    requireString(row.provider_subject, `tables.auth_identities[${index}].provider_subject`);
  }
  assertUnique(
    rows.map((row) => `${row.provider}\u0000${row.provider_subject}`),
    'provider identity subjects'
  );
}

function validateGenericRows(tables) {
  const stringRequirements = Object.freeze({
    profiles: ['user_id'],
    profile_favourites: ['profile_id', 'game_slug'],
    profile_game_library: ['profile_id', 'game_slug'],
    profile_top_picks: ['profile_id', 'game_slug'],
    user_badges: ['badge_code'],
    user_roles: ['user_id', 'role'],
    email_subscriptions: ['profile_id', 'email', 'status', 'unsubscribe_token'],
    ccq_weekly_attempts: ['user_id', 'player_name', 'seed'],
    comments: ['game_key', 'body'],
  });
  for (const [key, fields] of Object.entries(stringRequirements)) {
    for (const [index, raw] of tables[key].entries()) {
      const row = requireObject(raw, `tables.${key}[${index}]`);
      for (const field of fields) requireString(row[field], `tables.${key}[${index}].${field}`);
    }
  }
  for (const [index, raw] of tables.lost_sizzler_cloud_saves.entries()) {
    const row = requireObject(raw, `tables.lost_sizzler_cloud_saves[${index}]`);
    requireString(row.user_id, `tables.lost_sizzler_cloud_saves[${index}].user_id`);
    if (row.save_envelope !== null && row.save_envelope !== undefined) {
      requireObject(row.save_envelope, `tables.lost_sizzler_cloud_saves[${index}].save_envelope`);
      hashSavePayload(row.save_envelope);
    } else if (!row.deleted_at) {
      throw new Error(`tables.lost_sizzler_cloud_saves[${index}] must contain save_envelope or deleted_at.`);
    }
  }
}

export function validateMigrationBundle(bundle, snapshot) {
  requireObject(bundle, 'Migration bundle');
  if (bundle.bundle_version !== 1) throw new Error('Unsupported migration bundle version.');
  if (bundle.source_system !== 'supabase-read-only-export') {
    throw new Error('Migration bundle source_system must be supabase-read-only-export.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(bundle.captured_date || ''))) {
    throw new Error('Migration bundle captured_date is invalid.');
  }
  if (bundle.captured_date !== snapshot.captured_date) {
    throw new Error('Migration bundle captured_date does not match the frozen source snapshot.');
  }

  for (const forbidden of [
    'sessions', 'refresh_tokens', 'recovery_tokens', 'supabase_sessions', 'supabase_refresh_tokens',
  ]) {
    if (Object.prototype.hasOwnProperty.call(bundle, forbidden)) {
      throw new Error(`Migration bundle contains forbidden session material: ${forbidden}.`);
    }
  }

  const tables = requireObject(bundle.tables, 'Migration bundle tables');
  const extraTableKeys = Object.keys(tables).filter((key) => !TABLE_KEYS.includes(key));
  if (extraTableKeys.length > 0) {
    throw new Error(`Migration bundle contains unsupported table key: ${extraTableKeys[0]}.`);
  }
  for (const key of TABLE_KEYS) {
    requireArray(tables[key], `tables.${key}`);
    const expected = expectedCount(snapshot, key);
    if (tables[key].length !== expected) {
      throw new Error(`tables.${key} count does not match frozen snapshot (${expected}).`);
    }
  }

  validateAccountRows(tables.auth_accounts);
  validateIdentityRows(tables.auth_identities);
  validateGenericRows(tables);

  const accountIds = new Set(tables.auth_accounts.map((row) => row.user_id));
  const profileIds = new Set(tables.profiles.map((row) => row.user_id));
  assertUnique(tables.profiles.map((row) => row.user_id), 'profile user IDs');
  assertOwner(tables.auth_identities, 'user_id', accountIds, 'auth_identities');
  assertOwner(tables.profiles, 'user_id', accountIds, 'profiles');
  assertOwner(tables.profile_favourites, 'profile_id', accountIds, 'profile_favourites');
  assertOwner(tables.profile_game_library, 'profile_id', profileIds, 'profile_game_library');
  assertOwner(tables.profile_top_picks, 'profile_id', accountIds, 'profile_top_picks');
  assertOwner(tables.user_badges, 'user_id', profileIds, 'user_badges', { allowNull: true });
  assertOwner(tables.user_roles, 'user_id', accountIds, 'user_roles');
  assertOwner(tables.email_subscriptions, 'profile_id', profileIds, 'email_subscriptions');
  assertOwner(tables.ccq_weekly_attempts, 'user_id', accountIds, 'ccq_weekly_attempts');
  assertOwner(tables.lost_sizzler_cloud_saves, 'user_id', accountIds, 'lost_sizzler_cloud_saves');
  assertOwner(tables.comments, 'user_id', accountIds, 'comments', { allowNull: true });

  const authOnly = tables.auth_accounts.length - tables.profiles.length;
  if (authOnly !== snapshot.identity.auth_only_accounts) {
    throw new Error('Migration bundle auth-only account count does not match frozen snapshot.');
  }

  return Object.freeze({ bundle, tables });
}

export async function loadSensitiveMigrationBundle(bundlePath, { forApply = false } = {}) {
  const resolved = path.resolve(bundlePath);
  const stat = await fs.lstat(resolved);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Migration bundle must be a regular non-symlink file.');
  if (stat.size <= 0 || stat.size > MAX_BUNDLE_BYTES) throw new Error('Migration bundle size is outside the accepted range.');
  if (process.platform !== 'win32' && (stat.mode & 0o077) !== 0) {
    throw new Error('Sensitive migration bundle permissions must be owner-only (0600).');
  }
  if (forApply) {
    const relative = path.relative(SERVICE_ROOT, resolved);
    if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
      throw new Error('Refusing to import a sensitive migration bundle stored inside the repository service tree.');
    }
  }

  const bytes = await fs.readFile(resolved, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(bytes);
  } catch {
    throw new Error('Migration bundle is not valid JSON.');
  }
  return parsed;
}

function quoteIdentifier(identifier) {
  if (!/^[a-z][a-z0-9_]*$/.test(identifier)) throw new Error('Unsafe SQL identifier in migration importer.');
  return `"${identifier}"`;
}

async function insertRows(tx, spec, rows) {
  for (const row of rows) {
    const columns = spec.columns.filter((column) => row[column] !== undefined);
    if (columns.length === 0) throw new Error(`No importable columns supplied for ${spec.table}.`);
    const values = columns.map((column) => row[column]);
    const placeholders = columns.map((_, index) => `$${index + 1}`);
    await tx.query(
      `insert into ${quoteIdentifier(spec.table)} (${columns.map(quoteIdentifier).join(', ')})
       values (${placeholders.join(', ')})`,
      values
    );
  }
}

async function ensureEmptyDestination(tx) {
  const result = await tx.query(
    `select
       (select count(*) from ccg_users)::int as ccg_users,
       (select count(*) from ccg_auth_accounts)::int as ccg_auth_accounts,
       (select count(*) from ccg_auth_identities)::int as ccg_auth_identities,
       (select count(*) from ccg_profiles)::int as ccg_profiles,
       (select count(*) from profile_favourites)::int as profile_favourites,
       (select count(*) from profile_game_library)::int as profile_game_library,
       (select count(*) from profile_top_picks)::int as profile_top_picks,
       (select count(*) from user_badges)::int as user_badges,
       (select count(*) from user_roles)::int as user_roles,
       (select count(*) from email_subscriptions)::int as email_subscriptions,
       (select count(*) from ccq_weekly_attempts)::int as ccq_weekly_attempts,
       (select count(*) from lost_sizzler_cloud_saves)::int as lost_sizzler_cloud_saves,
       (select count(*) from comments)::int as comments,
       (select count(*) from ccg_auth_sessions)::int as ccg_auth_sessions,
       (select count(*) from ccg_auth_recovery_tokens)::int as ccg_auth_recovery_tokens`
  );
  const counts = result.rows?.[0];
  if (!counts) throw new Error('Could not inspect destination before migration import.');
  const populated = Object.entries(counts).find(([, value]) => Number(value) !== 0);
  if (populated) throw new Error(`Destination is not pristine; ${populated[0]} already contains rows.`);
}

function cloudSaveDestinationRow(source) {
  const row = {
    user_id: source.user_id,
    schema_name: source.schema_name,
    schema_version: source.schema_version,
    game_version: source.game_version,
    save_envelope: source.save_envelope,
    save_checksum: source.save_checksum,
    save_saved_at: source.save_saved_at,
    client_revision_ms: source.client_revision_ms,
    deleted_at: source.deleted_at,
    updated_at: source.updated_at,
  };
  if (source.save_envelope) {
    row.payload_sha256 = hashSavePayload(source.save_envelope).sha256;
  }
  return row;
}

const CLOUD_SAVE_SPEC = Object.freeze({
  table: 'lost_sizzler_cloud_saves',
  columns: Object.freeze([
    'user_id', 'schema_name', 'schema_version', 'game_version', 'save_envelope',
    'save_checksum', 'payload_sha256', 'save_saved_at', 'client_revision_ms',
    'deleted_at', 'updated_at',
  ]),
});

export async function importMigrationBundle(database, bundle, snapshot) {
  const validated = validateMigrationBundle(bundle, snapshot);
  return database.transaction(async (tx) => {
    await ensureEmptyDestination(tx);

    for (const account of validated.tables.auth_accounts) {
      await tx.query('insert into ccg_users (user_id) values ($1)', [account.user_id]);
    }

    for (const key of [
      'auth_accounts', 'auth_identities', 'profiles', 'profile_favourites',
      'profile_game_library', 'profile_top_picks', 'user_badges', 'user_roles',
      'email_subscriptions', 'ccq_weekly_attempts',
    ]) {
      await insertRows(tx, INSERT_SPECS[key], validated.tables[key]);
    }

    await insertRows(
      tx,
      CLOUD_SAVE_SPEC,
      validated.tables.lost_sizzler_cloud_saves.map(cloudSaveDestinationRow)
    );
    await insertRows(tx, INSERT_SPECS.comments, validated.tables.comments);

    const destination = await collectDestinationSummary(tx);
    const verification = compareDestinationToSnapshot(snapshot, destination);
    if (!verification.ok) {
      throw new Error(`Destination verification failed before commit (${verification.mismatches.length} mismatch(es)).`);
    }

    return Object.freeze({
      imported_accounts: snapshot.identity.auth_accounts,
      imported_profiles: snapshot.identity.profiles,
      verified: true,
    });
  });
}

function assertApplyEnvironment() {
  if (process.env.CCG_MIGRATION_TARGET !== 'non-production') {
    throw new Error('Import apply is locked to CCG_MIGRATION_TARGET=non-production.');
  }
  if (process.env.CCG_ALLOW_SENSITIVE_IMPORT !== APPLY_ACK) {
    throw new Error(`Import apply requires CCG_ALLOW_SENSITIVE_IMPORT=${APPLY_ACK}.`);
  }
  const databaseUrl = String(process.env.DATABASE_URL || '').trim();
  if (!databaseUrl) throw new Error('DATABASE_URL is required for migration import apply.');
  return databaseUrl;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || !['--check', '--apply'].includes(args[0])) {
    throw new Error('Use --check <bundle.json> or --apply <bundle.json>.');
  }

  const [mode, bundlePath] = args;
  const snapshot = await loadMigrationSnapshot();
  const bundle = await loadSensitiveMigrationBundle(bundlePath, { forApply: mode === '--apply' });
  validateMigrationBundle(bundle, snapshot);

  if (mode === '--check') {
    process.stdout.write(`${JSON.stringify({
      ok: true,
      captured_date: snapshot.captured_date,
      accounts: snapshot.identity.auth_accounts,
      profiles: snapshot.identity.profiles,
      writes: 0,
    })}\n`);
    return;
  }

  const databaseUrl = assertApplyEnvironment();
  const database = createDatabase(databaseUrl);
  try {
    const result = await importMigrationBundle(database, bundle, snapshot);
    process.stdout.write(`${JSON.stringify({
      ok: true,
      imported_accounts: result.imported_accounts,
      imported_profiles: result.imported_profiles,
      destination_verified: result.verified,
    })}\n`);
  } finally {
    await database.close();
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath && invokedPath === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(`CCG migration import failed: ${error.message}`);
    process.exitCode = 1;
  });
}

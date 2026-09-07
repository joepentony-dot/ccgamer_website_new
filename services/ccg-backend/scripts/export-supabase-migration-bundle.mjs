import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';
import { validateMigrationBundle } from './import-migration-bundle.mjs';
import { loadMigrationSnapshot } from './verify-migration-snapshot.mjs';

const { Pool } = pg;
const SERVICE_ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const REPOSITORY_ROOT = path.resolve(SERVICE_ROOT, '..', '..');
const EXPORT_ACK = 'I_ACCEPT_READ_ONLY_SENSITIVE_EXPORT';

export const SOURCE_QUERIES = Object.freeze({
  auth_accounts: `
    select
      id::text as user_id,
      email::text as email,
      encrypted_password::text as password_hash,
      'bcrypt'::text as password_hash_algorithm,
      email_confirmed_at,
      last_sign_in_at,
      banned_until,
      null::timestamptz as disabled_at,
      deleted_at,
      'supabase'::text as source_provider,
      coalesce(raw_app_meta_data, '{}'::jsonb) as source_app_metadata,
      coalesce(raw_user_meta_data, '{}'::jsonb) as source_user_metadata,
      created_at,
      updated_at
    from auth.users
    where is_anonymous is not true
    order by id
  `,
  auth_identities: `
    select
      id::text as identity_id,
      user_id::text as user_id,
      provider,
      provider_id as provider_subject,
      email,
      coalesce(identity_data, '{}'::jsonb) as identity_metadata,
      last_sign_in_at,
      created_at,
      updated_at
    from auth.identities
    order by user_id, provider, provider_id
  `,
  profiles: `
    select
      id::text as user_id,
      username,
      created_at,
      last_seen,
      mode_pref,
      role,
      avatar_url,
      display_name,
      bio,
      updated_at,
      is_admin,
      notify_new_games,
      notify_newsletter,
      notify_admin,
      banned,
      ban_reason,
      banned_at,
      email,
      preferred_system,
      is_public,
      public_bio,
      show_top_picks,
      show_badges,
      public_list_key,
      public_list_title,
      unsub_token,
      notify_new_games_choice_recorded,
      notify_newsletter_choice_recorded,
      notification_preferences_updated_at,
      hall_of_fame_opt_in,
      supporter_verified,
      supporter_tier,
      supporter_since,
      supporter_note,
      supporter_sort_order,
      notify_weekly_challenge
    from public.profiles
    order by id
  `,
  profile_favourites: `
    select id::text as id, profile_id::text as profile_id, game_slug, created_at
    from public.profile_favourites
    order by id
  `,
  profile_game_library: `
    select
      id::text as id,
      profile_id::text as profile_id,
      game_slug,
      title,
      system,
      release_year,
      lists,
      custom_lists,
      rating,
      note,
      created_at,
      updated_at,
      deleted_at
    from public.profile_game_library
    order by id
  `,
  profile_top_picks: `
    select id::text as id, profile_id::text as profile_id, game_slug, created_at
    from public.profile_top_picks
    order by id
  `,
  user_badges: `
    select id, user_id::text as user_id, badge_code, awarded_at
    from public.user_badges
    order by id
  `,
  user_roles: `
    select user_id::text as user_id, role, updated_at
    from public.user_roles
    order by user_id
  `,
  email_subscriptions: `
    select profile_id::text as profile_id, email, status, unsubscribe_token, updated_at
    from public.email_subscriptions
    order by profile_id
  `,
  ccq_weekly_attempts: `
    select
      id::text as id,
      week_start,
      user_id::text as user_id,
      player_name,
      seed,
      status,
      started_at,
      finished_at,
      score,
      deepest_floor,
      duration_ms,
      level,
      completed,
      stats,
      ghost_path
    from public.ccq_weekly_attempts
    order by id
  `,
  lost_sizzler_cloud_saves: `
    select
      user_id::text as user_id,
      schema_name,
      schema_version,
      game_version,
      save_envelope,
      save_checksum,
      save_saved_at,
      client_revision_ms,
      deleted_at,
      updated_at
    from public.lost_sizzler_solo_saves
    order by user_id
  `,
  comments: `
    select
      id::text as id,
      user_id::text as user_id,
      game_key,
      body,
      created_at,
      deleted,
      updated_at,
      page_type,
      page_id
    from public.comments
    order by id
  `,
});

const FORBIDDEN_SOURCE_SQL = /\b(insert|update|delete|truncate|alter|drop|create|grant|revoke|copy|call|do)\b/i;
const FORBIDDEN_AUTH_TOKEN_COLUMNS = /\b(confirmation_token|recovery_token|email_change_token_new|email_change_token_current|phone_change_token|reauthentication_token)\b/i;

export function validateSourceQueryContract(queries = SOURCE_QUERIES) {
  const expectedKeys = [
    'auth_accounts', 'auth_identities', 'profiles', 'profile_favourites',
    'profile_game_library', 'profile_top_picks', 'user_badges', 'user_roles',
    'email_subscriptions', 'ccq_weekly_attempts', 'lost_sizzler_cloud_saves', 'comments',
  ];
  if (Object.keys(queries).length !== expectedKeys.length) throw new Error('Unexpected source migration query set.');
  for (const key of expectedKeys) {
    const sql = String(queries[key] || '').trim();
    if (!/^select\b/i.test(sql)) throw new Error(`Source query ${key} must be SELECT-only.`);
    if (FORBIDDEN_SOURCE_SQL.test(sql)) throw new Error(`Source query ${key} contains a forbidden SQL verb.`);
    if (FORBIDDEN_AUTH_TOKEN_COLUMNS.test(sql)) throw new Error(`Source query ${key} selects forbidden Supabase token material.`);
    if (/\bauth\.sessions\b/i.test(sql)) throw new Error(`Source query ${key} must never read Supabase sessions.`);
  }
  if (!/\bencrypted_password\b/i.test(queries.auth_accounts)) {
    throw new Error('Auth account export must include the existing password hash for password continuity.');
  }
  return true;
}

export async function collectSourceMigrationRows(client, queries = SOURCE_QUERIES) {
  validateSourceQueryContract(queries);
  const tables = {};
  for (const [key, sql] of Object.entries(queries)) {
    const result = await client.query(sql);
    tables[key] = result.rows || [];
  }
  return Object.freeze(tables);
}

export function buildMigrationBundle(tables, snapshot) {
  const bundle = {
    bundle_version: 1,
    source_system: 'supabase-read-only-export',
    captured_date: snapshot.captured_date,
    tables,
  };
  validateMigrationBundle(bundle, snapshot);
  return bundle;
}

function isInsideRepository(candidatePath) {
  const relative = path.relative(REPOSITORY_ROOT, candidatePath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export async function writeSensitiveMigrationBundle(outputPath, bundle) {
  const resolved = path.resolve(outputPath);
  if (isInsideRepository(resolved)) {
    throw new Error('Refusing to write sensitive migration data anywhere inside the repository.');
  }
  const parent = path.dirname(resolved);
  const parentStat = await fs.stat(parent);
  if (!parentStat.isDirectory()) throw new Error('Migration export parent path is not a directory.');

  const bytes = `${JSON.stringify(bundle, null, 2)}\n`;
  const handle = await fs.open(resolved, 'wx', 0o600);
  let completed = false;
  try {
    await handle.writeFile(bytes, 'utf8');
    await handle.sync();
    if (process.platform !== 'win32') await handle.chmod(0o600);
    completed = true;
  } finally {
    await handle.close();
    if (!completed) await fs.rm(resolved, { force: true });
  }
  return Object.freeze({ path: resolved, bytes: Buffer.byteLength(bytes) });
}

function sourceSslConfig(mode) {
  if (mode === 'disable') return false;
  if (mode !== 'require') throw new Error('CCG_SOURCE_DB_SSL must be require or disable.');
  return { rejectUnauthorized: true };
}

export async function exportSupabaseMigrationBundle({
  sourceDatabaseUrl,
  outputPath,
  sourceSslMode = 'require',
  snapshot = null,
}) {
  if (!sourceDatabaseUrl) throw new Error('Supabase source database URL is required.');
  if (!outputPath) throw new Error('Migration export output path is required.');
  const frozenSnapshot = snapshot || await loadMigrationSnapshot();

  const pool = new Pool({
    connectionString: sourceDatabaseUrl,
    ssl: sourceSslConfig(sourceSslMode),
    max: 1,
    application_name: 'ccg-read-only-migration-export',
  });
  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query('begin isolation level repeatable read read only');
    transactionOpen = true;
    const tables = await collectSourceMigrationRows(client);
    const bundle = buildMigrationBundle(tables, frozenSnapshot);
    await client.query('commit');
    transactionOpen = false;
    return writeSensitiveMigrationBundle(outputPath, bundle);
  } catch (error) {
    if (transactionOpen) {
      try {
        await client.query('rollback');
      } catch {
        // Preserve the original export failure.
      }
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

function assertCliEnvironment() {
  if (process.env.CCG_SOURCE_EXPORT_ACK !== EXPORT_ACK) {
    throw new Error(`Sensitive source export requires CCG_SOURCE_EXPORT_ACK=${EXPORT_ACK}.`);
  }
  const sourceDatabaseUrl = String(process.env.SUPABASE_SOURCE_DATABASE_URL || '').trim();
  if (!sourceDatabaseUrl) throw new Error('SUPABASE_SOURCE_DATABASE_URL is required.');
  const sourceSslMode = String(process.env.CCG_SOURCE_DB_SSL || 'require').trim();
  return { sourceDatabaseUrl, sourceSslMode };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--output') {
    throw new Error('Use --output <external-sensitive-bundle.json>.');
  }
  const outputPath = args[1];
  const { sourceDatabaseUrl, sourceSslMode } = assertCliEnvironment();
  const result = await exportSupabaseMigrationBundle({
    sourceDatabaseUrl,
    outputPath,
    sourceSslMode,
  });
  process.stdout.write(`${JSON.stringify({
    ok: true,
    output_file_created: true,
    bytes: result.bytes,
    source_transaction: 'repeatable-read-read-only',
  })}\n`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath && invokedPath === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(`CCG Supabase migration export failed: ${error.message}`);
    process.exitCode = 1;
  });
}

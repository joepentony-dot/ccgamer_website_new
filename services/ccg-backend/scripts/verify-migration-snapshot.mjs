import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createDatabase } from '../src/db.mjs';

const DEFAULT_SNAPSHOT_URL = new URL('../migration/source-snapshot-2026-09-06.json', import.meta.url);
const SAFE_COUNT_KEYS = Object.freeze([
  'auth_accounts',
  'email_identities',
  'password_backed_accounts',
  'email_confirmed_accounts',
  'profiles',
  'auth_only_accounts',
]);
const CUTOVER_TABLE_KEYS = Object.freeze([
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

function requireNonNegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`Invalid snapshot count: ${label}`);
  return value;
}

function validateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) throw new Error('Migration snapshot must be a JSON object.');
  if (snapshot.snapshot_version !== 1) throw new Error('Unsupported migration snapshot version.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(snapshot.captured_date || ''))) throw new Error('Migration snapshot captured_date is invalid.');
  if (snapshot.source_system !== 'supabase-read-only') throw new Error('Migration snapshot source_system must be supabase-read-only.');

  for (const key of SAFE_COUNT_KEYS) requireNonNegativeInteger(snapshot.identity?.[key], `identity.${key}`);
  for (const key of CUTOVER_TABLE_KEYS) requireNonNegativeInteger(snapshot.cutover_data?.[key], `cutover_data.${key}`);

  if (snapshot.identity.auth_accounts !== snapshot.identity.email_identities) {
    throw new Error('Migration snapshot identity invariant failed: auth accounts and email identities differ.');
  }
  if (snapshot.identity.profiles + snapshot.identity.auth_only_accounts !== snapshot.identity.auth_accounts) {
    throw new Error('Migration snapshot identity invariant failed: profiles plus auth-only accounts must equal auth accounts.');
  }
  if (snapshot.identity.password_backed_accounts !== snapshot.identity.auth_accounts) {
    throw new Error('Migration snapshot identity invariant failed: not every source account is password-backed.');
  }

  for (const key of ['contains_user_ids', 'contains_emails', 'contains_password_hashes', 'contains_session_tokens', 'contains_unsubscribe_tokens']) {
    if (snapshot.security?.[key] !== false) throw new Error(`Sanitized migration snapshot must declare ${key}=false.`);
  }

  return snapshot;
}

export async function loadMigrationSnapshot(snapshotUrl = DEFAULT_SNAPSHOT_URL) {
  const bytes = await fs.readFile(snapshotUrl, 'utf8');
  if (bytes.length > 128 * 1024) throw new Error('Migration snapshot is unexpectedly large.');
  let parsed;
  try {
    parsed = JSON.parse(bytes);
  } catch {
    throw new Error('Migration snapshot is not valid JSON.');
  }
  return Object.freeze(validateSnapshot(parsed));
}

export async function collectDestinationSummary(database) {
  if (!database?.query) throw new Error('Migration verifier requires a database query boundary.');

  const countsResult = await database.query(
    `select
       (select count(*) from ccg_auth_accounts)::int as auth_accounts,
       (select count(*) from ccg_auth_identities where provider = 'email')::int as email_identities,
       (select count(*) from ccg_auth_accounts where password_hash is not null)::int as password_backed_accounts,
       (select count(*) from ccg_auth_accounts where email_confirmed_at is not null)::int as email_confirmed_accounts,
       (select count(*) from ccg_profiles)::int as profiles,
       (select count(*) from ccg_auth_accounts a left join ccg_profiles p on p.user_id = a.user_id where p.user_id is null)::int as auth_only_accounts,
       (select count(*) from profile_favourites)::int as profile_favourites,
       (select count(*) from profile_game_library)::int as profile_game_library,
       (select count(*) from profile_top_picks)::int as profile_top_picks,
       (select count(*) from user_badges)::int as user_badges,
       (select count(*) from user_roles)::int as user_roles,
       (select count(*) from email_subscriptions)::int as email_subscriptions,
       (select count(*) from ccq_weekly_attempts)::int as ccq_weekly_attempts,
       (select count(*) from lost_sizzler_cloud_saves)::int as lost_sizzler_cloud_saves,
       (select count(*) from comments)::int as comments,
       (select count(*) from ccg_auth_accounts where password_hash is not null and coalesce(password_hash_algorithm, '') <> 'bcrypt')::int as unsupported_password_hash_accounts,
       (select count(*) from ccg_auth_sessions)::int as ccg_auth_sessions,
       (select count(*) from ccg_auth_recovery_tokens)::int as ccg_auth_recovery_tokens`
  );
  const counts = countsResult.rows?.[0];
  if (!counts) throw new Error('Migration verifier could not read destination counts.');

  const orphanResult = await database.query(
    `select
       (select count(*) from ccg_auth_identities i left join ccg_auth_accounts a on a.user_id = i.user_id where a.user_id is null)::int as auth_identities,
       (select count(*) from ccg_profiles p left join ccg_auth_accounts a on a.user_id = p.user_id where a.user_id is null)::int as profiles,
       (select count(*) from profile_favourites x left join ccg_auth_accounts a on a.user_id = x.profile_id where a.user_id is null)::int as profile_favourites,
       (select count(*) from profile_game_library x left join ccg_profiles p on p.user_id = x.profile_id where p.user_id is null)::int as profile_game_library,
       (select count(*) from profile_top_picks x left join ccg_auth_accounts a on a.user_id = x.profile_id where a.user_id is null)::int as profile_top_picks,
       (select count(*) from user_badges x left join ccg_profiles p on p.user_id = x.user_id where x.user_id is not null and p.user_id is null)::int as user_badges,
       (select count(*) from user_roles x left join ccg_auth_accounts a on a.user_id = x.user_id where a.user_id is null)::int as user_roles,
       (select count(*) from email_subscriptions x left join ccg_profiles p on p.user_id = x.profile_id where p.user_id is null)::int as email_subscriptions,
       (select count(*) from ccq_weekly_attempts x left join ccg_auth_accounts a on a.user_id = x.user_id where a.user_id is null)::int as ccq_weekly_attempts,
       (select count(*) from lost_sizzler_cloud_saves x left join ccg_auth_accounts a on a.user_id = x.user_id where a.user_id is null)::int as lost_sizzler_cloud_saves,
       (select count(*) from comments x left join ccg_auth_accounts a on a.user_id = x.user_id where x.user_id is not null and a.user_id is null)::int as comments`
  );
  const orphans = orphanResult.rows?.[0];
  if (!orphans) throw new Error('Migration verifier could not read destination ownership checks.');

  return Object.freeze({ counts: Object.freeze({ ...counts }), orphans: Object.freeze({ ...orphans }) });
}

export function compareDestinationToSnapshot(snapshot, destination, { requirePristineSessions = true } = {}) {
  validateSnapshot(snapshot);
  if (!destination?.counts || !destination?.orphans) throw new Error('Destination summary is incomplete.');

  const mismatches = [];
  for (const key of SAFE_COUNT_KEYS) {
    const expected = snapshot.identity[key];
    const actual = Number(destination.counts[key]);
    if (actual !== expected) mismatches.push(Object.freeze({ field: `identity.${key}`, expected, actual }));
  }
  for (const key of CUTOVER_TABLE_KEYS) {
    const expected = snapshot.cutover_data[key];
    const actual = Number(destination.counts[key]);
    if (actual !== expected) mismatches.push(Object.freeze({ field: `cutover_data.${key}`, expected, actual }));
  }

  if (Number(destination.counts.unsupported_password_hash_accounts) !== 0) {
    mismatches.push(Object.freeze({
      field: 'security.unsupported_password_hash_accounts',
      expected: 0,
      actual: Number(destination.counts.unsupported_password_hash_accounts),
    }));
  }

  if (requirePristineSessions) {
    for (const key of ['ccg_auth_sessions', 'ccg_auth_recovery_tokens']) {
      const actual = Number(destination.counts[key]);
      if (actual !== 0) mismatches.push(Object.freeze({ field: `migration_hygiene.${key}`, expected: 0, actual }));
    }
  }

  for (const [key, rawValue] of Object.entries(destination.orphans)) {
    const actual = Number(rawValue);
    if (actual !== 0) mismatches.push(Object.freeze({ field: `ownership_orphans.${key}`, expected: 0, actual }));
  }

  return Object.freeze({ ok: mismatches.length === 0, mismatches: Object.freeze(mismatches) });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !['--check-manifest', '--check-destination'].includes(args[0])) {
    throw new Error('Use exactly one of --check-manifest or --check-destination. This verifier never writes migration data.');
  }

  const snapshot = await loadMigrationSnapshot();
  if (args[0] === '--check-manifest') {
    process.stdout.write(`${JSON.stringify({ ok: true, captured_date: snapshot.captured_date, account_count: snapshot.identity.auth_accounts, profile_count: snapshot.identity.profiles })}\n`);
    return;
  }

  const databaseUrl = String(process.env.DATABASE_URL || '').trim();
  if (!databaseUrl) throw new Error('DATABASE_URL is required for --check-destination.');
  const database = createDatabase(databaseUrl);
  try {
    const destination = await collectDestinationSummary(database);
    const result = compareDestinationToSnapshot(snapshot, destination);
    if (!result.ok) {
      for (const mismatch of result.mismatches) {
        console.error(`${mismatch.field}: expected ${mismatch.expected}, found ${mismatch.actual}`);
      }
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`${JSON.stringify({ ok: true, captured_date: snapshot.captured_date, verified_accounts: snapshot.identity.auth_accounts, verified_profiles: snapshot.identity.profiles })}\n`);
  } finally {
    await database.close();
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath && invokedPath === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(`CCG migration snapshot verifier failed: ${error.message}`);
    process.exitCode = 1;
  });
}

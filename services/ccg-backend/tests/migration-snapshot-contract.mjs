import assert from 'node:assert/strict';
import {
  collectDestinationSummary,
  compareDestinationToSnapshot,
  loadMigrationSnapshot,
} from '../scripts/verify-migration-snapshot.mjs';

const snapshot = await loadMigrationSnapshot();
assert.equal(snapshot.snapshot_version, 1);
assert.equal(snapshot.identity.auth_accounts, 33);
assert.equal(snapshot.identity.profiles, 27);
assert.equal(snapshot.identity.auth_only_accounts, 6);
assert.equal(snapshot.security.contains_password_hashes, false);
assert.equal(snapshot.security.contains_session_tokens, false);
assert.equal(snapshot.security.contains_unsubscribe_tokens, false);

const matchingCounts = {
  ...snapshot.identity,
  ...snapshot.cutover_data,
  unsupported_password_hash_accounts: 0,
  ccg_auth_sessions: 0,
  ccg_auth_recovery_tokens: 0,
};
const matchingOrphans = {
  auth_identities: 0,
  profiles: 0,
  profile_favourites: 0,
  profile_game_library: 0,
  profile_top_picks: 0,
  user_badges: 0,
  user_roles: 0,
  email_subscriptions: 0,
  ccq_weekly_attempts: 0,
  lost_sizzler_cloud_saves: 0,
  comments: 0,
};

let queryCount = 0;
const fakeDatabase = {
  async query() {
    queryCount += 1;
    return { rows: [queryCount === 1 ? matchingCounts : matchingOrphans] };
  },
};
const collected = await collectDestinationSummary(fakeDatabase);
assert.deepEqual(collected.counts, matchingCounts);
assert.deepEqual(collected.orphans, matchingOrphans);
assert.equal(queryCount, 2);

const matching = compareDestinationToSnapshot(snapshot, collected);
assert.equal(matching.ok, true);
assert.deepEqual(matching.mismatches, []);

const wrongProfileCount = compareDestinationToSnapshot(snapshot, {
  counts: { ...matchingCounts, profiles: 26 },
  orphans: matchingOrphans,
});
assert.equal(wrongProfileCount.ok, false);
assert.deepEqual(wrongProfileCount.mismatches[0], {
  field: 'identity.profiles',
  expected: 27,
  actual: 26,
});

const unsupportedHash = compareDestinationToSnapshot(snapshot, {
  counts: { ...matchingCounts, unsupported_password_hash_accounts: 1 },
  orphans: matchingOrphans,
});
assert.equal(unsupportedHash.ok, false);
assert.equal(unsupportedHash.mismatches.some((entry) => entry.field === 'security.unsupported_password_hash_accounts'), true);

const importedSession = compareDestinationToSnapshot(snapshot, {
  counts: { ...matchingCounts, ccg_auth_sessions: 1 },
  orphans: matchingOrphans,
});
assert.equal(importedSession.ok, false);
assert.equal(importedSession.mismatches.some((entry) => entry.field === 'migration_hygiene.ccg_auth_sessions'), true);

const allowedPostLoginSession = compareDestinationToSnapshot(
  snapshot,
  { counts: { ...matchingCounts, ccg_auth_sessions: 1 }, orphans: matchingOrphans },
  { requirePristineSessions: false }
);
assert.equal(allowedPostLoginSession.ok, true);

const orphanedProfile = compareDestinationToSnapshot(snapshot, {
  counts: matchingCounts,
  orphans: { ...matchingOrphans, profiles: 1 },
});
assert.equal(orphanedProfile.ok, false);
assert.equal(orphanedProfile.mismatches.some((entry) => entry.field === 'ownership_orphans.profiles'), true);

console.log('CCG migration snapshot contract passed: sanitized source counts, destination count parity, hash-format safety, pristine-session hygiene and ownership-orphan refusal are enforced without exposing user records.');

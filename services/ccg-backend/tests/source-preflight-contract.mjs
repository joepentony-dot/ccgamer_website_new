import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';

const snapshotUrl = new URL('../migration/source-snapshot-2026-09-06.json', import.meta.url);
const preflightUrl = new URL('../migration/source-preflight-2026-09-06.json', import.meta.url);

const [snapshotText, preflightText] = await Promise.all([
  fs.readFile(snapshotUrl, 'utf8'),
  fs.readFile(preflightUrl, 'utf8'),
]);
const snapshot = JSON.parse(snapshotText);
const preflight = JSON.parse(preflightText);

assert.equal(preflight.preflight_version, 1);
assert.equal(preflight.captured_date, snapshot.captured_date);
assert.equal(preflight.source_system, 'supabase-read-only');
assert.equal(preflight.migration_critical_match, true);
assert.deepEqual(preflight.identity, snapshot.identity);
assert.deepEqual(preflight.cutover_data, snapshot.cutover_data);

assert.deepEqual(preflight.password_structure, {
  password_backed_accounts: snapshot.identity.password_backed_accounts,
  bcrypt_2a_accounts: snapshot.identity.password_backed_accounts,
  min_hash_length: 60,
  max_hash_length: 60,
  hash_values_recorded: false,
});

for (const [key, value] of Object.entries(preflight.ownership)) {
  assert.equal(value, 0, `${key} must remain zero before migration.`);
}
for (const [key, value] of Object.entries(preflight.uniqueness)) {
  assert.equal(value, 0, `${key} must remain zero before migration.`);
}
assert.deepEqual(preflight.currently_empty_user_tables, snapshot.currently_empty_user_tables);

const oldRatings = preflight.retirement_followup.legacy_old_game_ratings;
assert.equal(oldRatings.rows, snapshot.retirement_followup.legacy_old_game_ratings.rows);
assert.equal(oldRatings.rows_with_user_id, snapshot.retirement_followup.legacy_old_game_ratings.rows_with_user_id);
assert.equal(oldRatings.distinct_linked_users, snapshot.retirement_followup.legacy_old_game_ratings.distinct_linked_users);
assert.equal(oldRatings.orphans, 0);
assert.equal(oldRatings.delta_from_frozen, 0);
assert.equal(oldRatings.classification, snapshot.retirement_followup.legacy_old_game_ratings.classification);

const announcements = preflight.retirement_followup.content_announcements;
assert.equal(announcements.rows, snapshot.retirement_followup.content_announcements.rows);
assert.equal(announcements.rows_with_actor_user_id, snapshot.retirement_followup.content_announcements.rows_with_actor_user_id);
assert.equal(announcements.distinct_linked_users, snapshot.retirement_followup.content_announcements.distinct_linked_users);
assert.equal(announcements.orphans, 0);
assert.equal(announcements.delta_from_frozen, 0);
assert.equal(announcements.classification, snapshot.retirement_followup.content_announcements.classification);

const telemetry = preflight.retirement_followup.game_play_events;
assert.equal(telemetry.frozen_rows, snapshot.retirement_followup.game_play_events.rows);
assert.equal(telemetry.frozen_rows_with_auth_user_id, snapshot.retirement_followup.game_play_events.rows_with_auth_user_id);
assert.equal(telemetry.distinct_linked_users, snapshot.retirement_followup.game_play_events.distinct_linked_users);
assert.equal(telemetry.orphans, 0);
assert.equal(telemetry.rows - telemetry.frozen_rows, telemetry.delta_from_frozen);
assert.equal(
  telemetry.rows_with_auth_user_id - telemetry.frozen_rows_with_auth_user_id,
  telemetry.authenticated_delta_from_frozen
);
assert.ok(telemetry.delta_from_frozen >= 0, 'Live telemetry may advance but must not move backwards from the frozen retirement snapshot.');
assert.ok(telemetry.authenticated_delta_from_frozen >= 0, 'Authenticated telemetry may advance but must not move backwards.');
assert.equal(telemetry.classification, snapshot.retirement_followup.game_play_events.classification);

for (const [key, value] of Object.entries(preflight.security)) {
  assert.equal(value, false, `${key} must remain false in sanitized preflight evidence.`);
}

const uuidPattern = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const bcryptPattern = /\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/;
const jwtPattern = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/;
assert.doesNotMatch(preflightText, uuidPattern, 'Sanitized preflight must not contain user UUIDs.');
assert.doesNotMatch(preflightText, emailPattern, 'Sanitized preflight must not contain email addresses.');
assert.doesNotMatch(preflightText, bcryptPattern, 'Sanitized preflight must not contain password hashes.');
assert.doesNotMatch(preflightText, jwtPattern, 'Sanitized preflight must not contain JWT/session material.');

console.log('CCG source preflight contract passed: migration-critical counts match the frozen snapshot, ownership and uniqueness are clean, password structure is migration-compatible, telemetry drift is isolated, and repository evidence contains no row-level identity or credential material.');

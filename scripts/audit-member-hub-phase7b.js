#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const failures = [];

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function requireText(source, pattern, message) {
  if (!pattern.test(source)) failures.push(message);
}

function forbidText(source, pattern, message) {
  if (pattern.test(source)) failures.push(message);
}

const profileLists = read('resources/js/auth/profile-lists.js');
const personalControls = read('js/ccg-personal-library-controls.js');
const customCollections = read('resources/js/auth/member-custom-collections.js');
const sync = read('resources/js/auth/member-library-sync.js');
const loyalty = read('resources/js/auth/member-loyalty-badges.js');
const inputHarden = read('admin/js/input-harden.js');
const adminCss = read('resources/css/ccg-admin.css');
const guard = read('admin/js/guard.js');
const migration = read('supabase/migrations/20260805_member_hub_deletion_tombstones.sql');
const safety = read('js/ccg-member-data-safety.js');

[
  ['profile list removals', profileLists],
  ['single-game controls', personalControls],
  ['custom collection management', customCollections],
  ['account synchronisation', sync]
].forEach(([label, source]) => {
  requireText(source, /ccgPersonalGameLibraryTombstonesV1/, `${label} does not use persistent deletion tombstones.`);
});

requireText(profileLists, /customLists\(entry\)/, 'Standard-list removal does not inspect custom collection membership.');
requireText(profileLists, /entryIsEmpty\(item\)/, 'Standard-list removal does not use the complete entry emptiness check.');
requireText(profileLists, /markDeleted\(slug,\s*changedAt\)/, 'Standard-list removal does not persist a deletion tombstone.');
forbidText(profileLists, /JSON\.stringify\(payload,\s*null,\s*2\)|ccg-personal-game-library\.json|exportData\s*\(/, 'Member list source still exposes JSON export.');

requireText(personalControls, /persistEntry\(library,\s*slug,\s*item\)/, 'Single-game controls do not centralise deletion-safe persistence.');
requireText(personalControls, /markDeleted\(slug,\s*changedAt\)/, 'Single-game controls do not record complete-entry deletions.');

requireText(customCollections, /persistEntry\(library,\s*slug,\s*entry/, 'Custom collection manager does not preserve deletion state.');
requireText(customCollections, /markDeleted\(slug,\s*changedAt\)/, 'Custom collection manager does not record deleted empty entries.');

requireText(sync, /\.select\('[^']*deleted_at[^']*'\)/, 'Cloud reconciliation does not request deleted_at.');
requireText(sync, /deleted_at:\s*value\.timestampIso/, 'Cloud reconciliation does not upload deletion tombstones.');
requireText(sync, /if\s*\(localValue\.deleted\s*!==\s*remoteValue\.deleted\)\s*return\s+localValue\.deleted/, 'Equal-time conflicts do not prefer deletion.');
requireText(sync, /Phase 7B deletion-safety migration/, 'Missing Phase 7B migration status is not explained to members.');
forbidText(sync, /Import JSON|importJsonFile|normalizeImportedLibrary|function exportCsv|createButton\(['"]exportPersonalLibraryCsv/, 'Member synchronisation source still creates JSON import or duplicate export controls.');
requireText(sync, /Member Hub Features/, 'Completed Member Hub functionality is still described as a future phase.');
requireText(sync, /private custom collections/, 'Member Hub copy does not state the private custom-collection status.');

requireText(safety, /Master archive JSON cannot be imported or exported here/, 'CSV-only safety notice is missing.');
requireText(safety, /downloadMemberProfileCsv/, 'Safe profile-and-games CSV control is missing.');

requireText(migration, /add column if not exists deleted_at timestamptz/i, 'Deletion tombstone migration does not add deleted_at.');
requireText(migration, /profile_game_library_profile_deleted_idx/, 'Deletion tombstone migration does not add its supporting index.');

requireText(inputHarden, /MASTER_DATA_PAGE_PATTERN/, 'Legacy master-data page has no synchronous head gate.');
requireText(inputHarden, /document\.documentElement\.style\.visibility\s*=\s*'hidden'/, 'Legacy master-data page is not concealed before first paint.');
requireText(adminCss, /body\.ccg-admin\s*>\s*main\.builder-wrap/, 'Game Builder has no first-stylesheet concealment rule.');
requireText(adminCss, /data-ccg-master-data-gate="granted"/, 'Game Builder concealment is not tied to authenticated grant state.');
requireText(guard, /MASTER_DATA_ROLES\s*=\s*Object\.freeze\(\['admin',\s*'superadmin'\]\)/, 'Master-data roles are not limited to admin and superadmin.');
requireText(guard, /isOwner\(email\)/, 'Configured owner override is missing.');
requireText(guard, /dataset\.ccgMasterDataGate\s*=\s*'granted'/, 'Guard does not reveal protected pages after access is granted.');

requireText(loyalty, /function earliestDate\(/, 'Loyalty badges do not compare account and profile creation dates.');
requireText(loyalty, /earliestDate\(profile\?\.created_at,\s*user\.created_at\)/, 'Loyalty tenure does not use the earliest valid membership date.');

if (failures.length) {
  console.error('Phase 7B Member Hub audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Phase 7B Member Hub audit passed.');
console.log('Deletion tombstones, CSV-only member controls, first-paint admin gating, current copy and loyalty tenure are protected.');

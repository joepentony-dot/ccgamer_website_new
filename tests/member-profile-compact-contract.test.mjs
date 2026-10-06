import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const profileHtml = fs.readFileSync('community/profile.html', 'utf8');
const memberHubCss = fs.readFileSync('resources/css/member-hub.css', 'utf8');
const profileJs = fs.readFileSync('resources/js/auth/profile-page.js', 'utf8');
const memberHubJs = fs.readFileSync('resources/js/auth/member-hub.js', 'utf8');
const libraryInterface = fs.readFileSync('js/ccg-member-library-interface.js', 'utf8');
const customCollections = fs.readFileSync('resources/js/auth/member-custom-collections.js', 'utf8');
const memberCommunity = fs.readFileSync('resources/js/auth/member-community.js', 'utf8');
const achievementCss = fs.readFileSync('resources/css/member-achievement-badges.css', 'utf8');
const loyaltyCss = fs.readFileSync('resources/css/member-loyalty-badges.css', 'utf8');
const avatarMigration = fs.readFileSync(
  'supabase/migrations/20261006123000_add_member_profile_avatars.sql',
  'utf8'
);

test('member profile uses the compact single-page layout', () => {
  assert.match(profileHtml, /member-dashboard-grid/);
  assert.match(profileHtml, /member-dashboard-primary/);
  assert.match(profileHtml, /member-dashboard-sidebar/);
  assert.match(profileHtml, /member-panel--compact/);
  assert.match(profileHtml, /<details class="member-compact-details">/);

  for (const removedId of [
    'memberCommunity',
    'memberBenefitsTitle',
    'memberUpdatesTitle',
    'memberSuggestionTitle',
    'memberCompletionPercent',
    'memberHubNav'
  ]) {
    assert.ok(!profileHtml.includes(removedId), `Bulky member section still present: ${removedId}`);
  }
});

test('avatar editing is visible and wired into profile storage', () => {
  assert.match(profileHtml, /id="profileAvatar"/);
  assert.match(profileHtml, /id="avatarInput"/);
  assert.match(profileHtml, /id="avatarRemoveBtn"/);
  assert.match(profileHtml, /Change avatar/);

  assert.match(profileJs, /const AVATAR_BUCKET = 'profile-avatars'/);
  assert.match(profileJs, /AVATAR_SIZE = 512/);
  assert.match(profileJs, /\.upload\(objectPath, blob/);
  assert.match(profileJs, /\.update\(\{ avatar_url: avatarUrl \}\)/);
  assert.match(profileJs, /\.update\(\{ avatar_url: null \}\)/);
});

test('avatar storage is constrained to the signed-in member folder', () => {
  assert.match(avatarMigration, /'profile-avatars'/);
  assert.match(avatarMigration, /2097152/);
  assert.match(avatarMigration, /image\/webp/);
  assert.match(avatarMigration, /storage\.foldername\(name\)/);
  assert.match(avatarMigration, /auth\.uid\(\)/);
  assert.match(avatarMigration, /for insert\s+to authenticated/i);
  assert.match(avatarMigration, /for update\s+to authenticated/i);
  assert.match(avatarMigration, /for delete\s+to authenticated/i);
});

test('member hub CSS keeps badges and stats compact', () => {
  assert.match(memberHubCss, /grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(memberHubCss, /min-height:\s*38px/);
  assert.match(memberHubCss, /member-avatar-editor/);
  assert.match(memberHubCss, /member-compact-details/);
});

test('member settings no longer writes retired profile preference columns', () => {
  assert.doesNotMatch(memberHubJs, /notify_new_games_opt_in/);
});


test('optional Member Hub tools stay collapsed instead of extending the page', () => {
  assert.match(profileHtml, /member-milestones-details/);
  assert.match(profileHtml, /<details[^>]+id="memberAchievements"/);
  assert.match(libraryInterface, /document\.createElement\(compact \? "details" : "section"\)/);
  assert.match(libraryInterface, /member-personal-library-details/);
  assert.match(memberCommunity, /document\.createElement\('details'\)/);
  assert.match(memberCommunity, /member-public-settings member-compact-details/);
});

test('compact profile does not dynamically inflate the four-stat summary', () => {
  assert.match(libraryInterface, /if \(isCompactHub\(\)\) return;/);
  assert.match(customCollections, /if \(document\.querySelector\("\.member-dashboard-grid"\)\) return;/);
});

test('detailed achievement and loyalty surfaces use dense Member Hub rows', () => {
  assert.match(achievementCss, /grid-template-columns:\s*34px minmax\(0, 1fr\)/);
  assert.match(achievementCss, /min-height:\s*0/);
  assert.match(achievementCss, /member-achievement-card__description[\s\S]*display:\s*none/);
  assert.match(loyaltyCss, /grid-template-columns:\s*64px minmax\(0, 1fr\)/);
  assert.match(loyaltyCss, /member-loyalty-badge__message[\s\S]*display:\s*none/);
});

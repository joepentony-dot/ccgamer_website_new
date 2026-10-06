import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const html = fs.readFileSync('community/profile.html', 'utf8');
const css = fs.readFileSync('resources/css/member-hub.css', 'utf8');
const achievementCss = fs.readFileSync('resources/css/member-achievement-badges.css', 'utf8');
const achievementJs = fs.readFileSync('resources/js/auth/member-achievement-badges.js', 'utf8');
const profileJs = fs.readFileSync('resources/js/auth/profile-page.js', 'utf8');
const memberHubJs = fs.readFileSync('resources/js/auth/member-hub.js', 'utf8');
const avatarMigration = fs.readFileSync(
  'supabase/migrations/20261006123000_add_member_profile_avatars.sql',
  'utf8'
);

test('member hub keeps the core information sections in compact menus', () => {
  assert.match(html, /<details id="memberFavourites"/);
  assert.match(html, /<details id="memberReviews"/);
  assert.match(html, /<details class="member-panel member-panel--compact member-achievements-menu" id="memberAchievements">/);
  assert.match(html, /<details class="member-account-settings member-info-menu" id="memberSettings">/);
  assert.match(html, /<details class="member-compact-details" id="memberCommunity">/);

  assert.doesNotMatch(html, /Member Benefits/);
  assert.doesNotMatch(html, /Share Your Verdict/);
  assert.doesNotMatch(html, /New and Recently Updated/);
});

test('achievements are collapsed by default and use a dense information grid', () => {
  const achievementTag = html.match(/<details[^>]+id="memberAchievements"[^>]*>/)?.[0] || '';
  assert.ok(achievementTag);
  assert.doesNotMatch(achievementTag, /\sopen(?:\s|=|>)/);

  assert.match(css, /\.member-achievements-menu__summary/);
  assert.match(css, /\.member-info-menu__summary/);
  assert.match(achievementCss, /grid-template-columns:\s*repeat\(4/);
  assert.match(achievementCss, /min-height:\s*82px/);
  assert.match(achievementCss, /-webkit-line-clamp:\s*2/);

  assert.doesNotMatch(achievementJs, /document\.createElement\('details'\)/);
  assert.match(achievementJs, /section\.insertBefore\(panel, legacyGrid\)/);
  assert.match(achievementJs, /section\.open = true/);
});

test('member navigation opens targeted accordion sections', () => {
  assert.match(memberHubJs, /target\?\.tagName === "DETAILS"/);
  assert.match(memberHubJs, /target\.open = true/);
});

test('member profile exposes custom avatar controls', () => {
  assert.match(html, /id="profileAvatarInput"/);
  assert.match(html, /id="profileAvatarChange"/);
  assert.match(html, /id="profileAvatarRemove"/);
  assert.match(html, /JPG, PNG or WebP/);
});

test('avatar upload optimises source images before protected storage', () => {
  assert.match(profileJs, /PROFILE_AVATAR_BUCKET = 'profile-avatars'/);
  assert.match(profileJs, /PROFILE_AVATAR_SIZE = 512/);
  assert.match(profileJs, /PROFILE_AVATAR_SOURCE_MAX_BYTES = 8 \* 1024 \* 1024/);
  assert.match(profileJs, /canvas\.toBlob\(resolve, 'image\/webp', 0\.86\)/);
  assert.match(profileJs, /avatar\.webp/);
  assert.match(profileJs, /contentType: 'image\/webp'/);
  assert.match(profileJs, /avatar_url: avatarUrl/);
});

test('avatar migration constrains storage writes to the signed-in member folder', () => {
  assert.match(avatarMigration, /'profile-avatars'/);
  assert.match(avatarMigration, /2097152/);
  assert.match(avatarMigration, /storage\.foldername\(name\)/);
  assert.match(avatarMigration, /auth\.uid\(\)/);
  assert.match(avatarMigration, /for insert\s+to authenticated/i);
  assert.match(avatarMigration, /for update\s+to authenticated/i);
  assert.match(avatarMigration, /for delete\s+to authenticated/i);
});

test('member preference updates no longer reference retired opt-in column', () => {
  assert.doesNotMatch(memberHubJs, /notify_new_games_opt_in/);
  assert.match(memberHubJs, /notify_new_games_choice_recorded/);
});

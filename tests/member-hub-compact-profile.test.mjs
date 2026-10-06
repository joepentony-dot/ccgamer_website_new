import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const html = fs.readFileSync('community/profile.html', 'utf8');
const css = fs.readFileSync('resources/css/member-hub.css', 'utf8');
const profileJs = fs.readFileSync('resources/js/auth/profile-page.js', 'utf8');
const memberHubJs = fs.readFileSync('resources/js/auth/member-hub.js', 'utf8');

test('member hub is reduced to the compact core sections', () => {
  for (const id of [
    'memberOverview',
    'memberFavourites',
    'memberReviews',
    'memberAchievements',
    'memberSettings'
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }

  assert.doesNotMatch(html, /id="memberCommunity"/);
  assert.doesNotMatch(html, /Member Benefits/);
  assert.doesNotMatch(html, /Share Your Verdict/);
  assert.doesNotMatch(html, /New and Recently Updated/);
});

test('member badge layout is deliberately compact', () => {
  assert.match(css, /\.member-achievements\s*\{/);
  assert.match(css, /grid-template-columns:\s*repeat\(5/);
  assert.match(css, /min-height:\s*54px/);
});

test('member profile exposes custom avatar controls', () => {
  assert.match(html, /id="profileAvatarInput"/);
  assert.match(html, /id="profileAvatarChange"/);
  assert.match(html, /id="profileAvatarRemove"/);
  assert.match(html, /JPG, PNG or WebP/);
});

test('avatar upload uses the existing protected profile avatar bucket', () => {
  assert.match(profileJs, /PROFILE_AVATAR_BUCKET = 'profile-avatars'/);
  assert.match(profileJs, /PROFILE_AVATAR_MAX_BYTES = 2 \* 1024 \* 1024/);
  assert.match(profileJs, /\.storage\s*\n\s*\.from\(PROFILE_AVATAR_BUCKET\)/);
  assert.match(profileJs, /avatar_url: avatarUrl/);
  assert.match(profileJs, /Avatar must be 2 MB or smaller\./);
});

test('member preference updates no longer reference retired opt-in column', () => {
  assert.doesNotMatch(memberHubJs, /notify_new_games_opt_in/);
  assert.match(memberHubJs, /notify_new_games_choice_recorded/);
});

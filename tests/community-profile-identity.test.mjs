import assert from 'node:assert/strict';
import fs from 'node:fs';

const communityAuth = fs.readFileSync('js/ccg-community-auth.js', 'utf8');
const headerAuth = fs.readFileSync('js/ccg-auth.js', 'utf8');
const profilePage = fs.readFileSync('resources/js/auth/profile-page.js', 'utf8');

const seedMatch = communityAuth.match(/function safeProfileSeed\(user\) \{([\s\S]*?)\n  \}/);
assert.ok(seedMatch, 'safeProfileSeed must exist');
assert.doesNotMatch(seedMatch[1], /user\.id|slice\(0, 8\)/, 'profile seed must never derive a visible identity from the Supabase UUID');
assert.match(seedMatch[1], /return '';/, 'missing metadata should not fall back to an account identifier');

assert.match(communityAuth, /function isLegacyIdFallback\(value, user\)/, 'legacy UUID-derived handles must be detected');
assert.match(communityAuth, /display_name: displayName/, 'choosing a username must repair a placeholder display name');
assert.match(communityAuth, /display_name: metadataDisplayName[\s\S]*?: 'Member'/, 'new fallback profiles should show Member rather than an identifier');
assert.match(communityAuth, /isLegacyIdFallback\(profile\.username, state\.currentUser\)/, 'legacy fallback profiles should be prompted to choose a username');

assert.match(headerAuth, /!isLegacyIdFallback\(profileDisplayName, user\)/, 'global header must hide legacy UUID-derived display names');
assert.match(headerAuth, /!isLegacyIdFallback\(profileUsername, user\)/, 'global header must hide legacy UUID-derived usernames');

assert.match(profilePage, /resolveProfileDisplayName\(user, profile\)/, 'member hub must resolve a safe display identity');
assert.match(profilePage, /return 'Member';/, 'member hub must use a non-identifying fallback');

console.log('community profile identity contract passed');

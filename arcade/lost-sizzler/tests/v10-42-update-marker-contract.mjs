import fs from 'node:fs';
import assert from 'node:assert/strict';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const version = JSON.parse(fs.readFileSync(new URL('../version.json', import.meta.url), 'utf8'));
const identityOwner = fs.readFileSync(new URL('../js/v10-42-r4-release-identity-owner.js', import.meta.url), 'utf8');

assert.equal(version.releaseVersion, 'V10.42');
assert.match(version.build, /^V10\.42 r\d+$/);
assert.match(version.cacheToken, /^\d{8}r\d+$/);
assert.ok(index.includes(`meta name="ccg-lost-sizzler-build" content="${version.build}"`));
assert.ok(index.includes(`meta name="ccg-lost-sizzler-cache" content="${version.cacheToken}"`));
assert.match(index, /C64 Dungeon Carnage/);
assert.match(index, /BUILD V10\.42/);
assert.doesNotMatch(index, /20260827r31/);
assert.match(identityOwner, /expectedSubtitle=`C64 DUNGEON CARNAGE — \$\{activeFamily\(\)\}`/);
assert.doesNotMatch(identityOwner, /expectedSubtitle=`THE LOST SIZZLER/);

const versionCheckIndex = index.indexOf(`js/version-check.js?v=${version.cacheToken}`);
assert.ok(versionCheckIndex >= 0, 'version-check.js must use the current cache token');

console.log('V10.42 C64 Dungeon Carnage update marker contract passed');
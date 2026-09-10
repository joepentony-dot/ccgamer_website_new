import fs from 'node:fs';
import assert from 'node:assert/strict';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const version = JSON.parse(fs.readFileSync(new URL('../version.json', import.meta.url), 'utf8'));
const identityOwner = fs.readFileSync(new URL('../js/v10-42-r4-release-identity-owner.js', import.meta.url), 'utf8');

assert.equal(version.releaseVersion, 'V10.42');
assert.equal(version.build, '2026.09.10.1');
assert.equal(version.cacheToken, '20260910r1');
assert.match(index, /meta name="ccg-lost-sizzler-build" content="2026\.09\.10\.1"/);
assert.match(index, /meta name="ccg-lost-sizzler-cache" content="20260910r1"/);
assert.match(index, /C64 Dungeon Carnage/);
assert.match(index, /BUILD V10\.42/);
assert.doesNotMatch(index, /20260827r31/);
assert.match(identityOwner, /expectedSubtitle=`C64 DUNGEON CARNAGE — \$\{activeFamily\(\)\}`/);
assert.doesNotMatch(identityOwner, /expectedSubtitle=`THE LOST SIZZLER/);

const versionCheckIndex = index.indexOf('js/version-check.js?v=20260910r1');
assert.ok(versionCheckIndex >= 0, 'version-check.js must use the current cache token');

console.log('V10.42 C64 Dungeon Carnage update marker contract passed');

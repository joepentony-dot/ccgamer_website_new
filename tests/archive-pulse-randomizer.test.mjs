import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const navCore = fs.readFileSync('js/ccg-nav-core.js', 'utf8');
const randomizer = fs.readFileSync('js/ccg-archive-pulse-randomizer.js', 'utf8');
const engagement = fs.readFileSync('js/ccg-engagement-engine.js', 'utf8');

test('Archive Pulse every-visit randomizer is loaded globally after the base engagement engine', () => {
  const engagementIndex = navCore.indexOf('/js/ccg-engagement-engine.js');
  const randomizerIndex = navCore.indexOf('/js/ccg-archive-pulse-randomizer.js');
  assert.ok(engagementIndex >= 0, 'base engagement engine is registered');
  assert.ok(randomizerIndex > engagementIndex, 'randomizer is registered after the base engine');
  assert.match(navCore, /data-ccg-archive-pulse-randomizer-loader/);
});

test('base Archive Pulse remains the fallback while the randomizer corrects daily locking', () => {
  assert.match(engagement, /function dailyGame/);
  assert.match(engagement, /Something Different Every Visit/);
  assert.match(randomizer, /PREVIOUS_KEY = "ccgArchivePulsePreviousV2"/);
  assert.match(randomizer, /sessionStorage\.getItem\(PREVIOUS_KEY\)/);
  assert.match(randomizer, /sessionStorage\.setItem\(PREVIOUS_KEY/);
});

test('game cards exclude the previous visit and cannot duplicate each other', () => {
  assert.match(randomizer, /const previous = new Set\(previousSlugs \|\| \[\]\)/);
  assert.match(randomizer, /games\.filter\(\(game\) => !previous\.has/);
  assert.match(randomizer, /shuffledCopy\(pool\)\.slice\(0, Math\.min\(2, pool\.length\)\)/);
  assert.match(randomizer, /TARGET_GAME_TYPES = \["game-of-the-day", "archive-pick"\]/);
});

test('Zzap feature also rotates away from the previous visit when alternatives exist', () => {
  assert.match(randomizer, /zzapItems\.length > 1/);
  assert.match(randomizer, /!== previousSlug/);
  assert.match(randomizer, /secureRandomIndex\(pool\.length\)/);
});

test('existing Archive Pulse layout and thumbnail presentation are preserved', () => {
  assert.match(randomizer, /\.ccg-archive-pulse__card\[data-ccg-archive-pulse=/);
  assert.match(randomizer, /\.ccg-archive-pulse__thumb/);
  assert.match(randomizer, /ccg-archive-pulse__card--has-thumb/);
  assert.match(randomizer, /label\.textContent = "Fresh Game Pick"/);
  assert.doesNotMatch(randomizer, /innerHTML\s*=\s*`<section/);
});

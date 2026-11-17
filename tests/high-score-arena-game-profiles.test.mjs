import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_CROSSFIRE_PROFILE, arenaProfileKeys, identifyArenaMedia,
  createArenaDiagnosticObserver
} from '../scripts/high-score-arena/arena-game-profiles.mjs';

const media = Object.freeze({
  platform: 'c64', catalogId: 'archive-02121', format: 'prg',
  sha256: 'ddc3ab84c98fc065fd39e69bfe68b7ee6de38ebab4b51b607bbcea64cad570a9',
  byteLength: 23637
});

test('only the exact verified Atlantis/Pantheon Crossfire edition matches', () => {
  assert.deepEqual(arenaProfileKeys(), ['c64-crossfire-atlantis']);
  assert.equal(identifyArenaMedia(media), ARENA_CROSSFIRE_PROFILE);
  for (const changed of [
    { catalogId: 'archive-02122' }, // Crossfire - Tron: different game
    { sha256: 'a'.repeat(64) },
    { byteLength: 23638 },
    { format: 'd64' },
    { platform: 'amiga' }
  ]) assert.equal(identifyArenaMedia({ ...media, ...changed }), null);
  assert.equal(identifyArenaMedia({title:'Crossfire'}),null);
  assert.equal(identifyArenaMedia(null),null);
});

test('all scoring starts disabled; cannot infer eligibility from filename', () => {
  assert.equal(ARENA_CROSSFIRE_PROFILE.publicSubmissionEnabled, false);
  assert.equal(ARENA_CROSSFIRE_PROFILE.rules.startLevel, 1);
  assert.equal(ARENA_CROSSFIRE_PROFILE.rules.unlimitedLives, false);
  assert.equal(ARENA_CROSSFIRE_PROFILE.rules.unlimitedTime, false);
  assert.equal(ARENA_CROSSFIRE_PROFILE.rules.saveStateEligible, false);
  assert.equal(ARENA_CROSSFIRE_PROFILE.scoreboard.maxDisplayed, 5);
  assert.deepEqual(ARENA_CROSSFIRE_PROFILE.scoreboard.modes, ['alltime','challenge']);
});

test('a Crossfire-specific observer is available for diagnostics only', () => {
  const observer = createArenaDiagnosticObserver(media);
  assert.equal(observer?.enabled, true);
  assert.equal(observer.observe(new Uint8Array(65536)), null);
  assert.equal(createArenaDiagnosticObserver({ ...media, catalogId: 'archive-02122' }), null);
});

test('a new title cannot inherit Crossfire score detection without its own adapter', () => {
  assert.equal(Object.isFrozen(ARENA_CROSSFIRE_PROFILE), true);
  assert.equal(Object.isFrozen(ARENA_CROSSFIRE_PROFILE.media), true);
  assert.equal(identifyArenaMedia({
    ...media, catalogId: 'some-unverified-game', title: 'Future title'
  }), null);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_CROSSFIRE_PROFILE, arenaProfileKeys, identifyArenaMedia,
  createArenaDiagnosticObserver
} from '../js/ccg-c64/arena/arena-game-profiles.mjs';
import { SIERRA_CROSSFIRE_CRT, isVerifiedSierraCrossfireCrt }
  from '../js/ccg-c64/game-catalog.js';

const media = Object.freeze({
  platform: 'c64', catalogId: SIERRA_CROSSFIRE_CRT.id, format: 'crt',
  sha256: SIERRA_CROSSFIRE_CRT.sha256, byteLength: SIERRA_CROSSFIRE_CRT.bytes
});

test('only the exact verified Sierra Online CRT has an Arena presentation profile', () => {
  assert.deepEqual(arenaProfileKeys(), ['c64-crossfire-sierra-online']);
  assert.equal(identifyArenaMedia(media), ARENA_CROSSFIRE_PROFILE);
  for (const changed of [
    { catalogId: 'archive-02122' }, // Crossfire - Tron is different
    { catalogId: 'archive-02121' }, // Atlantis/Pantheon Crossfire is different
    { sha256: 'a'.repeat(64) }, { byteLength: 23637 },
    { format: 'prg' }, { platform: 'amiga' }
  ]) assert.equal(identifyArenaMedia({ ...media, ...changed }), null);
  assert.equal(identifyArenaMedia({ title: 'Crossfire' }), null);
  assert.equal(identifyArenaMedia(null), null);
});

test('pinned CRT metadata must match the actual owner manifest identity', () => {
  const exact = {
    id: SIERRA_CROSSFIRE_CRT.id, title: SIERRA_CROSSFIRE_CRT.title,
    format: 'crt', bytes: SIERRA_CROSSFIRE_CRT.bytes,
    sha256: SIERRA_CROSSFIRE_CRT.sha256, url: SIERRA_CROSSFIRE_CRT.url,
    approved: true, preferOverOtherFormats: true
  };
  assert.equal(isVerifiedSierraCrossfireCrt(exact), true);
  assert.equal(isVerifiedSierraCrossfireCrt({ ...exact, id: 'archive-02121' }), false);
  assert.equal(isVerifiedSierraCrossfireCrt({ ...exact, packed: true }), false);
  assert.equal(isVerifiedSierraCrossfireCrt({ ...exact, bytes: 23637 }), false);
});

test('score attempts remain forbidden until Sierra CRT-specific gameplay forensics exist', () => {
  assert.equal(ARENA_CROSSFIRE_PROFILE.publicSubmissionEnabled, false);
  assert.equal(ARENA_CROSSFIRE_PROFILE.adapter, 'crt-score-forensics-not-yet-verified');
  assert.equal(createArenaDiagnosticObserver(media), null);
  assert.equal(createArenaDiagnosticObserver({
    platform: 'c64', catalogId: 'archive-02121', format: 'prg',
    sha256: 'ddc3ab84c98fc065fd39e69bfe68b7ee6de38ebab4b51b607bbcea64cad570a9',
    byteLength: 23637
  }), null);
  assert.equal(ARENA_CROSSFIRE_PROFILE.scoreboard.maxDisplayed, 5);
  assert.deepEqual(ARENA_CROSSFIRE_PROFILE.scoreboard.modes, ['alltime','challenge']);
  assert.equal(Object.isFrozen(ARENA_CROSSFIRE_PROFILE), true);
  assert.equal(Object.isFrozen(ARENA_CROSSFIRE_PROFILE.media), true);
});

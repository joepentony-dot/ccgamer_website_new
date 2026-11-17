import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CROSSFIRE_HUD_SCORE_BASE, readCrossfireScreenScore
} from '../js/ccg-c64/arena/read-crossfire-screen-score.mjs';

// Real 80-byte HUD screen-memory captures from unchanged C64Machine running
// verified Crossfire archive-02121; GitHub headless run 43929867793,
// job 133519085893, recorded at Level 1 and after independent lower-window
// hits. They are genuine captured memory, not invented score-address fixtures.
const ZERO_HUD = '01010101010101010101010101010101010101010101010101010101010101010101010101010101010c0d000809000000000000000000000004052c1415101100000004050405040504050405040501';
const LOWER_LEFT_HUD = '01010101010101010101010101010101010101010101010101010101010101010101010101010101010c0d000809000000000000000000000004052c1415080900000004050405040520212021181901';
const LOWER_RIGHT_HUD = '01010101010101010101010101010101010101010101010101010101010101010101010101010101010c0d000809000000000000000000000004052c1415080900000004050405040520212021181901';

function fromHud(hex) {
  const ram = new Uint8Array(65536);
  const bytes = hex.match(/../g).map(x => parseInt(x, 16));
  assert.equal(bytes.length, 80);
  ram.set(bytes, 0x7400);
  return ram;
}

test('reads the genuine Crossfire zero-score HUD, not a screen title', () => {
  assert.equal(readCrossfireScreenScore(fromHud(ZERO_HUD)), 0);
});

test('reads 000775 from two independent headless gameplay shots', () => {
  assert.equal(readCrossfireScreenScore(fromHud(LOWER_LEFT_HUD)), 775);
  assert.equal(readCrossfireScreenScore(fromHud(LOWER_RIGHT_HUD)), 775);
});

test('rejects missing, truncated, damaged or non-Crossfire HUD memory', () => {
  assert.equal(readCrossfireScreenScore(new Uint8Array(20)), null);
  assert.equal(readCrossfireScreenScore(null), null);
  const wrongHeader = fromHud(LOWER_LEFT_HUD);
  wrongHeader[0x7400] = 0;
  assert.equal(readCrossfireScreenScore(wrongHeader), null);
  const wrongColon = fromHud(LOWER_LEFT_HUD);
  wrongColon[0x743b] = 0;
  assert.equal(readCrossfireScreenScore(wrongColon), null);
  const badScorePair = fromHud(LOWER_LEFT_HUD);
  badScorePair[CROSSFIRE_HUD_SCORE_BASE + 11] = 0xff;
  assert.equal(readCrossfireScreenScore(badScorePair), null);
  const badDigit = fromHud(LOWER_LEFT_HUD);
  badDigit[CROSSFIRE_HUD_SCORE_BASE + 10] = 0x06;
  badDigit[CROSSFIRE_HUD_SCORE_BASE + 11] = 0x07;
  assert.equal(readCrossfireScreenScore(badDigit), null);
});

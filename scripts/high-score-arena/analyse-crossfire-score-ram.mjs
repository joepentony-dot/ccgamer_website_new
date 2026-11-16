#!/usr/bin/env node
/**
 * CCG High Score Arena: read-only analysis of separately captured Crossfire RAM.
 *
 * Usage:
 *   node scripts/high-score-arena/analyse-crossfire-score-ram.mjs snapshot-1.json snapshot-2.json ...
 *
 * Input JSON per sample:
 *   { "gameId":"archive-02121", "mediaSHA256":"ddc3...", "label":"score 100",
 *     "visibleScore":100, "phase":"playing", "ramBase64":"..." }
 *
 * This compares a human-observed on-screen score with raw RAM and
 * identifies candidates only. It NEVER proves game-over or enables scoring.
 * Capture instrumentation is separate from the production emulator.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ID = 'archive-02121';
const SHA = 'ddc3ab84c98fc065fd39e69bfe68b7ee6de38ebab4b51b607bbcea64cad570a9';
const RAM_BYTES = 65536;
const ENCODINGS = Object.freeze(['binary-le', 'binary-be', 'packed-bcd-le', 'packed-bcd-be', 'ascii']);

function decodeBase64(value) {
  assert.equal(typeof value, 'string', 'Snapshot must contain ramBase64');
  assert.match(value, /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
    'ramBase64 must be padded canonical base64');
  const bytes = Buffer.from(value, 'base64');
  assert.equal(bytes.length, RAM_BYTES, 'Snapshot must contain all 65536 RAM bytes');
  assert.equal(bytes.toString('base64'), value, 'Noncanonical base64 snapshot');
  return bytes;
}

function normaliseSample(s, index) {
  assert.ok(s && typeof s === 'object' && !Array.isArray(s), 'Sample ' + index + ': invalid object');
  assert.equal(s.gameId, ID, 'Sample ' + index + ': wrong game/edition');
  assert.equal(s.mediaSHA256, SHA, 'Sample ' + index + ': media checksum mismatch');
  assert.ok(Number.isSafeInteger(s.visibleScore) && s.visibleScore >= 0 && s.visibleScore <= 99999999,
    'Sample ' + index + ': visibleScore must be a nonnegative observed integer');
  assert.ok(s.phase === 'playing' || s.phase === 'game-over',
    'Sample ' + index + ': phase must be playing or game-over');
  assert.equal(typeof s.label, 'string', 'Sample ' + index + ': a descriptive label is required');
  assert.ok(s.label.trim(), 'Sample ' + index + ': blank label');
  return { label: s.label, score: s.visibleScore, phase: s.phase, ram: decodeBase64(s.ramBase64) };
}

function readCandidate(ram, address, width, encoding) {
  if (address + width > RAM_BYTES) return null;
  if (encoding === 'ascii') {
    let str = '';
    for (let i = 0; i < width; i++) {
      const b = ram[address + i];
      if (b < 48 || b > 57) return null;
      str += String.fromCharCode(b);
    }
    return Number(str);
  }
  if (encoding.startsWith('packed-bcd')) {
    let value = 0;
    for (let i = 0; i < width; i++) {
      const b = ram[address + i];
      if ((b & 15) > 9 || (b >> 4) > 9) return null;
      const digitPair = (b >> 4) * 10 + (b & 15);
      const place = encoding.endsWith('-le') ? i : width - i - 1;
      value += digitPair * (100 ** place);
    }
    return value;
  }
  let value = 0;
  for (let i = 0; i < width; i++) {
    const place = encoding.endsWith('-le') ? i : width - i - 1;
    value += ram[address + i] * (256 ** place);
  }
  return value;
}

export function analyseCrossfireSnapshots(rawSamples) {
  assert.ok(Array.isArray(rawSamples) && rawSamples.length >= 4,
    'At least four separate RAM snapshots are required');
  assert.ok(rawSamples.length <= 100, 'Limit samples to 100 independent captures');
  const samples = rawSamples.map(normaliseSample);
  assert.ok(new Set(samples.map(s => s.score)).size >= 3,
    'Provide at least three distinct observed on-screen scores');
  assert.ok(samples.some(s => s.score === 0) && samples.some(s => s.score > 0),
    'Include a genuine zero-score baseline and nonzero play samples');

  const changed = new Uint8Array(RAM_BYTES);
  for (let i = 1; i < samples.length; i++) {
    if (samples[i].score === samples[i - 1].score) continue;
    for (let address = 0; address < RAM_BYTES; address++) {
      if (samples[i].ram[address] !== samples[i - 1].ram[address]) changed[address] = 1;
    }
  }
  let changedByteCount = 0;
  for (const flag of changed) changedByteCount += flag;
  const changePrefix = new Uint32Array(RAM_BYTES + 1);
  for (let i = 0; i < RAM_BYTES; i++) changePrefix[i + 1] = changePrefix[i] + changed[i];

  const candidates = [];
  for (let address = 0; address < RAM_BYTES; address++) {
    for (const encoding of ENCODINGS) {
      const minWidth = encoding === 'ascii' ? 2 : 1;
      const maxWidth = encoding === 'ascii' ? 8 : 4;
      for (let width = minWidth; width <= maxWidth && address + width <= RAM_BYTES; width++) {
        if (changePrefix[address + width] === changePrefix[address]) continue;
        if (samples.every(s => readCandidate(s.ram, address, width, encoding) === s.score)) {
          candidates.push({ addressDecimal: address,
            addressHex: '0x' + address.toString(16).padStart(4, '0'),
            widthBytes: width, encoding,
            observedScores: samples.map(s => s.score) });
        }
      }
    }
  }
  candidates.sort((a, b) => a.widthBytes - b.widthBytes ||
    a.addressDecimal - b.addressDecimal || a.encoding.localeCompare(b.encoding));
  return {
    gameId: ID, mediaSHA256: SHA, sampleCount: samples.length,
    observedScoreCount: new Set(samples.map(s => s.score)).size,
    capturedPhases: [...new Set(samples.map(s => s.phase))],
    changedByteCount, candidateCount: candidates.length,
    candidates: candidates.slice(0, 100), candidatesTruncated: candidates.length > 100,
    memoryScoreAddressVerified: false, gameOverSignalVerified: false,
    automaticScoringEnabled: false,
    notice: 'Candidate matches are NOT proof of the score address. Confirm with independent gameplay, reset and game-over captures.',
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const files = process.argv.slice(2);
    assert.ok(files.length >= 4, 'Pass at least four snapshot JSON filenames');
    const captures = files.map(path => JSON.parse(readFileSync(resolve(path), 'utf8')));
    console.log(JSON.stringify(analyseCrossfireSnapshots(captures), null, 2));
  } catch (e) {
    console.error('[Crossfire read-only RAM analysis] FAIL:', e.message);
    process.exitCode = 1;
  }
}

import assert from 'node:assert/strict';
import test from 'node:test';
import { largestSessionWindow } from '../scripts/lib/cls-session-window.mjs';

test('CLS ignores interaction shifts and ignores invalid observations', () => {
  assert.equal(largestSessionWindow([]), 0);
  assert.equal(largestSessionWindow([
    { startTime: 100, value: 0.12, hadRecentInput: true },
    { start_time: 200, value: 0.09, had_recent_input: true },
    { startTime: 300, value: Number.NaN },
    { startTime: 400, value: 0.05 },
  ]), 0.05);
});

test('CLS uses the largest separated session rather than the lifetime sum', () => {
  const entries = [
    { startTime: 3000, value: 0.11 },
    { startTime: 100, value: 0.15 },
    { startTime: 500, value: 0.25 },
    { startTime: 4100, value: 0.04 },
  ];
  assert.equal(largestSessionWindow(entries), 0.4);
});

test('CLS keeps sub-second gaps within a session and caps at five seconds', () => {
  const entries = [0, 900, 1800, 2700, 3600]
    .map((startTime) => ({ startTime, value: 0.1 }));
  assert.ok(Math.abs(largestSessionWindow(entries) - 0.5) < 1e-9);
});

test('CLS splits on an exact one-second gap', () => {
  assert.equal(largestSessionWindow([
    { start_time: 100, value: 0.1 },
    { start_time: 1100, value: 0.2 },
  ]), 0.2);
});

test('CLS splits when a shift lands exactly five seconds after session start', () => {
  assert.equal(largestSessionWindow([
    { start_time: 100, value: 0.1 },
    { start_time: 900, value: 0.1 },
    { start_time: 1700, value: 0.1 },
    { start_time: 2500, value: 0.1 },
    { start_time: 3300, value: 0.1 },
    { start_time: 4100, value: 0.1 },
    { start_time: 5100, value: 0.25 },
  ]), 0.6);
});

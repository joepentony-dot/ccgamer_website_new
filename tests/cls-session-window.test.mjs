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

test('CLS caps a continuous session at five seconds', () => {
  const entries = [0, 1000, 2000, 3000, 4000, 5000, 6000]
    .map((startTime) => ({ startTime, value: 0.1 }));
  assert.ok(Math.abs(largestSessionWindow(entries) - 0.6) < 1e-9);
});

test('CLS treats exactly one-second gaps as the same session', () => {
  assert.equal(largestSessionWindow([
    { start_time: 100, value: 0.1 },
    { start_time: 1100, value: 0.2 },
    { start_time: 2201, value: 0.3 },
  ]), 0.3);
});

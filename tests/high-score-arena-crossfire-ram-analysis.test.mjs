import test from 'node:test';
import assert from 'node:assert/strict';
import { analyseCrossfireSnapshots } from '../scripts/high-score-arena/analyse-crossfire-score-ram.mjs';

const GAME = 'archive-02121';
const SHA = 'ddc3ab84c98fc065fd39e69bfe68b7ee6de38ebab4b51b607bbcea64cad570a9';

function sample(score, label, phase = 'playing') {
  const ram = Buffer.alloc(65536, 0);
  ram.writeUInt16LE(score, 0xc120);
  const lo = score % 100, hi = Math.floor(score / 100);
  ram[0xc300] = (Math.floor(lo / 10) << 4) | (lo % 10);
  ram[0xc301] = (Math.floor(hi / 10) << 4) | (hi % 10);
  ram.write(String(score).padStart(6, '0'), 0xc400, 'ascii');
  // A changing unrelated byte must never qualify as a candidate for every score.
  ram[0xd000] = (score + 123) & 0xff;
  return { gameId: GAME, mediaSHA256: SHA, label, phase,
    visibleScore: score, ramBase64: ram.toString('base64') };
}

const snapshots = [sample(0, 'start'), sample(100, 'score 100'),
  sample(250, 'score 250'), sample(250, 'game over', 'game-over')];

test('identifies common binary, BCD and ASCII candidate encodings without claiming verified score', () => {
  const report = analyseCrossfireSnapshots(snapshots);
  assert.equal(report.candidateCount > 0, true);
  assert.ok(report.candidates.some(c => c.addressDecimal === 0xc120 && c.encoding === 'binary-le' && c.widthBytes === 2));
  assert.ok(report.candidates.some(c => c.addressDecimal === 0xc300 && c.encoding === 'packed-bcd-le' && c.widthBytes === 2));
  assert.ok(report.candidates.some(c => c.addressDecimal === 0xc400 && c.encoding === 'ascii' && c.widthBytes === 6));
  assert.equal(report.memoryScoreAddressVerified, false);
  assert.equal(report.gameOverSignalVerified, false);
  assert.equal(report.automaticScoringEnabled, false);
});

test('rejects wrong media edition and truncated RAM', () => {
  assert.throws(() => analyseCrossfireSnapshots([
    { ...snapshots[0], mediaSHA256: '0'.repeat(64) }, ...snapshots.slice(1),
  ]), /checksum mismatch/);
  assert.throws(() => analyseCrossfireSnapshots([
    { ...snapshots[0], ramBase64: Buffer.alloc(100).toString('base64') },
    ...snapshots.slice(1),
  ]), /65536 RAM bytes/);
  assert.throws(() => analyseCrossfireSnapshots([
    { ...snapshots[0], gameId: 'archive-02122' }, ...snapshots.slice(1),
  ]), /wrong game/);
});

test('requires representative scores and a zero baseline', () => {
  assert.throws(() => analyseCrossfireSnapshots([snapshots[0], snapshots[0], snapshots[0], snapshots[0]]),
    /three distinct/);
  const onlyNonzero = [sample(10, 'a'), sample(20, 'b'), sample(30, 'c'), sample(40, 'd')];
  assert.throws(() => analyseCrossfireSnapshots(onlyNonzero), /zero-score baseline/);
  assert.throws(() => analyseCrossfireSnapshots(snapshots.slice(0, 3)), /four separate/);
});

test('never treats a phase label alone as a verified game-over signal', () => {
  const report = analyseCrossfireSnapshots(snapshots);
  assert.ok(report.capturedPhases.includes('game-over'));
  assert.equal(report.gameOverSignalVerified, false);
});

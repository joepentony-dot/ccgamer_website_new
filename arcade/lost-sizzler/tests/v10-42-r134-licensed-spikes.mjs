import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assetRoot = 'assets/pixel/user-r134';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const expected = [
  ['stealthix-spikes-0.png', '99b508dbdd0416972b80d5aedbd5469eff223914980935b7a97c0b880a0d2d9b'],
  ['stealthix-spikes-1.png', '66ca01ec5b340fbd1ce87f94ba70bbffbbe646b1a91826dd03b2efd919849a6f'],
  ['stealthix-spikes-2.png', 'd39639a238d028dcf3b944017146b9366e1b514374f4333170f659e91e7f8581'],
  ['stealthix-spikes-3.png', '66ca01ec5b340fbd1ce87f94ba70bbffbbe646b1a91826dd03b2efd919849a6f']
];
const manifest = JSON.parse(readFileSync(join(root, 'assets/asset-manifest.json'), 'utf8'));
const approved = manifest.images?.visualOverhaul?.r134LicensedCC0;
assert.equal(approved?.license, 'CC0-1.0');
assert.equal(approved?.creator, 'Stealthix');
assert.equal(approved?.source, 'https://stealthix.itch.io/animated-traps');
assert.deepEqual(approved?.stagedOnly, []);
const overrides = readFileSync(join(root, 'js/asset-overrides.js'), 'utf8');
const credits = readFileSync(join(root, 'assets/THIRD-PARTY-ART-CREDITS.md'), 'utf8');
const provenance = readFileSync(join(root, `${assetRoot}/PROVENANCE.md`), 'utf8');
const render = readFileSync(join(root, 'js/game-render.js'), 'utf8');
assert.match(credits, /Stealthix/);
assert.match(provenance, /CC0 1\.0/);
assert.match(render, /if\(t\.kind==="spike"&&spikeArtReady\)/);
assert.match(render, /spikeArtReady=spikeFrames\.length===4/);
for (let i = 0; i < expected.length; i++) {
  const [filename, fingerprint] = expected[i];
  const relative = `${assetRoot}/${filename}`;
  assert.equal(approved.activeSpikeTrapFrames[i], relative);
  const data = readFileSync(join(root, relative));
  assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(data.readUInt32BE(16), 32);
  assert.equal(data.readUInt32BE(20), 32);
  assert.equal(sha256(data), fingerprint);
  assert.ok(overrides.includes(`spikeTrapFrame${i}:"${relative}"`));
  assert.ok(provenance.includes(fingerprint));
}
console.log('R134 licensed spike art: fingerprints, PNG dimensions, runtime overrides, renderer and commercial credits PASS');

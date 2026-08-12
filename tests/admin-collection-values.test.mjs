import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const {
  canonicalCollectionValue,
  collectionDisplayLabel,
  collectionMatchesCanonical
} = await import('../admin/js/collection-values.js');

const guardSource = fs.readFileSync(new URL('../admin/js/guard.js', import.meta.url), 'utf8');
const collectionLoaderSource = fs.readFileSync(new URL('../js/collection-loader.js', import.meta.url), 'utf8');

test('Top Picks aliases collapse to the public canonical collection key', () => {
  assert.equal(canonicalCollectionValue('top picks'), 'top-picks');
  assert.equal(canonicalCollectionValue('top-picks'), 'top-picks');
  assert.equal(canonicalCollectionValue('top_picks'), 'top-picks');
  assert.equal(collectionDisplayLabel('top picks'), 'Top Picks');
});

test('legacy banned/BPJM aliases collapse to the BPJS public collection key', () => {
  assert.equal(canonicalCollectionValue('banned'), 'bpjs');
  assert.equal(canonicalCollectionValue('BPJM'), 'bpjs');
  assert.equal(canonicalCollectionValue('BPJS / BPJM Indexed'), 'bpjs');
  assert.equal(collectionDisplayLabel('banned'), 'BPJS / BPJM Indexed');
});

test('cartridge and licensed labels remain canonical and human friendly', () => {
  assert.equal(canonicalCollectionValue('Cartridge Games'), 'cartridge');
  assert.equal(canonicalCollectionValue('licensed-games'), 'licensed');
  assert.equal(collectionDisplayLabel('cartridge'), 'Cartridge Games');
  assert.equal(collectionDisplayLabel('licensed'), 'Licensed Games');
});

test('canonical matcher accepts historical collection values', () => {
  assert.equal(collectionMatchesCanonical('top picks', 'top-picks'), true);
  assert.equal(collectionMatchesCanonical('banned', 'bpjs'), true);
  assert.equal(collectionMatchesCanonical('licensed', 'top-picks'), false);
});

test('all guarded admin game tools install the shared collection normalizer', () => {
  assert.match(guardSource, /import ['"]\.\/collection-values\.js['"];?/);
});

test('public collection loader accepts aliases instead of exact-only collection matching', () => {
  assert.match(collectionLoaderSource, /game\.collections\.some\(value => ccgCollectionValueMatchesKey\(value, key\)\)/);
  assert.match(collectionLoaderSource, /normalizedKey === "bpjs"/);
});

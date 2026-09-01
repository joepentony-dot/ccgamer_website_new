import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectReleaseYear,
  validateGamePublisherSource
} from '../admin/js/content-publisher-source-preflight.mjs';

const validBase = {
  system: 'AMIGA',
  year: 1994,
  description: 'Ruff n Tumble is a 1994 Commodore Amiga run and gun platform game from Wunderkind Software and Renegade. It features detailed stages, weapon upgrades, hidden routes, demanding platforming and a Jason Page soundtrack, giving the source description enough editorial detail to survive a temporary YouTube metadata failure during automated publishing.',
  pdf: 'https://drive.google.com/file/d/example/view',
  thumbnail: 'resources/images/thumbnails/all/ruff_n_tumble.png'
};

test('detects a release year stated in an Amiga description', () => {
  assert.equal(detectReleaseYear(validBase.description), 1994);
});

test('blocks a release-year contradiction before a source commit', () => {
  const errors = validateGamePublisherSource({ ...validBase, year: 1993 });
  assert.ok(errors.some((error) => /Release year conflict/.test(error)));
});

test('does not require a Lemon64 or Lemon Amiga URL', () => {
  assert.deepEqual(validateGamePublisherSource(validBase), []);
  assert.deepEqual(validateGamePublisherSource({ ...validBase, lemonUrl: '' }), []);
});

test('Ruff n Tumble canonical source passes preflight without an external Lemon dependency', () => {
  assert.deepEqual(validateGamePublisherSource(validBase), []);
});

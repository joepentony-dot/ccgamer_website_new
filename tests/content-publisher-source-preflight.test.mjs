import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectReleaseYear,
  validateGamePublisherSource,
  validateLemonSource
} from '../admin/js/content-publisher-source-preflight.mjs';

const validBase = {
  system: 'AMIGA',
  year: 1994,
  description: 'Ruff n Tumble is a 1994 Commodore Amiga run and gun platform game from Wunderkind Software and Renegade. It features detailed stages, weapon upgrades, hidden routes, demanding platforming and a Jason Page soundtrack, giving the source description enough editorial detail to survive a temporary YouTube metadata failure during automated publishing.',
  lemonUrl: 'https://www.lemonamiga.com/game/ruff-n-tumble',
  pdf: 'https://drive.google.com/file/d/example/view',
  thumbnail: 'resources/images/thumbnails/all/ruff_n_tumble.png'
};

test('detects a release year stated in an Amiga description', () => {
  assert.equal(detectReleaseYear(validBase.description), 1994);
});

test('rejects a manual or Google Drive URL in the Lemon source field', () => {
  const result = validateLemonSource('AMIGA', 'https://drive.google.com/file/d/example/view');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'wrong-host');
});

test('accepts the matching direct Lemon game page', () => {
  const result = validateLemonSource('AMIGA', validBase.lemonUrl);
  assert.equal(result.ok, true);
});

test('blocks a release-year contradiction before a source commit', () => {
  const errors = validateGamePublisherSource({ ...validBase, year: 1993 });
  assert.ok(errors.some((error) => /Release year conflict/.test(error)));
});

test('blocks a missing magazine source unless the editor explicitly confirms no Lemon listing exists', () => {
  const withoutLemon = { ...validBase, lemonUrl: '' };
  assert.ok(validateGamePublisherSource(withoutLemon).some((error) => /magazine reviews/i.test(error)));
  assert.deepEqual(validateGamePublisherSource(withoutLemon, { noLemonListing: true }), []);
});

test('Ruff n Tumble canonical source passes the new preflight', () => {
  assert.deepEqual(validateGamePublisherSource(validBase), []);
});

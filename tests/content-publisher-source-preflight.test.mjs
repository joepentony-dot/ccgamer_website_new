import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectReleaseYear,
  generateGameSourceDescription,
  validateGamePublisherSource,
  validateLemonSourceUrl,
  wordCount
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

test('generates a factual C64 fallback from entered release metadata', () => {
  const description = generateGameSourceDescription({
    title: 'Speed King',
    system: 'C64',
    year: 1985,
    publisher: 'Digital Integration',
    genres: ['Racing'],
    developer: 'Digital Integration'
  });

  assert.match(description, /Speed King/);
  assert.match(description, /1985/);
  assert.match(description, /Commodore 64 \(C64\)/);
  assert.match(description, /Digital Integration/);
  assert.match(description, /Racing/);
  assert.ok(wordCount(description) >= 40);
  assert.ok(wordCount(description) <= 165);
  assert.match(description, /[.!?]$/);
});

test('generates an Amiga fallback without inventing a developer', () => {
  const description = generateGameSourceDescription({
    title: 'Premiere',
    system: 'AMIGA',
    year: 1992,
    publisher: 'Core Design',
    genres: ['Platform']
  });

  assert.match(description, /Commodore Amiga/);
  assert.match(description, /Core Design/);
  assert.doesNotMatch(description, /recorded as the developer/i);
  assert.ok(wordCount(description) >= 40);
});

test('accepts only the platform-matching direct Lemon game source', () => {
  assert.equal(validateLemonSourceUrl('https://www.lemon64.com/game/speed-king', 'C64'), '');
  assert.equal(validateLemonSourceUrl('https://www.lemonamiga.com/game/premiere', 'AMIGA'), '');
  assert.match(validateLemonSourceUrl('https://www.lemonamiga.com/game/premiere', 'C64'), /must use the matching lemon64\.com/i);
  assert.match(validateLemonSourceUrl('https://www.lemon64.com/games/details.php?id=1', 'C64'), /direct \/game\//i);
});

test('preflight rejects a mismatched Lemon platform source before publishing', () => {
  const errors = validateGamePublisherSource({
    ...validBase,
    lemonUrl: 'https://www.lemon64.com/game/ruff-n-tumble'
  });
  assert.ok(errors.some((error) => /lemonamiga\.com/i.test(error)));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { validateGameSnippetMetadata } = require('../scripts/validate-seo-game-routes.js');
const { buildCanonicalHtml } = require('../scripts/generate-slug-pages.js');
const { buildSnippet } = require('../js/ccg-game-seo-snippet.js');

function page(description, og = description, twitter = description) {
  return [
    '<meta name="description" content="' + description + '">',
    '<meta property="og:description" content="' + og + '">',
    '<meta name="twitter:description" content="' + twitter + '">'
  ].join('\n');
}

test('complete factual canonical snippet and consistent social text pass', () => {
  const errors = [];
  validateGameSnippetMetadata(page(
    '1942 is a vertically scrolling shoot ’em up set against the backdrop of World War II.'
  ), 'games/1942/index.html', errors);
  assert.deepEqual(errors, []);
});

test('cut-off snippet is rejected even when social text agrees', () => {
  const errors = [];
  validateGameSnippetMetadata(page('Chuckie Egg is a platform game with numerous…'), 'games/chuckie-egg/index.html', errors);
  assert.ok(errors.some(message => message.includes('cut-off ellipsis')));
  assert.ok(errors.some(message => message.includes('complete sentence')));
});

test('social metadata must match the authored canonical snippet', () => {
  const errors = [];
  validateGameSnippetMetadata(page(
    'Cavelon is a medieval action adventure.',
    'Cavelon is an action game.',
    'Cavelon is a medieval action adventure.'
  ), 'games/cavelon/index.html', errors);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Open Graph description differs/);
});

test('HTML-encoded ampersands and apostrophes compare consistently', () => {
  const errors = [];
  validateGameSnippetMetadata(page(
    'An A&amp;F game isn&#39;t the same as a different release.',
    "An A&F game isn't the same as a different release.",
    'An A&amp;F game isn&#39;t the same as a different release.'
  ), 'games/demo/index.html', errors);
  assert.deepEqual(errors, []);
});

function legacyGamePage(game, existingHtml) {
  return buildCanonicalHtml({
    slug: game.slug,
    game,
    title: game.title,
    schemaDescription: 'Test schema description.',
    canonicalUrl: 'https://www.cheekycommodoregamer.co.uk/games/' + game.slug + '/',
    ogImage: 'https://www.cheekycommodoregamer.co.uk/resources/images/demo.png',
    platformLong: 'Commodore 64',
    imageMetadata: { mimeType: 'image/png', width: 600, height: 400 },
    existingHtml
  });
}

test('legacy page generation preserves a factual canonical description and HTML entities', () => {
  const game = { id: 'archive_test', slug: 'archive-test', title: 'Archive Test', system: 'C64', year: 1985 };
  const original = [
    '<!DOCTYPE html><html><head>',
    "<meta content='Archive Test is an A&amp;F release with &quot;special&quot; features and its &#x27;original&#39; soundtrack.'",
    "  name='description'>",
    '</head><body></body></html>'
  ].join('\n');
  const html = legacyGamePage(game, original);
  const errors = [];
  validateGameSnippetMetadata(html, 'games/archive-test/index.html', errors);
  assert.deepEqual(errors, []);
  assert.match(html, /og:description[^>]*A&amp;F release/);
  assert.match(html, /twitter:description[^>]*A&amp;F release/);
  assert.doesNotMatch(html, /A&amp;amp;F/);
  assert.match(html, /original&#39; soundtrack/);
});

test('legacy generator fills missing canonical metadata from shared factual snippet', () => {
  const game = {
    id: 'archive_test', slug: 'archive-test', title: 'Archive Test', system: 'C64', year: 1985,
    description: 'Archive Test is a Commodore 64 puzzle game with several levels.'
  };
  const expected = buildSnippet(game, game.title);
  for (const existing of [
    '<!doctype html><html><head></head><body></body></html>',
    ''
  ]) {
    const html = legacyGamePage(game, existing);
    const errors = [];
    validateGameSnippetMetadata(html, 'games/archive-test/index.html', errors);
    assert.deepEqual(errors, []);
    assert.ok(html.includes('<meta name="description" content="' + expected + '">'));
    assert.ok(html.includes('og:description'));
    assert.ok(html.includes('twitter:description'));
    assert.doesNotMatch(html, /screenshots, gameplay video, manual, downloads and game history/);
  }
});

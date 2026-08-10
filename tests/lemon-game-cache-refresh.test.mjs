import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const cache = require('../scripts/refresh-lemon-game-cache.js');

test('normalizes supported Lemon game URLs and strips query strings', () => {
  assert.equal(
    cache.normalizeLemonGameUrl('http://lemon64.com/game/caveman-ugh-lympics?ref=ccg'),
    'https://www.lemon64.com/game/caveman-ugh-lympics'
  );
  assert.equal(
    cache.normalizeLemonGameUrl('https://www.lemonamiga.com/game/another-world/'),
    'https://www.lemonamiga.com/game/another-world'
  );
  assert.equal(cache.normalizeLemonGameUrl('https://example.com/game/caveman-ugh-lympics'), '');
});

test('detects Lemon URLs only for new games or changed Lemon references', () => {
  const before = [
    { slug: 'existing', lemon: ['https://www.lemon64.com/game/existing'] },
    { slug: 'changed', lemon: ['https://www.lemon64.com/game/old-title'] }
  ];
  const after = [
    { slug: 'existing', lemon: ['https://www.lemon64.com/game/existing'] },
    { slug: 'changed', lemon: ['https://www.lemon64.com/game/new-title'] },
    { slug: 'new-game', lemon: ['https://www.lemon64.com/game/caveman-ugh-lympics'] }
  ];

  assert.deepEqual(cache.changedLemonUrls(before, after), [
    'https://www.lemon64.com/game/caveman-ugh-lympics',
    'https://www.lemon64.com/game/new-title'
  ]);
});

test('extracts a canonical Lemon game URL from cached HTML', () => {
  const html = '<html><head><link rel="canonical" href="https://www.lemon64.com/game/caveman-ugh-lympics"></head></html>';
  assert.equal(cache.extractCanonical(html), 'https://www.lemon64.com/game/caveman-ugh-lympics');
});

test('cache filenames are deterministic per normalized URL', () => {
  const url = 'https://www.lemon64.com/game/caveman-ugh-lympics';
  assert.equal(cache.cacheFileName(url), cache.cacheFileName(url));
  assert.match(cache.cacheFileName(url), /^[a-f0-9]{40}\.html$/);
});

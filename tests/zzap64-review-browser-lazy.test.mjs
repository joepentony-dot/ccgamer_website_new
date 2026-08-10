import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = fs.readFileSync(path.join(root, 'js', 'zzap64-review-browser.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'resources', 'css', 'zzap64-reviews.css'), 'utf8');

test('all-review browser is lazy by default', () => {
  assert.match(script, /const PAGE_SIZE = 24;/);
  assert.match(script, /IntersectionObserver/);
  assert.match(script, /function chunkForLetter\(/);
  assert.match(script, /async function loadChunk\(/);
  assert.match(script, /Choose a letter above to browse reviews/);
  assert.doesNotMatch(script, /state\.records\s*=\s*await loadRecords\(/);
});

test('global loading is opt-in for All or search', () => {
  assert.match(script, /async function loadAllRecords\(/);
  assert.match(script, /async function selectAll\(/);
  assert.match(script, /async function runSearch\(/);
  assert.match(script, /SEARCH_MIN_LENGTH = 2/);
});

test('alphabet navigation and progressive rendering are styled', () => {
  assert.match(css, /\.zzap-review-browser__alphabet/);
  assert.match(css, /\.zzap-review-browser__letter-select-wrap/);
  assert.match(css, /\.zzap-review-browser__more-button/);
});

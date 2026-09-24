import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const completionGuard = fs.readFileSync('admin/js/content-publisher-completion-guard.js', 'utf8');

test('publisher completion guard recognises string-array and object Lemon retry queues', () => {
  assert.match(completionGuard, /typeof row === 'string' \? row/);
  assert.match(completionGuard, /row\?\.slug \|\| row\?\.gameSlug \|\| row\?\.id/);
  assert.match(completionGuard, /Magazine reviews unresolved/);
});

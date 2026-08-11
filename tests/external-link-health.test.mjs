import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const script = fs.readFileSync('scripts/audit-external-links.js', 'utf8');

test('external link monitor is read-only against source data', () => {
  assert.match(script, /games\/games\.json/);
  assert.match(script, /data\/retro-specials\.json/);
  assert.doesNotMatch(script, /writeFileSync\([^,]+games\/games\.json/);
  assert.doesNotMatch(script, /unlinkSync|rmSync|renameSync/);
});

test('only repeated 404 or 410 responses are called confirmed broken', () => {
  assert.match(script, /status === 404 \|\| status === 410/);
  assert.match(script, /attempts: 2/);
  assert.match(script, /confirmed \? 'confirmed-broken' : 'unstable'/);
});

test('bot blocks and transient failures are not labelled broken', () => {
  assert.match(script, /status === 401 \|\| status === 403/);
  assert.match(script, /status === 429/);
  assert.match(script, /status >= 500/);
  assert.match(script, /return 'blocked'/);
  assert.match(script, /return 'transient'/);
});

test('YouTube videos use the oEmbed availability endpoint', () => {
  assert.match(script, /youtube\.com\/oembed/);
  assert.match(script, /watch\?v=/);
  assert.match(script, /YOUTUBE_KEYS/);
});

test('CCG internal URLs are excluded from the external monitor', () => {
  assert.match(script, /cheekycommodoregamer\.co\.uk/);
  assert.match(script, /SITE_HOSTS/);
  assert.match(script, /isInternalUrl/);
});

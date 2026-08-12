import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('admin publishers never write repository music filename metadata', () => {
  const publisherHtml = read('admin/content-publisher.html');
  const publisherJs = read('admin/js/content-publisher.js');
  const legacyHtml = read('admin/games-editor.html');
  const legacyJs = read('admin/js/games-editor.js');

  assert.doesNotMatch(publisherHtml, /data-game-field=["']music["']/);
  assert.doesNotMatch(publisherJs, /gameValue\(["']music["']\)/);
  assert.doesNotMatch(legacyHtml, /data-field=["']music["']/);
  assert.doesNotMatch(legacyHtml, /resources\/audio\/games/);
  assert.doesNotMatch(legacyJs, /state\.draft\.music/);
  assert.doesNotMatch(legacyJs, /resources\/audio\/games/);
});

test('game source no longer carries obsolete music filename properties', () => {
  const games = JSON.parse(read('games/games.json'));
  assert.ok(Array.isArray(games) && games.length > 0);
  assert.equal(games.filter((game) => Object.prototype.hasOwnProperty.call(game, 'music')).length, 0);
});

test('Archive Quality separates Cloudflare music from local resource findings', () => {
  const html = read('admin/archive-quality.html');
  const js = read('admin/js/archive-quality.js');
  const musicConfig = read('js/ccg-music-config.js');

  assert.match(html, /id=["']archiveQualityRunMusic["']/);
  assert.match(html, /Cloudflare tracks found/);
  assert.match(js, /runCloudflareMusicAudit/);
  assert.match(js, /new Audio\(\)/);
  assert.doesNotMatch(js, /category:\s*["']Local audio["']/);
  assert.doesNotMatch(js, /resources\/audio\/games/);
  assert.doesNotMatch(js, /\n\s*\}\);\n\n\s*\[game\?\.pdf, game\?\.disk\]/, 'Local linked-file checks must remain inside the per-game resource loop');

  const archiveBase = js.match(/CLOUDFLARE_MUSIC_BASE_URL = '([^']+)'/)?.[1];
  const runtimeBase = musicConfig.match(/DEFAULT_MUSIC_BASE_URL = "([^"]+)"/)?.[1];
  assert.equal(archiveBase, runtimeBase, 'Archive Quality and public music runtime must use the same Cloudflare base URL');
});

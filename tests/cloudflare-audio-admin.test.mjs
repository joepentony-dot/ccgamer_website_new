import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('admin game publishing exposes no music upload or repository music filename metadata', () => {
  const publisherHtml = read('admin/content-publisher.html');
  const publisherJs = read('admin/js/content-publisher.js');
  const editJs = read('admin/js/content-publisher-existing-game-update.js');
  const completionGuard = read('admin/js/content-publisher-completion-guard.js');
  const legacyHtml = read('admin/games-editor.html');
  const legacyJs = read('admin/js/games-editor.js');

  assert.doesNotMatch(publisherHtml, /data-game-field=["']music["']|data-game-music-file|Game music file/i);
  assert.doesNotMatch(publisherJs, /gameValue\(["']music["']\)|game-music|uploadGameMusic|data-game-music-file/i);
  assert.doesNotMatch(editJs, /game-music|ccgUploadMusic|data-game-music-file/i);
  assert.doesNotMatch(completionGuard, /game music|music upload|ccg_publisher_music_state/i);
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
  const publishing = read('.github/workflows/games-publishing.yml');

  assert.match(html, /id=["']archiveQualityRunMusic["']/);
  assert.match(html, /Cloudflare tracks found/);
  assert.match(js, /runCloudflareMusicAudit/);
  assert.match(js, /new Audio\(\)/);
  assert.doesNotMatch(js, /category:\s*["']Local audio["']/);
  assert.doesNotMatch(js, /resources\/audio\/games/);
  assert.doesNotMatch(js, /\n\s*\}\);\n\n\s*\[game\?\.pdf, game\?\.disk\]/, 'Local linked-file checks must remain inside the per-game resource loop');
  assert.doesNotMatch(publishing, /resources\/audio\/games/, 'Reliable Games Publishing must not watch the retired local audio directory');

  const archiveBase = js.match(/CLOUDFLARE_MUSIC_BASE_URL = '([^']+)'/)?.[1];
  const runtimeBase = musicConfig.match(/DEFAULT_MUSIC_BASE_URL = "([^"]+)"/)?.[1];
  assert.equal(archiveBase, runtimeBase, 'Archive Quality and public music runtime must use the same Cloudflare base URL');
});

test('music upload Worker keeps R2 credentials and role enforcement server-side', () => {
  const worker = read('workers/game-music-upload/src/handler.mjs');
  const config = read('workers/game-music-upload/wrangler.toml');
  assert.match(config, /name = "ccgamer-website-new"/);
  assert.match(config, /binding = "GAME_MUSIC"/);
  assert.match(config, /workers_dev = true/);
  assert.match(config, /keep_vars = true/);
  assert.doesNotMatch(config, /\[\[routes\]\]/);
  assert.doesNotMatch(config, /zone_name\s*=/);
  assert.match(worker, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(worker, /user_roles/);
  assert.match(worker, /editor.*admin.*superadmin/);
  assert.match(worker, /\$\{normalized\}\.mp3/);
  assert.doesNotMatch(read('admin/js/content-publisher.js'), /SUPABASE_SERVICE_ROLE_KEY/);
});

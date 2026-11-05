import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { buildPlayAlongGuide, buildPlayAlongEditorial } =
  require('../scripts/generate-retro-pages.js');
const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'data/retro-specials.json'), 'utf8'));
const entry = catalogue.find((item) => item.slug === 'c64-vs-amiga-100-games-compared');

test('source catalogue owns exactly 100 games, 9 interludes and final tally', () => {
  assert.ok(entry, 'showdown record must exist');
  assert.equal(entry.youtubeId, 'ygPOtslHRfk');
  assert.equal(entry.chapters.length, 111);
  assert.equal(entry.chapters[0].time, '00:00');
  assert.equal(entry.chapters[1].time, '00:30');
  assert.equal(entry.chapters.at(-1).time, '52:00');
  assert.equal(entry.chapters.filter((x) => /^#\d+ – /.test(x.title)).length, 100);
  assert.equal(entry.chapters.filter((x) => /^Scoreboard — /.test(x.title)).length, 9);
  assert.ok(entry.disableAutoFeaturedGames);
  assert.ok(entry.deferYouTubePlayer);
});

test('generated showdown guide is complete, navigable and safely escaped', () => {
  const html = buildPlayAlongGuide(entry, '/retro-specials/');
  assert.equal((html.match(/data-video-chapter="/g) || []).length, 111);
  assert.equal((html.match(/<details\b/g) || []).length, 10);
  assert.ok(html.includes('data-video-chapter="30"'));
  assert.ok(html.includes('data-video-chapter="3120"'));
  assert.ok(html.includes('C64 vs Amiga'));
  assert.ok(!html.includes('<script>'));
  const altered = structuredClone(entry);
  altered.chapters[1].title = '<img src=x onerror=alert(1)>';
  const safe = buildPlayAlongGuide(altered, '/retro-specials/');
  assert.ok(!safe.includes('<img src=x'));
  assert.ok(safe.includes('&lt;img'));
  altered.chapters[1].time = '00:00';
  assert.throws(() => buildPlayAlongGuide(altered, '/retro-specials/'), /timings are invalid/);
});

test('showdown editorial remains source-owned and links are local', () => {
  const html = buildPlayAlongEditorial(entry);
  assert.ok(html.includes('retro-video-page__editorial'));
  assert.ok(html.includes('/retro-specials/50-essential-amiga-games/'));
  const altered = structuredClone(entry);
  altered.playAlong.editorialLinks.push({ url: 'javascript:alert(1)', title: 'Bad link' });
  assert.ok(!buildPlayAlongEditorial(altered).includes('javascript:alert'));
});

test('production retro-page generator preserves chapters and editorial', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ccg-showdown-generator-'));
  try {
    fs.mkdirSync(path.join(temp, 'admin', 'templates'), { recursive: true });
    fs.mkdirSync(path.join(temp, 'data'), { recursive: true });
    fs.copyFileSync(
      path.join(root, 'admin', 'templates', 'retro-video-template.html'),
      path.join(temp, 'admin', 'templates', 'retro-video-template.html')
    );
    fs.writeFileSync(path.join(temp, 'data', 'retro-specials.json'),
      JSON.stringify([entry], null, 2), 'utf8');
    const result = spawnSync(process.execPath,
      [path.join(root, 'scripts', 'generate-retro-pages.js'), '--root', temp],
      { encoding: 'utf8', timeout: 60_000 });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const generated = fs.readFileSync(path.join(temp, 'retro-specials',
      'c64-vs-amiga-100-games-compared', 'index.html'), 'utf8');
    assert.equal((generated.match(/data-video-chapter="/g) || []).length, 111);
    assert.equal((generated.match(/<details\b/g) || []).length, 10);
    assert.ok(generated.includes('data-ccg-seo-editorial="c64-vs-amiga-100-games-compared"'));
    assert.ok(generated.includes('data-ccg-youtube-src="https://www.youtube-nocookie.com/embed/ygPOtslHRfk"'));
    assert.ok(generated.includes('https://www.cheekycommodoregamer.co.uk/retro-specials/c64-vs-amiga-100-games-compared/'));
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

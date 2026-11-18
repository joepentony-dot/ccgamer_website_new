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
const { buildTimedChaptersGuide } = require('../scripts/generate-retro-pages.js');
const { chaptersFor } = require('../scripts/generate-video-library.js');
const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'data/retro-specials.json'), 'utf8'));
const slug = '50-commodore-64-sid-tunes-zzap64';
const videoId = 'icwCrzfKxhk';
const entry = catalogue.find(item => item.slug === slug);
const route = '/retro-specials/' + slug + '/';

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

test('SID documentary has one canonical catalogue record, 50 tracks and 53 precise chapters', () => {
  assert.ok(entry);
  assert.equal(catalogue.filter(item => item.youtubeId === videoId).length, 1);
  assert.equal(catalogue.filter(item => item.slug === slug).length, 1);
  assert.equal(entry.chapters.length, 53);
  assert.equal(entry.chapters[0].time, '00:00');
  assert.equal(entry.chapters[1].time, '00:28');
  assert.equal(entry.chapters[25].time, '24:25');
  assert.equal(entry.chapters[40].time, '39:23');
  assert.equal(entry.chapters[51].time, '50:22');
  assert.equal(entry.chapters[52].time, '56:22');
  assert.match(entry.chapters[25].title, /Sanxion.*copyright claim/i);
  assert.match(entry.chapters[40].title, /Last Ninja 2.*copyright claim/i);
  assert.doesNotMatch(entry.chapters[50].title, /replaced|copyright/i);
  assert.equal(entry.deferYouTubePlayer, true);
  assert.equal(entry.disableAutoFeaturedGames, true);
  assert.ok(entry.featureEditorial.links.some(link => link.url === '/music/'));
  assert.ok(entry.featureEditorial.links.some(link => link.url === '/games/'));
  assert.equal(chaptersFor(entry, { description: '00:00 Wrong auto chapter\n00:01 Truncated metadata' }).length, 53);
});

test('published collection card and watch page preserve canonical, SEO, 53 jumps and deferred player', () => {
  const collection = read('games/collections/retro-specials.html');
  const watch = read('retro-specials/' + slug + '/index.html');
  const redirect = read('retro-specials/' + slug + '.html');
  assert.match(collection, new RegExp(videoId));
  assert.doesNotMatch(collection, /7PU3GqBDnRI/, 'Old removed upload must not remain on collection');
  assert.ok(collection.includes('https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg'));
  assert.match(collection, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(watch, /<meta name="description" content="Listen through 50 classic Commodore 64 SID music/);
  assert.ok(watch.includes('rel="canonical" href="https://www.cheekycommodoregamer.co.uk' + route + '"'));
  assert.ok(watch.includes('data-ccg-youtube-src="https://www.youtube-nocookie.com/embed/' + videoId + '"'));
  assert.ok(watch.includes('data-ccg-video-facade-play'));
  assert.doesNotMatch(watch, /7PU3GqBDnRI/, 'Old removed upload must not remain on watch page');
  assert.ok(watch.includes('https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg'));
  assert.doesNotMatch(watch, /<iframe src="https:\/\/www\.youtube(?:-nocookie)?\.com/);
  assert.equal((watch.match(/data-video-chapter="/g) || []).length, 53);
  assert.ok(watch.includes('data-ccg-feature-editorial="' + slug + '"'));
  assert.ok(watch.includes('/music/'));
  assert.ok(watch.includes('Sanxion'));
  assert.ok(watch.includes('Last Ninja 2'));
  assert.ok(watch.includes('<!-- CCG_VIDEO_SCHEMA -->'), 'Unverified YouTube dates must not be invented');
  assert.doesNotMatch(watch, /"uploadDate"\s*:/);
  assert.ok(redirect.includes('noindex,follow'));
  assert.ok(redirect.includes('rel="canonical" href="https://www.cheekycommodoregamer.co.uk' + route + '"'));
});

test('opt-in guide escapes markup and rejects invalid chapter timing', () => {
  const html = buildTimedChaptersGuide(entry, '/retro-specials/');
  assert.equal((html.match(/data-video-chapter="/g) || []).length, 53);
  assert.ok(html.includes('?t=2363#watch-video'), 'Last Ninja 2 offset must be 39:23');
  assert.ok(html.includes('?t=1465#watch-video'), 'Sanxion offset must be 24:25');
  const altered = structuredClone(entry);
  altered.chapters[1].title = '<script>alert(1)</script>';
  const safe = buildTimedChaptersGuide(altered, '/retro-specials/');
  assert.doesNotMatch(safe, /<script>alert/);
  assert.match(safe, /&lt;script&gt;/);
  altered.chapters[1].time = '00:00';
  assert.throws(() => buildTimedChaptersGuide(altered, '/retro-specials/'), /increase strictly/);
  altered.chapters[1].time = '99:99';
  assert.throws(() => buildTimedChaptersGuide(altered, '/retro-specials/'), /Invalid documentary chapter/);
});

test('source generation and video-library companion retain all 53 chapters and editorial', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ccg-sid-documentary-'));
  try {
    fs.mkdirSync(path.join(temp, 'admin', 'templates'), { recursive: true });
    fs.mkdirSync(path.join(temp, 'data'), { recursive: true });
    fs.mkdirSync(path.join(temp, 'games'), { recursive: true });
    for (const name of ['retro-video-template.html', 'video-library-template.html']) {
      fs.copyFileSync(path.join(root, 'admin', 'templates', name),
        path.join(temp, 'admin', 'templates', name));
    }
    fs.writeFileSync(path.join(temp, 'games', 'games.json'), '[]\n');
    fs.writeFileSync(path.join(temp, 'data', 'retro-specials.json'), JSON.stringify([entry], null, 2));

    const generation = spawnSync(process.execPath,
      [path.join(root, 'scripts', 'generate-retro-pages.js'), '--root', temp],
      { encoding: 'utf8', timeout: 60_000 });
    assert.equal(generation.status, 0, generation.stderr || generation.stdout);
    const generatedPath = path.join(temp, 'retro-specials', slug, 'index.html');
    const generated = fs.readFileSync(generatedPath, 'utf8');
    assert.equal((generated.match(/data-video-chapter="/g) || []).length, 53);
    assert.ok(generated.includes('data-ccg-feature-editorial="' + slug + '"'));
    assert.ok(generated.includes('data-ccg-youtube-src="https://www.youtube-nocookie.com/embed/' + videoId + '"'));

    const companion = spawnSync(process.execPath,
      [path.join(root, 'scripts', 'generate-video-library.js')],
      { encoding: 'utf8', timeout: 60_000, env: { ...process.env, CCG_REPO_ROOT: temp } });
    assert.equal(companion.status, 0, companion.stderr || companion.stdout);
    const enriched = fs.readFileSync(generatedPath, 'utf8');
    assert.equal((enriched.match(/data-video-chapter="/g) || []).length, 53);
    assert.ok(enriched.includes('Original SID audio was replaced for Sanxion and Last Ninja 2'));
    assert.ok(enriched.includes('data-ccg-feature-editorial="' + slug + '"'));
    assert.ok(enriched.includes('data-ccg-youtube-src="https://www.youtube-nocookie.com/embed/' + videoId + '"'));
    assert.ok(enriched.includes('/music/'));
    const library = JSON.parse(fs.readFileSync(path.join(temp, 'videos', 'video-index.json'), 'utf8'));
    assert.equal(library.items.filter(item => item.id === videoId).length, 1);
    assert.equal(library.items.find(item => item.id === videoId).url, route);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

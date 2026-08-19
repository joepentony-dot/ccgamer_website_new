import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const runtime = fs.readFileSync('js/ccg-category-omega.js', 'utf8');
const css = fs.readFileSync('resources/css/ccg-category-omega.css', 'utf8');
const generator = fs.readFileSync('scripts/upgrade-category-pages.js', 'utf8');
const rebuild = fs.readFileSync('scripts/rebuild-games.js', 'utf8');
const publishing = fs.readFileSync('.github/workflows/games-publishing.yml', 'utf8');
const music = fs.readFileSync('music/index.html', 'utf8');

const racing = () => fs.readFileSync('games/genres/racing-games.html', 'utf8');
const licensed = () => fs.readFileSync('games/collections/licensed-games.html', 'utf8');
const genreIndex = () => fs.readFileSync('games/genres/index.html', 'utf8');

test('Category Omega covers the complete genre and curated collection routes', () => {
  const genreFiles = [
    'action-adventure-games.html', 'adventure-games.html', 'arcade-games.html',
    'casino-games.html', 'fighting-games.html', 'horror-games.html', 'miscellaneous.html',
    'platform-games.html', 'puzzle-games.html', 'quiz-games.html', 'racing-games.html',
    'role-playing-games.html', 'shooting-games.html', 'sports-games.html', 'strategy-games.html'
  ];
  const collectionFiles = [
    'cartridge-games.html', 'licensed-games.html', 'bpjs-indexed-games.html',
    'top-picks.html', 'amiga-demo-music.html', 'retro-events.html', 'retro-specials.html'
  ];

  genreFiles.forEach((file) => {
    assert.match(runtime, new RegExp(file.replace('.', '\\.')));
    assert.match(generator, new RegExp(file.replace('.', '\\.')));
  });
  collectionFiles.forEach((file) => {
    assert.match(runtime, new RegExp(file.replace('.', '\\.')));
    assert.match(generator, new RegExp(file.replace('.', '\\.')));
  });
});

test('representative genre output carries strong static C64 and Amiga SEO', () => {
  const html = racing();
  assert.match(html, /<title>Racing Games on C64 &amp; Amiga \| Cheeky Commodore Gamer<\/title>/);
  assert.match(html, /Browse C64 and Amiga racing games/);
  assert.match(html, /Racing Games on Commodore 64 &amp; Amiga/);
  assert.match(html, /ccg-category-omega\.css/);
  assert.match(html, /ccg-category-omega\.js/);
  assert.match(html, /data-ccg-category-static-schema/);
  assert.match(html, /CollectionPage/);
});

test('representative collection output carries strong static C64 and Amiga SEO', () => {
  const html = licensed();
  assert.match(html, /<title>Licensed Games – C64 &amp; Amiga \| Cheeky Commodore Gamer<\/title>/);
  assert.match(html, /Browse licensed C64 and Amiga games/);
  assert.match(html, /Licensed Games – C64 &amp; Amiga/);
  assert.match(html, /ccg-category-omega\.css/);
  assert.match(html, /ccg-category-omega\.js/);
  assert.match(html, /data-ccg-category-static-schema/);
});

test('genre index targets the useful C64 and Amiga genre query directly', () => {
  const html = genreIndex();
  assert.match(html, /<title>C64 &amp; Amiga Games by Genre \| Cheeky Commodore Gamer<\/title>/);
  assert.match(html, /C64 &amp; Amiga Games by Genre/);
  assert.match(html, /Commodore 64 and Amiga games by genre/);
});

test('Omega presentation varies by category without creating separate CSS forks', () => {
  assert.match(css, /data-ccg-category-theme="racing"/);
  assert.match(css, /data-ccg-category-theme="horror"/);
  assert.match(css, /data-ccg-category-theme="strategy"/);
  assert.match(css, /data-ccg-category-theme="licensed"/);
  assert.match(css, /data-ccg-category-theme="amiga-demo"/);
  assert.match(css, /\.ccg-category-omega__discovery/);
  assert.match(runtime, /All C64 & Amiga Games/);
  assert.match(runtime, /Curated Collections/);
  assert.match(runtime, /Browse by Genre/);
});

test('category SEO survives authoritative game rebuilds and is published automatically', () => {
  assert.match(rebuild, /\["upgrade-category-pages\.js"\]/);
  assert.match(rebuild, /\["upgrade-category-pages\.js", "--check"\]/);
  assert.match(publishing, /scripts\/upgrade-category-pages\.js/);
  assert.match(publishing, /js\/ccg-category-omega\.js/);
  assert.match(publishing, /resources\/css\/ccg-category-omega\.css/);
});

test('music keeps its established short URL while signalling C64 and Amiga strongly', () => {
  assert.match(music, /<title>C64 &amp; Amiga Music Hub \| Cheeky Commodore Gamer<\/title>/);
  assert.match(music, /C64 and Amiga game music composers/);
  assert.match(music, /rel="canonical" href="https:\/\/www\.cheekycommodoregamer\.co\.uk\/music\/"/);
  assert.match(music, /"name": "C64 & Amiga Music Hub"/);
  assert.doesNotMatch(generator, /music\/index\.html/);
});

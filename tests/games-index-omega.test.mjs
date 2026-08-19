import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const games = fs.readFileSync('games/index.html', 'utf8');
const css = fs.readFileSync('resources/css/ccg-games-index-omega.css', 'utf8');
const generator = fs.readFileSync('scripts/upgrade-games-index.js', 'utf8');
const rebuild = fs.readFileSync('scripts/rebuild-games.js', 'utf8');
const navFit = fs.readFileSync('js/ccg-nav-fit.js', 'utf8');
const navFitCss = fs.readFileSync('resources/css/ccg-nav-fit.css', 'utf8');
const publishing = fs.readFileSync('.github/workflows/games-publishing.yml', 'utf8');

test('games archive has strong static C64 and Amiga SEO', () => {
  assert.match(games, /<title>C64 &amp; Amiga Games Archive \| Cheeky Commodore Gamer<\/title>/);
  assert.match(games, /Explore the Cheeky Commodore Gamer C64 and Amiga games archive/);
  assert.match(games, /<meta name="robots" content="index,follow" \/>/);
  assert.match(games, /<h1 class="games-hero__title">C64 &amp; Amiga Games Archive<\/h1>/);
  assert.match(games, /data-ccg-games-index-schema/);
  assert.match(games, /"@type":"CollectionPage"/);
  assert.match(games, /"@type":"BreadcrumbList"/);
});

test('games archive exposes useful static discovery routes', () => {
  const expected = [
    '/games/genres/',
    '/games/publishers/',
    '/games/collections/',
    '/games/years/',
    '/games/platforms/',
    '/games/developers/',
    '/games/downloads/',
    '/music/'
  ];
  expected.forEach((href) => assert.match(games, new RegExp(`href="${href.replaceAll('/', '\\/')}"`)));
  assert.match(games, /Find C64 &amp; Amiga Games Your Way/);
  assert.match(games, /Search &amp; Filter C64 and Amiga Games/);
  assert.match(games, /data-games-archive-shortcuts="true"/);
  assert.match(games, /data-games-downloads-shortcut="true"/);
});

test('Omega games archive presentation is responsive and scoped', () => {
  assert.match(games, /ccg-games-index-omega\.css/);
  assert.match(css, /\.ccg-page--games-index \.games-hero/);
  assert.match(css, /\.games-omega-discovery__grid/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test('games index upgrade survives authoritative rebuilds', () => {
  const integrateIndex = rebuild.indexOf('["integrate-year-platform-discovery.js"]');
  const upgradeIndex = rebuild.indexOf('["upgrade-games-index.js"]');
  assert.ok(integrateIndex >= 0, 'year/platform discovery is part of rebuild');
  assert.ok(upgradeIndex > integrateIndex, 'games index upgrade runs after discovery integration');
  assert.match(rebuild, /\["upgrade-games-index\.js", "--check"\]/);
  assert.match(publishing, /scripts\/upgrade-games-index\.js/);
  assert.match(publishing, /resources\/css\/ccg-games-index-omega\.css/);
  assert.match(publishing, /games\/index\.html/);
  assert.match(generator, /CCG GAMES INDEX OMEGA DISCOVERY START/);
});

test('desktop More is backed by real authoritative menu links from first paint', () => {
  assert.match(navFit, /function menuHasOverflowLinks\(menu\)/);
  assert.match(navFit, /menu\?\.querySelector\("\.ccg-nav-fit__link"\)/);
  assert.match(navFit, /PINNED_MORE_LABELS = new Set\(\["install ccg app", "about", "about me", "contact"\]\)/);
  assert.match(navFit, /\["Install CCG App", "\/install-app\.html"\]/);
  assert.match(navFit, /more\.hidden = !hasOverflow/);
  assert.match(navFit, /toggle\.disabled = !hasOverflow/);
  assert.match(navFit, /toggle\.setAttribute\("aria-hidden", hasOverflow \? "false" : "true"\)/);
  assert.match(navFit, /Keep the desktop More slot reserved throughout fitting/);
  assert.match(navFit, /showPopover/);
  assert.match(navFit, /data-ccg-more-top-layer/);
  assert.match(navFit, /window\.addEventListener\("pageshow"/);
  assert.match(navFitCss, /\.ccg-header \.ccg-nav__more \{/);
  assert.match(navFitCss, /a\[href="\/install-app\.html"\]/);
  assert.match(navFitCss, /\.ccg-nav__more\[hidden\]/);
  assert.match(navFitCss, /\.ccg-nav__more-menu\[popover\]:popover-open/);
});

test('More remains available for pinned and responsive overflow links', () => {
  assert.match(navFit, /items\.filter\(isPinnedMoreItem\)/);
  assert.match(navFit, /populateMore\(menu, hiddenItems\)/);
  assert.match(navFit, /syncMoreAvailability\(nav, more, toggle, menu\)/);
  assert.match(navFitCss, /\.ccg-nav--has-overflow \.ccg-nav__more/);
  assert.match(navFitCss, /display: inline-flex !important/);
});
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { build: buildGamesIndex, DESCRIPTION: authoritativeDescription } = require('../scripts/upgrade-games-index.js');

const games = fs.readFileSync('games/index.html', 'utf8');
const css = fs.readFileSync('resources/css/ccg-games-index-omega.css', 'utf8');
const generator = fs.readFileSync('scripts/upgrade-games-index.js', 'utf8');
const rebuild = fs.readFileSync('scripts/rebuild-games.js', 'utf8');
const navFit = fs.readFileSync('js/ccg-nav-fit.js', 'utf8');
const navFitCss = fs.readFileSync('resources/css/ccg-nav-fit.css', 'utf8');
const publishing = fs.readFileSync('.github/workflows/games-publishing.yml', 'utf8');

test('games archive has strong static C64 and Amiga SEO', () => {
  assert.match(games, /<title>C64 &amp; Amiga Games Archive \| Cheeky Commodore Gamer<\/title>/);
  assert.ok(authoritativeDescription.length <= 155, 'authoritative SEO description is concise');
  assert.match(authoritativeDescription, /[.!?]$/, 'authoritative SEO description ends with a sentence');
  assert.ok(!authoritativeDescription.endsWith('…') && !authoritativeDescription.endsWith('...'), 'no cut-off ellipsis');
  for (const tag of [
    '<meta name="description" content="',
    '<meta property="og:description" content="',
    '<meta name="twitter:description" content="'
  ]) {
    assert.ok(games.includes(tag + authoritativeDescription + '"'), tag + ' matches authoritative description');
  }
  const schemaMarker = '<script type="application/ld+json" data-ccg-games-index-schema>';
  const schemaStart = games.indexOf(schemaMarker);
  assert.ok(schemaStart >= 0, 'games archive schema is present');
  const schemaEnd = games.indexOf('</script>', schemaStart);
  assert.ok(schemaEnd > schemaStart, 'games archive schema closes');
  const graph = JSON.parse(games.slice(schemaStart + schemaMarker.length, schemaEnd))['@graph'];
  assert.equal(graph.find((entry) => entry['@type'] === 'CollectionPage').description, authoritativeDescription,
    'CollectionPage schema shares authoritative description');
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
  assert.match(games, /Use the search and filters above/);
  const activeStyle = fs.readFileSync('resources/css/games-hero-fix.css', 'utf8');
  assert.match(activeStyle, /gamesSearchInput:not\(:placeholder-shown\)\) \.games-omega-discovery,/,
    'an active search hides optional discovery so matching games stay directly below filters');
  assert.match(activeStyle, /games-omega-discovery \+ \.ccg-omega-divider/,
    'the divider after optional discovery is also hidden during an active search');
  assert.match(generator, /Use the search and filters above/);
  assert.match(games, /Search &amp; Filter C64 and Amiga Games/);
  assert.match(games, /data-games-archive-shortcuts="true"/);
  assert.match(games, /data-games-downloads-shortcut="true"/);
  assert.match(games, /<details class="games-omega-discovery__more">/);
  assert.match(games, /<summary class="games-omega-discovery__summary">/);
  assert.ok(games.indexOf('gamesSearchInput') < games.indexOf('games-omega-discovery__summary'), 'search precedes the optional archive route disclosure');
  assert.match(generator, /games-omega-discovery__summary/);
});

test('main games archive uses one focused search/filter surface with optional browsing controls', () => {
  const toolsSection = games.match(/<!-- SEARCH -->[\s\S]*?<!-- ACCORDION -->/)?.[0];
  assert.ok(toolsSection, 'search and filter area is present');
  assert.match(toolsSection, /<div class="games-tools__controls" role="group" aria-label="Find and filter games">/);
  assert.match(toolsSection, /<details class="games-tools__optional">/);
  assert.match(toolsSection, /<summary class="games-tools__optional-title">Browse A–Z and other game sections<\/summary>/);
  assert.ok(toolsSection.indexOf('id="gamesSearchInput"') < toolsSection.indexOf('games-tools__optional'), 'search remains visible ahead of optional browsing');
  for (const id of ['gamesSearchInput', 'gamesSearchClear', 'gamesYearSelect', 'gamesBrowseHint', 'gamesAlphaStrip']) {
    assert.equal((games.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1, 'preserve one runtime hook: ' + id);
  }
  for (const filter of ['all', 'c64', 'amiga']) {
    assert.match(toolsSection, new RegExp('data-system-filter="' + filter + '"'), 'system choice exists: ' + filter);
  }
  assert.match(css, /\.ccg-page--games-index \.games-tools__controls/);
  assert.match(css, /\.ccg-page--games-index \.games-tools__optional-title:focus-visible/);
});

test('archive generator repairs missing discovery routes despite an intact summary marker', () => {
  const sectionPattern = /<!-- CCG GAMES INDEX OMEGA DISCOVERY START -->[\s\S]*?<!-- CCG GAMES INDEX OMEGA DISCOVERY END -->/;
  const originalSection = games.match(sectionPattern)?.[0];
  assert.ok(originalSection, 'generated discovery section is present');
  const broken = games.replace(
    /<a class="games-omega-discovery__card" href="\/games\/genres\/"[^>]*>[\s\S]*?<\/a>/,
    ''
  );
  assert.notEqual(broken, games, 'the test actually removes a discovery card');
  assert.match(broken, /games-omega-discovery__summary/, 'the misleading summary marker remains');
  const rebuilt = buildGamesIndex(broken);
  assert.equal(rebuilt.match(sectionPattern)?.[0], originalSection, 'the generator restores the exact complete section');
  assert.equal(buildGamesIndex(rebuilt), rebuilt, 'repair remains deterministic on the second rebuild');
});

test('Omega games archive presentation is responsive and scoped', () => {
  assert.match(games, /ccg-games-index-omega\.css/);
  assert.match(css, /\.ccg-page--games-index \.games-hero/);
  assert.match(css, /\.games-omega-discovery__grid/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test('games index catalogue count and crawlable fallback are derived from games.json', () => {
  const sourceGames = JSON.parse(fs.readFileSync('games/games.json', 'utf8'));
  const rebuilt = buildGamesIndex(games, sourceGames);
  const expectedCount = sourceGames.length;

  assert.match(rebuilt, new RegExp(`<strong id="gamesTotalCount">${expectedCount}<\\/strong>`));
  assert.match(rebuilt, new RegExp(`<strong id="gamesResultsCount">${expectedCount}<\\/strong>`));
  assert.match(rebuilt, new RegExp(`<span class="games-focus-panel__count">${expectedCount} total<\\/span>`));

  const fallback = rebuilt.match(/<section id="gamesStaticFallback"[^>]*>[\s\S]*?<ul>([\s\S]*?)<\/ul>[\s\S]*?<\/section>/i);
  assert.ok(fallback, 'crawlable games fallback is present');

  const fallbackSlugs = [...fallback[1].matchAll(new RegExp('href="/games/([^"/]+)/"', 'g'))].map((match) => match[1]);
  const sourceSlugs = sourceGames.map((game) => String(game.slug || '').trim()).filter(Boolean);
  assert.equal(fallbackSlugs.length, sourceSlugs.length, 'fallback contains one link per source game');
  assert.deepEqual(new Set(fallbackSlugs), new Set(sourceSlugs), 'fallback slugs match the authoritative catalogue');
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
  assert.match(navFit, /PINNED_MORE_LABELS = new Set\(\["ccg games", "install ccg app", "about", "about me", "contact"\]\)/);
  assert.match(navFit, /\["CCG Games", "\/games\/ccg-games\/"\]/);
  assert.match(navFit, /\["Install CCG App", "\/install-app\.html"\]/);
  assert.match(navFit, /more\.hidden = !hasOverflow/);
  assert.match(navFit, /toggle\.disabled = !hasOverflow/);
  assert.match(navFit, /toggle\.setAttribute\("aria-hidden", hasOverflow \? "false" : "true"\)/);
  assert.match(navFit, /Keep the desktop More slot reserved throughout fitting/);
  assert.match(navFit, /showPopover/);
  assert.match(navFit, /data-ccg-more-top-layer/);
  assert.match(navFit, /window\.addEventListener\("pageshow"/);
  assert.match(navFitCss, /a\[href="\/games\/ccg-games\/"\]/);
  assert.match(navFitCss, /a\[href="\/install-app\.html"\]/);
  assert.match(navFitCss, /\.ccg-header \.ccg-nav__more \{/);
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
test('dynamic Games Archive cards encode editable catalogue data without changing valid links', () => {
  const runtime = fs.readFileSync('js/games-library.js', 'utf8');
  const sections = [];
  const fakeDocument = {
    addEventListener() {},
    getElementById(id) { return id === 'gamesAccordion' ? { appendChild(node) { sections.push(node); } } : null; },
    createElement() { return { dataset: {}, className: '', innerHTML: '' }; },
    querySelectorAll() { return []; }
  };
  const library = new Function('window', 'document',
    runtime + '\nreturn { renderGameCardMarkup, renderGameCardShell, resolveGameUrl, buildAccordion };'
  )({ matchMedia: () => ({ matches: false }), innerWidth: 1440 }, fakeDocument);

  const poisoned = {
    id: 'safe-game',
    slug: 'javascript:alert(1)',
    title: "Demo <svg onload=alert(1)> \" & '",
    thumbnail: 'art.png" onerror="alert(1)',
    year: '1987"><img src=x onerror=alert(1)>',
    system: 'C64</div><script>alert(1)</script>'
  };
  const markup = library.renderGameCardMarkup(poisoned, {
    key: 'slug:" onmouseover="alert(1)',
    rendered: true
  });
  assert.match(markup, /href="safe-game\/"/);
  assert.match(markup, /&lt;svg onload=alert\(1\)&gt;/);
  assert.match(markup, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(markup, /&quot;/);
  assert.match(markup, /&#39;/);
  assert.doesNotMatch(markup, /<svg|<script|onerror="alert|onmouseover="alert/);
  assert.equal((markup.match(/class="ccg-game-card__actions"/g) || []).length, 1);

  const shell = library.renderGameCardShell('slug:"><svg onload=alert(1)>');
  assert.match(shell, /data-game-key="slug:&quot;&gt;&lt;svg/);
  assert.doesNotMatch(shell, /<svg/);

  const ordinary = library.renderGameCardMarkup({
    id: 'accolades-comics', slug: 'accolades-comics',
    title: "Accolade's Comics", thumbnail: 'accolades-comics.webp',
    year: 1987, system: 'C64'
  });
  assert.match(ordinary, /href="accolades-comics\/"/);
  assert.match(ordinary, /Accolade&#39;s Comics/);
  assert.equal(library.resolveGameUrl({ slug: 'smash-t-5' }), 'smash-tv/');

  library.buildAccordion({ '<': [poisoned] });
  assert.equal(sections.length, 1);
  assert.match(sections[0].innerHTML, /data-letter="&lt;"/);
  assert.doesNotMatch(sections[0].innerHTML, /<svg|<script|onerror="alert/);
});

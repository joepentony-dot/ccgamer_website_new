import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const normalizer = require('../scripts/normalize-public-header-shell.js');

test('staging makes the final cascade active, ordered and idempotent even with preload/noscript copies', () => {
  const source = fs.readFileSync('games/ace-of-aces/index.html', 'utf8');
  const href = '/resources/css/ccg-responsive-safety.css';
  const input = source.replace('</head>', `<link rel="preload" as="style" href="${href}" onload="this.rel='stylesheet'"><noscript><link rel="stylesheet" href="${href}"></noscript></head>`);
  const staged = normalizer.normaliseHtml(input).html;
  let position = -1;
  for (const href of normalizer.PUBLIC_HEADER_FIRST_PAINT_STYLES) {
    const next = staged.indexOf(`href="${href}" data-ccg-public-header-first-paint-style="true"`);
    assert(next > position, `Wrong first-paint CSS order: ${href}`);
    position = next;
  }
  assert.equal(staged.split(`href="${href}"`).length - 1, 1);
  assert.equal(normalizer.normaliseHtml(staged).html, staged);
  const enriched = staged.replace('</head>', '<script type="application/ld+json">{"@type":"WebPage"}</script>\n</head>');
  assert.equal(normalizer.normaliseHtml(enriched).html, enriched, 'Later inert SEO enrichment must not cause stylesheet relocation');
  // The existing parity audit additionally checks every canonical source page.
  for (const id of ['game-graph', 'game-canonical', 'gameHeroTitle']) assert(staged.includes(id));
  assert(staged.includes('data-ccg-engagement-breadcrumbs="true"'));
  assert(staged.includes('id="ccgModeIdentityBar"'));
  assert.equal(fs.readFileSync('games/ace-of-aces/index.html', 'utf8'), source);
});

test('responsive fallback preserves existing relative styles and never reorders on resize/load', () => {
  const styles = ['ccg-responsive-safety', 'ccg-responsive-page-polish', 'ccg-sitewide-layout-optimization', 'ccg-nav-labelled-bridge'];
  const links = styles.map(name => ({ href: new URL(`../resources/css/${name}.css`, 'https://ccg.test/games/').href }));
  let writes = 0;
  const events = [];
  const context = { URL, location: { href: 'https://ccg.test/home.html' }, window: { location: { pathname: '/home.html' }, addEventListener: (...args) => events.push(args) }, document: {
    documentElement: { getAttribute: () => 'home' }, readyState: 'complete',
    querySelectorAll: () => links,
    head: { appendChild: () => { writes++; } },
    createElement: () => ({ setAttribute() {} })
  } };
  vm.runInNewContext(fs.readFileSync('js/ccg-responsive-safety.js', 'utf8'), context);
  assert.equal(writes, 0);
  assert.deepEqual(events, []);
});

test('Home owns real mode status, Archive Pulse and artwork in its initial HTML', () => {
  const home = fs.readFileSync('home.html', 'utf8');
  const hero = home.indexOf('<section class="home-hero');
  assert(home.indexOf('id="ccgModeIdentityBar"') < hero);
  assert(home.indexOf('data-ccg-archive-pulse="true"') < hero);
  const games = JSON.parse(fs.readFileSync('games/games-index.json'));
  for (const slug of ['ace-of-aces', '20-tons']) {
    const game = games.find(row => row.slug === slug);
    assert(home.includes(`href="/games/${slug}/"`));
    assert(home.includes(`src="/${game.thumbnail}" width="96" height="72"`));
    assert(home.includes(game.title));
  }
});

test('approved CLS additions cannot exempt unrelated homepage content or executable changes', () => {
  const { isApprovedHomeClsChange } = require('../scripts/home-cls-contract.js');
  const { execFileSync } = require('node:child_process');
  const baseline = execFileSync('git', ['show', 'origin/main:home.html'], { encoding: 'utf8' });
  const home = fs.readFileSync('home.html', 'utf8');
  assert(isApprovedHomeClsChange(baseline, home));
  assert(!isApprovedHomeClsChange(baseline, home.replace('Find Your Way Around CCG', 'Unreviewed redesign')));
  assert(!isApprovedHomeClsChange(baseline, home.replace('Fresh Game Pick', 'Unreviewed pick')));
  assert(!isApprovedHomeClsChange(baseline, home.replace('data-ccg-first-paint-mode="true">', 'data-ccg-first-paint-mode="true">alert(1);')));
});

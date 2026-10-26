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

test('music hub scrolling cannot invalidate the entire page on native wheel input', () => {
  const music = fs.readFileSync('js/music-composer-pages.js', 'utf8');
  const start = music.indexOf('function initMusicScrollPerfPause()');
  const end = music.indexOf('function initBackToTop()', start);
  assert(start >= 0 && end > start, 'music scrolling contract must remain discoverable');
  const block = music.slice(start, end);
  assert.doesNotMatch(block, /root\.classList\.(add|remove)\(/,
    'music hub must never mutate root classes inside the wheel performance helper');
  assert.doesNotMatch(block, /addEventListener\(["'](?:scroll|touchmove)["']/,
    'do not reinstall unnecessary document-wide music scroll listeners');
});

test('music decorative effects have bounded non-wheel restoration', () => {
  const music = fs.readFileSync('js/music-composer-pages.js', 'utf8');
  const start = music.indexOf('function initMusicScrollPerfPause()');
  const end = music.indexOf('function initBackToTop()', start);
  const block = music.slice(start, end);
  assert.match(block, /nonWheelResumeTimer/);
  assert.match(block, /setTimeout\(\(\) => \{[\s\S]*if \(!wheelStarted\) resumeDecorativeAnimations\(\);/);
  assert.match(block, /addEventListener\("touchstart", onNonWheelInteraction/);
  assert.match(block, /addEventListener\("keydown", onNonWheelInteraction/);
});

test('CLS release suite diagnoses the targeted 960px game route before the full matrix', () => {
  const source = fs.readFileSync('scripts/audit-sitewide-cls.mjs', 'utf8');
  const workflow = fs.readFileSync('.github/workflows/ccg-game-page-release.yml', 'utf8');
  assert.match(source, /CCG_CLS_FOCUS === 'ace960'/);
  assert.match(source, /CLS SOURCE DIAGNOSTIC/);
  assert.match(workflow, /Diagnose the exact 960px game-page CLS regression/);
  assert.match(workflow, /- name: Measure staged CLS and exercise page functionality/,
    'the existing entire staged matrix must still run once focus succeeds');
});

test('staged canonical box-art prefill protects first-paint hero grid', () => {
  const script = fs.readFileSync('scripts/prefill-canonical-game-boxes.mjs', 'utf8');
  const workflow = fs.readFileSync('.github/workflows/deploy-github-pages-omega-stable.yml', 'utf8');
  assert.match(script, /game-hero--has-box3d/);
  assert.match(script, /data-ccg-box3d-prefilled/);
  assert.match(script, /games', 'boxes-3d/);
  assert.match(script, /if \(check\) throw new Error/);
  assert.match(workflow, /prefill-canonical-game-boxes\.mjs --root _site/);
  assert.match(workflow, /prefill-canonical-game-boxes\.mjs --root _site --check/);
});

test('hidden floating navigation does not expand the document scroll height', () => {
  const css = fs.readFileSync('resources/css/ccg-master.css', 'utf8');
  const rule = css.match(/\.ccg-floating-nav\s*\{([^}]*)\}/);
  assert(rule, 'floating navigation must retain its fixed-position shell');
  assert.match(rule[1], /position:\s*fixed;/);
  assert.match(rule[1], /transform:\s*translate\(-50%,\s*4px\);/,
    'hidden floating navigation must stay within the smallest mobile bottom clearance');
  assert.doesNotMatch(rule[1], /translate\(-50%,\s*16px\)/,
    'do not reintroduce the 7–10px bottom-of-page oscillation');
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

test('secret Easter Egg overlay never takes ownership of the document scroll root', () => {
  for (const path of [
    'resources/css/ccg-master.css',
    'resources/css/ccg-overlays.css',
    'resources/css/ccg-responsive-safety.css',
    'resources/css/ccg-scroll-authority.css'
  ]) {
    const css = fs.readFileSync(path, 'utf8');
    assert.doesNotMatch(
      css,
      /body\.ccg-secret-modal-open\s*\{[^}]*\boverflow\s*:\s*hidden/si,
      `${path}: secret modal must not hide document overflow`
    );
    assert.doesNotMatch(
      css,
      /:not\(\.ccg-secret-modal-open\)/,
      `${path}: secret modal must not disable the normal document scroll owner`
    );
  }

  const source = fs.readFileSync('js/ccg-global.js', 'utf8');
  assert.match(source, /const pauseTarget = document\.querySelector\("\.ccg-bg"\)/,
    'pause only decorative background; avoid full-page style invalidation');
  assert.match(source, /if \(!pauseTarget\) return;/,
    'archive pages without a universe must not run an unnecessary scroll mutation');
  assert.match(source, /pauseFrame = requestAnimationFrame/,
    'defer decorative pause until after the native scroll event');
  assert.match(source, /pauseTarget\.classList\.add\(PAUSE_CLASS\)/,
    'decorative pause must not require HTML root restyling');
  const start = source.indexOf('function lockSecretModalScroll()');
  const end = source.indexOf('function openSecretModal(', start);
  assert(start >= 0 && end > start, 'secret modal scroll ownership block must remain discoverable');
  const block = source.slice(start, end);
  assert.doesNotMatch(block, /document\.(?:body|documentElement)\.style\.overflow(?![A-Za-z_$])/);
  const earlyNavigation = fs.readFileSync('js/ccg-nav-core.js', 'utf8');
  assert.doesNotMatch(earlyNavigation, /:not\(\.ccg-secret-modal-open\)/,
    'opening the secret modal must not change document scroll ownership');
  assert.match(block, /const scrollY\s*=\s*window\.scrollY/, 'record the actual scroll position');
  assert.match(source, /event\.stopImmediatePropagation\(\);[\s\S]*traceNavState\("click-handler-before"\)/,
    'mobile menu must stop competing click handlers after opening the drawer');
  assert.match(source, /navBoundButtons\.has\(toggle\)/,
    'the mobile menu must not bind duplicate handlers to the same live node');
  assert.match(source, /navBoundButtons\.add\(toggle\)/,
    'the mobile menu must track bound DOM nodes rather than cloneable flags');
  assert.match(source, /if \(target && !navBoundButtons\.has\(target\)\)/,
    'a replaced mobile menu button must be rebound before the click reaches it');
  assert.match(block, /\bscrollY,\s*bodyMinHeight:/s, 'retain the saved scroll position in the modal lock');
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

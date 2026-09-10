import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  STATIC_SHELL_VERSION,
  PRIMARY_LINKS,
  SECONDARY_LINKS,
  REQUIRED_STYLES,
  REQUIRED_SCRIPTS,
  PUBLIC_HEADER_FOUNDATION_STYLES,
  PUBLIC_HEADER_FIRST_PAINT_STYLES,
  AUTH_SNAPSHOT_KEY,
  isImmediateRedirectShell,
  normaliseHtml,
  processRoot,
  rootAbsoluteUrl,
  shouldExclude,
  shouldInjectPublicHeader
} = require('../scripts/normalize-public-header-shell.js');

function oldHeaderPage(extraHead = '', extraBody = '') {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="../resources/css/ccg-nav.css">
  ${extraHead}
</head>
<body>
  <header class="ccg-header" data-ccg-header>
    <div class="ccg-header-inner">
      <a class="ccg-brand" href="../home.html">CCG</a>
      <nav class="ccg-nav" id="ccg-primary-nav">
        <div class="ccg-nav__bar">
          <ul data-ccg-nav-primary><li><a class="ccg-nav__link" href="../home.html">Home</a></li><li><a class="ccg-nav__link" href="../games/">Browse Games</a></li><li><a class="ccg-nav__link" href="../games/genres/">Browse by Genre</a></li><li><a class="ccg-nav__link" href="../games/collections/">Collections</a></li></ul>
          <div class="ccg-nav__more"><button data-ccg-more-toggle>More</button><div data-ccg-more-menu></div></div>
        </div>
        <ul data-ccg-nav-secondary><li><a class="ccg-nav__link" href="../quiz/quiz.html">Quiz</a></li><li><a class="ccg-nav__link" href="../emulation.html">Emulation</a></li><li><a class="ccg-nav__link" href="../about.html">About</a></li><li><a class="ccg-nav__link" href="../contact.html">Contact</a></li></ul>
      </nav>
      <div class="ccg-header-actions">
        <button class="ccg-mode-toggle" data-ccg-mode-toggle><span class="ccg-mode-toggle__pill"></span></button>
        <div class="ccg-socials-fallback"><a href="#">YouTube</a></div>
      </div>
    </div>
  </header>
  ${extraBody}
</body>
</html>`;
}

function headerlessPage(content = 'Hello') {
  return `<!doctype html>
<html lang="en" data-ccg-page="plain">
<head><meta charset="utf-8"></head>
<body><main>${content}</main></body>
</html>`;
}

function redirectShell() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex,follow">
  <meta http-equiv="refresh" content="0; url=/retro-specials/example/">
</head>
<body></body>
</html>`;
}

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

test('normaliser replaces old first-paint navigation with the canonical shell', () => {
  const result = normaliseHtml(oldHeaderPage());
  assert.equal(result.applicable, true);
  assert.equal(result.changed, true);

  assert.match(result.html, new RegExp(`data-ccg-static-shell="${STATIC_SHELL_VERSION}"`));
  for (const [label, href] of PRIMARY_LINKS) {
    assert.ok(result.html.includes(`href="${href}"`), `Missing primary href ${href}`);
    assert.ok(result.html.includes(label.replace('&', '&amp;')) || result.html.includes(label), `Missing primary label ${label}`);
  }
  for (const [label, href] of SECONDARY_LINKS) {
    assert.ok(result.html.includes(`href="${href}"`), `Missing secondary href ${href}`);
    assert.ok(result.html.includes(label.replace('&', '&amp;')) || result.html.includes(label), `Missing secondary label ${label}`);
  }

  assert.match(result.html, /class="ccg-auth-slot" data-ccg-auth-pending="true"/);
  assert.match(result.html, /data-ccg-auth-snapshot-bootstrap="true"/);
  assert.ok(result.html.includes(`sessionStorage.getItem("${AUTH_SNAPSHOT_KEY}")`));
  assert.match(result.html, /slot\.setAttribute\("data-ccg-auth-provisional", "true"\)/);
  assert.match(result.html, /profile\.href = "\/community\/profile\.html"/);
  assert.match(result.html, /logout\.textContent = "Logout"/);
  assert.match(result.html, /login\.textContent = "Join \/ Login"/);

  assert.equal(count(result.html, 'ccg-socials__icon--yt'), 1);
  assert.equal(count(result.html, 'ccg-socials__icon--patreon'), 1);
  assert.equal(count(result.html, 'ccg-socials__icon--paypal'), 1);
  assert.equal(count(result.html, 'ccg-socials__icon--x'), 1);
  assert.equal(count(result.html, 'ccg-socials__icon--fb'), 1);
  assert.equal(count(result.html, 'ccg-socials__icon--discord'), 1);
  assert.match(result.html, /class="ccg-socials-fallback" hidden aria-hidden="true"><\/div>/);
});

test('normaliser makes all shell CSS and JS direct staged dependencies', () => {
  const result = normaliseHtml(oldHeaderPage(
    '<script src="../js/ccg-nav-core.js" defer></script>',
    '<script src="../js/ccg-nav.js" defer></script>'
  ));

  for (const href of REQUIRED_STYLES) {
    assert.equal(count(result.html, `href="${href}"`) + count(result.html, `href="..${href}"`), 1, `Expected one stylesheet reference for ${href}`);
  }

  for (const src of REQUIRED_SCRIPTS) {
    const rootCount = count(result.html, `src="${src}"`);
    const relativeCount = count(result.html, `src="..${src}"`);
    assert.equal(rootCount + relativeCount, 1, `Expected one script reference for ${src}`);
  }

  for (const href of PUBLIC_HEADER_FIRST_PAINT_STYLES) {
    assert.equal(count(result.html, `href="${href}"`), 1, `Expected one late first-paint stylesheet for ${href}`);
  }

  assert.ok(
    result.html.indexOf('href="/resources/css/ccg-nav-labelled-bridge.css"') > result.html.indexOf('href="../resources/css/ccg-nav.css"'),
    'The compact-desktop labelled-navigation bridge must load after the older nav stylesheet'
  );
  assert.match(result.html, /src="\/js\/ccg-header-auth-loader\.js" defer data-ccg-static-shell-script="true"/);
  assert.match(result.html, /href="\/resources\/css\/ccg-socials\.css" data-ccg-static-shell-style="true"/);
  assert.match(result.html, /href="\/resources\/css\/ccg-community\.css" data-ccg-static-shell-style="true"/);
});

test('a preload-only social stylesheet never counts as the direct first-paint stylesheet', () => {
  const preload = '<link rel="preload" href="../resources/css/ccg-socials.css" as="style" onload="this.rel=\'stylesheet\'">';
  const result = normaliseHtml(oldHeaderPage(preload));

  assert.equal(count(result.html, 'rel="preload" href="../resources/css/ccg-socials.css"'), 1);
  assert.equal(count(result.html, 'rel="stylesheet" href="/resources/css/ccg-socials.css" data-ccg-static-shell-style="true"'), 1);
});

test('normalisation is idempotent including inline auth bootstrap and direct styles', () => {
  const first = normaliseHtml(oldHeaderPage());
  const second = normaliseHtml(first.html);
  assert.equal(second.applicable, true);
  assert.equal(second.changed, false);
  assert.equal(second.html, first.html);
  assert.equal(count(second.html, 'data-ccg-auth-snapshot-bootstrap="true"'), 1);
  assert.equal(count(second.html, 'data-ccg-public-header-first-paint-style="true"'), 1);
});

test('admin, auth and supabase paths stay outside the deployment normaliser', () => {
  assert.equal(shouldExclude('admin/index.html'), true);
  assert.equal(shouldExclude('auth/login.html'), true);
  assert.equal(shouldExclude('supabase/example.html'), true);
  assert.equal(shouldExclude('community/profile.html'), false);
  assert.equal(shouldExclude('games/1942/index.html'), false);
});

test('site-wide header injection preserves technical shell exclusions only', () => {
  const html = headerlessPage();
  assert.equal(shouldInjectPublicHeader('terms.html', html), true);
  assert.equal(shouldInjectPublicHeader('404.html', html), true);
  assert.equal(shouldInjectPublicHeader('games/some-game/index.html', html), true);
  assert.equal(shouldInjectPublicHeader('community/profile.html', html), true);

  assert.equal(shouldInjectPublicHeader('index.html', html), false, 'Protected intro loader must remain untouched');
  assert.equal(shouldInjectPublicHeader('app-launch.html', html), false, 'PWA launch shell must remain untouched');
  assert.equal(shouldInjectPublicHeader('offline.html', html), false, 'Offline fallback must remain self-contained');
  assert.equal(shouldInjectPublicHeader('arcade/c64-dungeon-carnage/index.html', html), false, 'Fullscreen arcade runtime must remain untouched');
  assert.equal(shouldInjectPublicHeader('admin/index.html', html), false);
  assert.equal(shouldInjectPublicHeader('auth/login.html', html), false);
});

test('instant redirect stubs stay lightweight and outside the visible navigation contract', () => {
  const html = redirectShell();
  assert.equal(isImmediateRedirectShell(html), true);
  assert.equal(shouldInjectPublicHeader('retro-specials/example.html', html), false);

  const result = normaliseHtml(html, { root: path.resolve('.'), relativePath: 'retro-specials/example.html' });
  assert.equal(result.applicable, false);
  assert.equal(result.changed, false);
  assert.equal(result.html, html);
});

test('canonical header paths are root-absolute even when source markup uses parent-relative paths', () => {
  assert.equal(rootAbsoluteUrl('../home.html'), '/home.html');
  assert.equal(rootAbsoluteUrl('../../resources/images/ccgamer-logo.png'), '/resources/images/ccgamer-logo.png');
  assert.equal(rootAbsoluteUrl('./games/'), '/games/');
  assert.equal(rootAbsoluteUrl('/quiz/quiz.html'), '/quiz/quiz.html');
});

test('non-Music public pages without a header receive the master navigation shell', () => {
  const root = path.resolve('.');
  const result = normaliseHtml(headerlessPage('Public page'), { root, relativePath: 'terms.html' });

  assert.equal(result.applicable, true);
  assert.equal(result.changed, true);
  assert.equal(result.publicHeaderInserted, true);
  assert.match(result.html, /<header\b[^>]*data-ccg-header/);
  assert.match(result.html, />Browse Games<\/a>/);
  assert.match(result.html, />Publishers<\/a>/);
  assert.match(result.html, />Music Hub<\/a>/);
  assert.match(result.html, />Find Me a Game<\/a>/);
  assert.match(result.html, /href="\/home\.html" class="ccg-brand"/);
  assert.match(result.html, /src="\/resources\/images\/ccgamer-logo\.png"/);
  assert.match(result.html, /srcset="\/resources\/images\/ccgamer-logo\.png 1500w"/);

  for (const href of PUBLIC_HEADER_FOUNDATION_STYLES) {
    assert.match(result.html, new RegExp(`href="${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
  }
  for (const href of PUBLIC_HEADER_FIRST_PAINT_STYLES) {
    assert.match(result.html, new RegExp(`href="${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
  }
});

test('root processor writes site-wide staged navigation then passes check mode', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccg-header-shell-'));
  try {
    fs.mkdirSync(path.join(root, 'games'), { recursive: true });
    fs.mkdirSync(path.join(root, 'admin'), { recursive: true });
    fs.mkdirSync(path.join(root, 'retro-specials'), { recursive: true });
    fs.writeFileSync(path.join(root, 'home.html'), oldHeaderPage(), 'utf8');
    fs.writeFileSync(path.join(root, 'games', 'index.html'), oldHeaderPage(), 'utf8');
    fs.writeFileSync(path.join(root, 'terms.html'), headerlessPage('Terms'), 'utf8');
    fs.writeFileSync(path.join(root, 'admin', 'index.html'), oldHeaderPage(), 'utf8');
    fs.writeFileSync(path.join(root, 'retro-specials', 'example.html'), redirectShell(), 'utf8');

    const written = processRoot(root, { check: false });
    assert.equal(written.applicable, 3);
    assert.equal(written.changed, 3);
    assert.equal(written.publicHeadersInserted, 1);
    assert.equal(written.excluded, 1);

    const terms = fs.readFileSync(path.join(root, 'terms.html'), 'utf8');
    assert.match(terms, /data-ccg-header/);
    assert.match(terms, />Browse Games<\/a>/);
    assert.match(terms, /href="\/resources\/css\/ccg-master\.css"/);
    assert.match(terms, /href="\/resources\/css\/ccg-nav-labelled-bridge\.css"/);

    const redirect = fs.readFileSync(path.join(root, 'retro-specials', 'example.html'), 'utf8');
    assert.doesNotMatch(redirect, /data-ccg-header/);

    const checked = processRoot(root, { check: true });
    assert.equal(checked.applicable, 3);
    assert.equal(checked.changed, 0);
    assert.equal(checked.publicHeadersInserted, 0);

    const admin = fs.readFileSync(path.join(root, 'admin', 'index.html'), 'utf8');
    assert.doesNotMatch(admin, /data-ccg-static-shell=/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

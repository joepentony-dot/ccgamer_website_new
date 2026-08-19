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
  AUTH_SNAPSHOT_KEY,
  normaliseHtml,
  ensureSearchCommandSlot,
  processRoot,
  shouldExclude
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
  <main class="ccg-main">${extraBody}</main>
</body>
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
  assert.match(result.html, /class="ccg-home-search-command" role="search" aria-label="Search the CCG website" data-ccg-search-command-slot="true"><\/div>/);
  assert.equal(ensureSearchCommandSlot(result.html), result.html);
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

  assert.match(result.html, /src="\/js\/ccg-header-auth-loader\.js" defer data-ccg-static-shell-script="true"/);
  assert.match(result.html, /href="\/resources\/css\/ccg-socials\.css" data-ccg-static-shell-style="true"/);
  assert.match(result.html, /href="\/resources\/css\/ccg-community\.css" data-ccg-static-shell-style="true"/);
  assert.match(result.html, /href="\/resources\/css\/ccg-global-search\.css" data-ccg-static-shell-style="true"/);
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
});

test('admin, auth and supabase paths stay outside the deployment normaliser', () => {
  assert.equal(shouldExclude('admin/index.html'), true);
  assert.equal(shouldExclude('auth/login.html'), true);
  assert.equal(shouldExclude('supabase/example.html'), true);
  assert.equal(shouldExclude('community/profile.html'), false);
  assert.equal(shouldExclude('games/1942/index.html'), false);
});

test('root processor writes the staged shell then passes check mode', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccg-header-shell-'));
  try {
    fs.mkdirSync(path.join(root, 'games'), { recursive: true });
    fs.mkdirSync(path.join(root, 'admin'), { recursive: true });
    fs.writeFileSync(path.join(root, 'home.html'), oldHeaderPage(), 'utf8');
    fs.writeFileSync(path.join(root, 'games', 'index.html'), oldHeaderPage(), 'utf8');
    fs.writeFileSync(path.join(root, 'admin', 'index.html'), oldHeaderPage(), 'utf8');

    const written = processRoot(root, { check: false });
    assert.equal(written.applicable, 2);
    assert.equal(written.changed, 2);
    assert.equal(written.excluded, 1);

    const checked = processRoot(root, { check: true });
    assert.equal(checked.applicable, 2);
    assert.equal(checked.changed, 0);

    const admin = fs.readFileSync(path.join(root, 'admin', 'index.html'), 'utf8');
    assert.doesNotMatch(admin, /data-ccg-static-shell=/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

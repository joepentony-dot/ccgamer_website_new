import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const navCore = fs.readFileSync('js/ccg-nav-core.js', 'utf8');
const navAuthority = fs.readFileSync('js/ccg-nav-authority.js', 'utf8');
const navFit = fs.readFileSync('js/ccg-nav-fit.js', 'utf8');
const archiveShortcuts = fs.readFileSync('js/ccg-archive-shortcuts.js', 'utf8');
const discoverHtml = fs.readFileSync('games/discover/index.html', 'utf8');
const discoverJs = fs.readFileSync('js/game-discovery.js', 'utf8');
const discoverCss = fs.readFileSync('resources/css/game-discovery.css', 'utf8');
const scrollCss = fs.readFileSync('resources/css/ccg-scroll-authority.css', 'utf8');

test('public navigation has one final authoritative structure', () => {
  assert.match(navCore, /\/js\/ccg-nav-authority\.js/);
  assert.match(navCore, /script\.async = false/);
  assert.match(navAuthority, /\["Find Me a Game", "\/games\/discover\/"\]/);
  assert.match(navAuthority, /\["Zzap!64 Reviews & Awards", "\/zzap64\/"\]/);
  assert.match(navAuthority, /\["About Me", "\/about\.html"\]/);
  assert.match(navAuthority, /\["Contact", "\/contact\.html"\]/);
  assert.doesNotMatch(archiveShortcuts, /function addNavigationLinks/);
  assert.doesNotMatch(archiveShortcuts, /data-ccg-nav-secondary/);
});

test('desktop More is functional and deliberately owns About Me and Contact', () => {
  assert.match(navFit, /PINNED_MORE_LABELS = new Set\(\["about", "about me", "contact"\]\)/);
  assert.match(navFit, /event\.stopImmediatePropagation\(\)/);
  assert.match(navFit, /\}, true\);/);
  assert.match(navFit, /item\.setAttribute\("data-ccg-nav-fit-pinned", "true"\)/);
  assert.match(navFit, /link\.classList\.add\("ccg-nav-fit__link"\)/);
});

test('navigation handoff suppresses the legacy-style mutation flash', () => {
  assert.match(navCore, /ccg-nav-syncing/);
  assert.match(navCore, /visibility:hidden!important/);
  assert.match(navAuthority, /classList\.remove\("ccg-nav-syncing"\)/);
  assert.match(navAuthority, /classList\.add\("ccg-nav-ready"\)/);
});

test('Find Me a Game exposes no removed game-download filter or copy', () => {
  assert.doesNotMatch(discoverHtml, /discoverDownload/);
  assert.doesNotMatch(discoverHtml, /Has a download/i);
  assert.doesNotMatch(discoverJs, /discoverDownload/);
  assert.doesNotMatch(discoverJs, /function hasDownload/);
  assert.doesNotMatch(discoverJs, /download_status/);
  assert.doesNotMatch(discoverJs, /available video, downloads/i);
});

test('Find Me a Game uses compact hero and filter spacing', () => {
  assert.match(discoverCss, /padding: clamp\(16px, 2vw, 24px\)/);
  assert.match(discoverCss, /font: 700 clamp\(1\.8rem, 3\.5vw, 3rem\)/);
  assert.match(discoverCss, /margin: 14px 0/);
  assert.match(discoverCss, /min-height: 44px/);
});

test('public pages use one document scroll root with native wheel ownership', () => {
  assert.match(navCore, /\/resources\/css\/ccg-scroll-authority\.css/);
  assert.match(scrollCss, /html\[data-ccg-page\] \{/);
  assert.match(scrollCss, /overflow-y: auto !important/);
  assert.match(scrollCss, /> body\.ccg-body:not\(\.ccg-body--locked\):not\(\.ccg-body--nav-open\)/);
  assert.match(scrollCss, /overflow-y: visible !important/);
  assert.match(scrollCss, /scrollbar-width: thin/);
  assert.doesNotMatch(scrollCss, /scroll-behavior:\s*smooth/i);
});

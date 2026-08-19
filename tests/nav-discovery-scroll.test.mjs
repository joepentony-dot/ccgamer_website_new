import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const navCore = fs.readFileSync('js/ccg-nav-core.js', 'utf8');
const navFit = fs.readFileSync('js/ccg-nav-fit.js', 'utf8');
const archiveShortcuts = fs.readFileSync('js/ccg-archive-shortcuts.js', 'utf8');
const releaseCheck = fs.readFileSync('js/ccg-release-check.js', 'utf8');
const discoverHtml = fs.readFileSync('games/discover/index.html', 'utf8');
const discoverJs = fs.readFileSync('js/game-discovery.js', 'utf8');
const discoverCss = fs.readFileSync('resources/css/game-discovery.css', 'utf8');
const scrollCss = fs.readFileSync('resources/css/ccg-scroll-authority.css', 'utf8');
const headers = fs.readFileSync('_headers', 'utf8');

test('public navigation has one final authoritative structure', () => {
  assert.doesNotMatch(navCore, /\/js\/ccg-nav-authority\.js/);
  assert.match(navCore, /const FINAL_PRIMARY/);
  assert.match(navCore, /const FINAL_SECONDARY/);
  assert.match(navCore, /\["Find Me a Game", "\/games\/discover\/"\]/);
  assert.match(navCore, /\["Zzap!64 Reviews & Awards", "\/zzap64\/"\]/);
  assert.match(navCore, /\["About Me", "\/about\.html"\]/);
  assert.match(navCore, /\["Contact", "\/contact\.html"\]/);
  assert.match(navCore, /synchroniseNavigationStructure\(\)/);
  assert.doesNotMatch(archiveShortcuts, /function addNavigationLinks/);
  assert.doesNotMatch(archiveShortcuts, /data-ccg-nav-secondary/);
});

test('desktop More is functional and deliberately owns About Me and Contact', () => {
  assert.match(navFit, /PINNED_MORE_LABELS = new Set\(\["about", "about me", "contact"\]\)/);
  assert.match(navFit, /const BASE_MORE_LINKS/);
  assert.match(navFit, /\["About Me", "\/about\.html"\]/);
  assert.match(navFit, /\["Contact", "\/contact\.html"\]/);
  assert.match(navFit, /event\.stopImmediatePropagation\(\)/);
  assert.match(navFit, /appendMoreLink\(menu, label, href, seen\)/);
  assert.match(navFit, /document\.dispatchEvent\(new CustomEvent\("ccg:navigation-fitted"/);
});

test('navigation handoff suppresses every legacy header flash', () => {
  assert.match(navCore, /ccg-nav-syncing/);
  assert.match(navCore, /visibility:hidden!important;opacity:0!important/);
  assert.match(navCore, /\.ccg-header \.ccg-socials-fallback\{display:none!important;visibility:hidden!important\}/);
  assert.match(navCore, /document\.addEventListener\("ccg:navigation-fitted", revealNavigation/);
  assert.match(navCore, /\/resources\/css\/ccg-nav-fit\.css/);
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

test('shared CCG releases can update without manual cache clearing', () => {
  assert.match(navCore, /\/js\/ccg-release-check\.js/);
  assert.match(releaseCheck, /ccg_public_release_fingerprint/);
  assert.match(releaseCheck, /RELEASE_ASSETS/);
  assert.match(releaseCheck, /cache: "no-store"/);
  assert.match(releaseCheck, /CLEAR_PUBLIC_CACHES/);
  assert.match(releaseCheck, /SKIP_WAITING/);
  assert.match(releaseCheck, /CCG update ready/);
  assert.match(headers, /\/js\/\*\s+Cache-Control: public, max-age=0, must-revalidate/s);
  assert.match(headers, /\/resources\/css\/\*\s+Cache-Control: public, max-age=0, must-revalidate/s);
  assert.match(headers, /\/service-worker\.js\s+Cache-Control: no-cache, no-store, must-revalidate/s);
});

// fixed first-paint More destinations
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const navCore = fs.readFileSync('js/ccg-nav-core.js', 'utf8');
const navFit = fs.readFileSync('js/ccg-nav-fit.js', 'utf8');
const legacyNav = fs.readFileSync('js/ccg-nav.js', 'utf8');
const visibleInstall = fs.readFileSync('js/ccg-pwa-visible-install.js', 'utf8');
const archiveShortcuts = fs.readFileSync('js/ccg-archive-shortcuts.js', 'utf8');
const releaseCheck = fs.readFileSync('js/ccg-release-check.js', 'utf8');
const serviceWorker = fs.readFileSync('service-worker.js', 'utf8');
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
  assert.match(navCore, /\["Install CCG App", "\/install-app\.html"\]/);
  assert.match(navCore, /\["About Me", "\/about\.html"\]/);
  assert.match(navCore, /\["Contact", "\/contact\.html"\]/);
  assert.match(navCore, /data-ccg-pwa-install-nav/);
  assert.match(navCore, /installNavigationAuthorityObserver/);
  assert.match(navCore, /synchroniseNavigationStructure\(\)/);
  assert.match(navCore, /DEFAULT_MORE_LABELS/);
  assert.match(navCore, /prepareDefaultMoreState/);
  assert.match(navCore, /ensureHeaderSupportStructure/);
  assert.doesNotMatch(archiveShortcuts, /function addNavigationLinks/);
  assert.doesNotMatch(archiveShortcuts, /data-ccg-nav-secondary/);
});

test('legacy helpers and PWA installation cannot rewrite public navigation', () => {
  assert.doesNotMatch(legacyNav, /const NAV_PRIMARY/);
  assert.doesNotMatch(legacyNav, /const NAV_SECONDARY/);
  assert.doesNotMatch(legacyNav, /function rebuildList/);
  assert.doesNotMatch(legacyNav, /data-ccg-nav-primary/);
  assert.doesNotMatch(legacyNav, /data-ccg-nav-secondary/);
  assert.doesNotMatch(visibleInstall, /ensureNavigationLink/);
  assert.doesNotMatch(visibleInstall, /data-ccg-nav-secondary/);
  assert.doesNotMatch(visibleInstall, /dispatchEvent\(new Event\("resize"\)\)/);
  assert.match(navCore, /navigationStructureMatches/);
  assert.match(navCore, /MutationObserver/);
});

test('desktop More is functional and deliberately owns fixed first-paint More destinations', () => {
  assert.match(navFit, /PINNED_MORE_LABELS = new Set\(\["emulation", "install ccg app", "about", "about me", "contact"\]\)/);
  assert.match(navFit, /const BASE_MORE_LINKS/);
  assert.match(navFit, /\["Emulation", "\/emulation\.html"\]/);
  assert.match(navFit, /\["Install CCG App", "\/install-app\.html"\]/);
  assert.match(navFit, /\["About Me", "\/about\.html"\]/);
  assert.match(navFit, /\["Contact", "\/contact\.html"\]/);
  assert.match(navFit, /event\.stopImmediatePropagation\(\)/);
  assert.match(navFit, /appendMoreLink\(menu, label, href, seen\)/);
  assert.match(navFit, /document\.dispatchEvent\(new CustomEvent\("ccg:navigation-fitted"/);
});

test('navigation never hides during refresh or fitting', () => {
  assert.doesNotMatch(navCore, /ccg-nav-syncing/);
  assert.doesNotMatch(navCore, /ccg-nav-ready/);
  assert.doesNotMatch(navCore, /visibility:hidden!important;opacity:0!important/);
  assert.doesNotMatch(navCore, /installNavigationSyncGuard/);
  assert.doesNotMatch(navCore, /revealNavigation/);
  assert.match(navCore, /if \(document\.querySelector\("\[data-ccg-header\]"\)\) initUnifiedNavCore\(\)/);
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
  assert.match(releaseCheck, /"\/js\/ccg-nav\.js"/);
  assert.match(releaseCheck, /"\/js\/ccg-header-auth-loader\.js"/);
  assert.match(releaseCheck, /"\/js\/ccg-music-config\.js"/);
  assert.match(releaseCheck, /"\/js\/ccg-music-navigation\.js"/);
  assert.match(releaseCheck, /"\/js\/ccg-pwa-visible-install\.js"/);
  assert.match(releaseCheck, /cache: "no-store"/);
  assert.match(releaseCheck, /CLEAR_PUBLIC_CACHES/);
  assert.match(releaseCheck, /SKIP_WAITING/);
  assert.match(releaseCheck, /CCG update ready/);
  assert.match(serviceWorker, /const CACHE_VERSION = "\d{4}-\d{2}-\d{2}-public-release-v\d+";/);
  assert.match(headers, /\/js\/\*\s+Cache-Control: public, max-age=0, must-revalidate/s);
  assert.match(headers, /\/resources\/css\/\*\s+Cache-Control: public, max-age=0, must-revalidate/s);
  assert.match(headers, /\/service-worker\.js\s+Cache-Control: no-cache, no-store, must-revalidate/s);
});

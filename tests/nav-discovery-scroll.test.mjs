import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const navCore = fs.readFileSync('js/ccg-nav-core.js', 'utf8');
const navFit = fs.readFileSync('js/ccg-nav-fit.js', 'utf8');
const navFitCss = fs.readFileSync('resources/css/ccg-nav-fit.css', 'utf8');
const modeIdentityCss = fs.readFileSync('resources/css/ccg-mode-identity.css', 'utf8');
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

test('desktop More is functional and deliberately owns About Me and Contact', () => {
  assert.match(navFit, /PINNED_MORE_LABELS = new Set\(\["about", "about me", "contact"\]\)/);
  assert.match(navFit, /const BASE_MORE_LINKS/);
  assert.match(navFit, /\["About Me", "\/about\.html"\]/);
  assert.match(navFit, /\["Contact", "\/contact\.html"\]/);
  assert.match(navFit, /event\.stopImmediatePropagation\(\)/);
  assert.match(navFit, /appendMoreLink\(menu, label, href, seen\)/);
  assert.match(navFit, /\[data-ccg-more-menu\] a\[href\]/);
  assert.match(navFit, /showPopover/);
  assert.match(navFit, /data-ccg-more-top-layer/);
  assert.match(navFit, /document\.dispatchEvent\(new CustomEvent\("ccg:navigation-fitted"/);
  assert.match(navFitCss, /a\[href="\/about\.html"\]/);
  assert.match(navFitCss, /a\[href="\/contact\.html"\]/);
  assert.match(navFitCss, /z-index:\s*2147483000\s*!important/);
  assert.match(navFitCss, /pointer-events:\s*auto\s*!important/);
  assert.match(navFitCss, /\[popover\]/);
  assert.match(navFitCss, /:popover-open/);
  assert.match(modeIdentityCss, /\.ccg-mode-identity\s*\{[\s\S]*pointer-events:\s*none/);
  assert.match(modeIdentityCss, /\.ccg-mode-identity__inner\s*\{[\s\S]*pointer-events:\s*none/);
});

test('navigation never hides during refresh or fitting', () => {
  assert.doesNotMatch(navCore, /ccg-nav-syncing/);
  assert.doesNotMatch(navCore, /ccg-nav-ready/);
  assert.doesNotMatch(navCore, /visibility:hidden!important;opacity:0!important/);
  assert.doesNotMatch(navCore, /installNavigationSyncGuard/);
  assert.doesNotMatch(navCore, /revealNavigation/);
  assert.match(navCore, /if \(document\.querySelector\("\[data-ccg-header\]"\)\) initUnifiedNavCore\(\)/);
  assert.match(navCore, /\/resources\/css\/ccg-nav-fit\.css/);
  assert.match(navFit, /Keep the desktop More slot reserved throughout fitting/);
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
  assert.match(releaseCheck, /"\/js\/ccg-pwa-visible-install\.js"/);
  assert.match(releaseCheck, /"\/resources\/css\/ccg-nav-fit\.css"/);
  assert.match(releaseCheck, /"\/resources\/css\/ccg-mode-identity\.css"/);
  assert.match(releaseCheck, /cache: "no-store"/);
  assert.match(releaseCheck, /CLEAR_PUBLIC_CACHES/);
  assert.match(releaseCheck, /SKIP_WAITING/);
  assert.match(releaseCheck, /CCG update ready/);
  assert.match(serviceWorker, /2026-08-19-public-release-v5/);
  assert.match(headers, /\/js\/\*\s+Cache-Control: public, max-age=0, must-revalidate/s);
  assert.match(headers, /\/resources\/css\/\*\s+Cache-Control: public, max-age=0, must-revalidate/s);
  assert.match(headers, /\/service-worker\.js\s+Cache-Control: no-cache, no-store, must-revalidate/s);
});
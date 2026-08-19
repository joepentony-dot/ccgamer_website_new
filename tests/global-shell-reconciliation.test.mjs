import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const navCore = fs.readFileSync('js/ccg-nav-core.js', 'utf8');
const navCss = fs.readFileSync('resources/css/ccg-nav.css', 'utf8');
const navFitCss = fs.readFileSync('resources/css/ccg-nav-fit.css', 'utf8');
const auth = fs.readFileSync('js/ccg-auth.js', 'utf8');
const authLoader = fs.readFileSync('js/ccg-header-auth-loader.js', 'utf8');
const musicNavigation = fs.readFileSync('js/ccg-music-navigation.js', 'utf8');
const publisherGenerator = fs.readFileSync('scripts/generate-publisher-pages.js', 'utf8');
const zzap = fs.readFileSync('zzap64/index.html', 'utf8');
const releaseCheck = fs.readFileSync('js/ccg-release-check.js', 'utf8');
const serviceWorker = fs.readFileSync('service-worker.js', 'utf8');

const PRIMARY = [
  ['Home', '/home.html'],
  ['Browse Games', '/games/'],
  ['Browse by Genre', '/games/genres/'],
  ['Publishers', '/games/publishers/'],
  ['Collections', '/games/collections/'],
  ['Music Hub', '/music/']
];

const SECONDARY = [
  ['Find Me a Game', '/games/discover/'],
  ['Zzap!64 Reviews & Awards', '/zzap64/'],
  ['Quiz', '/quiz/quiz.html'],
  ['Emulation', '/emulation.html'],
  ['Install CCG App', '/install-app.html'],
  ['About Me', '/about.html'],
  ['Contact', '/contact.html']
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertLinkContract(source, links, label) {
  for (const [text, href] of links) {
    assert.match(source, new RegExp(`['\"]${escapeRegExp(text)}['\"]\\s*,\\s*['\"]${escapeRegExp(href)}['\"]`), `${label} is missing ${text}`);
  }
}

test('unified core owns the complete visible public shell', () => {
  assertLinkContract(navCore, PRIMARY, 'Primary navigation');
  assertLinkContract(navCore, SECONDARY, 'Secondary navigation');
  assert.match(navCore, /const SOCIAL_LINKS = \[/);
  assert.match(navCore, /synchroniseHeaderActions/);
  assert.match(navCore, /synchroniseBrand/);
  assert.match(navCore, /synchroniseShellStructure/);
  assert.match(navCore, /installShellAuthorityObserver/);
  assert.match(navCore, /header\.dataset\.ccgShellAuthority = "true"/);
  assert.match(navCore, /ccg-shell-ready/);
  assert.doesNotMatch(navCore, /ccg-nav-syncing/);
  assert.doesNotMatch(navCore, /visibility:hidden!important;opacity:0!important/);
});

test('final desktop navigation density is available before JavaScript fitting', () => {
  assert.ok(navCss.startsWith('@import url("/resources/css/ccg-nav-fit.css");'), 'ccg-nav.css must import the fit layer before first paint');
  assert.match(navCss, /First-paint density matches the fitted Omega desktop state/);
  assert.match(navCss, /font-size: clamp\(0\.67rem, 0\.64vw, 0\.76rem\)/);
  assert.match(navFitCss, /\.ccg-header \.ccg-nav--has-overflow \.ccg-nav__more/);
});

test('header auth never converts dependency loading into a false signed-out state', () => {
  assert.match(auth, /AUTH_HINT_KEY = 'ccg_auth_ui_hint_v1'/);
  assert.match(auth, /renderPendingHeaderAuth/);
  assert.match(auth, /authDependenciesAvailable/);
  assert.match(auth, /queueDependencyRetry/);
  assert.match(auth, /ccg:header-auth-dependencies-ready/);
  assert.match(auth, /aria-busy/);
  assert.match(auth, />Account</);
  assert.match(auth, /Profile:/);
  assert.match(auth, /state\.resolved = true/);
});

test('header dependency loader waits for APIs rather than only script tags', () => {
  assert.match(authLoader, /ready: \(\) => Boolean\(window\.CCG_SUPABASE_URL && window\.CCG_SUPABASE_ANON_KEY\)/);
  assert.match(authLoader, /waitForReady/);
  assert.match(authLoader, /existing\.addEventListener\("load"/);
  assert.match(authLoader, /await loadScript\(entry\)/);
  assert.match(authLoader, /ccg:header-auth-dependencies-ready/);
});

test('music bootstrap starts from the same canonical shell', () => {
  for (const [text, href] of [...PRIMARY, ...SECONDARY]) {
    assert.ok(musicNavigation.includes(`href="${href}"`) && musicNavigation.includes(`>${text.replace('&', '&amp;')}<`) || musicNavigation.includes(text), `Music shell is missing ${text}`);
  }
  assert.match(musicNavigation, /ccg-auth-slot/);
  assert.match(musicNavigation, /ccg-header-socials/);
  assert.match(musicNavigation, /data-ccg-pwa-install-nav/);
  assert.doesNotMatch(musicNavigation, /ccg-socials-fallback/);
});

test('publisher rebuilds emit the canonical shell rather than reviving legacy navigation', () => {
  for (const [, href] of [...PRIMARY, ...SECONDARY]) {
    assert.ok(publisherGenerator.includes(`href="${href}"`), `Publisher generator is missing ${href}`);
  }
  assert.match(publisherGenerator, /data-ccg-auth-slot="true"/);
  assert.match(publisherGenerator, /ccg-auth-pending">Account</);
  assert.match(publisherGenerator, /data-ccg-pwa-install-nav="true"/);
  assert.match(publisherGenerator, /loading="eager"/);
  assert.doesNotMatch(publisherGenerator, /href="\/games\/index\.html"/);
  assert.doesNotMatch(publisherGenerator, /href="\/games\/genres\/index\.html"/);
  assert.doesNotMatch(publisherGenerator, /href="\/games\/collections\/index\.html"/);
  assert.doesNotMatch(publisherGenerator, /<script src="\/js\/ccg-auth\.js" defer><\/script>/);
});

test('Zzap archive no longer exposes a legacy header before the shell core runs', () => {
  assert.match(zzap, /<link rel="stylesheet" href="\/resources\/css\/ccg-socials\.css">/);
  for (const [text, href] of PRIMARY) {
    assert.match(zzap, new RegExp(`href="${escapeRegExp(href)}"[^>]*>${escapeRegExp(text)}<`));
  }
  assert.match(zzap, /Zzap!64 Reviews &amp; Awards/);
  assert.match(zzap, /data-ccg-auth-slot="true"/);
  assert.match(zzap, /ccg-header-socials/);
  assert.doesNotMatch(zzap, /ccg-socials-fallback/);
  assert.ok(zzap.indexOf('/js/ccg-nav-core.js') < zzap.indexOf('/js/ccg-global.js'), 'Zzap must execute the shell core before legacy helpers');
});

test('installed app detects this complete shell release', () => {
  for (const asset of [
    '/js/ccg-nav-core.js',
    '/js/ccg-auth.js',
    '/js/ccg-header-auth-loader.js',
    '/js/ccg-music-navigation.js',
    '/resources/css/ccg-nav.css',
    '/resources/css/ccg-nav-fit.css'
  ]) {
    assert.ok(releaseCheck.includes(`"${asset}"`), `Release fingerprint is missing ${asset}`);
  }
  assert.match(serviceWorker, /2026-08-19-public-release-v4/);
  assert.match(serviceWorker, /"\/js\/ccg-auth\.js"/);
  assert.match(serviceWorker, /"\/js\/ccg-header-auth-loader\.js"/);
});

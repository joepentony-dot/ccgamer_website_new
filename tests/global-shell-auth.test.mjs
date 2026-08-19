import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const loader = fs.readFileSync('js/ccg-header-auth-loader.js', 'utf8');
const auth = fs.readFileSync('js/ccg-auth.js', 'utf8');
const music = fs.readFileSync('js/ccg-music-navigation.js', 'utf8');
const navCore = fs.readFileSync('js/ccg-nav-core.js', 'utf8');
const release = fs.readFileSync('js/ccg-release-check.js', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');
const socialCss = fs.readFileSync('resources/css/ccg-socials.css', 'utf8');

const canonicalPrimary = [
  'Home',
  'Browse Games',
  'Browse by Genre',
  'Publishers',
  'Collections',
  'Music Hub'
];
const canonicalSecondary = [
  'Find Me a Game',
  'Zzap!64 Reviews & Awards',
  'Quiz',
  'Emulation',
  'Install CCG App',
  'About Me',
  'Contact'
];

test('header auth loader restores the session before loading the header renderer', () => {
  assert.match(loader, /AUTH_FOUNDATION_SCRIPTS/);
  assert.match(loader, /HEADER_AUTH_SCRIPT/);
  assert.match(loader, /await restoreAuthFoundation\(\);[\s\S]*await loadScript\(HEADER_AUTH_SCRIPT\);/);
  assert.match(loader, /await window\.ccgCommunityAuth\.init\(\)/);
  assert.doesNotMatch(loader, /const AUTH_SCRIPTS = \[/);
});

test('header auth never invents a logged-out state before authoritative restoration', () => {
  assert.match(auth, /AUTH_SNAPSHOT_KEY/);
  assert.match(auth, /authoritativeResolved: false/);
  assert.match(auth, /await waitForAuthFoundation\(\)/);
  assert.match(auth, /if \(!state\.authoritativeResolved\)/);
  assert.match(auth, /readAuthSnapshot\(\)/);
  assert.match(auth, /if \(slot\.children\.length\) return;/);
  assert.match(auth, /state\.authoritativeResolved = true/);
  assert.match(auth, /clearAuthSnapshot\(\)/);
});

test('music injected header matches the global navigation and action contract', () => {
  for (const label of canonicalPrimary) assert.ok(music.includes(`>${label}<`) || music.includes(`>${label}</a>`), `Music header missing ${label}`);
  for (const label of canonicalSecondary) assert.ok(music.includes(label.replace('&', '&amp;')) || music.includes(label), `Music header missing ${label}`);

  assert.match(music, /ccg-mode-hint/);
  assert.match(music, /ccg-header-socials/);
  for (const socialClass of ['ccg-socials__icon--yt', 'ccg-socials__icon--patreon', 'ccg-socials__icon--paypal', 'ccg-socials__icon--x', 'ccg-socials__icon--fb', 'ccg-socials__icon--discord']) {
    assert.ok(music.includes(socialClass), `Music header missing ${socialClass}`);
  }
  assert.match(music, /data-ccg-pwa-install-nav="true"/);
  assert.match(music, /\/js\/ccg-nav-core\.js/);
});

test('nav core remains the canonical structural source', () => {
  for (const label of canonicalPrimary) assert.ok(navCore.includes(`["${label}",`), `Nav core missing ${label}`);
  for (const label of canonicalSecondary) assert.ok(navCore.includes(`["${label}",`), `Nav core missing ${label}`);
  assert.match(navCore, /installNavigationAuthorityObserver/);
});

test('legacy social fallback cannot become a public display state', () => {
  assert.match(socialCss, /\.ccg-socials-fallback\s*\{/);
  assert.match(socialCss, /display:\s*none\s*!important/);
  assert.match(socialCss, /visibility:\s*hidden\s*!important/);
});

test('installed app release v6 watches the full global shell', () => {
  assert.match(worker, /2026-08-19-public-release-v6/);
  for (const asset of [
    '/js/ccg-header-auth-loader.js',
    '/js/ccg-auth.js',
    '/js/ccg-music-navigation.js',
    '/resources/css/ccg-nav.css',
    '/resources/css/ccg-nav-fit.css',
    '/resources/css/ccg-socials.css'
  ]) {
    assert.ok(worker.includes(`"${asset}"`), `Service worker shell missing ${asset}`);
    assert.ok(release.includes(`"${asset}"`), `Release fingerprint missing ${asset}`);
  }
});
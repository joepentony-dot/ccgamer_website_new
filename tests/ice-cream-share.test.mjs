import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const publicHeaderShell = require('../scripts/normalize-public-header-shell.js');
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const html = read('ice-cream/index.html');
const css = read('resources/css/ccg-ice-cream.css');
const canonical = 'https://www.cheekycommodoregamer.co.uk/ice-cream/';

test('ice-cream page has a crawlable canonical, genuine context and share previews', () => {
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.cheekycommodoregamer\.co\.uk\/ice-cream\/"/);
  assert.match(html, /<meta name="robots" content="index,follow/);
  assert.match(html, /Speedball 2: Brutal Deluxe/);
  assert.match(html, /<meta property="og:image"/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image"/);
  assert.match(html, /href="\/games\/speedball-2-brutal-deluxe\/"/);
  assert.doesNotMatch(html, /display:\s*none.*Speedball|hidden[^>]*>.*Speedball/i);
});

test('dedicated page reuses only the existing first-party button, sprite, audio and counter', () => {
  assert.equal((html.match(/data-ccg-do-not-press/g) || []).length, 1);
  assert.match(html, /\/js\/ccg-do-not-press\.js" defer/);
  assert.match(html, /\/js\/ccg-supabase-config\.js" defer/);
  assert.match(html, /\/resources\/css\/ccg-do-not-press\.css/);
  assert.match(html, /\/resources\/images\/easter-eggs\/ccg-do-not-press-two-state\.webp/);
  assert.match(html, /data-ccg-dnp-button/);
  assert.match(html, /data-ccg-dnp-total[^>]*>0000<\/output>/);
  assert.match(html, /ccg-ice-cream-speedbal\.mp3" preload="none"/);
  assert.match(css, /data-ccg-feature="ice-cream"/);
  assert.doesNotMatch(html, /supabase\.co\/rest|service_role|setInterval/);
});

test('native sharing sends only the canonical link; copying is a fallback', async () => {
  const inline = html.match(/<script>\s*([\s\S]*?)<\/script>/);
  assert.ok(inline, 'share handler should be inline on the dedicated page');
  const listeners = {}, calls = [], copied = [];
  const status = { textContent: '' };
  function setup(nav) {
    const callbacks = {};
    vm.runInNewContext(inline[1], {
      document: { getElementById(id) {
        if (id === 'ice-share-status') return status;
        return { addEventListener(name, callback) { callbacks[id + ':' + name] = callback; } };
      } },
      navigator: nav, Promise,
    });
    return callbacks;
  }
  const shareEvents = setup({
    share(data) { calls.push(data); return Promise.resolve(); },
    clipboard: { writeText(url) { copied.push(url); return Promise.resolve(); } },
  });
  shareEvents['ice-share:click']();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, canonical);
  assert.equal(copied.length, 0);
  shareEvents['ice-copy:click']();
  await Promise.resolve();
  assert.deepEqual(copied, [canonical]);
  const fallback = setup({ clipboard: { writeText(url) { copied.push(url); return Promise.resolve(); } } });
  fallback['ice-share:click']();
  await Promise.resolve();
  assert.deepEqual(copied, [canonical, canonical]);
  assert.match(status.textContent, /Link copied/);
});

test('canonical route is in the generator source and current sitemap exactly once', () => {
  const paths = JSON.parse(read('tools/seo/static-pages.json'));
  assert.equal(paths.filter((x) => x === 'ice-cream/index.html').length, 1);
  assert.equal((read('sitemap-pages.xml').match(/<loc>https:\/\/www\.cheekycommodoregamer\.co\.uk\/ice-cream\/<\/loc>/g) || []).length, 1);
});

test('Phase 4D accepts only the exact new indexable page through existing validation', () => {
  const validator = read('scripts/validate-year-platform-discovery.js');
  assert.match(validator, /entry !== "ice-cream\/index\.html"/);
  assert.match(validator, /canonicals\.length !== 1 \|\| canonicals\[0\] !== url/);
  assert.match(validator, /sitemapPageLocs\.filter\(\(loc\) => loc === url\)\.length !== 1/);
});

test('production header normalizer preserves the standalone page without duplicate navigation or extra CSS/JS', () => {
  assert.match(html, /data-ccg-no-public-header="true"/);
  const location = 'ice-cream/index.html';
  assert.equal(publicHeaderShell.shouldInjectPublicHeader(location, html), false);
  assert.equal(publicHeaderShell.shouldInjectPublicHeader(location, html.replace(' data-ccg-no-public-header="true"', '')), true);
  const staged = publicHeaderShell.normaliseHtml(html, { relativePath: location });
  assert.equal(staged.changed, false, 'normalization must be an identity operation');
  assert.equal(staged.html, html);
  assert.equal(staged.publicHeaderInserted, false);
  assert.equal((staged.html.match(/<header\b/g) || []).length, 1);
  assert.equal((staged.html.match(/<link[^>]+rel="stylesheet"/g) || []).length, 2);
  assert.equal((staged.html.match(/<script\b/g) || []).length, 4);
});

test('Speedball 2 source-backed history and the optimised poster are published together', () => {
  const image = 'resources/images/easter-eggs/speedball2-ice-cream-ccg-poster.avif';
  const bytes = readFileSync(path.join(root, image));
  assert.equal(bytes.toString('ascii', 4, 12), 'ftypavif', 'image must be AVIF, not a missing or placeholder file');
  assert.ok(bytes.byteLength > 4000 && bytes.byteLength < 40000, 'poster must stay a small, real image asset');
  assert.match(html, /src="\/resources\/images\/easter-eggs\/speedball2-ice-cream-ccg-poster\.avif"/);
  assert.match(html, /width="400" height="500" loading="lazy" decoding="async"/);
  assert.match(css, /\.ice-poster img/);
  assert.match(html, /96% in Zzap!/);
  assert.match(html, /95% in CU Amiga/);
  assert.match(html, /1991 Golden Joystick Awards/);
  assert.match(html, /Michael Burdett/);
  assert.match(html, /the identification of Burdett comes from later accounts/);
  assert.match(html, /amigareviews\.leveluphost\.com\/speedba2\.htm/);
  const schemaText = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert.equal(JSON.parse(schemaText).image, 'https://www.cheekycommodoregamer.co.uk/' + image);
  assert.equal((html.match(/data-ccg-do-not-press/g) || []).length, 1, 'existing button must remain singleton');
});

test('only Speedball 2 contains the first-party Ice Cream game-page link', () => {
  const speedball = read('games/speedball-2-brutal-deluxe/index.html');
  const otherGame = read('games/fire-ant/index.html');
  const { buildCanonicalPage } = require('../scripts/prepare-seo-game-routes.js');
  const gameShell = read('games/game.html');
  const fixture = { slug: 'speedball-2-brutal-deluxe', title: 'Speedball 2: Brutal Deluxe', year: 1990, system: 'Amiga' };
  const generated = buildCanonicalPage(gameShell, fixture);
  const unrelated = buildCanonicalPage(gameShell, { ...fixture, slug: 'fire-ant', title: 'Fire Ant' });
  const link = "<a class=\"ccg-btn ccg-btn--secondary\" href=\"/ice-cream/\" aria-label=\"Play the Speedball 2 Ice Cream sound\">🍦 PRESS FOR ICE CREAM!</a>";
  assert.equal(speedball.split(link).length - 1, 1, 'live candidate must contain one Speedball CTA');
  assert.equal(generated.split(link).length - 1, 1, 'canonical generator must retain one CTA');
  assert.ok(!otherGame.includes('href="/ice-cream/"'), 'unrelated published page must not gain the CTA');
  assert.ok(!unrelated.includes('href="/ice-cream/"'), 'generator must exclude other games');
  assert.equal(speedball.split('data-ccg-share-btn').length - 1, 1, 'the original Share button remains');
  assert.ok(!speedball.includes('data-ccg-dnp-button'), 'the interactive button remains on its standalone page');
});

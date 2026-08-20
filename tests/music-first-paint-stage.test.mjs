import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const normalizer = require('../scripts/normalize-public-header-shell.js');

const root = path.resolve('.');
const musicHeaderSource = fs.readFileSync('js/ccg-music-navigation.js', 'utf8');
const musicStylePaths = normalizer.extractMusicStylePaths(root);

function assertStaticMusicShell(html, label) {
  const headerIndex = html.indexOf('data-ccg-header');
  const mainIndex = html.indexOf('<main');
  assert.ok(headerIndex >= 0, `${label} must contain the shared CCG header in staged HTML`);
  assert.ok(mainIndex > headerIndex, `${label} shared header must precede visible main content`);
  assert.match(html, /data-ccg-music-static-header="true"/);
  assert.match(html, /data-ccg-static-shell="2026-08-19-v1"/);
  assert.match(html, /class="ccg-auth-slot" data-ccg-auth-pending="true"/);
  assert.match(html, />Browse Games<\/a>/);
  assert.match(html, />Music Hub<\/a>/);
  assert.match(html, />Zzap!64 Reviews &amp; Awards<\/a>/);
  assert.match(html, /src="\/js\/ccg-nav-core\.js"/);
  assert.match(html, /href="\/resources\/css\/ccg-nav-fit\.css"/);
  assert.doesNotMatch(html, /ccg-header--music-injected/);

  for (const href of musicStylePaths) {
    assert.ok(html.includes(`rel="stylesheet" href="${href}"`), `${label} must load ${href} before first paint`);
  }
}

test('Music hub receives the canonical header and final geometry before first visible content', () => {
  const source = fs.readFileSync('music/index.html', 'utf8');
  assert.doesNotMatch(source, /data-ccg-header/);

  const result = normalizer.normaliseHtml(source, { root });
  assert.equal(result.applicable, true);
  assert.equal(result.musicStaticHeaderInserted, true);
  assertStaticMusicShell(result.html, 'Music hub');

  const second = normalizer.normaliseHtml(result.html, { root });
  assert.equal(second.changed, false, 'Music first-paint normalization must be idempotent');
});

test('Music first-paint styles are sourced from the maintained Music bootstrap contract', () => {
  assert.ok(musicHeaderSource.includes('const STYLES = ['));
  assert.deepEqual(musicStylePaths, [
    '/resources/css/ccg-mode.css',
    '/resources/css/ccg-effects.css',
    '/resources/css/ccg-nav.css',
    '/resources/css/ccg-nav-fit.css',
    '/resources/css/ccg-buttons.css',
    '/resources/css/ccg-footer.css',
    '/resources/css/ccg-community.css',
    '/resources/css/ccg-socials.css',
    '/resources/css/ccg-mobile-lite.css',
    '/resources/css/ccg-amiga-mode.css',
    '/resources/css/ccg-amiga-mobile-fix.css'
  ]);
});

test('generated and curated composer routes receive the same static first-paint shell', () => {
  for (const file of ['music/ivan-allan/index.html', 'music/allister-brimble/index.html', 'music/composers/index.html']) {
    const source = fs.readFileSync(file, 'utf8');
    const result = normalizer.normaliseHtml(source, { root });
    assert.equal(result.applicable, true, `${file} should be part of the public shell contract`);
    assertStaticMusicShell(result.html, file);
  }
});

test('Music header markup is sourced from the maintained fallback rather than a second copied shell', () => {
  const extracted = normalizer.extractMusicHeaderMarkup(root);
  assert.ok(musicHeaderSource.includes('function headerMarkup()'));
  assert.match(extracted, /data-ccg-music-static-header="true"/);
  assert.match(extracted, /data-ccg-nav-primary/);
  assert.match(extracted, /data-ccg-nav-secondary/);
});

test('non-Music pages without a public header are not force-wrapped', () => {
  const html = '<!doctype html><html lang="en" data-ccg-page="plain"><head></head><body><main>Hello</main></body></html>';
  const result = normalizer.normaliseHtml(html, { root });
  assert.equal(result.applicable, false);
  assert.equal(result.changed, false);
  assert.equal(result.html, html);
});

test('root processing writes Music first-paint shell and then passes check mode', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ccg-music-first-paint-'));
  try {
    fs.mkdirSync(path.join(temp, 'music'), { recursive: true });
    fs.mkdirSync(path.join(temp, 'js'), { recursive: true });
    fs.writeFileSync(path.join(temp, 'music', 'index.html'), fs.readFileSync('music/index.html', 'utf8'), 'utf8');
    fs.writeFileSync(path.join(temp, 'js', 'ccg-music-navigation.js'), musicHeaderSource, 'utf8');

    const written = normalizer.processRoot(temp, { check: false });
    assert.equal(written.musicHeadersInserted, 1);
    assert.equal(written.changed, 1);

    const staged = fs.readFileSync(path.join(temp, 'music', 'index.html'), 'utf8');
    assertStaticMusicShell(staged, 'temporary staged Music hub');

    const checked = normalizer.processRoot(temp, { check: true });
    assert.equal(checked.changed, 0);
    assert.equal(checked.musicHeadersInserted, 0);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

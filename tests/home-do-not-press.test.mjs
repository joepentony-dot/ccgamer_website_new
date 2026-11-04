import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');
const home = read('home.html');
const css = read('resources/css/ccg-do-not-press.css');
const js = read('js/ccg-do-not-press.js');
const sql = read('supabase/ccg-do-not-press-counter.sql');

test('homepage only: semantic fixed-size image and accessible standalone button', () => {
  assert.equal((home.match(/data-ccg-do-not-press/g) || []).length, 1);
  assert.match(home, /aria-labelledby="ccg-dnp-title"/);
  assert.match(home, /width="240" height="207"/);
  assert.match(home, /loading="lazy" decoding="async"/);
  assert.match(home, /<audio data-ccg-dnp-sound[^>]*preload="none"/);
  assert.ok(home.indexOf('<section class="ccg-dnp"') > home.indexOf('<section class="home-support-art'));
  assert.ok(home.indexOf('<section class="ccg-dnp"') < home.indexOf('<section class="home-visitor-callout'));
});
test('layout isolation and reduced-motion treatment', () => {
  assert.match(css, /html\[data-ccg-page="home"\] \.ccg-dnp/);
  assert.match(css, /grid-template-columns:/);
  assert.match(css, /min-height: 252px/);
  assert.match(css, /@media \(max-width: 520px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(css, /position:\s*(?:fixed|sticky)/);
});
test('counter uses server RPCs and never displays a made-up local counter', () => {
  assert.match(js, /ccg_do_not_press_count/);
  assert.match(js, /ccg_do_not_press_increment/);
  assert.match(js, /Number\.isSafeInteger/);
  assert.match(js, /pending = pending\.catch/);
  assert.doesNotMatch(js, /localStorage|sessionStorage|Math\.random/);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /REVOKE ALL ON public\.ccg_do_not_press_totals/);
  assert.match(sql, /SET search_path = ''/);
});
test('local media assets remain small and independently cacheable', () => {
  assert.ok(statSync(path.join(root, 'resources/images/easter-eggs/ccg-do-not-press-red-button.webp')).size < 16000);
  assert.ok(statSync(path.join(root, 'resources/audio/easter-eggs/ccg-ice-cream-speedbal.mp3')).size < 26000);
  assert.match(home, /ccg-do-not-press-red-button\.webp/);
  assert.match(home, /ccg-ice-cream-speedbal\.mp3/);
});

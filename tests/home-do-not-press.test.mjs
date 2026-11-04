import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');
const home = read('home.html');
const css = read('resources/css/ccg-do-not-press.css');
const js = read('js/ccg-do-not-press.js');

test('the homepage renders only DO NOT PRESS, the two-frame actuator and neon 0000', () => {
  assert.equal((home.match(/data-ccg-do-not-press/g) || []).length, 1);
  assert.match(home, /id="ccg-dnp-title">DO NOT PRESS<\/h2>/);
  assert.match(home, /class="ccg-dnp__sprite" data-ccg-dnp-sprite/);
  assert.match(home, /data-ccg-dnp-button[^>]*aria-label="Press the centre of the red button"/s);
  assert.match(home, /data-ccg-dnp-total[^>]*>0000<\/output>/s);
  assert.doesNotMatch(home, /Sound plays only when you press|Counter temporarily unavailable|TOTAL BUTTON PRESSES|Seriously\. Leave it alone/);
  assert.match(home, /<audio data-ccg-dnp-sound[^>]*preload="none"/);
  assert.ok(home.indexOf('<section class="ccg-dnp"') > home.indexOf('<section class="home-support-art'));
  assert.ok(home.indexOf('<section class="ccg-dnp"') < home.indexOf('<section class="home-visitor-callout'));
});
test('only the 60-percent circular centre is clickable; outer frame is not interactive', () => {
  assert.match(css, /\.ccg-dnp__button\s*\{[^}]*width:\s*60%;[^}]*height:\s*60%;[^}]*border-radius:\s*50%/s);
  assert.match(css, /\.ccg-dnp__sprite\s*\{[^}]*pointer-events:\s*none/);
  assert.match(css, /background-size:\s*200% 100%/);
  assert.match(css, /\.ccg-dnp\.is-pressed \.ccg-dnp__sprite/);
  assert.match(css, /background-position:\s*right center/);
  assert.doesNotMatch(css, /position:\s*fixed|position:\s*sticky|translateY\(/);
});
test('the visual counter is honest static 0000 pending the separate backend', () => {
  assert.match(home, /Counter preview; not yet connected to the new backend/);
  assert.doesNotMatch(js, /fetch\(|rpc\(|SUPABASE|localStorage|sessionStorage/);
  assert.match(css, /--ccg-dnp-neon:\s*#72d7ff/);
});
test('transparent sprite is present and fits the first paint budget', () => {
  const sprite = statSync(path.join(root, 'resources/images/easter-eggs/ccg-do-not-press-two-state.webp'));
  assert(sprite.size > 10000 && sprite.size < 80000);
  assert.match(css, /ccg-do-not-press-two-state\.webp/);
  assert.ok(statSync(path.join(root, 'resources/audio/easter-eggs/ccg-ice-cream-speedbal.mp3')).size < 26000);
});
test('pointer and keyboard presses toggle the two frames, and clicks replay the sound', () => {
  const listeners = Object.create(null), classes = new Set();
  const button = {addEventListener(name, fn) { listeners[name] = fn; }};
  let playCount = 0, pauseCount = 0, timerId = 0;
  const timers = new Map();
  const sound = {currentTime: 99, pause(){pauseCount++;}, play(){playCount++; return Promise.resolve();}};
  const section = {querySelector(q){return q === '[data-ccg-dnp-button]' ? button : q === '[data-ccg-dnp-sound]' ? sound : null;}, classList:{add(x){classes.add(x);},remove(x){classes.delete(x);}}};
  const ctx = {document:{querySelector(q){return q === '[data-ccg-do-not-press]' ? section : null;}},window:{setTimeout(cb){const n=++timerId;timers.set(n,cb);return n;},clearTimeout(n){timers.delete(n);}}};
  vm.runInNewContext(js,ctx);
  assert.equal(ctx.window.ccgDoNotPressLoaded,true);
  listeners.pointerdown({button:0});
  assert(classes.has('is-pressed'));
  listeners.click();
  assert.equal(playCount,1);
  assert.equal(pauseCount,1);
  assert.equal(sound.currentTime,0);
  listeners.pointerup();
  for (const fn of [...timers.values()]) fn();
  assert(!classes.has('is-pressed'));
  listeners.keydown({key:' ',repeat:false});
  assert(classes.has('is-pressed'));
  listeners.keyup({key:' '});
  for (const fn of [...timers.values()]) fn();
  assert(!classes.has('is-pressed'));
  listeners.click();
  assert.equal(playCount,2);
  listeners.blur();
  assert(!classes.has('is-pressed'));
});

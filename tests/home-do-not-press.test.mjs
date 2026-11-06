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

test('the homepage renders PRESS FOR ICE-CREAM!, the two-frame actuator and neon 0000', () => {
  assert.equal((home.match(/data-ccg-do-not-press/g) || []).length, 1);
  assert.match(home, /id="ccg-dnp-title">PRESS FOR ICE-CREAM!<\/h2>/);
  assert.doesNotMatch(home, /id="ccg-dnp-title">DO NOT PRESS<\/h2>/);
  assert.match(home, /aria-label="Total button presses"/);
  assert.doesNotMatch(home, /Counter preview; not yet connected to the new backend/);
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
test('the counter begins at 0000 but reads and increments an atomic server total', () => {
  assert.match(home, /data-ccg-dnp-total[^>]*>0000<\/output>/s);
  assert.match(js, /ccg_do_not_press_/);
  assert.match(js, /counterRpc\('count'\)/);
  assert.match(js, /counterRpc\('increment'\)/);
  assert.doesNotMatch(js, /localStorage|sessionStorage|service_role/);
  assert.match(css, /min-width:\s*5\.6ch/);
  assert.match(css, /width:\s*max-content/);
  assert.match(css, /font:\s*900 clamp\(0\.98rem, 3vw, 1\.14rem\)/);
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
  const total = {textContent:'0000',setAttribute(){}};
  const section = {querySelector(q){return q === '[data-ccg-dnp-button]' ? button : q === '[data-ccg-dnp-sound]' ? sound : q === '[data-ccg-dnp-total]' ? total : null;}, classList:{add(x){classes.add(x);},remove(x){classes.delete(x);}}};
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

test('compact panel preserves the isolated two-frame hit area without a blue square', () => {
  assert.match(css, /width:\s*min\(316px, calc\(100% - 28px\)\)/);
  assert.match(css, /min-height:\s*252px/);
  assert.match(css, /\.ccg-dnp__button::before,[\s\S]*?\.ccg-dnp__button::after\s*\{[\s\S]*?content:\s*none !important/);
  assert.match(css, /\.ccg-dnp__button:focus\s*\{[^}]*outline:\s*0 !important/s);
  assert.match(css, /\.ccg-dnp__button:focus-visible\s*\{[^}]*box-shadow:\s*0 0 0 3px rgba\(255, 255, 255, \.9\)/s);
  assert.match(css, /\.ccg-dnp__button:hover,[\s\S]*?\.ccg-dnp__button:active,[\s\S]*?\.ccg-dnp__button:focus\s*\{[^}]*transform:\s*translate\(-50%, -50%\) !important/s);
  assert.doesNotMatch(css, /outline:\s*3px solid var\(--ccg-dnp-neon\)/);
  assert.doesNotMatch(css, /animation:\s*(?:pulse|flash|strobe)/i);
});

test('failed MP3 playback triggers one quiet fallback click per completed press', async () => {
  let ticks = 0, played = 0, primed = 0;
  const listeners = Object.create(null);
  class AudioContextMock {
    constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
    createOscillator() {
      return {
        frequency: {setValueAtTime(){}, exponentialRampToValueAtTime(){}},
        connect(){}, start(){ticks++;}, stop(){}
      };
    }
    createGain() {
      return {gain: {setValueAtTime(){}, linearRampToValueAtTime(){}, exponentialRampToValueAtTime(){}},connect(){}};
    }
  }
  const button = {addEventListener(name, fn){listeners[name] = fn;}};
  const total = {textContent:'0000',setAttribute(){}};
  const sound = {
    currentTime: 40, muted: true, volume: 0,
    load(){primed++;}, pause(){},
    play(){played++; return Promise.reject(new Error('MP3 unavailable')); }
  };
  const section = {
    querySelector(q){return q === '[data-ccg-dnp-button]' ? button : q === '[data-ccg-dnp-sound]' ? sound : q === '[data-ccg-dnp-total]' ? total : null;},
    classList:{add(){},remove(){}}
  };
  const context = {document:{querySelector(q){return q === '[data-ccg-do-not-press]' ? section : null;}},window:{
    AudioContext: AudioContextMock, setTimeout(){return 1;}, clearTimeout(){}
  }};
  vm.runInNewContext(js,context);
  assert.equal(ticks,0);
  assert.equal(played,0);
  listeners.pointerenter();
  listeners.focus();
  assert.equal(primed,1);
  listeners.click();
  await Promise.resolve();
  listeners.click();
  await Promise.resolve();
  assert.equal(ticks,2);
  assert.equal(played,2);
  assert.equal(sound.muted,false);
  assert.equal(sound.volume,0.4);
  assert.equal(sound.currentTime,0);
});

test('successful MP3 playback has no overlapping mechanical click', async () => {
  const listeners = Object.create(null);
  let ticks = 0, plays = 0;
  const button = {addEventListener(name,fn){listeners[name] = fn;}};
  const sound = {currentTime:9, pause(){}, play(){plays++; return Promise.resolve();}};
  const total = {textContent:'0000',setAttribute(){}};
  const section = {
    querySelector(q){return q === '[data-ccg-dnp-button]' ? button
      : q === '[data-ccg-dnp-sound]' ? sound
      : q === '[data-ccg-dnp-total]' ? total : null;},
    classList:{add(){},remove(){}}
  };
  class AudioContextMock {
    constructor(){this.state = 'running';this.currentTime = 0;this.destination = {};}
    createOscillator(){return {frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},start(){ticks++;},stop(){}};}
    createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}
  }
  const win={AudioContext:AudioContextMock,setTimeout(){return 1;},clearTimeout(){}};
  vm.runInNewContext(js,{document:{querySelector(q){return q === '[data-ccg-do-not-press]' ? section : null;}},window:win});
  listeners.click();
  await Promise.resolve();
  assert.equal(plays,1);
  assert.equal(ticks,0,'no second sound should be layered over the MP3');
  assert.equal(sound.volume,0.4);
});

test('an obsolete rejected sound attempt cannot add a tick to the latest successful press', async () => {
  const listeners = Object.create(null);
  let rejectFirst, ticks = 0, plays = 0;
  const button = {addEventListener(name,fn){listeners[name]=fn;}};
  const sound = {currentTime:0,pause(){},play(){
    plays++;
    return plays===1 ? new Promise((resolve,reject)=>{rejectFirst=reject;}) : Promise.resolve();
  }};
  const total = {textContent:'0000',setAttribute(){}};
  const section = {
    querySelector(q){return q === '[data-ccg-dnp-button]' ? button
      : q === '[data-ccg-dnp-sound]' ? sound
      : q === '[data-ccg-dnp-total]' ? total : null;},
    classList:{add(){},remove(){}}
  };
  class AudioContextMock {
    constructor(){this.state='running';this.currentTime=0;this.destination={};}
    createOscillator(){return {frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},start(){ticks++;},stop(){}};}
    createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}
  }
  const win={AudioContext:AudioContextMock,setTimeout(){return 1;},clearTimeout(){}};
  vm.runInNewContext(js,{document:{querySelector(q){return q === '[data-ccg-do-not-press]' ? section : null;}},window:win});
  listeners.click();
  listeners.click();
  rejectFirst(new Error('Old attempt aborted by new press'));
  await Promise.resolve();
  assert.equal(plays,2);
  assert.equal(ticks,0);
});

test('a cold media seek error cannot suppress the actual MP3 play attempt', () => {
  const listeners = Object.create(null);
  let attempts = 0;
  const sound = {
    pause(){},
    play(){attempts++; return Promise.resolve();}
  };
  Object.defineProperty(sound, 'currentTime', {
    get(){return 0;},
    set(){throw new Error('Media metadata not loaded');}
  });
  const button = {addEventListener(name, fn){listeners[name] = fn;}};
  const total = {textContent:'0000',setAttribute(){}};
  const section = {
    querySelector(q){return q === '[data-ccg-dnp-button]' ? button : q === '[data-ccg-dnp-sound]' ? sound : q === '[data-ccg-dnp-total]' ? total : null;},
    classList:{add(){},remove(){}}
  };
  const context = {
    document:{querySelector(q){return q === '[data-ccg-do-not-press]' ? section : null;}},
    window:{setTimeout(){return 1;},clearTimeout(){}}
  };
  vm.runInNewContext(js, context);
  listeners.click();
  assert.equal(attempts, 1);
});

test('both the MP3 and oscillator press tick are reduced by 60 percent', () => {
  assert.match(js, /sound\.volume\s*=\s*0\.4/);
  assert.match(js, /volume\.gain\.linearRampToValueAtTime\(0\.064,/);
  assert.doesNotMatch(js, /sound\.volume\s*=\s*1\s*;/);
});

test('global total grows from four to five and six digits without truncation or stale response regression', async () => {
  const listeners = Object.create(null);
  const calls = [];
  let visible = null, observers = 0;
  class VisibilityObserver {
    constructor(callback){visible = callback;}
    observe(){observers++;}
    disconnect(){}
  }
  const total = {textContent:'0000',attributes:{},setAttribute(name,value){this.attributes[name]=value;}};
  const button = {addEventListener(name,fn){listeners[name]=fn;}};
  const sound = {currentTime:0, pause(){},play(){return Promise.resolve();}};
  const section = {
    querySelector(q){return q === '[data-ccg-dnp-button]' ? button
      : q === '[data-ccg-dnp-sound]' ? sound
      : q === '[data-ccg-dnp-total]' ? total : null;},
    classList:{add(){},remove(){}}
  };
  const win = {
    CCG_SUPABASE_URL:'https://sample.supabase.co',
    CCG_SUPABASE_ANON_KEY:'public-test-key',
    IntersectionObserver:VisibilityObserver,
    setTimeout(){return 1;}, clearTimeout(){},
    fetch(url,options){return new Promise(resolve=>calls.push({url,options,resolve}));}
  };
  vm.runInNewContext(js,{document:{querySelector(q){return q === '[data-ccg-do-not-press]' ? section : null;}},window:win});
  assert.equal(observers,1);
  assert.equal(calls.length,0, 'no first-paint backend request');
  visible([{isIntersecting:true}]);
  assert.equal(calls.length,1);
  assert.match(calls[0].url,/ccg_do_not_press_count$/);
  assert.equal(calls[0].options.method,'POST');
  assert.equal(calls[0].options.cache,'no-store');
  assert.equal(calls[0].options.headers.apikey,'public-test-key');
  listeners.click();
  listeners.click();
  assert.equal(calls.length,3);
  assert.match(calls[1].url,/ccg_do_not_press_increment$/);
  const ok = value=>({ok:true,json:async()=>value});
  // The newest press finishes before the earlier press and initial count read.
  calls[2].resolve(ok(100000));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(total.textContent,'100000');
  calls[1].resolve(ok(10000));
  calls[0].resolve(ok(9999));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(total.textContent,'100000');
  assert.equal(total.attributes['aria-label'],'Total button presses: 100000');
});

test('failed count service does not fabricate presses or show an unverified number', async () => {
  const listeners=Object.create(null);
  const total={textContent:'0000',setAttribute(name,value){this.label=value;}};
  const button={addEventListener(name,fn){listeners[name]=fn;}};
  const sound={currentTime:0,pause(){},play(){return Promise.resolve();}};
  const section={querySelector(q){return q === '[data-ccg-dnp-button]' ? button
    : q === '[data-ccg-dnp-sound]' ? sound
    : q === '[data-ccg-dnp-total]' ? total : null;},
    classList:{add(){},remove(){}}};
  const win={CCG_SUPABASE_URL:'https://sample.supabase.co', CCG_SUPABASE_ANON_KEY:'test-key',
    setTimeout(){return 1;},clearTimeout(){},
    fetch(){return Promise.resolve({ok:false,status:503});}};
  vm.runInNewContext(js,{document:{querySelector(q){return q === '[data-ccg-do-not-press]' ? section : null;}},window:win});
  listeners.click();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(total.textContent,'—');
  assert.equal(total.label,'Button press total unavailable');
});

/* CCG homepage-only two-state sound button with the existing shared Supabase press counter. */
(function () {
  'use strict';
  var section = document.querySelector('[data-ccg-do-not-press]');
  if (!section || window.ccgDoNotPressLoaded) return;
  var button = section.querySelector('[data-ccg-dnp-button]');
  var sound = section.querySelector('[data-ccg-dnp-sound]');
  var total = section.querySelector('[data-ccg-dnp-total]');
  if (!button || !sound || !total) return;
  window.ccgDoNotPressLoaded = true;

  var releaseTimer = null;
  var pointerDown = false;
  var keyboardDown = false;
  var soundPrimed = false;
  var pressAudioContext = null;
  var latestSoundPress = 0;
  var lastCount = null;
  var countInitialised = false;

  function counterRemoteAccessAllowed() {
    try {
      if (window.CCGDungeonCarnageItchPackage === true ||
          window.CCG_OFFLINE_BUILD === true ||
          (window.location && window.location.protocol === 'file:')) return false;
      if (typeof navigator !== 'undefined' &&
          (navigator.webdriver === true || /HeadlessChrome/i.test(String(navigator.userAgent || '')))) return false;
      if (window.ccgSupabase && typeof window.ccgSupabase.remoteBackendAllowed === 'function' &&
          !window.ccgSupabase.remoteBackendAllowed()) return false;
      return true;
    } catch (_error) {
      // Fail closed if a test/offline environment cannot be classified safely.
      return false;
    }
  }

  function counterConfig() {
    if (!counterRemoteAccessAllowed()) return null;
    var base = String(window.CCG_SUPABASE_URL || '').replace(/\/+$/, '');
    var key = String(window.CCG_SUPABASE_ANON_KEY || '');
    // Only the already-configured public Supabase API is allowed. Never place
    // privileged keys or browser-generated counts in the homepage source.
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(base) || !key ||
        typeof window.fetch !== 'function') return null;
    return { base: base, key: key };
  }

  function normalizeCount(value) {
    // PostgREST's bigint RPC can return a JSON number or a decimal string.
    if (typeof value === 'number') {
      if (!Number.isSafeInteger(value) || value < 0) return null;
      value = String(value);
    }
    if (typeof value !== 'string' || !/^\d{1,19}$/.test(value)) return null;
    return value.replace(/^0+(?=\d)/, '');
  }

  function recordCount(value) {
    var next = normalizeCount(value);
    if (next === null) return false;
    // Network replies can arrive out of order. Never replace a newer global
    // total with a stale initial count or an older click response.
    if (lastCount !== null &&
        (next.length < lastCount.length ||
         (next.length === lastCount.length && next < lastCount))) return true;
    lastCount = next;
    var shown = next.padStart(4, '0');
    total.textContent = shown;
    total.setAttribute('aria-label', 'Total button presses: ' + shown);
    return true;
  }

  function showCounterUnavailable() {
    if (lastCount !== null) return; // Preserve the last verified number.
    total.textContent = '—';
    total.setAttribute('aria-label', 'Button press total unavailable');
  }

  function counterRpc(method) {
    var cfg = counterConfig();
    if (!cfg) return Promise.reject(new Error('Counter backend unavailable'));
    return window.fetch(cfg.base + '/rest/v1/rpc/ccg_do_not_press_' + method, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-store',
      credentials: 'omit',
      headers: {
        apikey: cfg.key,
        Authorization: 'Bearer ' + cfg.key,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: '{}'
    }).then(function (response) {
      if (!response || !response.ok) throw new Error('Press counter RPC failed');
      return response.json();
    });
  }

  function readCounter() {
    if (countInitialised) return;
    countInitialised = true;
    counterRpc('count').then(function (value) {
      if (!recordCount(value)) showCounterUnavailable();
    }).catch(showCounterUnavailable);
  }

  function incrementCounter() {
    // The database function increments atomically and returns the shared total.
    // Do not simulate an increase locally if the request fails.
    counterRpc('increment').then(function (value) {
      if (!recordCount(value)) showCounterUnavailable();
    }).catch(showCounterUnavailable);
  }

  // This widget is below the fold. Defer its first backend read until it comes
  // near the viewport, preserving the site's first-paint performance budget.
  if (typeof window.IntersectionObserver === 'function') {
    var visibility = new window.IntersectionObserver(function (entries) {
      if (!entries.some(function (entry) { return entry.isIntersecting; })) return;
      visibility.disconnect();
      readCounter();
    }, { rootMargin: '300px' });
    visibility.observe(section);
  } else {
    readCounter();
  }

  function press() {
    window.clearTimeout(releaseTimer);
    section.classList.add('is-pressed');
  }
  function releaseSoon() {
    window.clearTimeout(releaseTimer);
    releaseTimer = window.setTimeout(function () {
      if (!pointerDown && !keyboardDown) section.classList.remove('is-pressed');
    }, 135);
  }
  function cancelPress() {
    pointerDown = false;
    keyboardDown = false;
    window.clearTimeout(releaseTimer);
    section.classList.remove('is-pressed');
  }

  function primeSound() {
    if (soundPrimed) return;
    soundPrimed = true;
    // The audio clip remains lazy until the user approaches or focuses the button.
    // Prime it before the click so the first activation can play without a cold start.
    try {
      sound.preload = 'auto';
      if (typeof sound.load === 'function') sound.load();
    } catch (_loadFailed) {}
  }

  function playMechanicalClick() {
    // A short, first-party Web Audio press tick is audible even when the MP3
    // is delayed or fails to decode. No background autoplay or third-party audio.
    var Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    try {
      if (!pressAudioContext || pressAudioContext.state === 'closed') {
        pressAudioContext = new Context();
      }
      if (pressAudioContext.state === 'suspended') {
        var resumed = pressAudioContext.resume();
        if (resumed && typeof resumed.catch === 'function') resumed.catch(function () {});
      }
      var time = pressAudioContext.currentTime;
      var tone = pressAudioContext.createOscillator();
      var volume = pressAudioContext.createGain();
      tone.type = 'triangle';
      tone.frequency.setValueAtTime(225, time);
      tone.frequency.exponentialRampToValueAtTime(95, time + 0.085);
      volume.gain.setValueAtTime(0.001, time);
      volume.gain.linearRampToValueAtTime(0.064, time + 0.006);
      volume.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
      tone.connect(volume);
      volume.connect(pressAudioContext.destination);
      tone.start(time);
      tone.stop(time + 0.095);
    } catch (_webAudioUnavailable) {
      // The existing MP3 is still attempted below.
    }
  }

  button.addEventListener('pointerenter', primeSound);
  button.addEventListener('focus', primeSound);

  // The actual HTML button covers only the circular centre, not the fixed outer rim.
  button.addEventListener('pointerdown', function (event) {
    if (event.button !== undefined && event.button !== 0) return;
    pointerDown = true;
    press();
  });
  button.addEventListener('pointerup', function () {
    pointerDown = false;
    releaseSoon();
  });
  button.addEventListener('pointercancel', cancelPress);
  button.addEventListener('pointerleave', function () {
    if (!pointerDown) return;
    cancelPress();
  });
  button.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (event.repeat) return;
    keyboardDown = true;
    press();
  });
  button.addEventListener('keyup', function (event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    keyboardDown = false;
    releaseSoon();
  });
  button.addEventListener('blur', cancelPress);
  button.addEventListener('click', function () {
    press();
    if (!pointerDown && !keyboardDown) releaseSoon();
    // The original MP3 is the only primary sound. An extra synthesized tick
    // playing alongside it made the combined press sound unexpectedly loud.
    var soundPress = ++latestSoundPress;
    incrementCounter();
    try {
      sound.muted = false;
      sound.volume = 0.4;
    } catch (_audioSettings) {}
    try { sound.pause(); } catch (_pauseFailed) {}
    // On a cold mobile media element currentTime can throw before metadata is
    // available. A reset failure must never suppress the first real play().
    try { sound.currentTime = 0; } catch (_seekFailed) {}
    try {
      var playback = sound.play();
      if (playback && typeof playback.catch === 'function') playback.catch(function () {
        // Only the newest failed play attempt may produce a fallback click.
        // Aborted earlier play requests must not overlap newer MP3 playback.
        if (soundPress === latestSoundPress) playMechanicalClick();
      });
    } catch (_blockedAudio) {
      if (soundPress === latestSoundPress) playMechanicalClick();
    }
  });
})();

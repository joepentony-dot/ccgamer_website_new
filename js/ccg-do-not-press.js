/* CCG homepage-only sound button. Shares a server-side count, never a browser-only fake. */
(function () {
  'use strict';
  var section = document.querySelector('[data-ccg-do-not-press]');
  if (!section || window.ccgDoNotPressLoaded) return;
  window.ccgDoNotPressLoaded = true;

  var button = section.querySelector('[data-ccg-dnp-button]');
  var sound = section.querySelector('[data-ccg-dnp-sound]');
  var count = section.querySelector('[data-ccg-dnp-total]');
  var hint = section.querySelector('[data-ccg-dnp-hint]');
  if (!button || !sound || !count || !hint) return;

  var root = String(window.CCG_SUPABASE_URL || '').replace(/\/+$/, '');
  var anonKey = String(window.CCG_SUPABASE_ANON_KEY || '');
  var api = root ? root + '/rest/v1/rpc/' : '';
  var lastPress = 0;
  var displayedTotal = -1;
  var pressTimer = null;
  var pending = Promise.resolve();

  function showNumber(value) {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid press total');
    // Keep the public number monotonic if the startup read completes late.
    if (value < displayedTotal) return;
    displayedTotal = value;
    count.textContent = value.toLocaleString('en-GB');
  }

  async function rpc(name) {
    if (!api || !anonKey) throw new Error('Counter configuration unavailable');
    var controller = new AbortController();
    var timer = window.setTimeout(function () { controller.abort(); }, 8000);
    try {
      var response = await fetch(api + name, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          apikey: anonKey,
          Authorization: 'Bearer ' + anonKey,
          'Content-Type': 'application/json'
        },
        body: '{}'
      });
      if (!response.ok) throw new Error('Counter request failed');
      var value = await response.json();
      if (typeof value !== 'number') throw new Error('Unexpected counter response');
      return value;
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function refreshCount() {
    try {
      showNumber(await rpc('ccg_do_not_press_count'));
      hint.textContent = 'Every press is added to the total.';
    } catch (error) {
      hint.textContent = 'Counter temporarily unavailable. Sound still works.';
    }
  }

  button.addEventListener('click', function () {
    var now = performance.now();
    if (now - lastPress < 250) return;
    lastPress = now;

    button.classList.add('is-pressed');
    window.clearTimeout(pressTimer);
    pressTimer = window.setTimeout(function () {
      button.classList.remove('is-pressed');
    }, 170);

    try {
      sound.pause();
      sound.currentTime = 0;
      var playback = sound.play();
      if (playback && typeof playback.catch === 'function') {
        playback.catch(function () { hint.textContent = 'Your browser blocked audio playback.'; });
      }
    } catch (error) {
      hint.textContent = 'Your browser blocked audio playback.';
    }

    pending = pending.catch(function () {}).then(async function () {
      try {
        showNumber(await rpc('ccg_do_not_press_increment'));
        hint.textContent = 'Every press is added to the total.';
      } catch (error) {
        hint.textContent = 'Counter temporarily unavailable. Sound still works.';
      }
    });
  });

  refreshCount();
})();

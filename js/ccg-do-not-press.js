/* CCG homepage-only two-state sound button. The 0000 display is deliberately static until backend integration. */
(function () {
  'use strict';
  var section = document.querySelector('[data-ccg-do-not-press]');
  if (!section || window.ccgDoNotPressLoaded) return;
  var button = section.querySelector('[data-ccg-dnp-button]');
  var sound = section.querySelector('[data-ccg-dnp-sound]');
  if (!button || !sound) return;
  window.ccgDoNotPressLoaded = true;

  var releaseTimer = null;
  var pointerDown = false;
  var keyboardDown = false;
  var soundPrimed = false;
  var pressAudioContext = null;

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
      volume.gain.linearRampToValueAtTime(0.16, time + 0.006);
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
    playMechanicalClick();
    try {
      sound.muted = false;
      sound.volume = 1;
    } catch (_audioSettings) {}
    try { sound.pause(); } catch (_pauseFailed) {}
    // On a cold mobile media element currentTime can throw before metadata is
    // available. A reset failure must never suppress the first real play().
    try { sound.currentTime = 0; } catch (_seekFailed) {}
    try {
      var playback = sound.play();
      if (playback && typeof playback.catch === 'function') playback.catch(function () {
        // The mechanical click already played; retain the silent visual UI.
      });
    } catch (_blockedAudio) {
      // A blocked or unavailable sample must not create a page-wide error.
    }
  });
})();

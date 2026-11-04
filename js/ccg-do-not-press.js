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
    try {
      sound.pause();
      sound.currentTime = 0;
      var playback = sound.play();
      if (playback && typeof playback.catch === 'function') playback.catch(function () {});
    } catch (_blockedAudio) {
      // An unavailable or blocked sound must never add error text to the page.
    }
  });
})();

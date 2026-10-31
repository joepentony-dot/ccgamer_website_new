/*
 * CCG selective copyright notice.
 * A deterrent for casual image copying, not an access-control mechanism.
 * Keep real browser actions, game controls, editable content and downloads intact.
 */
(function () {
  'use strict';

  var path = (window.location.pathname || '/').toLowerCase();
  if (window.ccgCopyrightNoticeLoaded ||
      /^(\/admin\/|\/auth\/|\/emulator\/|\/arcade\/)/.test(path) ||
      document.documentElement.getAttribute('data-ccg-page') === 'intro') {
    return;
  }
  window.ccgCopyrightNoticeLoaded = true;

  var INTERACTIVE = 'input, textarea, select, option, button, a, [contenteditable], [role="textbox"]';
  var EXCLUDED = '[data-ccg-allow-contextmenu], [data-ccg-no-copyright-guard], ' +
    'canvas, video, audio, iframe, object, embed, pre, code, ' +
    '.emulator, .ccg-emulator, .emulator-container, ' +
    '[data-ccg-emulator], [data-ccg-game-canvas], ' +
    '.monaco-editor, .cm-editor, .ccg-consent-dialog';

  var toast = null;
  var timeoutId = null;

  function guarded(target) {
    if (!target || typeof target.closest !== 'function') return false;
    if (target.closest(INTERACTIVE) || target.closest(EXCLUDED)) return false;
    return Boolean(target.closest('img, picture, [data-ccg-protected-content]'));
  }

  function dismiss() {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (toast) {
      toast.remove();
      toast = null;
    }
  }

  function showNotice() {
    if (!document.body) return;
    dismiss();

    toast = document.createElement('aside');
    toast.className = 'ccg-copyright-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.setAttribute('aria-atomic', 'true');

    var title = document.createElement('strong');
    title.className = 'ccg-copyright-toast__title';
    title.textContent = '© ' + new Date().getFullYear() + ' Cheeky Commodore Gamer';

    var description = document.createElement('p');
    description.textContent = 'Original CCG content is copyright protected. Third-party artwork and game material belong to their respective rights holders.';

    var footer = document.createElement('div');
    footer.className = 'ccg-copyright-toast__footer';

    var policy = document.createElement('a');
    policy.href = '/copyright.html';
    policy.textContent = 'Copyright & permissions';

    var close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Dismiss';
    close.setAttribute('aria-label', 'Dismiss copyright notice');
    close.addEventListener('click', dismiss);

    footer.appendChild(policy);
    footer.appendChild(close);
    toast.appendChild(title);
    toast.appendChild(description);
    toast.appendChild(footer);
    document.body.appendChild(toast);

    timeoutId = window.setTimeout(dismiss, 4500);
  }

  document.addEventListener('contextmenu', function (event) {
    if (!guarded(event.target)) return;
    event.preventDefault();
    showNotice();
  }, { capture: true });

  document.addEventListener('dragstart', function (event) {
    var target = event.target;
    if (!target || typeof target.closest !== 'function') return;
    // Do not disable normal link dragging or interactions with game surfaces.
    if (target.closest('a, ' + INTERACTIVE) || target.closest(EXCLUDED)) return;
    if (target.closest('img')) event.preventDefault();
  }, { capture: true });
})();

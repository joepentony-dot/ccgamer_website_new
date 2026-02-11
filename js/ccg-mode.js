(function () {
  'use strict';

  function syncModeRoot() {
    const mode = document.body?.getAttribute('data-ccg-mode') || document.documentElement.getAttribute('data-ccg-mode') || 'c64';
    document.documentElement.setAttribute('data-mode', mode);
    if (document.body) document.body.setAttribute('data-mode', mode);
  }

  document.addEventListener('DOMContentLoaded', syncModeRoot);
  window.addEventListener('ccg:mode-changed', syncModeRoot);
})();

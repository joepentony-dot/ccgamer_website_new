(function () {
  'use strict';

  const quitButton = document.getElementById('btn-quit');
  if (!quitButton) return;

  quitButton.onclick = function () {
    window.location.assign('/games/ccg-games/');
  };
})();

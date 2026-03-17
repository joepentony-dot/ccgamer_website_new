(function () {
  'use strict';

  const REQUIRED_CSS = [
    '/resources/css/ccg-nav.css',
    '/resources/css/ccg-buttons.css',
    '/resources/css/ccg-mode.css'
  ];

  const NAV_PRIMARY = [
    ['Home', 'https://www.cheekycommodoregamer.co.uk/home.html'],
    ['Browse Games', 'https://www.cheekycommodoregamer.co.uk/games/index.html'],
    ['Browse by Genre', 'https://www.cheekycommodoregamer.co.uk/games/genres/index.html'],
    ['Collections', 'https://www.cheekycommodoregamer.co.uk/games/collections/index.html'],
    ['Music Hub', 'https://www.cheekycommodoregamer.co.uk/music/index.html']
  ];

  const NAV_SECONDARY = [
    ['Quiz', 'https://www.cheekycommodoregamer.co.uk/quiz/quiz.html'],
    ['Emulation', 'https://www.cheekycommodoregamer.co.uk/emulation.html'],
    ['About', 'https://www.cheekycommodoregamer.co.uk/about.html'],
    ['Contact', 'https://www.cheekycommodoregamer.co.uk/contact.html'],
    ['Rob Hubbard', 'https://www.cheekycommodoregamer.co.uk/music/rob-hubbard.html'],
    ['Martin Galway', 'https://www.cheekycommodoregamer.co.uk/music/martin-galway.html'],
    ['Ben Daglish', 'https://www.cheekycommodoregamer.co.uk/music/ben-daglish.html'],
    ['Matt Gray', 'https://www.cheekycommodoregamer.co.uk/music/matt-gray.html'],
    ['David Whittaker', 'https://www.cheekycommodoregamer.co.uk/music/david-whittaker.html'],
    ['Jeroen Tel', 'https://www.cheekycommodoregamer.co.uk/music/jeroen-tel.html'],
    ['Fred Gray', 'https://www.cheekycommodoregamer.co.uk/music/fred-gray.html'],
    ['Chris Hülsbeck', 'https://www.cheekycommodoregamer.co.uk/music/chris-huelsbeck.html'],
    ['Tim Follin', 'https://www.cheekycommodoregamer.co.uk/music/tim-follin.html'],
    ['Reyn Ouwehand', 'https://www.cheekycommodoregamer.co.uk/music/reyn-ouwehand.html']
  ];

  function ensureRequiredCSS() {
    REQUIRED_CSS.forEach(path => {
      const hasPath = Array.from(document.styleSheets).some(sheet => sheet.href && sheet.href.includes(path));
      if (!hasPath) {
        console.error(`‼ MISSING SHARED CSS IMPORT: ${path}`);
      }
    });
  }

  function rebuildList(selector, links) {
    const list = document.querySelector(selector);
    if (!list) return;
    list.innerHTML = links.map(([label, href]) => (
      `<li><a href="${href}" class="ccg-nav__link">${label}</a></li>`
    )).join('');
  }

  function normalizeButtons() {
    document.querySelectorAll('.ccg-btn').forEach(btn => {
      btn.style.borderRadius = '0px';
      btn.style.backdropFilter = 'none';
      btn.style.filter = 'none';
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    ensureRequiredCSS();
    rebuildList('[data-ccg-nav-primary]', NAV_PRIMARY);
    rebuildList('[data-ccg-nav-secondary]', NAV_SECONDARY);
    normalizeButtons();
  });
})();

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
    ['Publishers', 'https://www.cheekycommodoregamer.co.uk/games/publishers/'],
    ['Collections', 'https://www.cheekycommodoregamer.co.uk/games/collections/index.html'],
    ['Music Hub', 'https://www.cheekycommodoregamer.co.uk/music/index.html']
  ];

  const NAV_SECONDARY = [
    ['Quiz', 'https://www.cheekycommodoregamer.co.uk/quiz/quiz.html'],
    ['Emulation', 'https://www.cheekycommodoregamer.co.uk/emulation.html'],
    ['About', 'https://www.cheekycommodoregamer.co.uk/about.html'],
    ['Contact', 'https://www.cheekycommodoregamer.co.uk/contact.html']
  ];

  const PUBLISHER_ALIASES = new Map([
    ['ocean', 'Ocean Software'],
    ['ocean software', 'Ocean Software'],
    ['ocean software ltd', 'Ocean Software'],
    ['ocean software limited', 'Ocean Software'],
    ['mastertronic', 'Mastertronic'],
    ['mastertronic ltd', 'Mastertronic'],
    ['mastertronic limited', 'Mastertronic'],
    ['firebird', 'Firebird'],
    ['firebird software', 'Firebird'],
    ['firebird software ltd', 'Firebird'],
    ['firebird software limited', 'Firebird'],
    ['firebird silver', 'Firebird'],
    ['firebird gold', 'Firebird'],
    ['codemasters', 'Codemasters'],
    ['code masters', 'Codemasters'],
    ['code masters ltd', 'Codemasters'],
    ['us gold', 'US Gold'],
    ['u s gold', 'US Gold'],
    ['u.s. gold', 'US Gold'],
    ['u.s gold', 'US Gold'],
    ['us gold ltd', 'US Gold'],
    ['us gold limited', 'US Gold'],
    ['system 3', 'System 3'],
    ['system three', 'System 3'],
    ['system 3 software', 'System 3'],
    ['system 3 software ltd', 'System 3'],
    ['electronic arts', 'Electronic Arts'],
    ['electronic arts inc', 'Electronic Arts'],
    ['ea', 'Electronic Arts'],
    ['activision', 'Activision'],
    ['activision inc', 'Activision'],
    ['psygnosis', 'Psygnosis'],
    ['psygnosis ltd', 'Psygnosis'],
    ['elite', 'Elite'],
    ['elite systems', 'Elite'],
    ['elite systems ltd', 'Elite'],
    ['accolade', 'Accolade'],
    ['accolade inc', 'Accolade'],
    ['microprose', 'MicroProse'],
    ['micro prose', 'MicroProse'],
    ['hewson', 'Hewson'],
    ['hewson consultants', 'Hewson'],
    ['thalamus', 'Thalamus'],
    ['thalamus ltd', 'Thalamus'],
    ['rainbird', 'Rainbird'],
    ['rainbird software', 'Rainbird'],
    ['mirrorsoft', 'Mirrorsoft'],
    ['mirror soft', 'Mirrorsoft'],
    ['infogrames', 'Infogrames'],
    ['virgin', 'Virgin Games'],
    ['virgin games', 'Virgin Games'],
    ['virgin interactive', 'Virgin Games'],
    ['gremlin', 'Gremlin Graphics'],
    ['gremlin graphics', 'Gremlin Graphics'],
    ['gremlin graphics software', 'Gremlin Graphics'],
    ['domark', 'Domark'],
    ['domark ltd', 'Domark'],
    ['palace', 'Palace Software'],
    ['palace software', 'Palace Software'],
    ['image works', 'Image Works'],
    ['imageworks', 'Image Works'],
    ['melbourne house', 'Melbourne House'],
    ['software projects', 'Software Projects'],
    ['quicksilva', 'Quicksilva'],
    ['quick silva', 'Quicksilva'],
    ['audiogenic', 'Audiogenic'],
    ['millennium', 'Millennium Interactive'],
    ['millennium interactive', 'Millennium Interactive'],
    ['team 17', 'Team17'],
    ['team17', 'Team17'],
    ['renegade', 'Renegade'],
    ['sensible software', 'Sensible Software'],
    ['digital integration', 'Digital Integration'],
    ['alternative', 'Alternative Software'],
    ['alternative software', 'Alternative Software']
  ]);

  function ensureRequiredCSS() {
    REQUIRED_CSS.forEach(path => {
      const hasPath = Array.from(document.styleSheets).some(sheet => sheet.href && sheet.href.includes(path));
      if (!hasPath) {
        console.warn(`Missing CSS: ${path}`);
      }
    });
  }

  function ensureSkipLink() {
    if (document.querySelector('.ccg-skip-link')) return;

    const main = document.querySelector('main, [role="main"]');
    if (!main) return;

    if (!main.id) main.id = 'ccg-main-content';

    const skipLink = document.createElement('a');
    skipLink.className = 'ccg-skip-link';
    skipLink.href = `#${main.id}`;
    skipLink.textContent = 'Skip to main content';
    skipLink.setAttribute('data-ccg-skip-link', 'true');

    skipLink.addEventListener('click', function () {
      const hadTabindex = main.hasAttribute('tabindex');
      if (!hadTabindex) main.setAttribute('tabindex', '-1');

      window.setTimeout(function () {
        main.focus({ preventScroll: true });
        if (!hadTabindex) {
          main.addEventListener('blur', function () {
            main.removeAttribute('tabindex');
          }, { once: true });
        }
      }, 0);
    });

    document.body.insertBefore(skipLink, document.body.firstChild);
  }

  function rebuildList(selector, links) {
    const list = document.querySelector(selector);
    if (!list) return;
    list.innerHTML = links.map(([label, href]) => (
      `<li><a href="${href}" class="ccg-nav__link">${label}</a></li>`
    )).join('');
  }

  function addGamesDownloadsShortcut() {
    const page = document.querySelector('.ccg-page--games-index');
    const stats = page?.querySelector('.games-hero__stats');
    if (!stats || page.querySelector('[data-games-downloads-shortcut]')) return;

    const shortcut = document.createElement('div');
    shortcut.className = 'games-hero__stats';
    shortcut.setAttribute('data-games-downloads-shortcut', 'true');

    const link = document.createElement('a');
    link.className = 'ccg-btn ccg-btn--secondary';
    link.href = 'https://www.cheekycommodoregamer.co.uk/games/downloads/';
    link.textContent = 'Game Downloads A–Z';
    shortcut.appendChild(link);

    stats.insertAdjacentElement('afterend', shortcut);
  }

  function normalizeButtons() {
    document.querySelectorAll('.ccg-btn').forEach(btn => {
      btn.style.borderRadius = '0px';
      btn.style.backdropFilter = 'none';
      btn.style.filter = 'none';
    });
  }

  function normalizePublisherKey(value) {
    return String(value || '')
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[’‘]/g, "'")
      .replace(/&/g, ' and ')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[.,]+$/g, '')
      .trim();
  }

  function canonicalizePublisherName(value) {
    const raw = String(value || '').trim().replace(/\s+/g, ' ');
    if (!raw) return '';
    return PUBLISHER_ALIASES.get(normalizePublisherKey(raw)) || raw;
  }

  function slugifyPublisher(value) {
    return canonicalizePublisherName(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/&/g, ' and ')
      .toLowerCase()
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function getGamePublishers(game) {
    const raw = game?.credits?.publisher ?? game?.publisher ?? [];
    const values = Array.isArray(raw) ? raw : [raw];
    const seen = new Set();

    return values
      .map(value => String(value || '').trim())
      .filter(Boolean)
      .filter(value => {
        const slug = slugifyPublisher(value);
        if (!slug || seen.has(slug)) return false;
        seen.add(slug);
        return true;
      });
  }

  function getSiteRoot() {
    const root = typeof window.ccgGetSiteRoot === 'function' ? window.ccgGetSiteRoot() : '/';
    return root.endsWith('/') ? root : `${root}/`;
  }

  function linkPublisherCredits(game) {
    const publishers = getGamePublishers(game);
    if (!publishers.length) return;

    const terms = document.querySelectorAll('.ccg-behind-pixels-inline__list dt');
    const publisherTerm = Array.from(terms).find(term => term.textContent.trim().toLowerCase() === 'publisher');
    const publisherDetail = publisherTerm?.nextElementSibling;
    if (!publisherDetail || publisherDetail.dataset.ccgPublisherLinks === 'true') return;

    publisherDetail.textContent = '';
    publishers.forEach((publisher, index) => {
      if (index > 0) publisherDetail.appendChild(document.createTextNode(', '));

      const canonicalName = canonicalizePublisherName(publisher);
      const slug = slugifyPublisher(publisher);
      const link = document.createElement('a');
      link.className = 'ccg-composer-button ccg-publisher-credit-link';
      link.href = `${getSiteRoot()}games/publishers/${slug}/`;
      link.textContent = publisher;
      link.setAttribute('aria-label', `Browse all ${canonicalName} games`);
      publisherDetail.appendChild(link);
    });

    publisherDetail.dataset.ccgPublisherLinks = 'true';
  }

  window.addEventListener('ccg:game-loaded', event => {
    linkPublisherCredits(event.detail?.game || null);
  });

  document.addEventListener('DOMContentLoaded', function () {
    ensureRequiredCSS();
    ensureSkipLink();
    rebuildList('[data-ccg-nav-primary]', NAV_PRIMARY);
    rebuildList('[data-ccg-nav-secondary]', NAV_SECONDARY);
    addGamesDownloadsShortcut();
    document.querySelectorAll('.ccg-socials-fallback').forEach(el => {
      el.style.display = 'none';
    });
    normalizeButtons();
  });
})();

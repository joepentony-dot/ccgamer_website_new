(function () {
  window.CCG_COMMUNITY_FLAGS = Object.freeze({
    COMMUNITY_COMMENTS_ENABLED: true,
    COMMUNITY_RATINGS_ENABLED: true
  });

  function ensureCommunityStylesheet() {
    if (document.querySelector('link[href*="ccg-community.css"]')) return;

    var stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = '/resources/css/ccg-community.css';
    stylesheet.setAttribute('data-ccg-community-styles', 'runtime');
    document.head.appendChild(stylesheet);
  }

  function ensureGameCommunitySection() {
    var root = document.documentElement;
    var shell = document.querySelector('.ccg-page--single-game .game-shell');

    if (!root || root.getAttribute('data-ccg-page') !== 'single-game' || !shell) return;

    ensureCommunityStylesheet();
    if (document.getElementById('ccg-community-rating') && document.getElementById('ccg-community-comments')) return;

    var section = document.createElement('section');
    section.className = 'game-section ccg-community-game-section';
    section.setAttribute('aria-labelledby', 'ccg-community-game-title');
    section.innerHTML = [
      '<p class="game-section__kicker">The CCG Community</p>',
      '<h2 class="game-section__title" id="ccg-community-game-title">Rate &amp; Review This Game</h2>',
      '<p class="ccg-section__intro">Share your verdict with other Commodore fans. Everyone can read the reviews; members must log in to rate or comment.</p>',
      '<details class="ccg-comments-panel" id="ccg-community-rating-panel">',
        '<summary class="ccg-comments-panel__summary">',
          '<span>Community Rating</span>',
          '<span class="ccg-comments-panel__meta" id="ccg-rating-summary-meta">Loading rating…</span>',
        '</summary>',
        '<div class="ccg-comments-panel__body" id="ccg-community-rating">',
          '<div class="ccg-community-card"><p class="ccg-community-muted">Preparing ratings…</p></div>',
        '</div>',
      '</details>',
      '<details class="ccg-comments-panel" id="ccg-community-comments-panel">',
        '<summary class="ccg-comments-panel__summary">',
          '<span>Member Reviews</span>',
          '<span class="ccg-comments-panel__meta" id="ccg-comments-summary-meta">Loading reviews…</span>',
        '</summary>',
        '<div class="ccg-comments-panel__body" id="ccg-community-comments">',
          '<div class="ccg-community-card"><p class="ccg-community-muted">Preparing reviews…</p></div>',
        '</div>',
      '</details>'
    ].join('');

    var quickActions = shell.querySelector('[data-game-quick-actions]');
    if (quickActions) {
      shell.insertBefore(section, quickActions);
      return;
    }

    shell.appendChild(section);
  }

  ensureGameCommunitySection();
})();

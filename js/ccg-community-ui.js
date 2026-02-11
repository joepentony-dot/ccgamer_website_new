(function () {
  function detectPrefixFromHref(href) {
    if (!href) return '/';
    if (href.startsWith('/')) return '/';
    const match = href.match(/^(\.\.\/)+/);
    return match ? match[0] : '';
  }

  function createCommunityNavItem(hrefPrefix) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.className = 'ccg-nav__link';
    a.href = hrefPrefix + 'community/index.html';
    a.textContent = 'Community';
    li.appendChild(a);
    li.className = 'ccg-community-nav-item';
    return li;
  }

  function injectNavLinks() {
    document.querySelectorAll('[data-ccg-nav-secondary]').forEach((list) => {
      if (list.querySelector('.ccg-community-nav-item')) return;
      const firstLink = list.querySelector('a');
      const prefix = detectPrefixFromHref(firstLink ? firstLink.getAttribute('href') : '');
      list.insertBefore(createCommunityNavItem(prefix), list.firstChild);
    });
  }

  async function renderAuthButton() {
    const actions = document.querySelector('.ccg-header-actions');
    if (!actions) return;

    const context = await window.ccgSupabase.getCurrentUserContext();
    const profile = window.ccgCommunityAuth.getProfile();

    let btn = actions.querySelector('[data-ccg-community-auth-btn]');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ccg-community-auth-btn ccg-community-profile-btn';
      btn.setAttribute('data-ccg-community-auth-btn', '1');
      btn.addEventListener('click', function () {
        if (window.ccgCommunityAuth.getUser()) {
          window.location.href = '/community/profile.html';
        } else {
          window.ccgCommunityAuth.openAuthModal('signin');
        }
      });
      actions.appendChild(btn);
    }

    const username = profile && profile.username ? profile.username : 'My Profile';
    const avatar = profile && profile.avatar_url
      ? '<img src="' + window.ccgCommunityAuth.esc(profile.avatar_url) + '" alt="' + window.ccgCommunityAuth.esc(username) + ' avatar" class="ccg-community-auth-btn__avatar">'
      : '<span class="ccg-community-auth-btn__avatar ccg-community-auth-btn__avatar--fallback" aria-hidden="true">@</span>';

    if (context.isAuthenticated) {
      btn.innerHTML = avatar + '<span>@' + window.ccgCommunityAuth.esc(username) + '</span>';
      btn.setAttribute('aria-label', 'Open profile for @' + username);
    } else {
      btn.textContent = 'Join / Log in';
      btn.setAttribute('aria-label', 'Open login and registration');
    }
  }

  function init() {
    injectNavLinks();
    renderAuthButton();
    window.addEventListener('ccg:auth-ready', renderAuthButton);
    window.addEventListener('ccg:auth-changed', renderAuthButton);
  }

  document.addEventListener('DOMContentLoaded', init);
})();

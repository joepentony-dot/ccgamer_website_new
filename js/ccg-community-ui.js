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
    await window.ccgSupabase.waitForAuth();
    const actions = document.querySelector('.ccg-header-actions');
    if (!actions) return;

    let btn = actions.querySelector('[data-ccg-community-auth-btn]');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ccg-community-auth-btn';
      btn.setAttribute('data-ccg-community-auth-btn', '1');
      btn.addEventListener('click', function () {
        const user = window.ccgCommunityAuth.getUser();
        if (user) {
          window.location.href = '/community/profile.html';
        } else {
          window.ccgCommunityAuth.openAuthModal('signin');
        }
      });
      actions.appendChild(btn);
    }

    const user = window.ccgCommunityAuth.getUser();
    const profile = window.ccgCommunityAuth.getProfile();
    btn.textContent = user ? ('@' + (profile && profile.username ? profile.username : 'My Profile')) : 'Join / Log in';
  }

  function init() {
    injectNavLinks();
    renderAuthButton();
    window.addEventListener('ccg:auth-ready', renderAuthButton);
    window.addEventListener('ccg:auth-changed', renderAuthButton);
  }

  document.addEventListener('DOMContentLoaded', init);
})();

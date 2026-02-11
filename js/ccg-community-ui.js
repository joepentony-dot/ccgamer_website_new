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

  function init() {
    injectNavLinks();
  }

  document.addEventListener('DOMContentLoaded', init);
})();

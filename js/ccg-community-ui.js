(function () {
  const COMMUNITY_LINKS = [
    { href: 'community/index.html', label: 'Community' },
    { href: 'community/profile.html', label: 'Profile' },
    { href: 'community/rankings.html', label: 'Rankings' },
    { href: 'community/badges.html', label: 'Badges' },
    { href: 'community/challenges.html', label: 'Challenges' }
  ];

  function detectPrefixFromHref(href) {
    if (!href) return '/';
    if (href.startsWith('/')) return '/';
    const match = href.match(/^(\.\.\/)+/);
    return match ? match[0] : '';
  }

  function buildNavItem(hrefPrefix, config) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.className = 'ccg-nav__link';
    a.href = hrefPrefix + config.href;
    a.textContent = config.label;
    li.appendChild(a);
    li.className = 'ccg-community-nav-item ccg-community-nav-item--' + config.label.toLowerCase();
    return li;
  }

  function hasCommunityLink(list) {
    return Array.from(list.querySelectorAll('a')).some((link) => {
      const href = String(link.getAttribute('href') || '').toLowerCase();
      return href.includes('community/index.html') || href === '/community/' || href === '/community/index.html';
    });
  }

  function injectGlobalCommunityLink() {
    document.querySelectorAll('[data-ccg-nav-secondary]').forEach((list) => {
      if (list.querySelector('.ccg-community-nav-item--community') || hasCommunityLink(list)) return;
      const firstLink = list.querySelector('a');
      const prefix = detectPrefixFromHref(firstLink ? firstLink.getAttribute('href') : '');
      list.insertBefore(buildNavItem(prefix, COMMUNITY_LINKS[0]), list.firstChild);
    });
  }

  function injectCommunitySubnav() {
    const mount = document.getElementById('ccg-community-subnav');
    if (!mount) return;

    const currentPath = window.location.pathname;
    mount.innerHTML = COMMUNITY_LINKS.map(function (item) {
      const absoluteHref = '/' + item.href;
      const isActive = currentPath.endsWith(item.href);
      return '<a class="ccg-community-subnav__link' + (isActive ? ' is-active' : '') + '" href="' + absoluteHref + '">' + item.label + '</a>';
    }).join('');
  }

  function init() {
    injectGlobalCommunityLink();
    injectCommunitySubnav();
  }

  document.addEventListener('DOMContentLoaded', init);
})();

(function () {
  'use strict';

  const PROFILE_URL = '/community/profile.html';

  function getUsername() {
    return localStorage.getItem('ccg_username') || localStorage.getItem('ccg-user') || '';
  }

  function bindAuthModalTrigger(button) {
    if (!button || button.dataset.ccgAuthBound === 'true') return;

    button.addEventListener('click', function (event) {
      event.preventDefault();
      const auth = window.ccgCommunityAuth;
      if (auth && typeof auth.openAuthModal === 'function') {
        auth.openAuthModal('signin');
      }
    });

    button.dataset.ccgAuthBound = 'true';
  }

  function ensureAuthButton() {
    const actions = document.querySelector('.ccg-header-actions');
    if (!actions) return;

    let slot = actions.querySelector('.ccg-auth-slot');
    if (!slot) {
      slot = document.createElement('div');
      slot.className = 'ccg-auth-slot';
      const socials = actions.querySelector('.ccg-header-socials');
      actions.insertBefore(slot, socials || actions.firstChild);
    }

    const username = getUsername();
    if (username) {
      slot.innerHTML = `<a href="${PROFILE_URL}" class="ccg-btn ccg-btn-auth" id="profile-btn">@${username}</a>`;
      return;
    }

    slot.innerHTML = '<button type="button" class="ccg-btn ccg-btn-auth" id="join-login">Join / Login</button>';
    bindAuthModalTrigger(slot.querySelector('#join-login'));
  }

  document.addEventListener('DOMContentLoaded', ensureAuthButton);
})();

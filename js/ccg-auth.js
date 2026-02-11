(function () {
  'use strict';

  const LOGIN_URL = '/community/index.html';
  const PROFILE_URL = '/community/profile.html';

  function getUsername() {
    return localStorage.getItem('ccg_username') || localStorage.getItem('ccg-user') || '';
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
    } else {
      slot.innerHTML = `<a href="${LOGIN_URL}" class="ccg-btn ccg-btn-auth" id="join-login">Join / Login</a>`;
    }
  }

  document.addEventListener('DOMContentLoaded', ensureAuthButton);
})();

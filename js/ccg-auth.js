(function () {
  'use strict';

  const PROFILE_URL = '/community/profile.html';
  const AUTH_EVENT = 'ccg:auth-state';

  const state = {
    initialized: false,
    profilePromise: null
  };

  function readStoredUsername() {
    return localStorage.getItem('ccg_username') || localStorage.getItem('ccg-user') || '';
  }

  function getDisplayName(profile, user) {
    if (profile && profile.username) return String(profile.username);
    if (user && user.user_metadata && user.user_metadata.username) return String(user.user_metadata.username);
    if (user && user.email) return String(user.email).split('@')[0];
    return readStoredUsername();
  }

  function setGlobalAuth(user, profile, session) {
    const loggedIn = Boolean(user);
    const username = getDisplayName(profile, user);
    window.CCG_AUTH = {
      loggedIn: loggedIn,
      user: user || null,
      profile: profile || null,
      session: session || null,
      username: username || ''
    };

    if (username) {
      try {
        localStorage.setItem('ccg_username', username);
      } catch (_error) {
        // ignore
      }
    }

    const message = loggedIn ? '[CCG AUTH] Logged in as: ' + (username || user.id) : '[CCG AUTH] No session';
    console.info(message);

    window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: window.CCG_AUTH }));
    return window.CCG_AUTH;
  }

  async function resolveAuthState() {
    let user = null;
    let profile = null;
    let session = null;

    if (window.ccgSupabase && typeof window.ccgSupabase.getCurrentUserContext === 'function') {
      try {
        const context = await window.ccgSupabase.getCurrentUserContext();
        user = context && context.user ? context.user : null;
        session = context && context.session ? context.session : null;
      } catch (_error) {
        user = null;
      }
    }

    if (!user && window.ccgCommunityAuth && typeof window.ccgCommunityAuth.getUser === 'function') {
      user = window.ccgCommunityAuth.getUser();
    }

    if (window.ccgCommunityAuth && typeof window.ccgCommunityAuth.getProfile === 'function') {
      profile = window.ccgCommunityAuth.getProfile();
    }

    if (!profile && user && window.ccgCommunityAuth && typeof window.ccgCommunityAuth.getProfileReady === 'function') {
      if (!state.profilePromise) {
        state.profilePromise = window.ccgCommunityAuth.getProfileReady().catch(function () { return null; }).finally(function () {
          state.profilePromise = null;
        });
      }
      profile = await state.profilePromise;
    }

    return setGlobalAuth(user, profile, session);
  }

  function bindAuthModalTrigger(button) {
    if (!button || button.dataset.ccgAuthBound === 'true') return;

    button.addEventListener('click', function (event) {
      event.preventDefault();
      const auth = window.ccgCommunityAuth;
      if (auth && typeof auth.goToLogin === 'function') {
        auth.goToLogin(window.location.pathname + window.location.search + window.location.hash);
        return;
      }
      const returnTo = encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
      window.location.href = '/auth/login.html?returnTo=' + returnTo;
    });

    button.dataset.ccgAuthBound = 'true';
  }

  function bindLogout(button) {
    if (!button || button.dataset.ccgAuthBound === 'true') return;
    button.addEventListener('click', async function (event) {
      event.preventDefault();
      if (!window.ccgCommunityAuth || typeof window.ccgCommunityAuth.logout !== 'function') return;
      await window.ccgCommunityAuth.logout();
      await resolveAuthState();
    });
    button.dataset.ccgAuthBound = 'true';
  }

  function renderHeaderAuth() {
    const actions = document.querySelector('.ccg-header-actions');
    if (!actions) return;

    let slot = actions.querySelector('.ccg-auth-slot');
    if (!slot) {
      slot = document.createElement('div');
      slot.className = 'ccg-auth-slot';
      const socials = actions.querySelector('.ccg-header-socials');
      actions.insertBefore(slot, socials || actions.firstChild);
    }

    const auth = window.CCG_AUTH || { loggedIn: false, username: '' };

    if (auth.loggedIn) {
      const username = auth.username || 'member';
      slot.innerHTML = '' +
        '<a href="' + PROFILE_URL + '" class="ccg-btn ccg-btn-auth" id="ccg-auth-profile-link">@' + username + '</a>' +
        '<button type="button" class="ccg-btn ccg-btn-auth" id="ccg-auth-logout">Logout</button>';
      bindLogout(slot.querySelector('#ccg-auth-logout'));
      return;
    }

    slot.innerHTML = '<button type="button" class="ccg-btn ccg-btn-auth" id="join-login">Join / Login</button>';
    bindAuthModalTrigger(slot.querySelector('#join-login'));
  }

  async function refreshUi() {
    await resolveAuthState();
    renderHeaderAuth();
  }

  function init() {
    if (state.initialized) return;
    state.initialized = true;

    refreshUi();

    window.addEventListener('ccg:auth-ready', refreshUi);
    window.addEventListener('ccg:auth-changed', refreshUi);
    window.addEventListener(AUTH_EVENT, renderHeaderAuth);
  }

  document.addEventListener('DOMContentLoaded', init);
})();

(function () {
  'use strict';

  const AUTH_EVENT = 'ccg:auth-state';

  const state = {
    initialized: false,
    profilePromise: null
  };

  function readStoredUsername() {
    return localStorage.getItem('ccg_username') || localStorage.getItem('ccg-user') || '';
  }

  function isEmailLike(value) {
    const text = String(value || '').trim();
    if (!text) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
  }

  function readSafeValue(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    if (isEmailLike(text)) return '';
    return text;
  }

  function getDisplayName(profile, user) {
    const profileDisplayName = readSafeValue(profile && profile.display_name);
    if (profileDisplayName) return profileDisplayName;

    const profileUsername = readSafeValue(profile && profile.username);
    if (profileUsername) return profileUsername;

    const metadataName = readSafeValue(user && user.user_metadata && (user.user_metadata.name || user.user_metadata.full_name || user.user_metadata.display_name));
    if (metadataName) return metadataName;

    const metadataUsername = readSafeValue(user && user.user_metadata && user.user_metadata.username);
    if (metadataUsername) return metadataUsername;

    const storedUsername = readSafeValue(readStoredUsername());
    if (storedUsername) return storedUsername;

    return '@member';
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

  async function getSupabaseClient() {
    if (window.ccgSupabase && typeof window.ccgSupabase.getClient === 'function') {
      try {
        const client = await window.ccgSupabase.getClient();
        if (client) return client;
      } catch (_error) {
        // fall through
      }
    }

    return window.supabase || window.__ccgSupabaseClient || null;
  }

  function bindLogout(button) {
    if (!button || button.dataset.ccgAuthBound === 'true') return;
    button.addEventListener('click', async function (event) {
      event.preventDefault();

      if (window.ccgCommunityAuth && typeof window.ccgCommunityAuth.logout === 'function') {
        await window.ccgCommunityAuth.logout();
      } else {
        const supabase = await getSupabaseClient();
        if (supabase && supabase.auth && typeof supabase.auth.signOut === 'function') {
          await supabase.auth.signOut();
        }
      }

      await resolveAuthState();
      renderHeaderAuth();
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
      const username = auth.username || '@member';
      slot.innerHTML = '' +
        '<a class="ccg-btn ccg-btn-auth" id="ccg-auth-identity" href="/community/profile.html">' + username + '</a>' +
        '<button type="button" class="ccg-btn ccg-btn-auth" id="ccg-auth-logout" data-logout>Logout</button>';
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

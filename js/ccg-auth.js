(function () {
  'use strict';

  const AUTH_EVENT = 'ccg:auth-state';

  const state = {
    initialized: false,
    profilePromise: null,
    profilePromiseUserId: '',
    resolveRequestId: 0
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

    if (username && username !== '@member') {
      try {
        localStorage.setItem('ccg_username', username);
      } catch (_error) {
        // ignore
      }
    }

    window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: window.CCG_AUTH }));
    return window.CCG_AUTH;
  }

  async function resolveAuthState() {
    const requestId = ++state.resolveRequestId;
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

    if (user && window.ccgCommunityAuth && typeof window.ccgCommunityAuth.getProfileReady === 'function') {
      const hasDisplayName = readSafeValue(profile && profile.display_name);
      if (!hasDisplayName) {
        if (!state.profilePromise || state.profilePromiseUserId !== user.id) {
          state.profilePromiseUserId = user.id;
          state.profilePromise = window.ccgCommunityAuth.getProfileReady().catch(function (error) {
            console.warn('[CCG AUTH] Profile fetch failed; using fallback display name.', error);
            return null;
          }).finally(function () {
            state.profilePromiseUserId = '';
            state.profilePromise = null;
          });
        }
        const resolvedProfile = await state.profilePromise;
        if (resolvedProfile) {
          profile = resolvedProfile;
        }
      }
    }

    if (requestId !== state.resolveRequestId) return window.CCG_AUTH;

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

  function makeButton(tagName, className, id, text) {
    const element = document.createElement(tagName);
    element.className = className;
    element.id = id;
    element.textContent = text;
    return element;
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
    slot.textContent = '';

    if (auth.loggedIn) {
      const username = auth.username || '@member';
      const profileLabel = 'Profile: ' + username;
      const identity = makeButton('a', 'ccg-btn ccg-btn-auth ccg-community-profile-btn', 'ccg-auth-identity', profileLabel);
      identity.href = '/community/profile.html';
      identity.title = 'Open your profile';
      identity.setAttribute('aria-label', 'Open ' + profileLabel);

      const logout = makeButton('button', 'ccg-btn ccg-btn-auth', 'ccg-auth-logout', 'Logout');
      logout.type = 'button';
      logout.setAttribute('data-logout', '');

      slot.append(identity, logout);
      bindLogout(logout);
      return;
    }

    const join = makeButton('button', 'ccg-btn ccg-btn-auth', 'join-login', 'Join / Login');
    join.type = 'button';
    slot.appendChild(join);
    bindAuthModalTrigger(join);
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

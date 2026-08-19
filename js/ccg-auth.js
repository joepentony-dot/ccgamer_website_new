(function () {
  'use strict';

  const AUTH_EVENT = 'ccg:auth-state';
  const AUTH_HINT_KEY = 'ccg_auth_ui_hint_v1';
  const MAX_DEPENDENCY_RETRIES = 24;

  const state = {
    initialized: false,
    profilePromise: null,
    profilePromiseUserId: '',
    resolveRequestId: 0,
    resolved: false,
    resolving: false,
    retryCount: 0,
    retryTimer: 0
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

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (character) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character];
    });
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

  function readAuthHint() {
    try {
      const parsed = JSON.parse(localStorage.getItem(AUTH_HINT_KEY) || 'null');
      if (!parsed || parsed.loggedIn !== true) return null;
      const username = readSafeValue(parsed.username);
      return { loggedIn: true, username: username || '@member' };
    } catch (_error) {
      return null;
    }
  }

  function storeAuthHint(auth) {
    try {
      if (auth && auth.loggedIn) {
        localStorage.setItem(AUTH_HINT_KEY, JSON.stringify({
          loggedIn: true,
          username: readSafeValue(auth.username) || '@member'
        }));
      } else {
        localStorage.removeItem(AUTH_HINT_KEY);
      }
    } catch (_error) {
      // UI hint storage is optional and never grants permissions.
    }
  }

  function ensureAuthSlot() {
    const actions = document.querySelector('.ccg-header-actions');
    if (!actions) return null;

    let slot = actions.querySelector('.ccg-auth-slot');
    if (!slot) {
      slot = document.createElement('div');
      slot.className = 'ccg-auth-slot';
      slot.setAttribute('data-ccg-auth-slot', 'true');
      const socials = actions.querySelector('.ccg-header-socials');
      actions.insertBefore(slot, socials || actions.firstChild);
    }
    return slot;
  }

  function renderPendingHeaderAuth() {
    if (state.resolved) return;
    const slot = ensureAuthSlot();
    if (!slot) return;

    const hint = readAuthHint();
    slot.setAttribute('aria-busy', 'true');
    slot.dataset.ccgAuthPending = 'true';

    if (hint && hint.loggedIn) {
      const safeUsername = escapeHtml(hint.username || '@member');
      slot.innerHTML = '' +
        '<a class="ccg-btn ccg-btn-auth ccg-profile-link" href="/community/profile.html" aria-label="Open member profile">' +
        '<span class="ccg-profile-link__label">Profile:</span> <span class="ccg-profile-link__name">' + safeUsername + '</span></a>' +
        '<button type="button" class="ccg-btn ccg-btn-auth" disabled aria-disabled="true">Logout</button>';
      return;
    }

    slot.innerHTML = '<span class="ccg-btn ccg-btn-auth ccg-auth-pending" aria-live="polite">Account</span>';
  }

  function setGlobalAuth(user, profile, session) {
    const loggedIn = Boolean(user);
    const username = getDisplayName(profile, user);
    state.resolved = true;
    state.resolving = false;
    state.retryCount = 0;
    if (state.retryTimer) {
      window.clearTimeout(state.retryTimer);
      state.retryTimer = 0;
    }

    window.CCG_AUTH = {
      loggedIn: loggedIn,
      user: user || null,
      profile: profile || null,
      session: session || null,
      username: username || '',
      resolved: true
    };

    if (username && username !== '@member') {
      try {
        localStorage.setItem('ccg_username', username);
      } catch (_error) {
        // ignore
      }
    }

    storeAuthHint(window.CCG_AUTH);
    window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: window.CCG_AUTH }));
    return window.CCG_AUTH;
  }

  function authDependenciesAvailable() {
    return Boolean(
      (window.ccgSupabase && typeof window.ccgSupabase.getCurrentUserContext === 'function') ||
      (window.ccgCommunityAuth && typeof window.ccgCommunityAuth.getUser === 'function')
    );
  }

  function queueDependencyRetry() {
    if (state.resolved || state.retryTimer || state.retryCount >= MAX_DEPENDENCY_RETRIES) return;
    state.retryCount += 1;
    state.retryTimer = window.setTimeout(function () {
      state.retryTimer = 0;
      void refreshUi();
    }, Math.min(1200, 90 + state.retryCount * 45));
  }

  async function resolveAuthState() {
    if (state.resolving) return window.CCG_AUTH || null;
    if (!authDependenciesAvailable()) {
      renderPendingHeaderAuth();
      queueDependencyRetry();
      return window.CCG_AUTH || null;
    }

    state.resolving = true;
    const requestId = ++state.resolveRequestId;
    let user = null;
    let profile = null;
    let session = null;
    let attempted = false;

    if (window.ccgSupabase && typeof window.ccgSupabase.getCurrentUserContext === 'function') {
      attempted = true;
      try {
        const context = await window.ccgSupabase.getCurrentUserContext();
        user = context && context.user ? context.user : null;
        session = context && context.session ? context.session : null;
      } catch (_error) {
        user = null;
      }
    }

    if (window.ccgCommunityAuth && typeof window.ccgCommunityAuth.init === 'function') {
      attempted = true;
      try {
        await window.ccgCommunityAuth.init();
      } catch (_error) {
        // The session resolver below remains the source of truth.
      }
    }

    if (!user && window.ccgCommunityAuth && typeof window.ccgCommunityAuth.getUser === 'function') {
      attempted = true;
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
        if (resolvedProfile) profile = resolvedProfile;
      }
    }

    if (requestId !== state.resolveRequestId) {
      state.resolving = false;
      return window.CCG_AUTH || null;
    }

    if (!attempted) {
      state.resolving = false;
      renderPendingHeaderAuth();
      queueDependencyRetry();
      return window.CCG_AUTH || null;
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

      state.resolved = false;
      storeAuthHint(null);
      renderPendingHeaderAuth();
      await resolveAuthState();
      renderHeaderAuth();
    });
    button.dataset.ccgAuthBound = 'true';
  }

  function renderHeaderAuth() {
    const slot = ensureAuthSlot();
    if (!slot) return;

    if (!state.resolved) {
      renderPendingHeaderAuth();
      return;
    }

    slot.removeAttribute('aria-busy');
    delete slot.dataset.ccgAuthPending;
    const auth = window.CCG_AUTH || { loggedIn: false, username: '' };

    if (auth.loggedIn) {
      const username = auth.username || '@member';
      const safeUsername = escapeHtml(username);
      slot.innerHTML = '' +
        '<a class="ccg-btn ccg-btn-auth ccg-profile-link" id="ccg-auth-identity" href="/community/profile.html" aria-label="Open profile for ' + safeUsername + '">' +
        '<span class="ccg-profile-link__label">Profile:</span> <span class="ccg-profile-link__name">' + safeUsername + '</span></a>' +
        '<button type="button" class="ccg-btn ccg-btn-auth" id="ccg-auth-logout" data-logout>Logout</button>';
      bindLogout(slot.querySelector('#ccg-auth-logout'));
      return;
    }

    slot.innerHTML = '<button type="button" class="ccg-btn ccg-btn-auth" id="join-login">Join / Login</button>';
    bindAuthModalTrigger(slot.querySelector('#join-login'));
  }

  async function refreshUi() {
    if (!state.resolved) renderPendingHeaderAuth();
    await resolveAuthState();
    renderHeaderAuth();
  }

  function init() {
    if (state.initialized) return;
    state.initialized = true;

    renderPendingHeaderAuth();
    void refreshUi();

    window.addEventListener('ccg:auth-ready', refreshUi);
    window.addEventListener('ccg:auth-changed', refreshUi);
    window.addEventListener('ccg:header-auth-dependencies-ready', refreshUi);
    window.addEventListener(AUTH_EVENT, renderHeaderAuth);
    window.addEventListener('pageshow', function () {
      if (!state.resolved) void refreshUi();
    });
  }

  window.CCGHeaderAuth = Object.freeze({
    refresh: refreshUi,
    render: renderHeaderAuth,
    resolve: resolveAuthState,
    prime: renderPendingHeaderAuth,
    isResolved: function () { return state.resolved; }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

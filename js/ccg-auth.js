(function () {
  'use strict';

  const AUTH_EVENT = 'ccg:auth-state';
  const AUTH_SNAPSHOT_KEY = 'ccg_header_auth_snapshot';

  const state = {
    initialized: false,
    initPromise: null,
    profilePromise: null,
    profilePromiseUserId: '',
    resolveRequestId: 0,
    authoritativeResolved: false
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

  function readAuthSnapshot() {
    try {
      const raw = sessionStorage.getItem(AUTH_SNAPSHOT_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.loggedIn !== 'boolean') return null;
      return {
        loggedIn: parsed.loggedIn,
        username: readSafeValue(parsed.username) || ''
      };
    } catch (_error) {
      return null;
    }
  }

  function writeAuthSnapshot(auth) {
    try {
      sessionStorage.setItem(AUTH_SNAPSHOT_KEY, JSON.stringify({
        loggedIn: Boolean(auth && auth.loggedIn),
        username: readSafeValue(auth && auth.username) || ''
      }));
    } catch (_error) {
      // ignore storage issues
    }
  }

  function clearAuthSnapshot() {
    try {
      sessionStorage.removeItem(AUTH_SNAPSHOT_KEY);
    } catch (_error) {
      // ignore storage issues
    }
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
    state.authoritativeResolved = true;

    if (username && username !== '@member') {
      try {
        localStorage.setItem('ccg_username', username);
      } catch (_error) {
        // ignore
      }
    }

    writeAuthSnapshot(window.CCG_AUTH);
    window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: window.CCG_AUTH }));
    return window.CCG_AUTH;
  }

  async function waitForAuthFoundation() {
    if (window.ccgCommunityAuth && typeof window.ccgCommunityAuth.init === 'function') {
      try {
        await window.ccgCommunityAuth.init();
      } catch (_error) {
        // Continue to Supabase readiness fallback below.
      }
    }

    if (window.ccgSupabase && typeof window.ccgSupabase.waitForSessionReady === 'function') {
      try {
        await window.ccgSupabase.waitForSessionReady();
      } catch (_error) {
        // resolveAuthState still has safe fallbacks.
      }
    }
  }

  async function resolveAuthState() {
    const requestId = ++state.resolveRequestId;
    let user = null;
    let profile = null;
    let session = null;

    await waitForAuthFoundation();

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
        if (resolvedProfile) profile = resolvedProfile;
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

      clearAuthSnapshot();
      await resolveAuthState();
      renderHeaderAuth();
    });
    button.dataset.ccgAuthBound = 'true';
  }

  function ensureAuthSlot() {
    const actions = document.querySelector('.ccg-header-actions');
    if (!actions) return null;

    let slot = actions.querySelector('.ccg-auth-slot');
    if (!slot) {
      slot = document.createElement('div');
      slot.className = 'ccg-auth-slot';
      const socials = actions.querySelector('.ccg-header-socials');
      actions.insertBefore(slot, socials || actions.firstChild);
    }
    return slot;
  }

  function renderAuthValue(slot, auth, provisional) {
    if (!slot) return;
    slot.toggleAttribute('data-ccg-auth-provisional', Boolean(provisional));

    if (auth && auth.loggedIn) {
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

  function renderHeaderAuth() {
    const slot = ensureAuthSlot();
    if (!slot) return;

    if (!state.authoritativeResolved) {
      const snapshot = readAuthSnapshot();
      if (snapshot) {
        renderAuthValue(slot, snapshot, true);
        return;
      }
      if (slot.children.length) return;
      slot.dataset.ccgAuthPending = 'true';
      return;
    }

    delete slot.dataset.ccgAuthPending;
    renderAuthValue(slot, window.CCG_AUTH || { loggedIn: false, username: '' }, false);
  }

  async function refreshUi() {
    renderHeaderAuth();
    await resolveAuthState();
    renderHeaderAuth();
  }

  function init() {
    if (state.initPromise) return state.initPromise;

    state.initPromise = (async function () {
      if (state.initialized) return window.CCG_AUTH || null;
      state.initialized = true;

      renderHeaderAuth();
      await refreshUi();

      window.addEventListener('ccg:auth-ready', refreshUi);
      window.addEventListener('ccg:auth-changed', refreshUi);
      window.addEventListener(AUTH_EVENT, renderHeaderAuth);
      return window.CCG_AUTH || null;
    })();

    return state.initPromise;
  }

  window.CCGHeaderAuth = Object.freeze({
    init: init,
    refresh: refreshUi,
    render: renderHeaderAuth,
    resolve: resolveAuthState
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { void init(); }, { once: true });
  } else {
    void init();
  }
})();

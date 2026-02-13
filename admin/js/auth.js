/* ============================================================
   CCG ADMIN — AUTH (SUPABASE)
   File: /admin/js/auth.js

   Contract relied on by:
   - /admin/js/login.js  (imports login/restoreSession/sendPasswordReset)
   - /admin/js/games-editor.js (imports getAuthContext/waitForAuthReady)
   - /admin/js/admin-nav.js (imports getAuthContext/logout)
   - /admin/js/guard.js (imports bindSessionInvalidation/refreshSessionIfNeeded)
   - /admin/js/roles.js (imports getSupabaseClient)

   Goals:
   - Use Supabase auth as source of truth
   - Provide stable ES module exports
   - Never “fake” auth state
   - Emit ccg:auth:ready for non-module listeners
   ============================================================ */

import { ADMIN_BUILD_ID } from './build.js';
import { AUTH_CONFIG, SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

const LOG = '[CCG-AUTH]';
const log = (...a) => console.log(LOG, ...a);
const warn = (...a) => console.warn(LOG, ...a);
const err = (...a) => console.error(LOG, ...a);

const BUILD_SUFFIX = ADMIN_BUILD_ID ? `?v=${ADMIN_BUILD_ID}` : '';
const OFFLINE_MESSAGE = 'Auth system offline. Please refresh or contact support.';

export const AUTH_STATE = {
  NO_SESSION: 'no_session',
  AUTHENTICATING: 'authenticating',
  AUTHENTICATED: 'authenticated',
  AUTHENTICATED_LIMITED: 'authenticated_limited',
  UNAUTHORISED: 'unauthorised'
};

export function resolveAuthState(session, profile) {
  if (!session) return AUTH_STATE.NO_SESSION;
  if (!profile) return AUTH_STATE.AUTHENTICATING;

  if (profile.role === 'admin') return AUTH_STATE.AUTHENTICATED;
  if (profile.role === undefined || profile.role === null) {
    return AUTH_STATE.AUTHENTICATED_LIMITED;
  }

  return AUTH_STATE.UNAUTHORISED;
}

console.log('[CCG-AUTH] auth.js loaded');
console.log(
  '[CCG-AUTH] Supabase detected:',
  Boolean(
    window.ccgSupabaseClient ||
      window.CCG_SUPABASE_CLIENT ||
      window.__ccgSupabaseClient ||
      window.supabaseClient
  )
);

if (window.__CCG_AUTH_BOOTSTRAPPED) {
  console.warn('[AUTH] bootstrap already initialised');
} else {
  window.__CCG_AUTH_BOOTSTRAPPED = true;
}

window.CCG_AUTH_READY = false;
window.CCG_AUTH_LOGGED_IN = false;
window.CCG_AUTH_ROLE = 'none';
window.CCG_AUTH_ERROR = null;
window.__ccgSession = window.__ccgSession || null;

let _supabase = null;
let _lastContext = null;
let _authListenerAttached = false;
let _lastAuthEvent = 'BOOT';
let _authBarrierPromise = null;
let _authBarrierReady = false;
let _authBarrierSession = null;
let _authBarrierContext = null;
let _authHydrationPromise = null;
let _authHydrationResolve = null;
let _authHydrationReady = false;
let _bootstrapAuthPromise = null;

function markAuthHydrated(session) {
  if (_authHydrationReady) return;
  _authHydrationReady = true;
  if (_authHydrationResolve) _authHydrationResolve(true);
  _authHydrationResolve = null;
  _authHydrationPromise = Promise.resolve(true);
  if (session !== undefined) {
    _authBarrierSession = session || null;
  }
}

function waitForAuthHydration(timeoutMs) {
  if (_authHydrationReady) return Promise.resolve(true);
  if (!_authHydrationPromise) {
    _authHydrationPromise = new Promise((resolve) => {
      _authHydrationResolve = resolve;
    });
  }
  if (!timeoutMs || timeoutMs <= 0) return _authHydrationPromise;
  return Promise.race([
    _authHydrationPromise,
    new Promise((resolve) => setTimeout(() => resolve(false), timeoutMs))
  ]);
}

function syncGlobalAuthState(context = null, error = null) {
  const resolvedContext = context || _lastContext || _authBarrierContext || null;
  const resolvedSession = resolvedContext?.session || _authBarrierSession || null;

  window.__ccgAuthState = {
    session: resolvedSession,
    context: resolvedContext,
    error: error || resolvedContext?.error || null
  };
}

function dispatchAuthReady(context) {
  try {
    window.dispatchEvent(
      new CustomEvent('ccg:auth:ready', {
        detail: {
          loggedIn: Boolean(context?.isAuthenticated),
          role: context?.role || 'none',
          user: context?.user || null,
          error: context?.error || null,
          event: _lastAuthEvent
        }
      })
    );
  } catch (_) {
    // no-op
  }
  syncGlobalAuthState(context, context?.error || null);
}

function applyWindowAuthState(context) {
  window.CCG_AUTH_READY = true;
  window.CCG_AUTH_LOGGED_IN = Boolean(context?.isAuthenticated);
  window.CCG_AUTH_ROLE = context?.role || 'none';
  window.CCG_AUTH_ERROR = context?.error || null;
}

function readCachedRole() {
  try {
    const raw = localStorage.getItem(AUTH_CONFIG.roleCacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.role) return null;
    return parsed.role;
  } catch {
    return null;
  }
}

function deriveRoleFromUser(user) {
  if (!user) return null;
  return (
    user.app_metadata?.role ||
    user.user_metadata?.role ||
    user.role ||
    null
  );
}

function buildContextFromSession(session, error = null) {
  const user = session?.user || null;
  const isAuthenticated = Boolean(user?.id);
  const cachedRole = readCachedRole();
  const role = isAuthenticated ? cachedRole || deriveRoleFromUser(user) || null : 'none';
  const profile = isAuthenticated ? { role } : null;
  const authState = resolveAuthState(session || null, profile);

  return {
    isAuthenticated,
    role,
    profile,
    authState,
    user,
    session: session || null,
    error
  };
}

function applySupabaseConfigToWindow() {
  if (SUPABASE_URL && !window.CCG_SUPABASE_URL) {
    window.CCG_SUPABASE_URL = SUPABASE_URL;
  }
  if (SUPABASE_ANON_KEY && !window.CCG_SUPABASE_ANON_KEY) {
    window.CCG_SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
  }
  if (AUTH_CONFIG?.storageKey && !window.CCG_SUPABASE_STORAGE_KEY) {
    window.CCG_SUPABASE_STORAGE_KEY = AUTH_CONFIG.storageKey;
  }
}

function renderAuthFatalBanner(message = OFFLINE_MESSAGE) {
  const host = document.querySelector('[data-admin-shell]') || document.body;
  if (!host) return;

  if (document.querySelector('[data-auth-fatal-banner]')) return;

  const banner = document.createElement('div');
  banner.className = 'admin-auth-fatal-banner';
  banner.dataset.authFatalBanner = 'true';
  banner.setAttribute('role', 'alert');
  banner.textContent = message;

  host.prepend(banner);
}

function disableLoginActions() {
  const loginButton = document.querySelector('[data-login-button]');
  const resetButton = document.querySelector('[data-reset-button]');
  if (loginButton) loginButton.disabled = true;
  if (resetButton) resetButton.disabled = true;
}

function setOfflineMessage(message = OFFLINE_MESSAGE) {
  const messageBox = document.querySelector('[data-message]');
  if (!messageBox) return;
  messageBox.textContent = message;
  messageBox.dataset.state = 'error';
}

function handleAuthFatal(error, message = OFFLINE_MESSAGE) {
  err(message, error);
  window.CCG_AUTH_ERROR = error || new Error(message);
  renderAuthFatalBanner(message);
  disableLoginActions();
  setOfflineMessage(message);
}

function bindGlobalAuthErrorTrap() {
  if (window.__CCG_AUTH_ERROR_TRAP_BOUND) return;
  window.__CCG_AUTH_ERROR_TRAP_BOUND = true;

  const handler = (type, error, message) => {
    const text = message || error?.message || String(error || 'unknown');
    err(`Global ${type} error:`, text, error);
    if (/auth|supabase|ccg/i.test(text)) {
      handleAuthFatal(error, OFFLINE_MESSAGE);
    }
  };

  window.addEventListener('error', (event) => {
    handler('error', event?.error, event?.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    handler('unhandledrejection', event?.reason, event?.reason?.message);
  });
}

bindGlobalAuthErrorTrap();

function buildRedirectUrl(path, reason) {
  const url = new URL(path, window.location.origin);
  if (reason) {
    url.searchParams.set('reason', reason);
  }
  return url.toString();
}

export function redirectWithGuard(path, reason) {
  const url = buildRedirectUrl(path, reason);
  window.location.replace(url);
  return true;
}

async function ensureSupabaseClient() {
  if (_supabase) return _supabase;

  applySupabaseConfigToWindow();

  const g = window;
  const candidates = [
    g.ccgSupabaseClient,
    g.CCG_SUPABASE_CLIENT,
    g.__ccgSupabaseClient,
    g.supabaseClient
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate?.auth?.getSession && candidate?.auth?.signInWithPassword) {
      _supabase = candidate;
      return _supabase;
    }
    if (candidate?.client?.auth?.getSession && candidate?.client?.auth?.signInWithPassword) {
      _supabase = candidate.client;
      return _supabase;
    }
  }

  if (g.ccgSupabase?.getClient) {
    try {
      _supabase = await g.ccgSupabase.getClient();
      g.ccgSupabaseClient = _supabase;
      g.CCG_SUPABASE_CLIENT = _supabase;
      return _supabase;
    } catch (error) {
      throw new Error(error?.message || 'Unable to initialise Supabase client.');
    }
  }

  try {
    await import(`/js/ccg-supabase-client.js${BUILD_SUFFIX}`);
  } catch (error) {
    err('Supabase bootstrap import failed.', error);
  }

  if (g.ccgSupabase?.getClient) {
    _supabase = await g.ccgSupabase.getClient();
    g.ccgSupabaseClient = _supabase;
    g.CCG_SUPABASE_CLIENT = _supabase;
    return _supabase;
  }

  throw new Error(
    'Supabase client not available. Ensure /js/ccg-supabase-config.js and /js/ccg-supabase-client.js load before auth modules.'
  );
}

function attachAuthListener(supabase) {
  if (_authListenerAttached) return;
  if (!supabase?.auth?.onAuthStateChange) return;
  _authListenerAttached = true;

  supabase.auth.onAuthStateChange((eventName, session) => {
    _lastAuthEvent = eventName || 'UNKNOWN';
    _lastContext = null;
    _authBarrierSession = session || null;
    if (!_authBarrierReady) {
      _authBarrierContext = buildContextFromSession(session, null);
    }
    markAuthHydrated(session || null);
    const context = buildContextFromSession(session, null);

    applyWindowAuthState(context);
    dispatchAuthReady(context);
  });
}

async function computeAuthContext({ force = false } = {}) {
  if (_lastContext && !force) return _lastContext;

  const supabase = await ensureSupabaseClient();
  attachAuthListener(supabase);

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(error.message || 'Unable to read Supabase session.');
  }

  const session = _authBarrierSession !== null && _authBarrierSession !== undefined
    ? _authBarrierSession
    : (data?.session || null);
  const context = buildContextFromSession(session, null);

  _lastContext = context;
  applyWindowAuthState(context);
  dispatchAuthReady(context);

  return context;
}

export async function waitForAuthReady() {
  if (_authBarrierPromise) return _authBarrierPromise;

  log('barrier start');
  _authBarrierPromise = (async () => {
    try {
      const supabase = await ensureSupabaseClient();
      attachAuthListener(supabase);

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        throw new Error(error.message || 'Unable to read Supabase session.');
      }

      const hydrated = await waitForAuthHydration(AUTH_CONFIG?.hydrationTimeoutMs || 2000);
      if (!hydrated) {
        warn('Auth hydration timed out. Continuing with session snapshot.');
      }

      _authBarrierSession = _authBarrierSession !== null && _authBarrierSession !== undefined
        ? _authBarrierSession
        : (data?.session || null);
      _authBarrierContext = buildContextFromSession(_authBarrierSession, null);
      log('session restored');

      _lastContext = _authBarrierContext;
      applyWindowAuthState(_authBarrierContext);
      dispatchAuthReady(_authBarrierContext);
      _authBarrierReady = true;
      log('barrier ready');
      return true;
    } catch (error) {
      const message = error?.message || String(error);
      if (/Supabase client not available/i.test(message)) {
        err('AUTH INIT FAILED:', error);
        handleAuthFatal(error, OFFLINE_MESSAGE);
        window.CCG_AUTH_READY = false;
        window.CCG_AUTH_ERROR = error;
        dispatchAuthReady({ isAuthenticated: false, role: 'none', user: null, error });
        log('barrier ready');
        throw error;
      }

      warn('Auth ready with no active session.', message);
      _authBarrierSession = null;
      _authBarrierContext = buildContextFromSession(null, error);
      _lastContext = _authBarrierContext;
      applyWindowAuthState(_authBarrierContext);
      dispatchAuthReady(_authBarrierContext);
      _authBarrierReady = true;
      log('barrier ready');
      return true;
    }
  })();

  return _authBarrierPromise;
}


export async function bootstrapAuth() {
  if (_bootstrapAuthPromise) return _bootstrapAuthPromise;

  _bootstrapAuthPromise = (async () => {
    try {
      await waitForAuthReady();
      const context = _lastContext || _authBarrierContext || buildContextFromSession(_authBarrierSession || null, null);
      syncGlobalAuthState(context, null);
      return window.__ccgAuthState;
    } catch (error) {
      const context = buildContextFromSession(null, error);
      syncGlobalAuthState(context, error);
      return window.__ccgAuthState;
    }
  })();

  return _bootstrapAuthPromise;
}

export const authReady = (async () => {
  await bootstrapAuth();
  return window.__ccgAuthState;
})();

export async function getAuthContext() {
  await waitForAuthReady();
  try {
    return await computeAuthContext({ force: true });
  } catch (error) {
    const context = buildContextFromSession(null, error);
    _lastContext = context;
    applyWindowAuthState(context);
    dispatchAuthReady(context);
    return context;
  }
}

export async function restoreSession() {
  const supabase = await ensureSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message || 'Unable to restore session.');
  window.__ccgSession = data?.session || null;
  return window.__ccgSession;
}

export async function refreshSessionIfNeeded() {
  const supabase = await ensureSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message || 'Unable to read session.');
  const session = data?.session || null;
  if (!session) return null;

  const expiresAtMs = (session.expires_at || 0) * 1000;
  const needsRefresh = expiresAtMs - Date.now() < AUTH_CONFIG.refreshMarginMs;
  if (!needsRefresh) return session;

  const refreshResult = await supabase.auth.refreshSession();
  if (refreshResult.error) {
    throw new Error(refreshResult.error.message || 'Unable to refresh session.');
  }

  _lastContext = null;
  return refreshResult.data?.session || null;
}

export function bindSessionInvalidation({ onSignedOut, onSignedIn, onTokenRefreshed } = {}) {
  ensureSupabaseClient()
    .then((supabase) => {
      attachAuthListener(supabase);
      if (!supabase?.auth?.onAuthStateChange) return;
      supabase.auth.onAuthStateChange((eventName, session) => {
        _lastAuthEvent = eventName || 'UNKNOWN';
        if (eventName === 'SIGNED_OUT' && typeof onSignedOut === 'function') {
          onSignedOut(session || null);
        }
        if (eventName === 'SIGNED_IN' && typeof onSignedIn === 'function') {
          onSignedIn(session || null);
        }
        if (eventName === 'TOKEN_REFRESHED' && typeof onTokenRefreshed === 'function') {
          onTokenRefreshed(session || null);
        }
      });
    })
    .catch((error) => {
      err('Unable to bind session invalidation listener.', error);
    });
}

export async function login(email, password) {
  const supabase = await ensureSupabaseClient();

  const cleanEmail = String(email || '').trim();
  const cleanPassword = String(password || '');

  if (!cleanEmail || !cleanPassword) {
    throw new Error('Enter both email and password.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: cleanPassword
  });

  if (error) {
    throw new Error(error.message || 'Login failed.');
  }

  _lastContext = null;
  await computeAuthContext({ force: true });

  return { session: data?.session || null, user: data?.user || null };
}

export async function sendPasswordReset(email) {
  const supabase = await ensureSupabaseClient();

  const cleanEmail = String(email || '').trim();
  if (!cleanEmail) throw new Error('Enter your email address.');

  const redirectTo =
    AUTH_CONFIG?.passwordResetRedirect ||
    AUTH_CONFIG?.defaultRedirectAfterLogin ||
    window.location.origin + '/admin/login.html';

  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo
  });

  if (error) throw new Error(error.message || 'Unable to send reset email.');
  return true;
}

export async function logout() {
  const supabase = await ensureSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message || 'Logout failed.');

  _lastContext = null;
  _authBarrierSession = null;
  window.__ccgSession = null;

  const context = buildContextFromSession(null, null);
  applyWindowAuthState(context);
  dispatchAuthReady(context);

  window.location.replace('/admin/login.html');
  return true;
}

export function requireAuthOrThrow(message = 'You must be signed in to do that.') {
  if (!window.CCG_AUTH_LOGGED_IN) throw new Error(message);
}

export async function getSupabaseClient() {
  return ensureSupabaseClient();
}

function bindLogoutButtons() {
  document.querySelectorAll('[data-logout]').forEach((button) => {
    if (button.dataset.logoutBound === 'true') return;
    button.dataset.logoutBound = 'true';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      logout().catch((error) => {
        err('Logout failed.', error);
      });
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindLogoutButtons, { once: true });
} else {
  bindLogoutButtons();
}

export function getAuthDiagnostics() {
  return {
    ready: window.CCG_AUTH_READY,
    loggedIn: window.CCG_AUTH_LOGGED_IN,
    role: window.CCG_AUTH_ROLE,
    error: window.CCG_AUTH_ERROR,
    lastEvent: _lastAuthEvent
  };
}

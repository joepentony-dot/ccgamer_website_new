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

import { AUTH_CONFIG, SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

const LOG = '[CCG-AUTH]';
const log = (...a) => console.log(LOG, ...a);
const warn = (...a) => console.warn(LOG, ...a);
const err = (...a) => console.error(LOG, ...a);

if (window.__CCG_AUTH_BOOTSTRAPPED) {
  console.warn('[AUTH] bootstrap already initialised');
} else {
  window.__CCG_AUTH_BOOTSTRAPPED = true;
}

window.CCG_AUTH_READY = false;
window.CCG_AUTH_LOGGED_IN = false;
window.CCG_AUTH_ROLE = 'none';
window.CCG_AUTH_ERROR = null;

let _supabase = null;
let _lastContext = null;
let _authListenerAttached = false;
let _lastAuthEvent = 'BOOT';
let _authBarrierPromise = null;
let _authBarrierReady = false;
let _authBarrierSession = null;
let _authBarrierContext = null;

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
  const role = isAuthenticated
    ? cachedRole || deriveRoleFromUser(user) || 'member'
    : 'none';

  return {
    isAuthenticated,
    role,
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
    await import('/js/ccg-supabase-client.js');
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

  const context = buildContextFromSession(data?.session || null, null);

  _lastContext = context;
  applyWindowAuthState(context);
  dispatchAuthReady(context);

  return context;
}

export async function waitForAuthReady() {
  if (_authBarrierPromise) return _authBarrierPromise;

  console.log('[AUTH] barrier start');
  _authBarrierPromise = (async () => {
    try {
      const supabase = await ensureSupabaseClient();
      attachAuthListener(supabase);

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        throw new Error(error.message || 'Unable to read Supabase session.');
      }

      _authBarrierSession = data?.session || null;
      _authBarrierContext = buildContextFromSession(_authBarrierSession, null);
      console.log('[AUTH] session restored');

      _lastContext = _authBarrierContext;
      applyWindowAuthState(_authBarrierContext);
      dispatchAuthReady(_authBarrierContext);
      _authBarrierReady = true;
      console.log('[AUTH] barrier ready');
      return true;
    } catch (error) {
      const message = error?.message || String(error);
      if (/Supabase client not available/i.test(message)) {
        err('AUTH INIT FAILED:', error);
        window.CCG_AUTH_READY = false;
        window.CCG_AUTH_ERROR = error;
        dispatchAuthReady({ isAuthenticated: false, role: 'none', user: null, error });
        console.log('[AUTH] barrier ready');
        throw error;
      }

      warn('Auth ready with no active session.', message);
      _authBarrierSession = null;
      _authBarrierContext = buildContextFromSession(null, error);
      _lastContext = _authBarrierContext;
      applyWindowAuthState(_authBarrierContext);
      dispatchAuthReady(_authBarrierContext);
      _authBarrierReady = true;
      console.log('[AUTH] barrier ready');
      return true;
    }
  })();

  return _authBarrierPromise;
}

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
  await waitForAuthReady();
  if (_authBarrierReady) return _authBarrierSession;

  const supabase = await ensureSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message || 'Unable to restore session.');
  return data?.session || null;
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

  const context = buildContextFromSession(null, null);
  applyWindowAuthState(context);
  dispatchAuthReady(context);

  return true;
}

export function requireAuthOrThrow(message = 'You must be signed in to do that.') {
  if (!window.CCG_AUTH_LOGGED_IN) throw new Error(message);
}

export async function getSupabaseClient() {
  return ensureSupabaseClient();
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

log('Auth module loaded.');

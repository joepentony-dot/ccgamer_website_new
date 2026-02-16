/* ============================================================
   CCG ADMIN — AUTH (SUPABASE)
   File: /admin/js/auth.js

   Contract relied on by:
   - /admin/js/login.js  (imports login/restoreSession/sendPasswordReset)
   - /admin/js/guard.js  (calls getAuthContext / waitForAuthReady)
   - /admin/games-editor.html + other admin pages

   Omega rule:
   - OWNER_EMAILS (config.js) must ALWAYS have elevated access even if
     Supabase role metadata / tables are missing.
============================================================ */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { AUTH_CONFIG, OWNER_EMAILS, SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

const LOG = AUTH_CONFIG?.LOG_AUTH !== false;
const TAG = '[CCG-AUTH]';

function log(...args) { if (LOG) console.log(TAG, ...args); }
function warn(...args) { console.warn(TAG, ...args); }
function err(...args) { console.error(TAG, ...args); }

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isOwnerEmail(email) {
  const needle = normalizeEmail(email);
  const owners = Array.isArray(OWNER_EMAILS) ? OWNER_EMAILS : [];
  return owners.some((entry) => normalizeEmail(entry) === needle);
}

const AUTH_STATE = {
  NO_SESSION: 'no_session',
  AUTHENTICATING: 'authenticating',
  AUTHENTICATED: 'authenticated',
  AUTHENTICATED_LIMITED: 'authenticated_limited',
  UNAUTHORISED: 'unauthorised',
};

let _client = null;
let _context = null;
let _ready = false;
let _readyPromise = null;

function now() { return Date.now(); }

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readAuthConfig() {
  const cfg = AUTH_CONFIG || {};
  return {
    authReadyTimeoutMs: Number(cfg.AUTH_READY_TIMEOUT_MS || 5000),
    softReadyPollMs: Number(cfg.AUTH_READY_POLL_MS || 50),
  };
}

async function ensureSupabaseClient() {
  if (_client) return _client;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase client config missing (SUPABASE_URL / SUPABASE_ANON_KEY).');
  }

  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  log('client ready');
  return _client;
}

function deriveRoleFromUser(user) {
  if (!user) return null;

  // Hard owner allowlist: the site owner should always have full admin access,
  // even if Supabase metadata/role rows are missing.
  if (isOwnerEmail(user.email)) return 'admin';

  return (
    user.app_metadata?.role ||
    user.user_metadata?.role ||
    user.role ||
    null
  );
}

function buildProfileFromSession(session) {
  const user = session?.user || null;
  if (!user) return null;

  const role = deriveRoleFromUser(user);

  return {
    id: user.id || null,
    email: user.email || null,
    role,
  };
}

function resolveAuthState(session, profile) {
  const user = session?.user || null;
  const isAuthenticated = Boolean(user?.id);

  if (!isAuthenticated) return AUTH_STATE.NO_SESSION;

  // Owner allowlist always counts as fully authenticated.
  if (isOwnerEmail(user?.email)) return AUTH_STATE.AUTHENTICATED;

  const role = profile?.role || null;
  const elevatedRoles = new Set(['admin', 'editor', 'superadmin']);

  if (elevatedRoles.has(role)) return AUTH_STATE.AUTHENTICATED;

  // Logged in, but role does not grant write access.
  if (role) return AUTH_STATE.AUTHENTICATED_LIMITED;

  return AUTH_STATE.AUTHENTICATING;
}

function buildContextFromSession(session, source = 'unknown') {
  const profile = buildProfileFromSession(session);

  const state = resolveAuthState(session, profile);
  const role = profile?.role || null;

  const elevatedRoles = new Set(['admin', 'editor', 'superadmin']);
  const canWrite = elevatedRoles.has(role) || isOwnerEmail(session?.user?.email);

  return {
    state,
    role,
    profile,
    session,
    user: session?.user || null,
    canWrite,
    source,
    updatedAt: now(),
  };
}

async function computeAuthContext(source = 'compute') {
  const client = await ensureSupabaseClient();
  const { data, error } = await client.auth.getSession();

  if (error) {
    warn('getSession error', error);
    return {
      state: AUTH_STATE.NO_SESSION,
      role: null,
      profile: null,
      session: null,
      user: null,
      canWrite: false,
      source,
      updatedAt: now(),
      error: String(error?.message || error),
    };
  }

  const session = data?.session || null;
  return buildContextFromSession(session, source);
}

async function setContext(ctx) {
  _context = ctx;
  _ready = true;
  return ctx;
}

async function initAuthOnce() {
  if (_readyPromise) return _readyPromise;

  _readyPromise = (async () => {
    try {
      await ensureSupabaseClient();
      const ctx = await computeAuthContext('init');
      await setContext(ctx);
      log('init complete', { state: ctx.state, role: ctx.role, canWrite: ctx.canWrite });

      // Keep context in sync
      _client.auth.onAuthStateChange(async (event, session) => {
        log('auth state change', event);
        const updated = buildContextFromSession(session, `onAuthStateChange:${event}`);
        await setContext(updated);
      });

      return ctx;
    } catch (e) {
      err('init failure', e);
      const fallback = {
        state: AUTH_STATE.NO_SESSION,
        role: null,
        profile: null,
        session: null,
        user: null,
        canWrite: false,
        source: 'init_error',
        updatedAt: now(),
        error: String(e?.message || e),
      };
      await setContext(fallback);
      return fallback;
    }
  })();

  return _readyPromise;
}

export async function waitForAuthReady(timeoutMs) {
  const cfg = readAuthConfig();
  const timeout = Number(timeoutMs ?? cfg.authReadyTimeoutMs);
  const start = now();

  await initAuthOnce();

  while (!_ready && (now() - start) < timeout) {
    await sleep(cfg.softReadyPollMs);
  }

  return _ready;
}

export async function getAuthContext() {
  if (!_ready) await initAuthOnce();
  return _context;
}

export async function restoreSession() {
  if (!_ready) await initAuthOnce();

  // Force recompute (useful after redirects)
  const ctx = await computeAuthContext('restoreSession');
  await setContext(ctx);
  return ctx;
}

export async function login(email, password) {
  const client = await ensureSupabaseClient();

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  const ctx = buildContextFromSession(data?.session || null, 'login');
  await setContext(ctx);

  log('login ok', { state: ctx.state, role: ctx.role, canWrite: ctx.canWrite });
  return ctx;
}

export async function logout() {
  const client = await ensureSupabaseClient();
  await client.auth.signOut();

  const ctx = {
    state: AUTH_STATE.NO_SESSION,
    role: null,
    profile: null,
    session: null,
    user: null,
    canWrite: false,
    source: 'logout',
    updatedAt: now(),
  };

  await setContext(ctx);
  return ctx;
}

export async function sendPasswordReset(email) {
  const client = await ensureSupabaseClient();

  // Optional redirect target can be handled by login page itself
  const { error } = await client.auth.resetPasswordForEmail(email);
  if (error) throw error;

  return true;
}

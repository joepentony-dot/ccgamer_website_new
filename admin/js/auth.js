import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { AUTH_CONFIG, OWNER_EMAILS, SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

const TAG = '[CCG-AUTH]';
const ELEVATED_ROLES = new Set(['superadmin', 'admin', 'editor']);

export const AUTH_STATE = Object.freeze({
  NO_SESSION: 'no_session',
  AUTHENTICATING: 'authenticating',
  AUTHENTICATED: 'authenticated',
  AUTHENTICATED_LIMITED: 'authenticated_limited',
  UNAUTHORISED: 'unauthorised'
});

let client = null;
let context = null;
let ready = false;
let authSubscription = null;
const listeners = new Set();
const invalidationListeners = new Set();

function log(...args) {
  console.info(TAG, ...args);
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isOwnerEmail(email) {
  const normalized = normalizeEmail(email);
  return (OWNER_EMAILS || []).some((entry) => normalizeEmail(entry) === normalized);
}

function deriveRole(user) {
  if (!user) return null;
  if (isOwnerEmail(user.email)) return 'admin';
  return user.app_metadata?.role || user.user_metadata?.role || user.role || null;
}

export function resolveAuthState(session, profile) {
  const user = session?.user || null;
  if (!user?.id) return AUTH_STATE.NO_SESSION;

  const role = String(profile?.role || '').toLowerCase();
  if (isOwnerEmail(user.email) || ELEVATED_ROLES.has(role)) return AUTH_STATE.AUTHENTICATED;
  if (role) return AUTH_STATE.AUTHENTICATED_LIMITED;
  return AUTH_STATE.AUTHENTICATING;
}

function buildContext(session, source = 'unknown') {
  const user = session?.user || null;
  const role = deriveRole(user);
  const state = resolveAuthState(session, { role });
  const canWrite = Boolean(user?.id) && (isOwnerEmail(user?.email) || ELEVATED_ROLES.has(String(role || '').toLowerCase()));

  return {
    source,
    updatedAt: Date.now(),
    session: session || null,
    user,
    profile: user
      ? { id: user.id || null, email: user.email || null, role: role || null }
      : null,
    role: role || null,
    state,
    canWrite,
    isAuthenticated: Boolean(user?.id)
  };
}

async function ensureClient() {
  if (client) return client;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase config missing (SUPABASE_URL/SUPABASE_ANON_KEY).');
  }

  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  window.CCG_SUPABASE_CLIENT = client;
  return client;
}

function publish(nextContext) {
  context = nextContext;
  ready = true;
  listeners.forEach((cb) => {
    try { cb(context); } catch (error) { console.warn(TAG, 'listener failed', error); }
  });
}

async function refreshContext(source = 'refresh') {
  const supabase = await ensureClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const nextContext = buildContext(data?.session || null, source);
  publish(nextContext);
  return nextContext;
}

export const authReady = (async () => {
  const supabase = await ensureClient();
  const initial = await refreshContext('init');

  if (!authSubscription) {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const next = buildContext(session || null, `onAuthStateChange:${event}`);
      publish(next);
      if (event === 'SIGNED_OUT' || !next.session?.user) {
        invalidationListeners.forEach((cb) => {
          try { cb(); } catch (error) { console.warn(TAG, 'invalidation callback failed', error); }
        });
      }
    });
    authSubscription = data?.subscription || null;
  }

  log('ready', { state: initial.state, role: initial.role, canWrite: initial.canWrite });
  return initial;
})();

export async function initAuth() {
  return authReady;
}

export async function waitForAuthReady(timeoutMs = 8000) {
  const timeout = Number(timeoutMs) || 8000;
  await Promise.race([
    authReady,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Auth ready timeout.')), timeout))
  ]);
  return true;
}

export async function getAuthContext() {
  if (!ready) await authReady;
  return context;
}

export async function getSession() {
  const ctx = await getAuthContext();
  return ctx?.session || null;
}

export async function getRole() {
  const ctx = await getAuthContext();
  return String(ctx?.role || '').toLowerCase() || 'guest';
}

export async function requireRole(minRole = 'authenticated') {
  const ctx = await getAuthContext();
  const role = String(ctx?.role || '').toLowerCase();
  if (!ctx?.isAuthenticated) return false;
  if (minRole === 'authenticated') return true;
  return role === String(minRole).toLowerCase() || (minRole === 'admin' && role === 'superadmin');
}

export function onAuthStateChange(cb) {
  if (typeof cb !== 'function') return () => {};
  listeners.add(cb);
  if (ready && context) cb(context);
  return () => listeners.delete(cb);
}

export function bindSessionInvalidation({ onSignedOut } = {}) {
  if (typeof onSignedOut !== 'function') return () => {};
  invalidationListeners.add(onSignedOut);
  return () => invalidationListeners.delete(onSignedOut);
}

export async function refreshSessionIfNeeded() {
  const supabase = await ensureClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const session = data?.session || null;
  if (!session) {
    publish(buildContext(null, 'refresh:none'));
    return null;
  }

  const expiresAt = Number(session.expires_at || 0) * 1000;
  const margin = Number(AUTH_CONFIG?.refreshMarginMs || 60_000);
  if (expiresAt && Date.now() >= expiresAt - margin) {
    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.error) throw refreshed.error;
    const next = buildContext(refreshed.data?.session || null, 'refresh:rotated');
    publish(next);
    return next.session;
  }

  publish(buildContext(session, 'refresh:ok'));
  return session;
}

export async function getSupabaseClient() {
  return ensureClient();
}

export async function restoreSession() {
  return refreshContext('restoreSession');
}

export async function login(email, password) {
  const supabase = await ensureClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const next = buildContext(data?.session || null, 'login');
  publish(next);
  return next;
}

export async function logout() {
  const supabase = await ensureClient();
  await supabase.auth.signOut();
  const next = buildContext(null, 'logout');
  publish(next);
  return next;
}

export async function sendPasswordReset(email) {
  const supabase = await ensureClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: AUTH_CONFIG?.passwordResetRedirect
  });
  if (error) throw error;
  return true;
}

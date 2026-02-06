import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { AUTH_CONFIG, OWNER_EMAIL, SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

let authListenerBound = false;
let supabaseClient = null;

const ADMIN_ROLES = new Set(['editor', 'admin', 'superadmin']);

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

function isOwnerEmail(email) {
  return Boolean(email) && String(email).trim().toLowerCase() === String(OWNER_EMAIL || '').trim().toLowerCase();
}

function readRoleCache() {
  try {
    const raw = localStorage.getItem(AUTH_CONFIG.roleCacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.userId || !parsed.role || !parsed.cachedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeRoleCache(userId, role) {
  try {
    localStorage.setItem(AUTH_CONFIG.roleCacheKey, JSON.stringify({ userId, role, cachedAt: Date.now() }));
  } catch {
    // intentionally ignored
  }
}

function clearRoleCache() {
  try {
    localStorage.removeItem(AUTH_CONFIG.roleCacheKey);
  } catch {
    // intentionally ignored
  }
}

function getFallbackClient() {
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storageKey: AUTH_CONFIG.storageKey
      }
    });
  }
  return supabaseClient;
}

async function fetchRoleFromSupabase(userId) {
  const client = await getSupabaseClient();
  const { data, error } = await client
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return normalizeRole(data?.role);
}

async function resolveSession({ allowRefresh = true } = {}) {
  const client = await getSupabaseClient();
  const {
    data: { session },
    error
  } = await client.auth.getSession();
  if (error) throw error;

  if (!session || !allowRefresh) {
    return session || null;
  }

  const expiry = Number(session.expires_at || 0) * 1000;
  const margin = Number(AUTH_CONFIG.refreshMarginMs || 60_000);
  if (!expiry || expiry - Date.now() > margin) {
    return session;
  }

  const { data, error: refreshError } = await client.auth.refreshSession();
  if (refreshError) {
    return session;
  }

  return data?.session || session;
}

/* ===================================================
   OMEGA AUTH LOCK — DO NOT REMOVE
   Prevents admin lockout via role desync
   =================================================== */
export async function getAuthContext({ forceRoleRefresh = false } = {}) {
  const session = await resolveSession({ allowRefresh: true });
  const user = session?.user || null;
  const isAuthenticated = Boolean(user);

  if (!isAuthenticated) {
    clearRoleCache();
    console.info('[CCG-AUTH] role=none session=missing cache=cleared');
    return {
      user: null,
      session: null,
      isAuthenticated: false,
      role: null,
      permissions: { canRate: false, canComment: false, canModerate: false }
    };
  }

  const userId = user.id;
  const email = String(user.email || '').trim().toLowerCase();
  const metadataRole = normalizeRole(user.app_metadata?.role || user.user_metadata?.role);
  const cached = readRoleCache();
  const cacheValid = Boolean(cached && cached.userId === userId && normalizeRole(cached.role));

  let role = null;
  let cacheState = 'none';

  if (isOwnerEmail(email)) {
    role = 'superadmin';
    writeRoleCache(userId, role);
    cacheState = 'owner-forced';
  } else {
    if (cacheValid && !forceRoleRefresh) {
      role = normalizeRole(cached.role);
      cacheState = 'hit';
    }

    const metadataIsAdmin = ADMIN_ROLES.has(metadataRole);
    const shouldRefetch =
      forceRoleRefresh
      || !role
      || !ADMIN_ROLES.has(role)
      || (metadataRole && role && metadataRole !== role)
      || (!metadataRole && !role)
      || (cacheValid && metadataIsAdmin && normalizeRole(cached.role) !== metadataRole);

    if (shouldRefetch) {
      if (cached && (!cacheValid || cached.userId !== userId)) {
        clearRoleCache();
      }

      const fetched = await fetchRoleFromSupabase(userId).catch(() => null);
      if (ADMIN_ROLES.has(fetched)) {
        role = fetched;
        writeRoleCache(userId, role);
        cacheState = 'rebuilt';
      } else if (metadataIsAdmin) {
        role = metadataRole;
        writeRoleCache(userId, role);
        cacheState = 'metadata';
      }
    }
  }

  if (!ADMIN_ROLES.has(role)) {
    clearRoleCache();
    cacheState = 'invalid-cleared';
    role = null;
  }

  console.info(`[CCG-AUTH] role=${role || 'none'} session=ok cache=${cacheState}`);

  return {
    user,
    session,
    isAuthenticated: true,
    role,
    permissions: {
      canRate: true,
      canComment: true,
      canModerate: role === 'admin' || role === 'superadmin'
    }
  };
}

export async function getSupabaseClient() {
  if (window.ccgSupabase?.getClient) {
    return window.ccgSupabase.getClient();
  }
  return getFallbackClient();
}

export async function waitForAuthReady() {
  if (window.ccgSupabase?.waitForAuth) {
    await window.ccgSupabase.waitForAuth();
    return;
  }

  await new Promise((resolve) => {
    window.addEventListener('ccg:auth-ready', () => resolve(), { once: true });
    window.setTimeout(resolve, 1000);
  });
}

export async function login(email, password) {
  const client = await getSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: String(email || '').trim(),
    password: String(password || '')
  });

  if (error) throw error;
  return data;
}

export async function logout() {
  const client = await getSupabaseClient();
  const { error } = await client.auth.signOut({ scope: 'global' });
  if (error) throw error;
}

export async function sendPasswordReset(email) {
  const client = await getSupabaseClient();
  const redirectTo = `${window.location.origin}/admin/login.html?reset=1`;
  const { data, error } = await client.auth.resetPasswordForEmail(String(email || '').trim(), {
    redirectTo
  });

  if (error) throw error;
  return data;
}

export async function restoreSession() {
  const session = await resolveSession({ allowRefresh: false });
  return session || null;
}

export async function refreshSessionIfNeeded() {
  const session = await resolveSession({ allowRefresh: true });
  return session || null;
}

export function onAuthStateChange(handler) {
  if (window.ccgSupabase?.getClient) {
    return window.ccgSupabase.getClient().then((client) => client.auth.onAuthStateChange(handler));
  }
  return getFallbackClient().auth.onAuthStateChange(handler);
}

export function bindSessionInvalidation({ onSignedOut } = {}) {
  if (authListenerBound) return;
  authListenerBound = true;

  window.addEventListener('ccg:auth-ready', () => {
    void onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && typeof onSignedOut === 'function') {
        onSignedOut();
      }
    });
  }, { once: true });
}

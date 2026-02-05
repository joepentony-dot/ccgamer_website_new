import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { AUTH_CONFIG, SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

let authListenerBound = false;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: AUTH_CONFIG.storageKey
  }
});

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email || '').trim(),
    password: String(password || '')
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function logout() {
  const { error } = await supabase.auth.signOut({ scope: 'global' });
  if (error) {
    throw error;
  }
}

export async function sendPasswordReset(email) {
  const redirectTo = `${window.location.origin}/admin/login.html?reset=1`;
  const { data, error } = await supabase.auth.resetPasswordForEmail(String(email || '').trim(), {
    redirectTo
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function restoreSession() {
  const {
    data: { session },
    error
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return session;
}

export async function refreshSessionIfNeeded() {
  const session = await restoreSession();
  if (!session) {
    return null;
  }

  const expiresAtMs = (session.expires_at || 0) * 1000;
  const now = Date.now();

  if (!expiresAtMs || expiresAtMs - now <= AUTH_CONFIG.refreshMarginMs) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      throw error;
    }
    return data.session || null;
  }

  return session;
}

export function onAuthStateChange(handler) {
  return supabase.auth.onAuthStateChange(handler);
}

export function bindSessionInvalidation({ onSignedOut } = {}) {
  if (authListenerBound) {
    return;
  }

  authListenerBound = true;

  onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT' && typeof onSignedOut === 'function') {
      onSignedOut();
    }
  });
}

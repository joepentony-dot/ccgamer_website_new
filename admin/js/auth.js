import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { AUTH_CONFIG, SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

let authListenerBound = false;
let supabaseClient = null;

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

async function getAuthContext() {
  if (window.ccgSupabase?.getCurrentUserContext) {
    return window.ccgSupabase.getCurrentUserContext();
  }

  const client = getFallbackClient();
  const {
    data: { session },
    error
  } = await client.auth.getSession();

  if (error) throw error;

  return {
    user: session?.user || null,
    session: session || null,
    isAuthenticated: Boolean(session?.user),
    role: session?.user?.app_metadata?.role || 'member',
    permissions: { canRate: false, canComment: false, canModerate: false }
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
  const context = await getAuthContext();
  return context.session || null;
}

export async function refreshSessionIfNeeded() {
  const context = await getAuthContext();
  return context.session || null;
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

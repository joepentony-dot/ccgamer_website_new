/* ============================================================
   CCG ADMIN — AUTH (SUPABASE)
   File: /admin/js/auth.js

   Contract relied on by:
   - /admin/js/login.js  (imports login/restoreSession/sendPasswordReset)
   - /admin/js/games-editor.js (imports getAuthContext/waitForAuthReady)
   - /admin/js/admin-nav.js (imports getAuthContext/logout)
   - /admin tools (guard/roles modules)

   Goals:
   - Use Supabase auth as source of truth
   - Provide stable ES module exports
   - Never “fake” auth state
   - Emit ccg:auth:ready for non-module listeners
   ============================================================ */

import { AUTH_CONFIG } from "./config.js";

const LOG = "[CCG-AUTH]";
const log = (...a) => console.log(LOG, ...a);
const warn = (...a) => console.warn(LOG, ...a);
const err = (...a) => console.error(LOG, ...a);

// Public-ish state for legacy scripts (optional)
window.CCG_AUTH_READY = false;
window.CCG_AUTH_LOGGED_IN = false;
window.CCG_AUTH_ROLE = "none";

let _authInitPromise = null;
let _supabase = null;
let _lastContext = null;

function dispatchAuthReady(context) {
  try {
    window.dispatchEvent(
      new CustomEvent("ccg:auth:ready", {
        detail: {
          loggedIn: Boolean(context?.isAuthenticated),
          role: context?.role || "none",
          user: context?.user || null
        }
      })
    );
  } catch (_) {
    // no-op
  }
}

function readCachedRole() {
  // roles.js appears to cache role for UI usage (based on your imports)
  // We keep this flexible and non-breaking.
  return (
    localStorage.getItem("ccg_admin_role") ||
    sessionStorage.getItem("ccg_admin_role") ||
    localStorage.getItem("omega_admin_role") ||
    sessionStorage.getItem("omega_admin_role") ||
    "none"
  );
}

async function ensureSupabaseClient() {
  if (_supabase) return _supabase;

  // Preferred: your site bootstrap creates a client globally.
  // We support several likely shapes without assuming one exact name.
  const g = window;

  const candidates = [
    g.ccgSupabaseClient,
    g.CCG_SUPABASE_CLIENT,
    g.supabaseClient,
    g.supabase
  ].filter(Boolean);

  for (const c of candidates) {
    // If it already looks like a Supabase client (auth.* exists), accept it.
    if (c?.auth?.getSession && c?.auth?.signInWithPassword) {
      _supabase = c;
      return _supabase;
    }
    // If it's a wrapper like { client: ... }
    if (c?.client?.auth?.getSession && c?.client?.auth?.signInWithPassword) {
      _supabase = c.client;
      return _supabase;
    }
  }

  // Attempt a dynamic import if your repo exposes a module builder.
  // (If /js/ccg-supabase-client.js is not an ES module, this will fail, but we will fail loudly.)
  try {
    await import("/js/ccg-supabase-client.js");
  } catch (e) {
    // ignore; we’ll still try to find a global after this
  }

  const after = [
    g.ccgSupabaseClient,
    g.CCG_SUPABASE_CLIENT,
    g.supabaseClient,
    g.supabase
  ].filter(Boolean);

  for (const c of after) {
    if (c?.auth?.getSession && c?.auth?.signInWithPassword) {
      _supabase = c;
      return _supabase;
    }
    if (c?.client?.auth?.getSession && c?.client?.auth?.signInWithPassword) {
      _supabase = c.client;
      return _supabase;
    }
  }

  throw new Error(
    "Supabase client not available. Ensure the Supabase bootstrap is loaded (e.g. /js/ccg-supabase-config.js + /js/ccg-supabase-client.js) or provides a global client."
  );
}

async function computeAuthContext({ force = false } = {}) {
  if (_lastContext && !force) return _lastContext;

  const supabase = await ensureSupabaseClient();

  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message || "Unable to read Supabase session.");

  const session = data?.session || null;
  const user = session?.user || null;

  const isAuthenticated = Boolean(user?.id);
  const role = isAuthenticated ? readCachedRole() : "none";

  const context = {
    isAuthenticated,
    role,
    user,
    session
  };

  _lastContext = context;

  // Mirror for any non-module legacy code
  window.CCG_AUTH_READY = true;
  window.CCG_AUTH_LOGGED_IN = isAuthenticated;
  window.CCG_AUTH_ROLE = role;

  dispatchAuthReady(context);

  return context;
}

export async function waitForAuthReady() {
  if (_authInitPromise) return _authInitPromise;

  _authInitPromise = (async () => {
    try {
      await computeAuthContext({ force: true });
      return true;
    } catch (e) {
      // Auth can be “not logged in” without being a hard error.
      // But missing Supabase is a hard error.
      const msg = e?.message || String(e);
      if (/Supabase client not available/i.test(msg)) {
        err("AUTH INIT FAILED:", e);
        // Mark ready=false because system cannot function
        window.CCG_AUTH_READY = false;
        dispatchAuthReady({ isAuthenticated: false, role: "none", user: null });
        throw e;
      }

      // Logged-out state: still “ready”
      warn("Auth ready: no active session.", msg);
      window.CCG_AUTH_READY = true;
      window.CCG_AUTH_LOGGED_IN = false;
      window.CCG_AUTH_ROLE = "none";
      dispatchAuthReady({ isAuthenticated: false, role: "none", user: null });
      return true;
    }
  })();

  return _authInitPromise;
}

export async function getAuthContext() {
  await waitForAuthReady();
  return computeAuthContext({ force: true });
}

export async function restoreSession() {
  // Used by login.js to redirect if already signed in
  const supabase = await ensureSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message || "Unable to restore session.");
  return data?.session || null;
}

export async function login(email, password) {
  const supabase = await ensureSupabaseClient();

  const cleanEmail = String(email || "").trim();
  const cleanPassword = String(password || "");

  if (!cleanEmail || !cleanPassword) {
    throw new Error("Enter both email and password.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: cleanPassword
  });

  if (error) {
    throw new Error(error.message || "Login failed.");
  }

  // Refresh cached context immediately
  _lastContext = null;
  await computeAuthContext({ force: true });

  return { session: data?.session || null, user: data?.user || null };
}

export async function sendPasswordReset(email) {
  const supabase = await ensureSupabaseClient();

  const cleanEmail = String(email || "").trim();
  if (!cleanEmail) throw new Error("Enter your email address.");

  const redirectTo =
    AUTH_CONFIG?.passwordResetRedirect ||
    AUTH_CONFIG?.defaultRedirectAfterLogin ||
    window.location.origin + "/admin/login.html";

  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo
  });

  if (error) throw new Error(error.message || "Unable to send reset email.");
  return true;
}

export async function logout() {
  const supabase = await ensureSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message || "Logout failed.");

  _lastContext = null;

  window.CCG_AUTH_READY = true;
  window.CCG_AUTH_LOGGED_IN = false;
  window.CCG_AUTH_ROLE = "none";
  dispatchAuthReady({ isAuthenticated: false, role: "none", user: null });

  return true;
}

// Optional helper used in some admin flows
export function requireAuthOrThrow(message = "You must be signed in to do that.") {
  if (!window.CCG_AUTH_LOGGED_IN) throw new Error(message);
}
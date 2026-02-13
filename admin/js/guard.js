import { ADMIN_BUILD_ID } from './build.js';
import { AUTH_CONFIG, OWNER_EMAILS } from './config.js';
import {
  AUTH_STATE,
  bindSessionInvalidation,
  getAuthContext,
  refreshSessionIfNeeded,
  resolveAuthState,
  waitForAuthReady,
  authReady
} from './auth.js';
import { clearRoleCache, fetchUserRole } from './roles.js';

console.info('[CCG-AUTH] guard.js loaded', ADMIN_BUILD_ID);

if (window.location.pathname.endsWith('/login.html')) {
  console.info('[CCG-AUTH] guard bypass on login page');
}

const IS_LOGIN_PAGE = window.location.pathname.endsWith('/login.html');

async function waitForClient({ timeout = 8000, interval = 120 } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try {
      if (window.ccgSupabase && typeof window.ccgSupabase.getClient === 'function') {
        const client = await window.ccgSupabase.getClient();
        if (client && client.auth) return client;
      }
      const fallback = window.__ccgSupabaseClient || window.supabase;
      if (fallback && fallback.auth) return fallback;
    } catch (_error) {
      // keep polling until timeout
    }
    await new Promise((resolve) => window.setTimeout(resolve, interval));
  }
  return null;
}

function redirect(path) {
  const url = new URL(path, window.location.origin);
  window.location.replace(url.toString());
}

function renderAuthStatus(state) {
  const statusNode = document.querySelector('[data-admin-status]');
  if (!statusNode) return;

  if (state === AUTH_STATE.AUTHENTICATED || state === AUTH_STATE.AUTHENTICATED_LIMITED) return;

  if (state === AUTH_STATE.AUTHENTICATING) {
    statusNode.textContent = 'Restoring session…';
    statusNode.dataset.state = 'info';
    return;
  }

  if (state === AUTH_STATE.UNAUTHORISED) {
    statusNode.textContent = 'Your account is not authorised for admin access.';
    statusNode.dataset.state = 'error';
    return;
  }

  if (state === AUTH_STATE.NO_SESSION) {
    statusNode.textContent = 'Please sign in to continue.';
    statusNode.dataset.state = 'info';
  }
}

(async () => {
  if (IS_LOGIN_PAGE) return;

  const client = await waitForClient({ timeout: 8000 });
  if (!client || !client.auth || typeof client.auth.getSession !== 'function') {
    console.warn('[CCG-AUTH] Supabase client not ready; guard bootstrap skipped');
    return;
  }

  const result = await client.auth.getSession();
  const session = result?.data?.session || null;

  if (!session?.user) {
    location.replace('/admin/login.html');
  }
})();

export async function ensureAuthenticated({ redirectTo = AUTH_CONFIG.loginPage } = {}) {
  if (IS_LOGIN_PAGE) return null;

  await waitForAuthReady();
  await authReady;

  const client = await waitForClient({ timeout: 8000 });
  const result = client?.auth?.getSession ? await client.auth.getSession() : null;
  const liveSession = result?.data?.session || window.__ccgSession || null;

  const context = await getAuthContext();
  const authState = resolveAuthState(context?.session || liveSession || null, context?.profile || null);
  renderAuthStatus(authState);

  if (!liveSession?.user) {
    redirect(redirectTo);
    return null;
  }

  return liveSession;
}

export async function ensureRole(allowedRoles = []) {
  if (IS_LOGIN_PAGE) return null;

  const session = await ensureAuthenticated();
  if (!session) return null;

  const context = await getAuthContext();
  const authState = resolveAuthState(context?.session || session || null, context?.profile || null);

  if (authState === AUTH_STATE.AUTHENTICATED_LIMITED) {
    return { session: context.session || session, role: null, authState };
  }

  const email = String(context?.user?.email || '').toLowerCase();
  const isOwner = Array.isArray(OWNER_EMAILS)
    && OWNER_EMAILS.map((entry) => String(entry).toLowerCase()).includes(email);

  if (isOwner) {
    return { session: context.session || session, role: 'superadmin' };
  }

  let role = String(context?.role || '').toLowerCase();

  if (context?.user?.id && (!role || role === 'none' || role === 'member' || role === 'unknown')) {
    try {
      const fetchedRole = await fetchUserRole({ userId: context.user.id, force: true });
      role = String(fetchedRole || role).toLowerCase();
    } catch (error) {
      console.warn('[CCG-AUTH] Unable to resolve role.', error);
    }
  }

  if (!context?.isAuthenticated || !role) {
    redirect(AUTH_CONFIG.loginPage);
    return null;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    redirect(AUTH_CONFIG.loginPage);
    return null;
  }

  return { session: context.session || session, role };
}

export async function startAccessMonitor({ onSessionInvalidated } = {}) {
  if (IS_LOGIN_PAGE) return;

  await waitForAuthReady();

  bindSessionInvalidation({
    onSignedOut: () => {
      clearRoleCache();
      if (typeof onSessionInvalidated === 'function') onSessionInvalidated();
      redirect(AUTH_CONFIG.loginPage);
    }
  });

  window.setInterval(async () => {
    try {
      const session = await refreshSessionIfNeeded();
      if (!session) {
        clearRoleCache();
        redirect(AUTH_CONFIG.loginPage);
      }
    } catch (error) {
      console.error('[CCG-AUTH] Session refresh failed.', error);
      clearRoleCache();
      redirect(AUTH_CONFIG.loginPage);
    }
  }, AUTH_CONFIG.sessionCheckIntervalMs);
}

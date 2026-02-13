import { ADMIN_BUILD_ID } from './build.js';
import { AUTH_CONFIG } from './config.js?v=20260207-01';
import {
  AUTH_STATE,
  authReady,
  bindSessionInvalidation,
  getAuthContext,
  refreshSessionIfNeeded,
  resolveAuthState
} from './auth.js?v=20260207-01';
import { clearRoleCache, fetchUserRole } from './roles.js?v=20260207-01';

console.info('[CCG-AUTH] guard.js loaded', ADMIN_BUILD_ID);

const IS_LOGIN_PAGE = window.location.pathname.endsWith('/login.html');

function redirect(path, reason) {
  const url = new URL(path, window.location.origin);
  if (reason) url.searchParams.set('reason', reason);
  window.location.replace(url.toString());
}

function renderAuthStatus(state) {
  const statusNode = document.querySelector('[data-admin-status]');
  if (!statusNode) return;

  if (state === AUTH_STATE.AUTHENTICATED || state === AUTH_STATE.AUTHENTICATED_LIMITED) {
    return;
  }

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

export async function ensureAuthenticated({ redirectTo = AUTH_CONFIG.loginPage } = {}) {
  if (IS_LOGIN_PAGE) {
    return null;
  }

  const readyState = await authReady;
  const context = readyState?.context || (await getAuthContext());
  const authState = resolveAuthState(context?.session || null, context?.profile || null);
  renderAuthStatus(authState);

  if (authState === AUTH_STATE.AUTHENTICATING) {
    console.info('[CCG-AUTH] Waiting for session to stabilise');
    return null;
  }

  if (authState === AUTH_STATE.NO_SESSION) {
    redirect(redirectTo, 'unauthenticated');
    return null;
  }

  try {
    const session = await refreshSessionIfNeeded();
    if (!session) {
      redirect(redirectTo, 'expired');
      return null;
    }
    return session;
  } catch (error) {
    console.error('[CCG-AUTH] Unable to refresh session.', error);
    redirect(redirectTo, 'expired');
    return null;
  }
}

export async function ensureRole(allowedRoles = []) {
  await authReady;
  const session = await ensureAuthenticated();
  if (!session) {
    return null;
  }

  const context = await getAuthContext();
  const authState = resolveAuthState(context?.session || null, context?.profile || null);
  if (authState === AUTH_STATE.AUTHENTICATED_LIMITED) {
    return { session: context.session || session, role: null, authState };
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
    redirect(AUTH_CONFIG.loginPage, 'forbidden');
    return null;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    redirect(AUTH_CONFIG.loginPage, 'forbidden');
    return null;
  }

  return { session: context.session || session, role };
}

export async function startAccessMonitor({ onSessionInvalidated } = {}) {
  if (IS_LOGIN_PAGE) {
    return;
  }

  await authReady;

  bindSessionInvalidation({
    onSignedOut: () => {
      clearRoleCache();
      if (typeof onSessionInvalidated === 'function') {
        onSessionInvalidated();
      }
      redirect(AUTH_CONFIG.loginPage, 'signed_out');
    }
  });

  window.setInterval(async () => {
    try {
      const session = await refreshSessionIfNeeded();
      if (!session) {
        clearRoleCache();
        redirect(AUTH_CONFIG.loginPage, 'expired');
      }
    } catch (error) {
      console.error('[CCG-AUTH] Session refresh failed.', error);
      clearRoleCache();
      redirect(AUTH_CONFIG.loginPage, 'refresh_failed');
    }
  }, AUTH_CONFIG.sessionCheckIntervalMs);
}

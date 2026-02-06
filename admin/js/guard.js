import { AUTH_CONFIG } from './config.js';
import {
  bindSessionInvalidation,
  getAuthContext,
  refreshSessionIfNeeded,
  waitForAuthReady
} from './auth.js';
import { clearRoleCache } from './roles.js';

function redirect(path, reason) {
  const url = new URL(path, window.location.origin);
  if (reason) {
    url.searchParams.set('reason', reason);
  }
  window.location.replace(url.toString());
}

export async function ensureAuthenticated({ redirectTo = AUTH_CONFIG.loginPage } = {}) {
  await waitForAuthReady();

  const context = await getAuthContext();
  if (!context?.isAuthenticated || !context?.session) {
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
  await waitForAuthReady();
  const session = await ensureAuthenticated();
  if (!session) {
    return null;
  }

  const context = await getAuthContext();
  const role = String(context?.role || '').toLowerCase();

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
  await waitForAuthReady();

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

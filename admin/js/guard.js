import { AUTH_CONFIG } from './config.js';
import {
  bindSessionInvalidation,
  refreshSessionIfNeeded,
  restoreSession
} from './auth.js';
import { clearRoleCache, fetchUserRole } from './roles.js';

function redirect(path, reason) {
  const url = new URL(path, window.location.origin);
  if (reason) {
    url.searchParams.set('reason', reason);
  }
  window.location.replace(url.toString());
}

export async function ensureAuthenticated({ redirectTo = AUTH_CONFIG.loginPage } = {}) {
  let session = await restoreSession();
  if (!session) {
    redirect(redirectTo, 'unauthenticated');
    return null;
  }

  session = await refreshSessionIfNeeded();

  if (!session) {
    redirect(redirectTo, 'expired');
    return null;
  }

  return session;
}

export async function ensureRole(allowedRoles = []) {
  const session = await ensureAuthenticated();
  if (!session) {
    return null;
  }

  const userId = session.user?.id;
  const role = await fetchUserRole({ userId });

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    redirect(AUTH_CONFIG.loginPage, 'forbidden');
    return null;
  }

  return { session, role };
}

export function startAccessMonitor({ onSessionInvalidated } = {}) {
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
    } catch {
      clearRoleCache();
      redirect(AUTH_CONFIG.loginPage, 'refresh_failed');
    }
  }, AUTH_CONFIG.sessionCheckIntervalMs);
}

import { ADMIN_BUILD_ID } from './build.js';
import { AUTH_CONFIG } from './config.js?v=20260207-01';
import { authReady, getAuthContext } from './auth.js?v=20260207-01';
import { clearRoleCache, fetchUserRole } from './roles.js?v=20260207-01';

console.info('[CCG-AUTH] guard.js loaded', ADMIN_BUILD_ID);

const IS_LOGIN_PAGE = window.location.pathname.endsWith('/login.html');

function redirect(path, reason) {
  const url = new URL(path, window.location.origin);
  if (reason) url.searchParams.set('reason', reason);
  window.location.replace(url.toString());
}

export async function ensureAuthenticated({ redirectTo = AUTH_CONFIG.loginPage } = {}) {
  if (IS_LOGIN_PAGE) {
    return null;
  }

  await authReady;

  const session = window.__ccgSession;
  if (session === null) {
    const url = new URL(redirectTo, window.location.origin);
    url.searchParams.set('reason', 'unauthenticated');
    window.location.replace(url.toString());
    return null;
  }

  return session;
}

export async function ensureRole(allowedRoles = []) {
  await authReady;
  const session = await ensureAuthenticated();
  if (!session) {
    return null;
  }

  const context = await getAuthContext();
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

export async function startAccessMonitor() {
  if (IS_LOGIN_PAGE) return;
  await authReady;
}

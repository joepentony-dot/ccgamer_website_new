// admin/js/guard.js

import { AUTH_CONFIG, OWNER_EMAILS } from './config.js';
import {
  AUTH_STATE,
  authReady,
  bindSessionInvalidation,
  getAuthContext,
  refreshSessionIfNeeded,
  resolveAuthState,
  waitForAuthReady
} from './auth.js';
import { clearRoleCache, fetchUserRole } from './roles.js';

const TAG = '[CCG-GUARD]';
const IS_LOGIN_PAGE = window.location.pathname.endsWith('/login.html');
const MASTER_DATA_PAGE_PATTERN = /\/admin\/(?:admin|games-editor)\.html$/i;
const IS_MASTER_DATA_PAGE = MASTER_DATA_PAGE_PATTERN.test(window.location.pathname);
const MASTER_DATA_ROLES = Object.freeze(['admin', 'superadmin']);

if (IS_MASTER_DATA_PAGE) {
  document.documentElement.dataset.ccgMasterDataGate = 'pending';
  document.documentElement.style.visibility = 'hidden';
}

function redirect(path, reason = '') {
  const url = new URL(path, window.location.origin);
  if (reason) url.searchParams.set('reason', reason);
  window.location.replace(url.toString());
}

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

function isOwner(email) {
  const target = String(email || '').toLowerCase();
  return (OWNER_EMAILS || []).some((entry) => String(entry || '').toLowerCase() === target);
}

function renderAuthStatus(state) {
  const statusNodes = document.querySelectorAll('[data-admin-status], [data-member-status]');
  if (!statusNodes.length) return;

  let text = 'Please sign in to continue.';
  let status = 'info';

  if (state === AUTH_STATE.AUTHENTICATED) {
    text = 'Signed in';
    status = 'success';
  } else if (state === AUTH_STATE.AUTHENTICATED_LIMITED) {
    text = 'Signed in (limited role)';
    status = 'warning';
  } else if (state === AUTH_STATE.AUTHENTICATING) {
    text = 'Restoring session…';
    status = 'info';
  }

  statusNodes.forEach((statusNode) => {
    statusNode.textContent = text;
    statusNode.dataset.state = status;
  });
}

export async function ensureAuthenticated({ redirectTo = AUTH_CONFIG.loginPage } = {}) {
  if (IS_LOGIN_PAGE) return null;

  // Always wait for auth bootstrap to be wired up…
  await waitForAuthReady();

  // …but do NOT hard-block forever on authReady if the global client is already marked ready.
  // This avoids the “Checking admin session…” stall when authReady is delayed/stuck.
  if (window.ccgSupabase?.isReady !== true) {
    await authReady;
  }

  const context = await getAuthContext();
  const authState = resolveAuthState(context?.session || null, context?.profile || null);
  renderAuthStatus(authState);

  if (!context?.session?.user) {
    console.info(TAG, 'no active session, redirecting');
    redirect(redirectTo, 'signed_out');
    return null;
  }

  return context.session;
}

export async function ensureRole(allowedRoles = []) {
  if (IS_LOGIN_PAGE) return null;

  const session = await ensureAuthenticated();
  if (!session) return null;

  const context = await getAuthContext();
  const email = String(context?.user?.email || session?.user?.email || '').toLowerCase();

  if (isOwner(email)) {
    return { session, role: 'superadmin' };
  }

  let role = normalizeRole(context?.role || context?.profile?.role);

  if (!role && context?.user?.id) {
    try {
      role = normalizeRole(await fetchUserRole({ userId: context.user.id, force: true }));
    } catch (error) {
      console.warn(TAG, 'role lookup failed', error);
    }
  }

  if (!role) {
    redirect(AUTH_CONFIG.loginPage, 'role');
    return null;
  }

  const effectiveAllowedRoles = IS_MASTER_DATA_PAGE ? MASTER_DATA_ROLES : allowedRoles;
  if (effectiveAllowedRoles.length && !effectiveAllowedRoles.includes(role)) {
    console.warn(TAG, 'role denied for protected page', { role, path: window.location.pathname });
    redirect(AUTH_CONFIG.loginPage, 'role');
    return null;
  }

  return { session, role };
}

export async function startAccessMonitor({ onSessionInvalidated } = {}) {
  if (IS_LOGIN_PAGE || window.__ccgAdminAccessMonitorStarted) return;
  window.__ccgAdminAccessMonitorStarted = true;

  await waitForAuthReady();

  bindSessionInvalidation({
    onSignedOut: () => {
      clearRoleCache();
      if (typeof onSessionInvalidated === 'function') onSessionInvalidated();
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
      console.error(TAG, 'session refresh failed', error);
      clearRoleCache();
      redirect(AUTH_CONFIG.loginPage, 'expired');
    }
  }, Number(AUTH_CONFIG.sessionCheckIntervalMs || 30000));
}

async function enforceMasterDataPageAccess() {
  try {
    const access = await ensureRole(MASTER_DATA_ROLES);
    if (!access) return;
    document.documentElement.dataset.ccgMasterDataGate = 'granted';
    document.documentElement.style.visibility = '';
    await startAccessMonitor();
  } catch (error) {
    console.error(TAG, 'master data access gate failed', error);
    redirect(AUTH_CONFIG.loginPage, 'role');
  }
}

if (IS_MASTER_DATA_PAGE && !IS_LOGIN_PAGE) {
  void enforceMasterDataPageAccess();
}

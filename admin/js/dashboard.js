import { AUTH_CONFIG } from './config.js?v=admin-stable-20260207';
import { AUTH_STATE, getAuthContext, redirectWithGuard, resolveAuthState, waitForAuthReady } from './auth.js?v=admin-stable-20260207';
import { fetchGamesJson } from './games-api.js?v=admin-stable-20260207';
import { startAccessMonitor } from './guard.js?v=admin-stable-20260207';
import { initAdminNav } from './admin-nav.js?v=admin-stable-20260207';
import { fetchUserRole } from './roles.js?v=admin-stable-20260207';

const emailField = document.querySelector('[data-admin-email]');
const roleField = document.querySelector('[data-admin-role]');
const statusField = document.querySelector('[data-admin-status]');
const loadField = document.querySelector('[data-admin-load-status]');
const exportField = document.querySelector('[data-admin-export-status]');
const envField = document.querySelector('[data-admin-env-status]');

const ALLOWED_ROLES = ['superadmin', 'admin', 'editor'];

function disableLimitedActions() {
  document.querySelectorAll('.admin-tool-nav a').forEach((link) => {
    const href = String(link.getAttribute('href') || '');
    if (href.includes('games-editor') || href.includes('publish')) {
      link.classList.add('is-disabled');
      link.setAttribute('aria-disabled', 'true');
      link.addEventListener('click', (event) => event.preventDefault());
    }
  });
}

function setStatus(text, state = 'info') {
  statusField.textContent = text;
  statusField.dataset.state = state;
}

function setEnvironmentHint() {
  const isLocal = /localhost|127\.0\.0\.1/.test(window.location.hostname);
  envField.innerHTML = `<strong>Environment:</strong> ${isLocal ? 'Localhost edit mode' : 'Live static site mode'} (${window.location.origin})`;
}

function hydrateLocalStatus() {
  const lastLoad = localStorage.getItem('omegaAdminLastLoadSuccess');
  const lastExport = localStorage.getItem('omegaAdminLastExportTime');
  if (lastLoad) loadField.textContent = `Last load success: ${lastLoad}`;
  if (lastExport) exportField.textContent = `Last export: ${lastExport}`;
}

async function bootstrap() {
  setStatus('Checking session…');
  setEnvironmentHint();
  hydrateLocalStatus();

  try {
    await waitForAuthReady();
    const context = await getAuthContext();

    if (!context?.isAuthenticated || !context?.user) {
      emailField.textContent = 'Guest';
      roleField.textContent = 'guest';
      setStatus('Please sign in to continue.', 'info');
      redirectWithGuard(AUTH_CONFIG.loginPage, 'unauthenticated');
      return;
    }

    let role = context.role || null;
    const email = context.user.email || 'unknown';

    if (context.user?.id && !role) {
      try {
        role = await fetchUserRole({ userId: context.user.id, force: true });
      } catch (error) {
        console.warn('[CCG-AUTH] Unable to resolve role.', error);
      }
    }

    const profile = { role: role || null };
    const authState = resolveAuthState(context.session || null, profile);

    emailField.textContent = email;
    roleField.textContent = role || 'limited';

    if (authState === AUTH_STATE.AUTHENTICATED) {
      setStatus('Signed in as Admin', 'success');
    } else if (authState === AUTH_STATE.AUTHENTICATED_LIMITED) {
      setStatus('Signed in (limited admin access)', 'info');
      disableLimitedActions();
    } else if (authState === AUTH_STATE.UNAUTHORISED) {
      setStatus('Access denied', 'error');
      redirectWithGuard(AUTH_CONFIG.loginPage, 'forbidden');
      return;
    }

    if (role && !ALLOWED_ROLES.includes(String(role).toLowerCase()) && authState !== AUTH_STATE.AUTHENTICATED_LIMITED) {
      setStatus('Access denied', 'error');
      redirectWithGuard(AUTH_CONFIG.loginPage, 'forbidden');
      return;
    }

    startAccessMonitor();

    await fetchGamesJson();
    const now = new Date().toLocaleString();
    loadField.textContent = `Last load success: ${now}`;
    localStorage.setItem('omegaAdminLastLoadSuccess', now);

    if (authState === AUTH_STATE.AUTHENTICATED) {
      setStatus('Signed in as Admin', 'success');
    } else if (authState === AUTH_STATE.AUTHENTICATED_LIMITED) {
      setStatus('Signed in (limited admin access)', 'info');
    }
  } catch (error) {
    loadField.textContent = `Last load error: ${error.message || 'unknown'}`;
    setStatus(error.message || 'Unable to validate admin access.', 'error');
  }
}

initAdminNav({ pageLabel: 'Dashboard', active: 'dashboard' });
bootstrap();

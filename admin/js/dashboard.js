import { AUTH_CONFIG } from './config.js';
import { getAuthContext, redirectWithGuard, waitForAuthReady } from './auth.js';
import { fetchGamesJson } from './games-api.js';
import { startAccessMonitor } from './guard.js';
import { initAdminNav } from './admin-nav.js';

const emailField = document.querySelector('[data-admin-email]');
const roleField = document.querySelector('[data-admin-role]');
const statusField = document.querySelector('[data-admin-status]');
const loadField = document.querySelector('[data-admin-load-status]');
const exportField = document.querySelector('[data-admin-export-status]');
const envField = document.querySelector('[data-admin-env-status]');

const ALLOWED_ROLES = ['superadmin', 'admin', 'editor'];

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
      setStatus('Session: guest', 'info');
      redirectWithGuard(AUTH_CONFIG.loginPage, 'unauthenticated');
      return;
    }

    const role = context.role || 'unknown';
    const email = context.user.email || 'unknown';

    emailField.textContent = email;
    roleField.textContent = role;
    setStatus(`Session: signed in as ${email}`, 'success');

    if (!ALLOWED_ROLES.includes(String(role).toLowerCase())) {
      setStatus('Session: signed in (role not permitted)', 'error');
      redirectWithGuard(AUTH_CONFIG.loginPage, 'forbidden');
      return;
    }

    startAccessMonitor();

    await fetchGamesJson();
    const now = new Date().toLocaleString();
    loadField.textContent = `Last load success: ${now}`;
    localStorage.setItem('omegaAdminLastLoadSuccess', now);

    setStatus('Access granted. Omega systems online.', 'success');
  } catch (error) {
    loadField.textContent = `Last load error: ${error.message || 'unknown'}`;
    setStatus(error.message || 'Unable to validate admin access.', 'error');
  }
}

initAdminNav({ pageLabel: 'Dashboard', active: 'dashboard' });
bootstrap();

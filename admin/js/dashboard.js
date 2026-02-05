import { AUTH_CONFIG } from './config.js';
import { logout } from './auth.js';
import { ensureRole, startAccessMonitor } from './guard.js';
import { fetchGamesJson } from './games-api.js';
import { initAdminNav } from './admin-nav.js';

const emailField = document.querySelector('[data-admin-email]');
const roleField = document.querySelector('[data-admin-role]');
const statusField = document.querySelector('[data-admin-status]');
const loadField = document.querySelector('[data-admin-load-status]');
const logoutButton = document.querySelector('[data-logout-button]');

function setStatus(text, state = 'info') {
  statusField.textContent = text;
  statusField.dataset.state = state;
}

async function bootstrap() {
  setStatus('Validating session and role…');

  try {
    const allowedRoles = ['superadmin', 'admin', 'editor'];
    const result = await ensureRole(allowedRoles);
    if (!result) return;

    const { session, role } = result;
    emailField.textContent = session.user?.email || 'Unknown';
    roleField.textContent = role;

    await fetchGamesJson();
    if (loadField) loadField.textContent = `Last load success: ${new Date().toLocaleString()}`;

    setStatus('Access granted. Admin systems operational.', 'success');
  } catch (error) {
    if (loadField) loadField.textContent = `Last load error: ${error.message || 'unknown'}`;
    setStatus(error.message || 'Unable to validate admin access.', 'error');
  }
}

logoutButton.addEventListener('click', async () => {
  logoutButton.disabled = true;
  setStatus('Signing out…', 'info');
  try {
    await logout();
    window.location.replace(AUTH_CONFIG.postLogoutRedirect);
  } catch (error) {
    setStatus(error.message || 'Could not sign out cleanly.', 'error');
    logoutButton.disabled = false;
  }
});

startAccessMonitor();
initAdminNav({ pageLabel: 'Dashboard', active: 'dashboard' });
bootstrap();

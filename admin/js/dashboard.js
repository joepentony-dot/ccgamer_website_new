import { ensureRole, startAccessMonitor } from './guard.js';
import { fetchGamesJson } from './games-api.js';
import { initAdminNav } from './admin-nav.js';

const emailField = document.querySelector('[data-admin-email]');
const roleField = document.querySelector('[data-admin-role]');
const statusField = document.querySelector('[data-admin-status]');
const loadField = document.querySelector('[data-admin-load-status]');
const exportField = document.querySelector('[data-admin-export-status]');
const envField = document.querySelector('[data-admin-env-status]');

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
  setStatus('Validating session and role…');
  setEnvironmentHint();
  hydrateLocalStatus();

  try {
    const result = await ensureRole(['superadmin', 'admin', 'editor']);
    if (!result) return;

    emailField.textContent = result.session.user?.email || 'Unknown';
    roleField.textContent = result.role;

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

startAccessMonitor();
initAdminNav({ pageLabel: 'Dashboard', active: 'dashboard' });
bootstrap();

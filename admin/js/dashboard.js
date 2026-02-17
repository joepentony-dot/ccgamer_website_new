import { fetchGamesJson } from './games-api.js';
import { ensureRole, startAccessMonitor } from './guard.js';
import { initAdminNav } from './admin-nav.js';

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
    const access = await ensureRole(ALLOWED_ROLES);
    if (!access) {
      return;
    }

    const email = access.session?.user?.email || 'unknown';
    const role = access.role || 'limited';

    emailField.textContent = email;
    roleField.textContent = role;

    if (!access.role) {
      setStatus('Signed in (limited admin access)', 'info');
      disableLimitedActions();
    } else {
      setStatus('Signed in as Admin', 'success');
    }

    startAccessMonitor();

    await fetchGamesJson();
    const now = new Date().toLocaleString();
    loadField.textContent = `Last load success: ${now}`;
    localStorage.setItem('omegaAdminLastLoadSuccess', now);
  } catch (error) {
    loadField.textContent = `Last load error: ${error.message || 'unknown'}`;
    setStatus(error.message || 'Unable to validate admin access.', 'error');
  }
}

initAdminNav({ pageLabel: 'Dashboard', active: 'dashboard' });
bootstrap();

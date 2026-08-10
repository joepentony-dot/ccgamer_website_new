import { fetchGamesJson } from './games-api.js';
import { ensureRole, startAccessMonitor } from './guard.js';
import { initAdminNav } from './admin-nav.js';

const emailField = document.querySelector('[data-admin-email]');
const roleField = document.querySelector('[data-admin-role]');
const statusField = document.querySelector('[data-admin-status]');
const loadField = document.querySelector('[data-admin-load-status]');
const videoField = document.querySelector('[data-admin-video-status]');
const envField = document.querySelector('[data-admin-env-status]');

const ALLOWED_ROLES = ['superadmin', 'admin', 'editor'];

function disableLimitedActions() {
  document.querySelectorAll('.admin-tool-nav a').forEach((link) => {
    const href = String(link.getAttribute('href') || '');
    if (href.includes('content-publisher') || href.includes('games-editor')) {
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
  envField.innerHTML = `<strong>Environment:</strong> ${isLocal ? 'Localhost' : 'Live site'} (${window.location.origin})`;
}

async function fetchVerifiedVideoCount() {
  const response = await fetch('/data/video-metadata.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`video-metadata.json failed to load (${response.status}).`);
  const payload = await response.json();
  const videos = payload?.videos && typeof payload.videos === 'object' ? payload.videos : {};
  return Object.keys(videos).length;
}

async function bootstrap() {
  setStatus('Checking session…');
  setEnvironmentHint();

  try {
    const access = await ensureRole(ALLOWED_ROLES);
    if (!access) return;

    const email = access.session?.user?.email || 'unknown';
    const role = access.role || 'limited';

    emailField.textContent = email;
    roleField.textContent = role;

    if (!access.role) {
      setStatus('Signed in (limited admin access)', 'info');
      disableLimitedActions();
    } else {
      setStatus('Signed in and ready', 'success');
    }

    startAccessMonitor();

    const [{ games }, verifiedVideoCount] = await Promise.all([
      fetchGamesJson(),
      fetchVerifiedVideoCount().catch(() => null)
    ]);

    loadField.textContent = `Game library: ${games.length.toLocaleString()} records loaded`;
    videoField.textContent = verifiedVideoCount === null
      ? 'Verified video metadata: unavailable on this refresh'
      : `Verified video metadata: ${verifiedVideoCount.toLocaleString()} YouTube records`;
  } catch (error) {
    loadField.textContent = `Publishing source check failed: ${error.message || 'unknown error'}`;
    if (videoField && videoField.textContent.includes('checking')) {
      videoField.textContent = 'Verified video metadata: not checked';
    }
    setStatus(error.message || 'Unable to validate admin access.', 'error');
  }
}

initAdminNav({ pageLabel: 'Dashboard', active: 'dashboard' });
bootstrap();

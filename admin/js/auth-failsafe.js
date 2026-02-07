import { ADMIN_BUILD_ID } from './build.js';

const LOG_PREFIX = '[CCG-AUTH]';
const FAILSAFE_TIMEOUT_MS = 3000;

const form = document.querySelector('[data-login-form]');
const loginButton = document.querySelector('[data-login-button]');
const resetButton = document.querySelector('[data-reset-button]');
const messageBox = document.querySelector('[data-message]');

function setMessage(message, type = 'error') {
  if (!messageBox) return;
  messageBox.textContent = message;
  messageBox.dataset.state = type;
}

function disableActions() {
  if (loginButton) loginButton.disabled = true;
  if (resetButton) resetButton.disabled = true;
}

function renderFatalBanner(message) {
  if (document.querySelector('[data-auth-fatal-banner]')) return;
  const host = document.querySelector('[data-admin-shell]') || document.body;
  if (!host) return;

  const banner = document.createElement('div');
  banner.className = 'admin-auth-fatal-banner';
  banner.dataset.authFatalBanner = 'true';
  banner.setAttribute('role', 'alert');
  banner.textContent = message;

  host.prepend(banner);
}

function triggerFailsafe(reason) {
  console.error(`${LOG_PREFIX} Auth system offline.`, reason || 'Unknown');
  renderFatalBanner('Auth system offline. Please refresh or contact support.');
  disableActions();
  setMessage('Auth system offline. Please refresh or contact support.', 'error');
}

function checkAuthBoot() {
  if (window.__CCG_AUTH_BOOTSTRAPPED || window.CCG_AUTH_READY) {
    return;
  }
  triggerFailsafe('Auth bootstrap did not start.');
}

window.addEventListener('error', (event) => {
  if (event?.message && /auth/i.test(event.message)) {
    triggerFailsafe(event.message);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const message = event?.reason?.message || String(event?.reason || 'unknown');
  if (/auth/i.test(message)) {
    triggerFailsafe(message);
  }
});

setTimeout(checkAuthBoot, FAILSAFE_TIMEOUT_MS);

if (ADMIN_BUILD_ID) {
  console.info(`${LOG_PREFIX} failsafe armed`, ADMIN_BUILD_ID);
}

if (!form) {
  console.warn(`${LOG_PREFIX} login form not found for failsafe.`);
}

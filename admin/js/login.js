import { AUTH_CONFIG } from './config.js?v=admin-stable-20260207';
import {
  login,
  redirectWithGuard,
  restoreSession,
  sendPasswordReset,
  waitForAuthReady
} from './auth.js?v=admin-stable-20260207';
import { fetchUserRole } from './roles.js?v=admin-stable-20260207';
import { initAdminNav } from './admin-nav.js?v=admin-stable-20260207';

const LOG = '[CCG-LOGIN]';
const log = (...a) => console.log(LOG, ...a);
const warn = (...a) => console.warn(LOG, ...a);
const error = (...a) => console.error(LOG, ...a);

// --- resilient element lookup (works even if data-* attrs were lost)
function $(sel) {
  return document.querySelector(sel);
}

function pickFirst(...candidates) {
  for (const el of candidates) if (el) return el;
  return null;
}

const form = pickFirst(
  $('[data-login-form]'),
  $('form'),
  $('.ccg-admin-login form')
);

const emailInput = pickFirst(
  $('[data-email-input]'),
  $('input[type="email"]'),
  $('input[name="email"]'),
  $('#email'),
  $('#loginEmail')
);

const passwordInput = pickFirst(
  $('[data-password-input]'),
  $('input[type="password"]'),
  $('input[name="password"]'),
  $('#password'),
  $('#loginPassword')
);

const loginButton = pickFirst(
  $('[data-login-button]'),
  (form ? form.querySelector('button[type="submit"]') : null),
  $('button[type="submit"]'),
  $('button[data-action="login"]')
);

const resetButton = pickFirst(
  $('[data-reset-button]'),
  $('button[data-action="reset"]'),
  $('#resetPassword'),
  null
);

// Message box: if not present, we create one
let messageBox = pickFirst(
  $('[data-message]'),
  $('#message'),
  $('.login-message')
);

function ensureMessageBox() {
  if (messageBox) return messageBox;

  messageBox = document.createElement('div');
  messageBox.className = 'ccg-login-message';
  messageBox.dataset.message = 'true';
  messageBox.dataset.state = 'info';
  messageBox.setAttribute('role', 'status');

  // Place it near the buttons if possible
  const host =
    (form && (form.querySelector('[data-login-actions]') || form)) ||
    document.querySelector('.admin-login-card') ||
    document.body;

  host.appendChild(messageBox);
  return messageBox;
}

function setMessage(message, type = 'info') {
  const box = ensureMessageBox();
  box.textContent = message;
  box.dataset.state = type;
}

function setLoading(isLoading) {
  if (loginButton) loginButton.disabled = isLoading;
  if (resetButton) resetButton.disabled = isLoading;
  if (loginButton) loginButton.textContent = isLoading ? 'Signing in…' : 'Sign in';
}

function showReasonMessage() {
  const reason = new URLSearchParams(window.location.search).get('reason');
  if (!reason) return;

  if (reason === 'forbidden' || reason === 'unauthorised' || reason === 'unauthorized') {
    setMessage('You are signed in but not authorised for admin access.', 'error');
    return;
  }

  if (reason === 'expired') {
    setMessage('Your session expired. Please sign in again.', 'info');
    return;
  }

  if (reason === 'signed_out') {
    setMessage('You have been signed out.', 'info');
  }
}

async function redirectIfSessionExists() {
  try {
    await waitForAuthReady();
    const session = await restoreSession();
    if (session?.user?.id) {
      console.info('[CCG-LOGIN] Session detected, handing off to dashboard');
      setMessage('Session detected. Redirecting to dashboard…', 'info');
      window.location.replace('/admin/dashboard.html');
      return;
    }
    log('No existing session found.');
  } catch (e) {
    error('Session restore failed', e);
    setMessage(e?.message || 'Unable to check session state.', 'error');
  }
}

async function handleLogin(evt) {
  // Always block default submit/navigation
  try {
    evt?.preventDefault?.();
    evt?.stopPropagation?.();
  } catch (_) {
    // no-op
  }

  setLoading(true);
  setMessage('Authenticating…', 'info');

  try {
    const email = emailInput?.value ?? '';
    const pass = passwordInput?.value ?? '';

    log('Attempting login…', { hasEmail: Boolean(String(email).trim()), hasPassword: Boolean(String(pass)) });

    const { user } = await login(email, pass);

    if (user?.id) {
      log('Signed in. Fetching role…', user.id);
      await fetchUserRole({ userId: user.id, force: true });
    }

    await waitForAuthReady();

    setMessage('Login successful. Redirecting to dashboard…', 'success');
    redirectWithGuard(AUTH_CONFIG.defaultRedirectAfterLogin, 'signed_in');
  } catch (e) {
    error('Login failed', e);
    setMessage(e?.message || 'Login failed. Check credentials and try again.', 'error');
  } finally {
    setLoading(false);
  }
}

async function handleReset(evt) {
  try {
    evt?.preventDefault?.();
    evt?.stopPropagation?.();
  } catch (_) {
    // no-op
  }

  const email = emailInput?.value ?? '';
  if (!String(email).trim()) {
    setMessage('Enter your email address before requesting a reset link.', 'error');
    return;
  }

  setLoading(true);
  setMessage('Sending password reset email…', 'info');

  try {
    await sendPasswordReset(email);
    setMessage('Password reset email sent. Check your inbox.', 'success');
  } catch (e) {
    error('Reset failed', e);
    setMessage(e?.message || 'Unable to send reset email.', 'error');
  } finally {
    setLoading(false);
  }
}

// --- boot
log('login.js loaded');
log('Elements detected:', {
  hasForm: Boolean(form),
  hasEmailInput: Boolean(emailInput),
  hasPasswordInput: Boolean(passwordInput),
  hasLoginButton: Boolean(loginButton),
  hasResetButton: Boolean(resetButton),
  hasMessageBox: Boolean(messageBox)
});

// Bind robustly (even if markup is imperfect)
if (form) {
  form.addEventListener('submit', handleLogin);
} else {
  warn('No <form> found; binding click handler only.');
}

if (loginButton) {
  loginButton.addEventListener('click', handleLogin);
} else {
  warn('No login button found. Submit may still work if form exists.');
}

if (resetButton) {
  resetButton.addEventListener('click', handleReset);
}

// Always init nav + login message/session redirect checks
initAdminNav({ pageLabel: 'Login', active: 'dashboard' });
showReasonMessage();
redirectIfSessionExists();

import { login, sendPasswordReset } from './auth.js?v=20260207-01';

const LOG = '[CCG-LOGIN]';
const log = (...a) => console.log(LOG, ...a);
const error = (...a) => console.error(LOG, ...a);

function $(sel) {
  return document.querySelector(sel);
}

const form = $('[data-login-form]') || $('form');
const emailInput = $('[data-email-input]') || $('input[type="email"]');
const passwordInput = $('[data-password-input]') || $('input[type="password"]');
const loginButton = $('[data-login-button]') || (form ? form.querySelector('button[type="submit"]') : null);
const resetButton = $('[data-reset-button]') || $('button[data-action="reset"]');
const messageBox = $('[data-message]') || $('[data-admin-status]');

function setMessage(msg, state = 'info') {
  if (!messageBox) return;
  messageBox.textContent = msg;
  messageBox.dataset.state = state;
}

function setLoading(on) {
  if (loginButton) loginButton.disabled = !!on;
  if (resetButton) resetButton.disabled = !!on;
  if (loginButton) loginButton.textContent = on ? 'Signing in…' : 'Sign in';
}

function showReasonMessage() {
  const reason = new URLSearchParams(window.location.search).get('reason');
  if (!reason) return;
  if (reason === 'signed_out') {
    setMessage('Signed out.', 'info');
    return;
  }
  if (reason === 'expired') {
    setMessage('Session expired. Please sign in again.', 'info');
  }
}

async function handleLogin(evt) {
  evt?.preventDefault?.();
  setLoading(true);
  setMessage('Authenticating…', 'info');

  try {
    const email = String(emailInput?.value || '').trim();
    const pass = String(passwordInput?.value || '');

    if (!email || !pass) {
      setMessage('Enter email + password.', 'error');
      return;
    }

    const { user } = await login(email, pass);
    if (!user?.id) {
      setMessage('Login failed. Please try again.', 'error');
      return;
    }

    location.replace('/admin/dashboard.html');
  } catch (e) {
    error('Login failed', e);
    setMessage(e?.message || 'Login failed. Check credentials and try again.', 'error');
  } finally {
    setLoading(false);
  }
}

async function handleReset(evt) {
  evt?.preventDefault?.();

  const email = String(emailInput?.value || '').trim();
  if (!email) {
    setMessage('Enter your email first.', 'error');
    return;
  }

  setLoading(true);
  setMessage('Sending reset email…', 'info');

  try {
    await sendPasswordReset(email);
    setMessage('Reset email sent. Check your inbox.', 'success');
  } catch (e) {
    error('Reset failed', e);
    setMessage(e?.message || 'Unable to send reset email.', 'error');
  } finally {
    setLoading(false);
  }
}

log('Initialising login page');
showReasonMessage();

if (form) form.addEventListener('submit', handleLogin);
if (loginButton) loginButton.addEventListener('click', handleLogin);
if (resetButton) resetButton.addEventListener('click', handleReset);

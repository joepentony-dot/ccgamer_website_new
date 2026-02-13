import { AUTH_CONFIG } from './config.js?v=20260207-01';
import {
  login,
  sendPasswordReset,
  waitForAuthReady,
  getAuthContext
} from './auth.js?v=20260207-01';

const LOG = '[CCG-LOGIN]';
const log = (...a) => console.log(LOG, ...a);
const warn = (...a) => console.warn(LOG, ...a);
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

  if (reason === 'forbidden' || reason === 'unauthorised' || reason === 'unauthorized') {
    setMessage('Signed in, but not authorised for admin access.', 'error');
    return;
  }
  if (reason === 'expired') {
    setMessage('Session expired. Please sign in again.', 'info');
    return;
  }
  if (reason === 'signed_out') {
    setMessage('Signed out.', 'info');
    return;
  }
  if (reason === 'unauthenticated') {
    setMessage('Please sign in to continue.', 'info');
  }
}

async function waitForSupabaseClient({ timeoutMs = 8000, intervalMs = 150 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if (window.ccgSupabase && typeof window.ccgSupabase.getClient === 'function') {
        const client = await window.ccgSupabase.getClient();
        if (client && client.auth) return client;
      }
      if (window.supabase && window.supabase.auth) return window.supabase;
      if (window.__ccgSupabaseClient && window.__ccgSupabaseClient.auth) return window.__ccgSupabaseClient;
    } catch (_) {
      // keep polling
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null;
}

async function redirectIfSessionExists() {
  setMessage('Checking session…', 'info');

  const sb = await waitForSupabaseClient();
  if (!sb) {
    warn('Supabase client missing.');
    setMessage('Supabase client missing. Please refresh and try again.', 'error');
    return;
  }

  await waitForAuthReady();

  const ctx = await getAuthContext();
  if (ctx?.session?.user?.id) {
    log('Session exists → redirecting to dashboard');
    setMessage('Session detected. Redirecting to dashboard…', 'info');
    window.location.replace(AUTH_CONFIG.defaultRedirectAfterLogin || '/admin/dashboard.html');
    return;
  }

  setMessage('Enter your credentials to continue.', 'info');
}

async function handleLogin(evt) {
  try {
    evt?.preventDefault?.();
    evt?.stopPropagation?.();
  } catch (_) {}

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

    setMessage('Login successful. Loading dashboard…', 'success');
    window.location.replace(AUTH_CONFIG.defaultRedirectAfterLogin || '/admin/dashboard.html');
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
  } catch (_) {}

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

// Boot
log('Initialising login page');
showReasonMessage();

if (form) form.addEventListener('submit', handleLogin);
if (loginButton) loginButton.addEventListener('click', handleLogin);
if (resetButton) resetButton.addEventListener('click', handleReset);

redirectIfSessionExists();
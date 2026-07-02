/* ============================================================
   CCG ADMIN — LOGIN
   File: /admin/js/login.js
============================================================ */

import { login, restoreSession } from './auth.js';

const TAG = '[CCG-LOGIN]';

let form = null;
let emailInput = null;
let passwordInput = null;
let submitBtn = null;
let forgotBtn = null;
let msgEl = null;

function setMessage(text, kind = 'info') {
  if (!msgEl) return;
  msgEl.textContent = text || '';
  msgEl.dataset.state = kind;
  msgEl.setAttribute('role', text ? 'status' : 'presentation');
  msgEl.setAttribute('aria-live', kind === 'error' || kind === 'warning' ? 'assertive' : 'polite');
}

function authFailureMessage(error) {
  const category = String(error?.category || '').toLowerCase();
  const detail = String(error?.detail || error?.message || '').toLowerCase();

  if (category === 'network' || detail.includes('failed to fetch') || detail.includes('network')) {
    return 'Network error while contacting the authentication service. Please try again.';
  }
  if (category === 'rate_limit' || detail.includes('rate limit') || Number(error?.status) === 429) {
    return 'Too many sign-in attempts. Please wait and try again.';
  }
  if (detail.includes('email not confirmed')) {
    return 'Please confirm your email before logging in.';
  }
  if (category === 'credentials' || detail.includes('invalid login credentials')) {
    return 'Invalid email or password.';
  }
  if (category === 'session') {
    return 'Session issue detected. Please sign in again.';
  }

  return 'Sign in failed. Please check your details and try again.';
}

function showReasonMessage() {
  const url = new URL(window.location.href);
  const reason = url.searchParams.get('reason') || '';
  const role = url.searchParams.get('role') || '';

  if (reason === 'expired') {
    setMessage('Session expired. Please sign in again.', 'warning');
    return;
  }
  if (reason === 'role') {
    setMessage(role ? `Role "${role}" is not authorised for this page.` : 'Your account is not authorised for this admin area.', 'warning');
    return;
  }
  if (reason === 'signed_out') {
    setMessage('Signed out. Please sign in again.', 'info');
    return;
  }
  if (reason) {
    setMessage('Please sign in to continue.', 'info');
  }
}

function ensurePasswordPeek() {
  if (!passwordInput) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ccg-auth-peek';
  btn.textContent = 'Show password';
  btn.setAttribute('aria-label', 'Show password');

  btn.addEventListener('click', () => {
    const show = passwordInput.type === 'password';
    passwordInput.type = show ? 'text' : 'password';
    btn.textContent = show ? 'Hide password' : 'Show password';
    btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });

  passwordInput.insertAdjacentElement('afterend', btn);
}

async function onSubmit(ev) {
  ev.preventDefault();
  setMessage('');

  const email = (emailInput?.value || '').trim();
  const password = String(passwordInput?.value || '');

  if (!email) {
    setMessage('Please enter your admin email address.', 'warning');
    emailInput?.focus();
    return;
  }
  if (!password) {
    setMessage('Please enter your admin password.', 'warning');
    passwordInput?.focus();
    return;
  }

  try {
    submitBtn.disabled = true;
    setMessage('Signing in…', 'info');

    await login(email, password);
    const restored = await restoreSession();

    if (!restored?.session?.user) {
      throw new Error('Session could not be restored after sign-in.');
    }

    window.location.assign('/admin/dashboard.html');
  } catch (error) {
    console.error(TAG, error);
    setMessage(authFailureMessage(error), 'error');
    submitBtn.disabled = false;
  }
}

function init() {
  form = document.querySelector('[data-login-form]');
  emailInput = document.querySelector('[data-email-input]');
  passwordInput = document.querySelector('[data-password-input]');
  submitBtn = document.querySelector('[data-login-button]');
  forgotBtn = document.querySelector('[data-reset-button]');
  msgEl = document.querySelector('[data-message]');

  showReasonMessage();
  ensurePasswordPeek();

  form?.addEventListener('submit', onSubmit);
  forgotBtn?.addEventListener('click', () => {
    window.location.assign('/admin/forgot-password.html');
  });
}

init();

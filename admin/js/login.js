/* ============================================================
   CCG ADMIN — LOGIN
   File: /admin/js/login.js
============================================================ */

import { login, restoreSession, sendPasswordReset } from './auth.js';

const LOG = true;
const TAG = '[CCG-LOGIN]';

function log(...args) { if (LOG) console.log(TAG, ...args); }

let form = null;
let emailInput = null;
let passwordInput = null;
let submitBtn = null;
let resetBtn = null;
let msgEl = null;

function setMessage(text, kind = 'info') {
  if (!msgEl) return;
  msgEl.textContent = text || '';
  msgEl.dataset.kind = kind;
  msgEl.style.opacity = text ? '1' : '0';
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
    setMessage(role ? `Role "${role}" is not allowed for this page.` : 'Your role is not allowed for this page.', 'warning');
    return;
  }

  if (reason === 'signed_out') {
    setMessage('Signed out. Please sign in again.', 'info');
    return;
  }

  if (reason) {
    setMessage(`Please sign in to continue (${reason}).`, 'info');
  }
}

function ensurePasswordPeek() {
  if (!passwordInput) return;

  // If the HTML already provides a toggle, respect it.
  const existing = document.querySelector('[data-action="toggle-password"]');
  if (existing) {
    existing.addEventListener('click', () => {
      const next = passwordInput.type === 'password' ? 'text' : 'password';
      passwordInput.type = next;
      existing.textContent = next === 'password' ? 'Show' : 'Hide';
    });
    return;
  }

  // Otherwise, create a minimal toggle beside the password field.
  const wrapper = passwordInput.parentElement;
  if (!wrapper) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ccg-auth-peek';
  btn.textContent = 'Show';
  btn.setAttribute('aria-label', 'Toggle password visibility');

  btn.addEventListener('click', () => {
    const next = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = next;
    btn.textContent = next === 'password' ? 'Show' : 'Hide';
  });

  wrapper.appendChild(btn);
}

async function onSubmit(ev) {
  ev.preventDefault();
  setMessage('');

  const email = (emailInput?.value || '').trim();
  const password = String(passwordInput?.value || '');

  if (!email || !password) {
    setMessage('Please enter both email and password.', 'warning');
    return;
  }

  try {
    submitBtn?.setAttribute('disabled', 'disabled');
    setMessage('Signing in…', 'info');

    const ctx = await login(email, password);
    log('login ctx', ctx);

    // Ensure session is restored in this tab (prevents “bounce back” loops).
    await restoreSession();

    // Redirect
    window.location.href = '/admin/dashboard.html';
  } catch (e) {
    console.error(e);
    setMessage(e?.message ? `Sign in failed: ${e.message}` : 'Sign in failed.', 'error');
    submitBtn?.removeAttribute('disabled');
  }
}

async function onReset(ev) {
  ev.preventDefault();
  setMessage('');

  const email = (emailInput?.value || '').trim();
  if (!email) {
    setMessage('Enter your email first, then click reset password.', 'warning');
    return;
  }

  try {
    resetBtn?.setAttribute('disabled', 'disabled');
    setMessage('Sending reset email…', 'info');
    await sendPasswordReset(email);
    setMessage('Password reset email sent. Check your inbox.', 'success');
  } catch (e) {
    console.error(e);
    setMessage(e?.message ? `Reset failed: ${e.message}` : 'Reset failed.', 'error');
  } finally {
    resetBtn?.removeAttribute('disabled');
  }
}

async function init() {
  form = document.querySelector('form');
  emailInput = document.querySelector('input[type="email"], #email');
  passwordInput = document.querySelector('input[type="password"], #password');
  submitBtn = document.querySelector('button[type="submit"], #signInBtn');
  resetBtn = document.querySelector('[data-action="reset-password"], #resetPasswordBtn');
  msgEl = document.querySelector('[data-ccg-msg], #loginMessage');

  showReasonMessage();
  ensurePasswordPeek();

  if (form) form.addEventListener('submit', onSubmit);
  if (resetBtn) resetBtn.addEventListener('click', onReset);
}

init();

import { AUTH_CONFIG } from './config.js';
import { restoreSession, sendPasswordReset, updateAdminPassword } from './auth.js';

function $(selector) { return document.querySelector(selector); }
function setMessage(text, state = 'info') {
  const el = $('[data-message]');
  if (!el) return;
  el.textContent = text || '';
  el.dataset.state = state;
  el.setAttribute('aria-live', state === 'error' || state === 'warning' ? 'assertive' : 'polite');
}
function getHashParams() { return new URLSearchParams(window.location.hash.replace(/^#/, '')); }
function hasRecoveryParams() {
  const hash = getHashParams();
  const query = new URLSearchParams(window.location.search);
  const type = hash.get('type') || query.get('type') || '';
  return type === 'recovery' || Boolean(hash.get('access_token') || hash.get('refresh_token') || query.get('code'));
}
function attachToggle(button, input) {
  button?.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    button.textContent = show ? 'Hide password' : 'Show password';
  });
}

async function initForgot() {
  const form = $('[data-forgot-form]');
  const email = $('[data-email-input]');
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const value = (email?.value || '').trim();
    if (!value) {
      setMessage('Please enter your admin email address.', 'warning');
      email?.focus();
      return;
    }
    try {
      $('[data-submit-button]').disabled = true;
      setMessage('Requesting password recovery email…', 'info');
      await sendPasswordReset(value);
      setMessage('If that address is authorised for CCG Admin, a password recovery email will be sent shortly.', 'success');
    } catch (error) {
      console.error('[CCG-ADMIN-RECOVERY]', error);
      const detail = String(error?.detail || error?.message || '').toLowerCase();
      if (detail.includes('rate limit') || Number(error?.status) === 429) {
        setMessage('Too many password recovery requests. Please wait and try again.', 'error');
      } else if (detail.includes('network') || detail.includes('failed to fetch')) {
        setMessage('Network error while contacting the authentication service. Please try again.', 'error');
      } else {
        setMessage('Unable to request password recovery right now. Please try again.', 'error');
      }
    } finally {
      $('[data-submit-button]').disabled = false;
    }
  });
}

async function waitForRecoverySession() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const context = await restoreSession();
      if (context?.session?.user) return context;
    } catch (_error) {
      // Retry briefly while Supabase processes URL recovery tokens/codes.
    }
    await new Promise((resolve) => window.setTimeout(resolve, 150));
  }
  return null;
}

async function initReset() {
  const form = $('[data-reset-form]');
  const password = $('[data-password-input]');
  const confirm = $('[data-confirm-password-input]');
  attachToggle($('[data-toggle-password]'), password);
  attachToggle($('[data-toggle-confirm-password]'), confirm);

  if (!hasRecoveryParams()) {
    form?.setAttribute('hidden', 'hidden');
    setMessage('This password recovery link is missing, invalid or expired. Please request a new admin password reset email.', 'error');
    return;
  }

  const recoveryContext = await waitForRecoverySession();
  if (!recoveryContext?.session?.user) {
    form?.setAttribute('hidden', 'hidden');
    setMessage('This password recovery link is invalid or expired. Please request a new admin password reset email.', 'error');
    return;
  }

  setMessage('Recovery session detected. Enter a new admin password.', 'success');

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const next = String(password?.value || '');
    const repeated = String(confirm?.value || '');
    if (!next) {
      setMessage('Please enter a new password.', 'warning');
      password?.focus();
      return;
    }
    if (next.length < 8) {
      setMessage('New password must be at least 8 characters.', 'warning');
      password?.focus();
      return;
    }
    if (next !== repeated) {
      setMessage('New password and confirmation must match.', 'warning');
      confirm?.focus();
      return;
    }
    try {
      $('[data-submit-button]').disabled = true;
      setMessage('Saving new password…', 'info');
      await updateAdminPassword(next);
      form.setAttribute('hidden', 'hidden');
      const done = $('[data-complete]');
      done?.removeAttribute('hidden');
      setMessage('Password updated successfully. Return to the admin login page and sign in with the new password.', 'success');
      window.history.replaceState({}, document.title, AUTH_CONFIG.passwordResetRedirect);
    } catch (error) {
      console.error('[CCG-ADMIN-RESET]', error);
      setMessage(error?.message || 'The recovery link may be invalid or expired. Please request a new admin password reset email.', 'error');
    } finally {
      $('[data-submit-button]').disabled = false;
    }
  });
}

const page = document.body?.dataset?.recoveryPage;
if (page === 'forgot') initForgot();
if (page === 'reset') initReset();

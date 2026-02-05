import { AUTH_CONFIG } from './config.js';
import { login, restoreSession, sendPasswordReset } from './auth.js';
import { fetchUserRole } from './roles.js';
import { initAdminNav } from './admin-nav.js';

const form = document.querySelector('[data-login-form]');
const emailInput = document.querySelector('[data-email-input]');
const passwordInput = document.querySelector('[data-password-input]');
const loginButton = document.querySelector('[data-login-button]');
const resetButton = document.querySelector('[data-reset-button]');
const messageBox = document.querySelector('[data-message]');

function setMessage(message, type = 'info') {
  messageBox.textContent = message;
  messageBox.dataset.state = type;
}

function setLoading(isLoading) {
  loginButton.disabled = isLoading;
  resetButton.disabled = isLoading;
  loginButton.textContent = isLoading ? 'Signing in…' : 'Sign in';
}

async function redirectIfSessionExists() {
  const session = await restoreSession();
  if (session?.user?.id) {
    window.location.replace(AUTH_CONFIG.defaultRedirectAfterLogin);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  setLoading(true);
  setMessage('Authenticating…', 'info');

  try {
    const { user } = await login(emailInput.value, passwordInput.value);
    await fetchUserRole({ userId: user.id, force: true });
    setMessage('Login successful. Redirecting to dashboard…', 'success');
    window.location.replace(AUTH_CONFIG.defaultRedirectAfterLogin);
  } catch (error) {
    setMessage(error.message || 'Login failed. Check credentials and try again.', 'error');
  } finally {
    setLoading(false);
  }
}

async function handleReset() {
  if (!emailInput.value) {
    setMessage('Enter your email address before requesting a reset link.', 'error');
    return;
  }
  setLoading(true);
  setMessage('Sending password reset email…', 'info');

  try {
    await sendPasswordReset(emailInput.value);
    setMessage('Password reset email sent. Check your inbox.', 'success');
  } catch (error) {
    setMessage(error.message || 'Unable to send reset email.', 'error');
  } finally {
    setLoading(false);
  }
}

form.addEventListener('submit', handleLogin);
resetButton.addEventListener('click', handleReset);
initAdminNav({ pageLabel: 'Login', active: 'dashboard' });
redirectIfSessionExists();

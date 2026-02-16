import { getAuthedUserOrNull, getAdminSummary } from './community-api.js';

const msg = document.getElementById('adminMessage');

function showError(text) {
  msg.textContent = text;
  msg.classList.add('auth-error');
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = await getAuthedUserOrNull();
  if (!user) {
    // require login; admin view is not public
    window.location.href = '/auth/login.html';
    return;
  }

  const { data, error } = await getAdminSummary();
  if (error || !data) {
    showError('Could not load admin stats.');
    return;
  }

  document.getElementById('statUsers').textContent = data.total_users ?? '0';
  document.getElementById('statComments').textContent = data.total_comments ?? '0';
  document.getElementById('statRatings').textContent = data.total_ratings ?? '0';
  document.getElementById('statActivity').textContent = data.total_activity ?? '0';
});

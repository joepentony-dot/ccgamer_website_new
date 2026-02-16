import { getAuthedUserOrNull, getAdminSummary } from './community-api.js';

const msg = document.getElementById('adminMessage');
const stats = document.getElementById('adminStats');

function showError(text) {
  msg.textContent = text;
  msg.classList.remove('auth-success');
  msg.classList.add('auth-error');
}

function showNotAuthorised() {
  showError('Not authorised for Community Admin.');
  const backLink = document.createElement('a');
  backLink.className = 'auth-btn';
  backLink.href = '/community/index.html';
  backLink.textContent = 'Back to Community Hub';
  msg.appendChild(document.createTextNode(' '));
  msg.appendChild(backLink);
  stats.hidden = true;
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = await getAuthedUserOrNull();
  if (!user) {
    window.location.href = '/auth/login.html';
    return;
  }

  const { data, error } = await getAdminSummary();
  if (error || !data) {
    showNotAuthorised();
    return;
  }

  stats.hidden = false;
  document.getElementById('statUsers').textContent = data.total_users ?? '0';
  document.getElementById('statComments').textContent = data.total_comments ?? '0';
  document.getElementById('statRatings').textContent = data.total_ratings ?? '0';
  document.getElementById('statActivity').textContent = data.total_activity ?? '0';
});

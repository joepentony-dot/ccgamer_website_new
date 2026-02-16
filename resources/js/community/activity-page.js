import { listActivity } from './community-api.js';

const msg = document.getElementById('activityMessage');
const listEl = document.getElementById('activityList');

function row(label, valueHtml) {
  const div = document.createElement('div');
  div.className = 'profile-row';
  div.innerHTML = `<span>${label}</span><strong>${valueHtml}</strong>`;
  return div;
}

function showError(text) {
  msg.textContent = text;
  msg.classList.add('auth-error');
}

document.addEventListener('DOMContentLoaded', async () => {
  const { data, error } = await listActivity(50);
  if (error) {
    showError('Could not load activity right now.');
    return;
  }

  if (!data.length) {
    listEl.appendChild(row('Status', 'No activity yet.'));
    return;
  }

  // Render compact list using existing CSS classes
  data.forEach((item) => {
    const when = new Date(item.created_at).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const label = `${item.activity_type}${item.game_slug ? ` • ${item.game_slug}` : ''}`;
    listEl.appendChild(row(when, label));
  });
});

import { getPublicProfileById } from './community-api.js';

const msg = document.getElementById('publicMessage');
const nameEl = document.getElementById('publicDisplayName');
const joinEl = document.getElementById('publicJoinDate');

function showError(text) {
  msg.textContent = text;
  msg.classList.add('auth-error');
}

function getProfileIdFromUrl() {
  // Supports:
  // /community/public-profile.html?id=<uuid>
  const u = new URL(location.href);
  return u.searchParams.get('id');
}

document.addEventListener('DOMContentLoaded', async () => {
  const id = getProfileIdFromUrl();
  if (!id) {
    showError('Missing profile id.');
    return;
  }

  const { data, error } = await getPublicProfileById(id);
  if (error || !data) {
    showError('Could not load public profile.');
    return;
  }

  nameEl.textContent = data.display_name || '—';
  joinEl.textContent = new Date(data.joined_at).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
});

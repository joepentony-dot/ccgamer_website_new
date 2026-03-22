import { listTopRated } from './community-api.js';

const msg = document.getElementById('topRatedMessage');
const listEl = document.getElementById('topRatedList');

function setError(text) {
  msg.textContent = text;
  msg.classList.add('auth-error');
}

function buildRow(item, index) {
  const row = document.createElement('div');
  row.className = 'profile-row';

  const label = document.createElement('span');
  label.textContent = `#${index + 1} • ${item.game_slug}`;

  const strong = document.createElement('strong');
  const rating = Number(item.avg_rating || 0).toFixed(2);
  const count = Number(item.rating_count || 0);

  const text = document.createElement('span');
  text.textContent = `Avg ${rating}/5 (${count} ratings)`;

  const link = document.createElement('a');
  link.className = 'auth-btn';
  const slug = String(item.game_slug || '').trim().replace(/_/g, '-').toLowerCase();
  link.href = slug ? `/games/${encodeURIComponent(slug)}/` : '/games/';
  link.textContent = 'Open game';

  strong.appendChild(text);
  strong.appendChild(document.createTextNode(' '));
  strong.appendChild(link);

  row.appendChild(label);
  row.appendChild(strong);
  return row;
}

document.addEventListener('DOMContentLoaded', async () => {
  const { data, error } = await listTopRated(30);
  if (error) {
    setError('Could not load top-rated games right now.');
    return;
  }

  if (!data.length) {
    const row = document.createElement('div');
    row.className = 'profile-row';

    const left = document.createElement('span');
    left.textContent = 'Status';

    const right = document.createElement('strong');
    right.textContent = 'No ratings yet.';

    row.appendChild(left);
    row.appendChild(right);
    listEl.appendChild(row);
    return;
  }

  data.forEach((item, index) => listEl.appendChild(buildRow(item, index)));
});

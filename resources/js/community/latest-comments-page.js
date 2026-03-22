import { listLatestComments } from './community-api.js';

const msg = document.getElementById('latestCommentsMessage');
const listEl = document.getElementById('latestCommentsList');

function setError(text) {
  msg.textContent = text;
  msg.classList.add('auth-error');
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function truncate(input, max = 120) {
  const value = String(input || '').trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function buildRow(item) {
  const row = document.createElement('div');
  row.className = 'profile-row';

  const label = document.createElement('span');
  const name = item.display_name || 'Community member';
  const when = formatDate(item.created_at);
  label.textContent = `${name} • ${when} • ${item.game_slug}`;

  const strong = document.createElement('strong');
  const excerpt = truncate(item.content, 140);
  const link = document.createElement('a');
  link.className = 'auth-btn';
  const slug = String(item.game_slug || '').trim().replace(/_/g, '-').toLowerCase();
  link.href = slug ? `/games/${encodeURIComponent(slug)}/` : '/games/';
  link.textContent = 'Open game';

  const excerptText = document.createElement('span');
  excerptText.textContent = excerpt;
  strong.appendChild(excerptText);
  strong.appendChild(document.createTextNode(' '));
  strong.appendChild(link);

  row.appendChild(label);
  row.appendChild(strong);
  return row;
}

document.addEventListener('DOMContentLoaded', async () => {
  const { data, error } = await listLatestComments(30);
  if (error) {
    setError('Could not load latest comments right now.');
    return;
  }

  if (!data.length) {
    const row = document.createElement('div');
    row.className = 'profile-row';

    const left = document.createElement('span');
    left.textContent = 'Status';

    const right = document.createElement('strong');
    right.textContent = 'No comments yet.';

    row.appendChild(left);
    row.appendChild(right);
    listEl.appendChild(row);
    return;
  }

  data.forEach((item) => listEl.appendChild(buildRow(item)));
});

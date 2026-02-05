import { supabase } from './auth.js';

const DEFAULT_ENDPOINT = '/functions/v1/games-json-proxy';
const CSRF_KEY = 'ccg-admin-csrf';

function getCsrfToken() {
  let token = sessionStorage.getItem(CSRF_KEY);
  if (!token) {
    token = `${Date.now()}-${crypto.randomUUID()}`;
    sessionStorage.setItem(CSRF_KEY, token);
  }
  return token;
}

async function request(path, options = {}) {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('No authenticated session token available.');
  }

  const endpoint = window.CCG_GAMES_EDITOR_ENDPOINT || DEFAULT_ENDPOINT;
  const response = await fetch(`${endpoint}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      'X-CSRF-Token': getCsrfToken(),
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed with status ${response.status}`);
  }
  return payload;
}

export async function fetchGamesJson() {
  return request('/read');
}

export async function fetchFileIndex() {
  return request('/file-index');
}

export async function fetchBackups() {
  return request('/backups');
}

export async function restoreBackup(backupId) {
  return request('/restore', {
    method: 'POST',
    body: { backupId }
  });
}

export async function saveGamesJson({ games, message, role }) {
  return request('/save', {
    method: 'POST',
    body: { games, message, role }
  });
}

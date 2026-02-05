import { supabase } from './auth.js';

const DEFAULT_ENDPOINT = '/functions/v1/asset-manager-proxy';
const CSRF_KEY = 'ccg-asset-manager-csrf';

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

  const endpoint = window.CCG_ASSET_MANAGER_ENDPOINT || DEFAULT_ENDPOINT;
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

export function scanAssets() {
  return request('/scan');
}

export function getHealthReport() {
  return request('/health');
}

export function createSnapshot() {
  return request('/snapshot', { method: 'POST' });
}

export function uploadAssets(payload) {
  return request('/upload', {
    method: 'POST',
    body: payload
  });
}

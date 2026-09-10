const ACHIEVEMENTS_PATH = '/v1/lost-sizzler/achievements';
const COLLECTION_PATH = '/v1/lost-sizzler/collection';

function normalizeBaseUrl(value) {
  const url = new URL(String(value || ''));
  const localHttp = url.protocol === 'http:' && ['127.0.0.1', 'localhost', '::1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !localHttp) throw new Error('ccg_backend_requires_https');
  if (url.username || url.password) throw new Error('ccg_backend_url_must_not_include_credentials');
  url.pathname = url.pathname.replace(/\/+$/, '');
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

async function decodeJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: 'invalid_backend_response' };
  }
}

function failure(status, body) {
  let kind = 'remote_error';
  if (status === 400 || status === 413 || status === 415 || status === 422) kind = 'invalid_request';
  else if (status === 401) kind = 'unauthorized';
  else if (status === 403) kind = 'forbidden';
  else if (status === 409) kind = 'conflict';
  else if (status === 503) kind = 'unavailable';
  return Object.freeze({
    ok: false,
    kind,
    status,
    error: typeof body?.error === 'string' ? body.error : 'remote_error',
  });
}

export function createLostSizzlerProgressClient({
  baseUrl,
  fetchImpl = globalThis.fetch,
  getAccessToken = () => null,
} = {}) {
  const endpointBase = normalizeBaseUrl(baseUrl);
  if (typeof fetchImpl !== 'function') throw new Error('fetch implementation is required');
  if (typeof getAccessToken !== 'function') throw new Error('getAccessToken must be a function');

  async function request(path, method, payload) {
    const token = String(getAccessToken() || '').trim();
    if (!token) {
      return Object.freeze({ ok: false, kind: 'unauthenticated', status: 0, error: 'authentication_required' });
    }

    const headers = {
      accept: 'application/json',
      authorization: `Bearer ${token}`,
    };
    const options = {
      method,
      headers,
      credentials: 'omit',
    };
    if (payload !== undefined) {
      headers['content-type'] = 'application/json';
      options.body = JSON.stringify(payload);
    }

    try {
      const response = await fetchImpl(`${endpointBase}${path}`, options);
      const body = await decodeJson(response);
      if (!response.ok) return failure(response.status, body);
      return Object.freeze({ ...body, ok: true, kind: 'success', status: response.status });
    } catch {
      return Object.freeze({ ok: false, kind: 'network_error', status: 0, error: 'network_error' });
    }
  }

  return Object.freeze({
    achievements: Object.freeze({
      list() {
        return request(ACHIEVEMENTS_PATH, 'GET');
      },
      unlock(payload) {
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
          return Promise.resolve(Object.freeze({ ok: false, kind: 'invalid_request', status: 0, error: 'invalid_achievement_payload' }));
        }
        return request(ACHIEVEMENTS_PATH, 'POST', payload);
      },
    }),
    collection: Object.freeze({
      pull() {
        return request(COLLECTION_PATH, 'GET');
      },
      push(payload) {
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
          return Promise.resolve(Object.freeze({ ok: false, kind: 'invalid_request', status: 0, error: 'invalid_collection_payload' }));
        }
        return request(COLLECTION_PATH, 'PUT', payload);
      },
    }),
  });
}

const WEEKLY_PATH = '/v1/lost-sizzler/weekly-vault';

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

function retryAfterSeconds(response) {
  const value = Number(response?.headers?.get?.('retry-after'));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function classifyFailure(response, body) {
  const status = Number(response?.status) || 0;
  const error = typeof body?.error === 'string' ? body.error : 'remote_error';
  const retry_after_seconds = retryAfterSeconds(response);
  if (status === 401) return Object.freeze({ ok: false, kind: 'unauthorized', status, error });
  if (status === 403) return Object.freeze({ ok: false, kind: 'forbidden', status, error });
  if (status === 409) return Object.freeze({ ok: false, kind: 'conflict', status, error });
  if (status === 422) return Object.freeze({ ok: false, kind: 'invalid_result', status, error });
  if (status === 429) return Object.freeze({ ok: false, kind: 'rate_limited', status, error, retry_after_seconds });
  return Object.freeze({ ok: false, kind: 'remote_error', status, error });
}

function validObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function createLostSizzlerWeeklyVault({
  baseUrl,
  getAccessToken,
  fetchImpl = globalThis.fetch,
} = {}) {
  const endpointBase = normalizeBaseUrl(baseUrl);
  if (typeof getAccessToken !== 'function') throw new Error('getAccessToken is required');
  if (typeof fetchImpl !== 'function') throw new Error('fetch implementation is required');

  async function token({ required }) {
    try {
      const value = String((await getAccessToken()) || '').trim();
      if (required && !value) return Object.freeze({ ok: false, kind: 'unauthenticated', status: 0, error: 'token_unavailable' });
      return Object.freeze({ ok: true, value });
    } catch {
      if (required) return Object.freeze({ ok: false, kind: 'unauthenticated', status: 0, error: 'token_unavailable' });
      return Object.freeze({ ok: true, value: '' });
    }
  }

  async function request(action, payload = {}, { authRequired = false } = {}) {
    const bearer = await token({ required: authRequired });
    if (!bearer.ok) return bearer;

    const headers = {
      accept: 'application/json',
      'content-type': 'application/json',
    };
    if (bearer.value) headers.authorization = `Bearer ${bearer.value}`;

    try {
      const response = await fetchImpl(`${endpointBase}${WEEKLY_PATH}`, {
        method: 'POST',
        headers,
        credentials: 'omit',
        body: JSON.stringify({ action, ...payload }),
      });
      const body = await decodeJson(response);
      if (!response.ok) return classifyFailure(response, body);
      if (!validObject(body)) return Object.freeze({ ok: false, kind: 'invalid_response', status: response.status, error: 'invalid_backend_response' });
      return Object.freeze({ ok: true, kind: 'success', status: response.status, body });
    } catch {
      return Object.freeze({ ok: false, kind: 'network_error', status: 0, error: 'network_error' });
    }
  }

  return Object.freeze({
    async status() {
      const result = await request('status');
      return result.ok ? Object.freeze({ ...result.body, ok: true, kind: 'success', status: result.status }) : result;
    },

    async ghost() {
      const result = await request('ghost', {}, { authRequired: true });
      return result.ok ? Object.freeze({ ...result.body, ok: true, kind: 'success', status: result.status }) : result;
    },

    async start() {
      const result = await request('start', {}, { authRequired: true });
      return result.ok ? Object.freeze({ ...result.body, ok: true, kind: 'success', status: result.status }) : result;
    },

    async finish({ attemptId, result: weeklyResult } = {}) {
      const normalizedAttemptId = String(attemptId || '').trim();
      if (!normalizedAttemptId || normalizedAttemptId.length > 128 || !validObject(weeklyResult)) {
        return Object.freeze({ ok: false, kind: 'invalid_request', status: 0, error: 'invalid_weekly_finish_request' });
      }
      const response = await request(
        'finish',
        { attemptId: normalizedAttemptId, result: weeklyResult },
        { authRequired: true }
      );
      return response.ok ? Object.freeze({ ...response.body, ok: true, kind: 'success', status: response.status }) : response;
    },
  });
}

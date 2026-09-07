const FEEDBACK_PATH = '/v1/lost-sizzler/feedback';

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
    return { success: false, error: 'invalid_backend_response' };
  }
}

function retryAfter(response) {
  const raw = response?.headers?.get?.('retry-after');
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function failure(status, body, response) {
  const error = typeof body?.error === 'string' ? body.error : 'remote_error';
  let kind = 'remote_error';
  if (status === 400 || status === 413 || status === 415 || status === 422) kind = 'invalid_request';
  else if (status === 401) kind = 'unauthorized';
  else if (status === 403) kind = 'forbidden';
  else if (status === 429) kind = 'rate_limited';
  else if (status === 503) kind = 'unavailable';

  return Object.freeze({
    ok: false,
    kind,
    status,
    error,
    retry_after: status === 429 ? retryAfter(response) : null,
  });
}

function accepted(status, body) {
  if (body?.success !== true) {
    return Object.freeze({
      ok: false,
      kind: 'invalid_response',
      status,
      error: typeof body?.error === 'string' ? body.error : 'invalid_backend_response',
    });
  }
  return Object.freeze({ ...body, ok: true, kind: 'success', status });
}

export function createLostSizzlerFeedbackClient({
  baseUrl,
  fetchImpl = globalThis.fetch,
  getAccessToken = () => null,
} = {}) {
  const endpointBase = normalizeBaseUrl(baseUrl);
  if (typeof fetchImpl !== 'function') throw new Error('fetch implementation is required');
  if (typeof getAccessToken !== 'function') throw new Error('getAccessToken must be a function');

  async function request(payload, { authenticatedIfAvailable = false } = {}) {
    const headers = {
      accept: 'application/json',
      'content-type': 'application/json',
    };
    if (authenticatedIfAvailable) {
      const token = String(getAccessToken() || '').trim();
      if (token) headers.authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetchImpl(`${endpointBase}${FEEDBACK_PATH}`, {
        method: 'POST',
        headers,
        credentials: 'omit',
        body: JSON.stringify(payload),
      });
      const body = await decodeJson(response);
      if (!response.ok) return failure(response.status, body, response);
      return accepted(response.status, body);
    } catch {
      return Object.freeze({ ok: false, kind: 'network_error', status: 0, error: 'network_error' });
    }
  }

  return Object.freeze({
    ratingStatus() {
      return request({ action: 'rating_status' }, { authenticatedIfAvailable: true });
    },

    telemetry(payload = {}) {
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return Promise.resolve(Object.freeze({
          ok: false,
          kind: 'invalid_request',
          status: 0,
          error: 'invalid_telemetry_payload',
        }));
      }
      return request(
        { ...payload, action: 'telemetry' },
        { authenticatedIfAvailable: true }
      );
    },

    submit(payload = {}) {
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return Promise.resolve(Object.freeze({
          ok: false,
          kind: 'invalid_request',
          status: 0,
          error: 'invalid_feedback_payload',
        }));
      }
      const body = { ...payload };
      delete body.action;
      return request(body);
    },
  });
}

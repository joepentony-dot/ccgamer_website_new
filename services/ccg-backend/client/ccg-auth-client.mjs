const LOGIN_PATH = '/v1/auth/login';
const REFRESH_PATH = '/v1/auth/refresh';
const LOGOUT_PATH = '/v1/auth/logout';
const ME_PATH = '/v1/me';
const MAX_EMAIL_LENGTH = 320;
const MAX_PASSWORD_LENGTH = 1024;

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

function normalizeLoginInput({ email, password } = {}) {
  const normalizedEmail = String(email || '').trim();
  if (normalizedEmail.length < 3 || normalizedEmail.length > MAX_EMAIL_LENGTH || !normalizedEmail.includes('@')) {
    throw new Error('invalid_email');
  }
  if (typeof password !== 'string' || password.length < 1 || password.length > MAX_PASSWORD_LENGTH) {
    throw new Error('invalid_password');
  }
  return Object.freeze({ email: normalizedEmail, password });
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

function remoteFailure(status, body) {
  const error = typeof body?.error === 'string' ? body.error : 'remote_error';
  if (status === 401) return Object.freeze({ ok: false, kind: 'unauthorized', status, error });
  if (status === 403) return Object.freeze({ ok: false, kind: 'forbidden', status, error });
  if (status === 429) return Object.freeze({ ok: false, kind: 'rate_limited', status, error });
  return Object.freeze({ ok: false, kind: 'remote_error', status, error });
}

function publicSession(body) {
  const accessToken = String(body?.access_token || '').trim();
  const userId = String(body?.user_id || '').trim();
  const expiresIn = Number(body?.expires_in);
  if (!accessToken || !userId || !Number.isSafeInteger(expiresIn) || expiresIn < 1) {
    throw new Error('invalid_backend_session');
  }
  return Object.freeze({
    accessToken,
    userId,
    expiresIn,
    refreshExpiresAt: typeof body?.refresh_expires_at === 'string' ? body.refresh_expires_at : null,
  });
}

export function createCcgAuthClient({ baseUrl, fetchImpl = globalThis.fetch } = {}) {
  const endpointBase = normalizeBaseUrl(baseUrl);
  if (typeof fetchImpl !== 'function') throw new Error('fetch implementation is required');

  let accessToken = '';
  let userId = '';

  function clearLocalSession() {
    accessToken = '';
    userId = '';
  }

  async function request(path, { method = 'GET', body, bearer = false, includeCredentials = false } = {}) {
    const headers = { accept: 'application/json' };
    if (bearer) {
      if (!accessToken) return Object.freeze({ ok: false, kind: 'unauthenticated', status: 0, error: 'token_unavailable' });
      headers.authorization = `Bearer ${accessToken}`;
    }

    const options = {
      method,
      headers,
      credentials: includeCredentials ? 'include' : 'omit',
    };
    if (body !== undefined) {
      headers['content-type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetchImpl(`${endpointBase}${path}`, options);
      const responseBody = await decodeJson(response);
      if (!response.ok) return remoteFailure(response.status, responseBody);
      return Object.freeze({ ok: true, kind: 'success', status: response.status, body: responseBody });
    } catch {
      return Object.freeze({ ok: false, kind: 'network_error', status: 0, error: 'network_error' });
    }
  }

  function acceptSession(result) {
    if (!result.ok) return result;
    try {
      const session = publicSession(result.body);
      accessToken = session.accessToken;
      userId = session.userId;
      return Object.freeze({
        ok: true,
        kind: 'success',
        status: result.status,
        user_id: session.userId,
        expires_in: session.expiresIn,
        refresh_expires_at: session.refreshExpiresAt,
      });
    } catch {
      clearLocalSession();
      return Object.freeze({ ok: false, kind: 'invalid_response', status: result.status, error: 'invalid_backend_session' });
    }
  }

  return Object.freeze({
    async login(input) {
      let credentials;
      try {
        credentials = normalizeLoginInput(input);
      } catch (error) {
        return Object.freeze({ ok: false, kind: 'invalid_request', status: 0, error: String(error?.message || error) });
      }

      clearLocalSession();
      const result = await request(LOGIN_PATH, {
        method: 'POST',
        body: credentials,
        includeCredentials: true,
      });
      return acceptSession(result);
    },

    async refresh() {
      const result = await request(REFRESH_PATH, {
        method: 'POST',
        includeCredentials: true,
      });
      if (!result.ok) {
        if (result.kind === 'unauthorized') clearLocalSession();
        return result;
      }
      return acceptSession(result);
    },

    async logout() {
      const result = await request(LOGOUT_PATH, {
        method: 'POST',
        includeCredentials: true,
      });
      clearLocalSession();
      return result.ok
        ? Object.freeze({ ok: true, kind: 'success', status: result.status, revoked: Boolean(result.body?.revoked) })
        : result;
    },

    async me() {
      const result = await request(ME_PATH, { bearer: true });
      if (!result.ok) {
        if (result.kind === 'unauthorized') clearLocalSession();
        return result;
      }
      return Object.freeze({
        ok: true,
        kind: 'success',
        status: result.status,
        user_id: result.body?.user_id ?? null,
        profile: result.body?.profile ?? null,
      });
    },

    getAccessToken() {
      return accessToken || null;
    },

    getUserId() {
      return userId || null;
    },

    clearLocalSession,
  });
}

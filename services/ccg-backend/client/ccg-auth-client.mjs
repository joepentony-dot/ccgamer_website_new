const LOGIN_PATH = '/v1/auth/login';
const REFRESH_PATH = '/v1/auth/refresh';
const LOGOUT_PATH = '/v1/auth/logout';
const REGISTER_PATH = '/v1/auth/register';
const CONFIRM_EMAIL_PATH = '/v1/auth/confirm-email';
const RECOVER_PATH = '/v1/auth/recover';
const RESET_PASSWORD_PATH = '/v1/auth/reset-password';
const ME_PATH = '/v1/me';
const MAX_EMAIL_LENGTH = 320;
const MAX_PASSWORD_LENGTH = 1024;
const MIN_REGISTRATION_PASSWORD_LENGTH = 10;
const MIN_RESET_PASSWORD_LENGTH = 12;

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

function normalizeEmail(value) {
  const email = String(value || '').trim();
  if (email.length < 3 || email.length > MAX_EMAIL_LENGTH || !email.includes('@')) {
    throw new Error('invalid_email');
  }
  return email;
}

function normalizeLoginInput({ email, password } = {}) {
  const normalizedEmail = normalizeEmail(email);
  if (typeof password !== 'string' || password.length < 1 || password.length > MAX_PASSWORD_LENGTH) {
    throw new Error('invalid_password');
  }
  return Object.freeze({ email: normalizedEmail, password });
}

function normalizeRegistrationPreferences(value) {
  if (value === undefined || value === null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('invalid_notification_preferences');
  }
  const required = [
    'notify_new_games',
    'notify_newsletter',
    'notify_new_games_choice_recorded',
    'notify_newsletter_choice_recorded',
  ];
  for (const key of required) {
    if (typeof value[key] !== 'boolean') throw new Error('invalid_notification_preferences');
  }
  if (!value.notify_new_games_choice_recorded || !value.notify_newsletter_choice_recorded) {
    throw new Error('invalid_notification_preferences');
  }
  return Object.freeze({
    notify_new_games: value.notify_new_games,
    notify_newsletter: value.notify_newsletter,
    notify_new_games_choice_recorded: true,
    notify_newsletter_choice_recorded: true,
  });
}

function normalizeRegistrationInput({ email, password, notification_preferences: notificationPreferences } = {}) {
  const normalized = normalizeLoginInput({ email, password });
  if (password.length < MIN_REGISTRATION_PASSWORD_LENGTH || password.length > 128 || /^\s+$/.test(password)) {
    throw new Error('invalid_password');
  }
  const preferences = normalizeRegistrationPreferences(notificationPreferences);
  return Object.freeze(preferences
    ? { ...normalized, notification_preferences: preferences }
    : normalized);
}

function normalizeVerificationToken(value) {
  const token = String(value || '').trim();
  if (!/^[A-Za-z0-9_-]{32,256}$/.test(token)) throw new Error('invalid_verification_token');
  return token;
}

function normalizeRecoveryToken(value) {
  const token = String(value || '').trim();
  if (!/^[A-Za-z0-9_-]{32,512}$/.test(token)) throw new Error('invalid_recovery_token');
  return token;
}

function normalizeResetInput({ token, newPassword } = {}) {
  const normalizedToken = normalizeRecoveryToken(token);
  if (
    typeof newPassword !== 'string' ||
    newPassword.length < MIN_RESET_PASSWORD_LENGTH ||
    newPassword.length > 128 ||
    /^\s+$/.test(newPassword)
  ) {
    throw new Error('invalid_new_password');
  }
  return Object.freeze({ token: normalizedToken, new_password: newPassword });
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
    async register(input) {
      let registration;
      try {
        registration = normalizeRegistrationInput(input);
      } catch (error) {
        return Object.freeze({ ok: false, kind: 'invalid_request', status: 0, error: String(error?.message || error) });
      }
      const result = await request(REGISTER_PATH, { method: 'POST', body: registration });
      if (!result.ok) return result;
      return Object.freeze({
        ok: true,
        kind: 'success',
        status: result.status,
        accepted: Boolean(result.body?.accepted),
        verification_required: Boolean(result.body?.verification_required),
      });
    },

    async confirmEmail(tokenValue) {
      let token;
      try {
        token = normalizeVerificationToken(tokenValue);
      } catch (error) {
        return Object.freeze({ ok: false, kind: 'invalid_request', status: 0, error: String(error?.message || error) });
      }
      const result = await request(CONFIRM_EMAIL_PATH, { method: 'POST', body: { token } });
      if (!result.ok) return result;
      return Object.freeze({
        ok: true,
        kind: 'success',
        status: result.status,
        confirmed: Boolean(result.body?.confirmed),
        user_id: result.body?.user_id ?? null,
      });
    },

    async requestPasswordReset({ email } = {}) {
      let normalizedEmail;
      try {
        normalizedEmail = normalizeEmail(email);
      } catch (error) {
        return Object.freeze({ ok: false, kind: 'invalid_request', status: 0, error: String(error?.message || error) });
      }
      const result = await request(RECOVER_PATH, { method: 'POST', body: { email: normalizedEmail } });
      if (!result.ok) return result;
      return Object.freeze({
        ok: true,
        kind: 'success',
        status: result.status,
        accepted: Boolean(result.body?.accepted),
      });
    },

    async resetPassword(input) {
      let reset;
      try {
        reset = normalizeResetInput(input);
      } catch (error) {
        return Object.freeze({ ok: false, kind: 'invalid_request', status: 0, error: String(error?.message || error) });
      }
      const result = await request(RESET_PASSWORD_PATH, { method: 'POST', body: reset });
      if (!result.ok) return result;
      clearLocalSession();
      return Object.freeze({
        ok: true,
        kind: 'success',
        status: result.status,
        reset: Boolean(result.body?.reset),
      });
    },

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
        email: result.body?.email ?? null,
        email_confirmed_at: result.body?.email_confirmed_at ?? null,
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

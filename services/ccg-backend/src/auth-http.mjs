const MAX_AUTH_REQUEST_BYTES = 16 * 1024;
const REFRESH_COOKIE = 'ccg_refresh';

function httpError(statusCode, code, message = code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

async function readAuthJsonBody(request) {
  const contentType = String(request.headers['content-type'] || '').toLowerCase();
  if (!contentType.startsWith('application/json')) throw httpError(415, 'content_type_must_be_json');

  const declaredLength = Number(request.headers['content-length'] || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_AUTH_REQUEST_BYTES) {
    throw httpError(413, 'request_too_large');
  }

  const chunks = [];
  let received = 0;
  for await (const chunk of request) {
    received += chunk.length;
    if (received > MAX_AUTH_REQUEST_BYTES) throw httpError(413, 'request_too_large');
    chunks.push(chunk);
  }
  if (received === 0) throw httpError(400, 'empty_request_body');

  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('object required');
    return parsed;
  } catch {
    throw httpError(400, 'invalid_json');
  }
}

function readCookie(request, name) {
  const header = String(request.headers.cookie || '');
  if (!header || header.length > 16 * 1024) return null;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 1) continue;
    const key = part.slice(0, index).trim();
    if (key !== name) continue;
    const value = part.slice(index + 1).trim();
    return value && value.length <= 512 ? value : null;
  }
  return null;
}

function sessionCookie(refreshToken, refreshExpiresAt) {
  const expires = new Date(refreshExpiresAt);
  if (!refreshToken || !Number.isFinite(expires.getTime())) throw new Error('Invalid refresh-session result');
  return `${REFRESH_COOKIE}=${refreshToken}; Path=/v1/auth; HttpOnly; Secure; SameSite=Strict; Expires=${expires.toUTCString()}`;
}

function clearedSessionCookie() {
  return `${REFRESH_COOKIE}=; Path=/v1/auth; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

function publicSession(result) {
  return Object.freeze({
    user_id: result.user_id,
    access_token: result.access_token,
    expires_in: result.expires_in,
    refresh_expires_at: result.refresh_expires_at,
  });
}

function requestFingerprint(request) {
  const remoteAddress = String(request.socket?.remoteAddress || '').slice(0, 128);
  const userAgent = String(request.headers['user-agent'] || '').slice(0, 256);
  return `${remoteAddress}|${userAgent}`;
}

export function createAuthHttp(auth) {
  if (!auth?.login || !auth?.refresh || !auth?.logout || !auth?.jwks) {
    throw new Error('CCG auth HTTP boundary requires the local authentication service.');
  }

  return Object.freeze({
    handles(method, pathname) {
      return (
        (method === 'GET' && pathname === '/.well-known/jwks.json') ||
        (method === 'POST' && pathname === '/v1/auth/login') ||
        (method === 'POST' && pathname === '/v1/auth/refresh') ||
        (method === 'POST' && pathname === '/v1/auth/logout')
      );
    },

    async handle(request, pathname) {
      if (request.method === 'GET' && pathname === '/.well-known/jwks.json') {
        return Object.freeze({ statusCode: 200, body: auth.jwks(), headers: {} });
      }

      if (request.method === 'POST' && pathname === '/v1/auth/login') {
        const body = await readAuthJsonBody(request);
        const result = await auth.login({
          email: body.email,
          password: body.password,
          fingerprint: requestFingerprint(request),
        });
        return Object.freeze({
          statusCode: 200,
          body: publicSession(result),
          headers: { 'set-cookie': sessionCookie(result.refresh_token, result.refresh_expires_at) },
        });
      }

      if (request.method === 'POST' && pathname === '/v1/auth/refresh') {
        const refreshToken = readCookie(request, REFRESH_COOKIE);
        if (!refreshToken) throw httpError(401, 'invalid_refresh_token');
        const result = await auth.refresh(refreshToken);
        return Object.freeze({
          statusCode: 200,
          body: publicSession(result),
          headers: { 'set-cookie': sessionCookie(result.refresh_token, result.refresh_expires_at) },
        });
      }

      if (request.method === 'POST' && pathname === '/v1/auth/logout') {
        const refreshToken = readCookie(request, REFRESH_COOKIE);
        const result = refreshToken ? await auth.logout(refreshToken) : { revoked: false };
        return Object.freeze({
          statusCode: 200,
          body: { revoked: Boolean(result.revoked) },
          headers: { 'set-cookie': clearedSessionCookie() },
        });
      }

      throw httpError(404, 'not_found');
    },
  });
}

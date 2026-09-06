const MAX_REGISTRATION_REQUEST_BYTES = 16 * 1024;

function httpError(statusCode, code, message = code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

async function readJsonBody(request) {
  const contentType = String(request.headers['content-type'] || '').toLowerCase();
  if (!contentType.startsWith('application/json')) throw httpError(415, 'content_type_must_be_json');
  const declaredLength = Number(request.headers['content-length'] || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REGISTRATION_REQUEST_BYTES) {
    throw httpError(413, 'request_too_large');
  }

  const chunks = [];
  let received = 0;
  for await (const chunk of request) {
    received += chunk.length;
    if (received > MAX_REGISTRATION_REQUEST_BYTES) throw httpError(413, 'request_too_large');
    chunks.push(chunk);
  }
  if (!received) throw httpError(400, 'empty_request_body');
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('object required');
    return parsed;
  } catch {
    throw httpError(400, 'invalid_json');
  }
}

function requestFingerprint(request) {
  const remoteAddress = String(request.socket?.remoteAddress || '').slice(0, 128);
  const userAgent = String(request.headers['user-agent'] || '').slice(0, 256);
  return `${remoteAddress}|${userAgent}`;
}

export function createAuthRegistrationHttp(registration) {
  if (!registration?.register || !registration?.confirmEmail) {
    throw new Error('CCG registration HTTP boundary requires the registration service.');
  }

  return Object.freeze({
    handles(method, pathname) {
      return (
        (method === 'POST' && pathname === '/v1/auth/register') ||
        (method === 'POST' && pathname === '/v1/auth/confirm-email')
      );
    },

    async handle(request, pathname) {
      const body = await readJsonBody(request);
      if (pathname === '/v1/auth/register') {
        const result = await registration.register({
          email: body.email,
          password: body.password,
          fingerprint: requestFingerprint(request),
        });
        return Object.freeze({ statusCode: 202, body: result, headers: {} });
      }
      if (pathname === '/v1/auth/confirm-email') {
        const result = await registration.confirmEmail(body.token);
        return Object.freeze({ statusCode: 200, body: result, headers: {} });
      }
      throw httpError(404, 'not_found');
    },
  });
}

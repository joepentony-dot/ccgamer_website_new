const MAX_RECOVERY_REQUEST_BYTES = 16 * 1024;

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
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RECOVERY_REQUEST_BYTES) {
    throw httpError(413, 'request_too_large');
  }

  const chunks = [];
  let received = 0;
  for await (const chunk of request) {
    received += chunk.length;
    if (received > MAX_RECOVERY_REQUEST_BYTES) throw httpError(413, 'request_too_large');
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

export function createAuthRecoveryHttp(recovery) {
  if (!recovery?.request || !recovery?.confirm) {
    throw new Error('CCG recovery HTTP boundary requires the password recovery service.');
  }

  return Object.freeze({
    handles(method, pathname) {
      return (
        (method === 'POST' && pathname === '/v1/auth/recover') ||
        (method === 'POST' && pathname === '/v1/auth/reset-password')
      );
    },

    async handle(request, pathname) {
      const body = await readJsonBody(request);

      if (pathname === '/v1/auth/recover') {
        const result = await recovery.request({
          email: body.email,
          fingerprint: requestFingerprint(request),
        });
        return Object.freeze({
          statusCode: 202,
          body: Object.freeze({ accepted: Boolean(result?.accepted) }),
          headers: {},
        });
      }

      if (pathname === '/v1/auth/reset-password') {
        const result = await recovery.confirm({
          token: body.token,
          new_password: body.new_password,
        });
        return Object.freeze({
          statusCode: 200,
          body: Object.freeze({ reset: Boolean(result?.reset) }),
          headers: {},
        });
      }

      throw httpError(404, 'not_found');
    },
  });
}

const MAX_WEEKLY_REQUEST_BYTES = 256 * 1024;
const WEEKLY_PATH = '/v1/lost-sizzler/weekly-vault';

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
  if (Number.isFinite(declaredLength) && declaredLength > MAX_WEEKLY_REQUEST_BYTES) {
    throw httpError(413, 'request_too_large');
  }

  const chunks = [];
  let received = 0;
  for await (const chunk of request) {
    received += chunk.length;
    if (received > MAX_WEEKLY_REQUEST_BYTES) throw httpError(413, 'request_too_large');
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
  const forwarded = String(
    request.headers['cf-connecting-ip'] ||
    request.headers['x-forwarded-for'] ||
    request.headers['x-real-ip'] ||
    ''
  ).split(',')[0].trim().slice(0, 128);
  const remoteAddress = String(request.socket?.remoteAddress || '').slice(0, 128);
  const userAgent = String(request.headers['user-agent'] || '').slice(0, 256);
  return `${remoteAddress}|${forwarded}|${userAgent}`;
}

function authorization(request) {
  return String(request.headers.authorization || '').trim();
}

async function optionalUserId(auth, request) {
  const header = authorization(request);
  if (!header) return null;
  const identity = await auth.verifyBearer(header);
  return identity.userId;
}

async function requiredUserId(auth, request) {
  const header = authorization(request);
  if (!header) throw httpError(401, 'authentication_required');
  const identity = await auth.verifyBearer(header);
  return identity.userId;
}

export function createWeeklyVaultHttp({ auth, weeklyVault } = {}) {
  if (!auth?.verifyBearer) throw new Error('CCG Weekly Vault HTTP boundary requires an authentication service.');
  if (!weeklyVault?.status || !weeklyVault?.ghost || !weeklyVault?.start || !weeklyVault?.finish) {
    throw new Error('CCG Weekly Vault HTTP boundary requires the Weekly Vault service.');
  }

  return Object.freeze({
    handles(method, pathname) {
      return method === 'POST' && pathname === WEEKLY_PATH;
    },

    async handle(request, pathname) {
      if (request.method !== 'POST' || pathname !== WEEKLY_PATH) throw httpError(404, 'not_found');
      const body = await readJsonBody(request);
      const action = String(body.action || 'status').trim().toLowerCase();
      if (!['status', 'ghost', 'start', 'finish'].includes(action)) throw httpError(400, 'unknown_weekly_action');
      const fingerprint = requestFingerprint(request);

      if (action === 'status') {
        const userId = await optionalUserId(auth, request);
        const result = await weeklyVault.status({ userId, fingerprint });
        return Object.freeze({ statusCode: 200, body: result, headers: {} });
      }

      const userId = await requiredUserId(auth, request);
      if (action === 'ghost') {
        const result = await weeklyVault.ghost({ userId, fingerprint });
        return Object.freeze({ statusCode: 200, body: result, headers: {} });
      }
      if (action === 'start') {
        const result = await weeklyVault.start({ userId, fingerprint });
        return Object.freeze({ statusCode: 200, body: result, headers: {} });
      }

      const result = await weeklyVault.finish({
        userId,
        attemptId: body.attemptId ?? body.attempt_id,
        result: body.result,
        fingerprint,
      });
      return Object.freeze({ statusCode: 200, body: result, headers: {} });
    },
  });
}

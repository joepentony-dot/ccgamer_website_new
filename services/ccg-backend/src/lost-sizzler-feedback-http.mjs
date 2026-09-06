import { readJsonBody } from './cloud-save.mjs';
import { requestFingerprintValue } from './lost-sizzler-feedback.mjs';

const FEEDBACK_PATH = '/v1/lost-sizzler/feedback';

function remoteAddress(request) {
  const raw = String(
    request.headers['cf-connecting-ip']
      || request.headers['x-forwarded-for']
      || request.headers['x-real-ip']
      || request.socket?.remoteAddress
      || ''
  );
  return raw.split(',')[0].trim();
}

async function optionalUserId(auth, authorization) {
  if (!authorization) return null;
  try {
    const identity = await auth.verifyBearer(authorization);
    return identity?.userId || null;
  } catch {
    return null;
  }
}

function requestError(error) {
  const code = String(error?.code || error?.message || '');
  if (code === 'invalid_json') return Object.freeze({ statusCode: 400, body: { success: false, error: 'Invalid JSON' }, headers: {} });
  if (code === 'content_type_must_be_json') return Object.freeze({ statusCode: 415, body: { success: false, error: 'Content-Type must be application/json' }, headers: {} });
  if (code === 'request_too_large') return Object.freeze({ statusCode: 413, body: { success: false, error: 'Request too large' }, headers: {} });
  if (code === 'empty_request_body') return Object.freeze({ statusCode: 400, body: { success: false, error: 'Invalid JSON' }, headers: {} });

  const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
  const body = {
    success: false,
    error: statusCode === 500 ? 'Service temporarily unavailable' : String(error?.message || 'Request failed'),
  };
  const headers = {};
  if (Number.isSafeInteger(error?.retryAfterSeconds) && error.retryAfterSeconds > 0) {
    headers['retry-after'] = String(error.retryAfterSeconds);
  }
  return Object.freeze({ statusCode, body, headers });
}

export function createLostSizzlerFeedbackHttp({ service, auth } = {}) {
  if (!service?.ratingStatus || !service?.recordTelemetry || !service?.submitFeedback) {
    throw new Error('Lost Sizzler feedback HTTP requires a feedback service.');
  }
  if (!auth?.verifyBearer) throw new Error('Lost Sizzler feedback HTTP requires an authentication boundary.');

  return Object.freeze({
    handles(method, pathname) {
      return pathname === FEEDBACK_PATH;
    },

    async handle(request) {
      if (request.method !== 'POST') {
        return Object.freeze({
          statusCode: 405,
          body: { success: false, error: 'Method not allowed' },
          headers: { allow: 'POST, OPTIONS' },
        });
      }

      try {
        const payload = await readJsonBody(request);
        const action = String(payload?.action || '').trim().toLowerCase();
        const fingerprint = requestFingerprintValue(
          remoteAddress(request),
          request.headers['user-agent']
        );
        const userAgent = String(request.headers['user-agent'] || '').slice(0, 500);
        const authUserId = action === 'rating_status' || action === 'telemetry'
          ? await optionalUserId(auth, request.headers.authorization)
          : null;

        let body;
        if (action === 'rating_status') {
          body = await service.ratingStatus({ authUserId, fingerprint });
        } else if (action === 'telemetry') {
          body = await service.recordTelemetry({
            payload,
            authUserId,
            fingerprint,
            userAgent,
          });
        } else {
          body = await service.submitFeedback({
            payload,
            fingerprint,
            userAgent,
          });
        }

        return Object.freeze({ statusCode: 200, body, headers: {} });
      } catch (error) {
        return requestError(error);
      }
    },
  });
}

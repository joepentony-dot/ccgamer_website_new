const PAYPAL_BASE_URLS = Object.freeze({
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com',
});

function webhookError(statusCode, code, message = code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function requireHeader(headers, name, max = 512) {
  const value = String(headers?.[name] ?? headers?.[name.toLowerCase()] ?? '').trim();
  if (!value || value.length > max) throw webhookError(400, `missing_${name.toLowerCase().replace(/-/g, '_')}`);
  return value;
}

function requireEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) throw webhookError(400, 'invalid_paypal_webhook_event');
  const id = String(event.id || '').trim();
  const type = String(event.event_type || '').trim();
  if (!id || id.length > 160) throw webhookError(400, 'invalid_paypal_webhook_event_id');
  if (!type || type.length > 160) throw webhookError(400, 'invalid_paypal_webhook_event_type');
  return event;
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { throw webhookError(502, 'paypal_invalid_json'); }
}

export function createPayPalWebhookVerifier({
  environment,
  clientId,
  clientSecret,
  webhookId,
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
} = {}) {
  if (!['sandbox', 'live'].includes(environment)) throw new Error('PayPal environment must be sandbox or live.');
  if (!clientId || !clientSecret) throw new Error('PayPal client credentials are required.');
  if (!webhookId) throw new Error('PayPal webhook id is required.');
  if (typeof fetchImpl !== 'function') throw new Error('PayPal webhook verifier requires fetch.');

  const baseUrl = PAYPAL_BASE_URLS[environment];
  let tokenCache = null;

  async function accessToken() {
    const current = now();
    if (tokenCache && tokenCache.expiresAt > current + 30_000) return tokenCache.value;
    const credentials = Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64');
    let response;
    try {
      response = await fetchImpl(`${baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          authorization: `Basic ${credentials}`,
          'content-type': 'application/x-www-form-urlencoded',
          accept: 'application/json',
        },
        body: 'grant_type=client_credentials',
      });
    } catch {
      throw webhookError(503, 'paypal_unavailable');
    }
    const payload = await readJson(response);
    if (!response.ok || !payload.access_token) throw webhookError(502, 'paypal_auth_failed');
    const expiresInSeconds = Number(payload.expires_in || 300);
    tokenCache = {
      value: String(payload.access_token),
      expiresAt: current + Math.max(60, Math.min(32_400, expiresInSeconds)) * 1000,
    };
    return tokenCache.value;
  }

  return Object.freeze({
    async verify({ headers, event } = {}) {
      const verifiedEvent = requireEvent(event);
      const transmissionId = requireHeader(headers, 'paypal-transmission-id', 256);
      const transmissionTime = requireHeader(headers, 'paypal-transmission-time', 128);
      const transmissionSig = requireHeader(headers, 'paypal-transmission-sig', 1024);
      const certUrl = requireHeader(headers, 'paypal-cert-url', 2048);
      const authAlgo = requireHeader(headers, 'paypal-auth-algo', 128);
      if (!/^https:\/\//i.test(certUrl)) throw webhookError(400, 'invalid_paypal_cert_url');

      const token = await accessToken();
      let response;
      try {
        response = await fetchImpl(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${token}`,
            accept: 'application/json',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            auth_algo: authAlgo,
            cert_url: certUrl,
            transmission_id: transmissionId,
            transmission_sig: transmissionSig,
            transmission_time: transmissionTime,
            webhook_id: String(webhookId),
            webhook_event: verifiedEvent,
          }),
        });
      } catch {
        throw webhookError(503, 'paypal_unavailable');
      }

      const payload = await readJson(response);
      if (!response.ok) throw webhookError(502, 'paypal_webhook_verification_failed');
      const status = String(payload.verification_status || '').trim().toUpperCase();
      if (status !== 'SUCCESS') throw webhookError(401, 'paypal_webhook_signature_invalid');
      return Object.freeze({ verified: true, event: verifiedEvent });
    },
  });
}

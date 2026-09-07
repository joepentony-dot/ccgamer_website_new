const PAYPAL_BASE_URLS = Object.freeze({
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com',
});

function gatewayError(statusCode, code, message = code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function validateOrderId(value) {
  const id = String(value || '').trim();
  if (!/^[A-Za-z0-9-]{1,128}$/.test(id)) throw gatewayError(400, 'invalid_paypal_order_id');
  return id;
}

function validateRequestId(value) {
  const id = String(value || '').trim();
  if (!/^[A-Za-z0-9:_-]{1,108}$/.test(id)) throw new Error('Invalid PayPal request id.');
  return id;
}

function amountValue(amountMinor) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 1 || amountMinor > 1_000_000) {
    throw new Error('Invalid PayPal amount.');
  }
  return (amountMinor / 100).toFixed(2);
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw gatewayError(502, 'paypal_invalid_json');
  }
}

function summarizePayPalFailure(payload, fallback = 'paypal_request_failed') {
  const name = String(payload?.name || '').trim();
  const issue = String(payload?.details?.[0]?.issue || '').trim();
  return (issue || name || fallback).toLowerCase().replace(/[^a-z0-9_]+/g, '_').slice(0, 120) || fallback;
}

function normalizeCapture(order) {
  const purchaseUnit = Array.isArray(order?.purchase_units) ? order.purchase_units[0] : null;
  const captures = Array.isArray(purchaseUnit?.payments?.captures) ? purchaseUnit.payments.captures : [];
  const completed = captures.find((entry) => String(entry?.status || '').toUpperCase() === 'COMPLETED') || captures[0] || null;
  return Object.freeze({
    orderId: String(order?.id || ''),
    orderStatus: String(order?.status || '').toUpperCase(),
    customId: String(purchaseUnit?.custom_id || ''),
    captureId: String(completed?.id || ''),
    captureStatus: String(completed?.status || '').toUpperCase(),
    currency: String(completed?.amount?.currency_code || purchaseUnit?.amount?.currency_code || '').toUpperCase(),
    value: String(completed?.amount?.value || purchaseUnit?.amount?.value || ''),
  });
}

export function createPayPalOrdersGateway({
  environment,
  clientId,
  clientSecret,
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
} = {}) {
  if (!['sandbox', 'live'].includes(environment)) throw new Error('PayPal environment must be sandbox or live.');
  if (!clientId || !clientSecret) throw new Error('PayPal client credentials are required.');
  if (typeof fetchImpl !== 'function') throw new Error('PayPal gateway requires fetch.');

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
      throw gatewayError(503, 'paypal_unavailable');
    }
    const payload = await readJson(response);
    if (!response.ok || !payload.access_token) {
      throw gatewayError(502, summarizePayPalFailure(payload, 'paypal_auth_failed'));
    }
    const expiresInSeconds = Number(payload.expires_in || 300);
    tokenCache = {
      value: String(payload.access_token),
      expiresAt: current + Math.max(60, Math.min(32_400, expiresInSeconds)) * 1000,
    };
    return tokenCache.value;
  }

  async function paypalRequest(path, { method = 'POST', requestId, body = null } = {}) {
    const token = await accessToken();
    const headers = {
      authorization: `Bearer ${token}`,
      accept: 'application/json',
      'content-type': 'application/json',
      prefer: 'return=representation',
    };
    if (requestId) headers['paypal-request-id'] = validateRequestId(requestId);

    let response;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers,
        body: body == null ? undefined : JSON.stringify(body),
      });
    } catch {
      throw gatewayError(503, 'paypal_unavailable');
    }
    const payload = await readJson(response);
    if (!response.ok) {
      const statusCode = response.status === 429 ? 503 : 502;
      throw gatewayError(statusCode, summarizePayPalFailure(payload));
    }
    return payload;
  }

  return Object.freeze({
    publicConfig() {
      return Object.freeze({ environment, clientId });
    },

    async createOrder({ requestId, localOrderId, amountMinor, currency, description }) {
      const currencyCode = String(currency || '').trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(currencyCode)) throw new Error('Invalid PayPal currency.');
      const customId = String(localOrderId || '').trim();
      if (!/^[0-9a-f-]{36}$/i.test(customId)) throw new Error('Invalid local purchase id.');
      const title = String(description || '').trim().slice(0, 127);
      if (!title) throw new Error('PayPal order description is required.');

      const payload = await paypalRequest('/v2/checkout/orders', {
        requestId,
        body: {
          intent: 'CAPTURE',
          purchase_units: [{
            reference_id: 'the-lost-sizzler-full-game',
            custom_id: customId,
            description: title,
            amount: {
              currency_code: currencyCode,
              value: amountValue(amountMinor),
            },
          }],
        },
      });
      const orderId = validateOrderId(payload.id);
      return Object.freeze({
        orderId,
        status: String(payload.status || '').toUpperCase(),
      });
    },

    async captureOrder({ orderId, requestId }) {
      const normalizedId = validateOrderId(orderId);
      const payload = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(normalizedId)}/capture`, {
        requestId,
        body: {},
      });
      const capture = normalizeCapture(payload);
      if (!capture.orderId) throw gatewayError(502, 'paypal_capture_missing_order');
      return capture;
    },
  });
}

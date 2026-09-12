function clientError(statusCode, code, retryAfterSeconds = null) {
  const error = new Error(code);
  error.statusCode = statusCode;
  error.code = code;
  if (Number.isSafeInteger(retryAfterSeconds) && retryAfterSeconds > 0) error.retryAfterSeconds = retryAfterSeconds;
  return error;
}

function normalizeBaseUrl(value) {
  const url = new URL(String(value || ''));
  const loopback = url.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !loopback) {
    throw new Error('C64 Dungeon Carnage purchase client requires HTTPS except for loopback development.');
  }
  url.pathname = url.pathname.replace(/\/+$/, '');
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

async function readResponse(response) {
  let body = {};
  try {
    body = await response.json();
  } catch {}
  if (response.ok) return body;
  const retryAfter = Number(response.headers?.get?.('retry-after') || 0);
  throw clientError(response.status, String(body?.error || 'request_failed'), Number.isSafeInteger(retryAfter) ? retryAfter : null);
}

function requireOrderId(value) {
  const orderId = String(value || '').trim();
  if (!/^[A-Za-z0-9-]{1,128}$/.test(orderId)) throw clientError(400, 'invalid_paypal_order_id');
  return orderId;
}

function normalizeEntitlement(value) {
  if (!value || typeof value !== 'object') return null;
  return Object.freeze({
    ...value,
    owned: value.owned === true,
    permanent: value.permanent === true,
    includes_all_updates: value.includes_all_updates === true,
  });
}

export function createLostSizzlerPurchaseClient({ baseUrl, getAccessToken, fetchImpl = globalThis.fetch } = {}) {
  const root = normalizeBaseUrl(baseUrl);
  if (typeof getAccessToken !== 'function') throw new Error('C64 Dungeon Carnage purchase client requires getAccessToken().');
  if (typeof fetchImpl !== 'function') throw new Error('C64 Dungeon Carnage purchase client requires fetch.');

  async function token() {
    const value = String(await getAccessToken() || '').trim();
    if (!value) throw clientError(401, 'authentication_required');
    return value;
  }

  async function authenticated(path, method = 'GET') {
    const accessToken = await token();
    let response;
    try {
      response = await fetchImpl(`${root}${path}`, {
        method,
        credentials: 'include',
        headers: {
          authorization: `Bearer ${accessToken}`,
          accept: 'application/json',
        },
      });
    } catch {
      throw clientError(503, 'network_unavailable');
    }
    return readResponse(response);
  }

  async function getEntitlement() {
    const body = await authenticated('/v1/lost-sizzler/commerce/entitlement');
    return normalizeEntitlement(body.entitlement);
  }

  async function captureOrder(orderIdValue) {
    const orderId = requireOrderId(orderIdValue);
    return authenticated(`/v1/lost-sizzler/commerce/orders/${encodeURIComponent(orderId)}/capture`, 'POST');
  }

  return Object.freeze({
    async getOffer() {
      let response;
      try {
        response = await fetchImpl(`${root}/v1/lost-sizzler/commerce/offer`, {
          method: 'GET',
          credentials: 'include',
          headers: { accept: 'application/json' },
        });
      } catch {
        throw clientError(503, 'network_unavailable');
      }
      return readResponse(response);
    },

    getEntitlement,

    async createOrder() {
      return authenticated('/v1/lost-sizzler/commerce/orders', 'POST');
    },

    captureOrder,

    async captureAndConfirmOwnership(orderIdValue) {
      const capture = await captureOrder(orderIdValue);
      const entitlement = await getEntitlement();
      if (!entitlement?.owned || !entitlement.permanent) {
        throw clientError(409, 'entitlement_not_confirmed');
      }
      return Object.freeze({ capture, entitlement });
    },
  });
}

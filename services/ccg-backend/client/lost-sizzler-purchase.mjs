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

function normalizeDownloadGrant(value, nowMs = Date.now()) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw clientError(503, 'secure_download_unavailable');
  }
  const download = value.download;
  const packageInfo = value.package;
  if (!download || typeof download !== 'object' || download.kind !== 'signed-url') {
    throw clientError(503, 'secure_download_unavailable');
  }

  let url;
  try {
    url = new URL(String(download.url || ''));
  } catch {
    throw clientError(503, 'secure_download_unavailable');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) {
    throw clientError(503, 'secure_download_unavailable');
  }

  const expiresMs = Date.parse(String(download.expires_at || ''));
  const ttlMs = expiresMs - Number(nowMs);
  if (!Number.isFinite(expiresMs) || !Number.isFinite(ttlMs) || ttlMs < 1000 || ttlMs > 15 * 60 * 1000) {
    throw clientError(503, 'secure_download_unavailable');
  }

  const packageId = String(packageInfo?.package_id || '').trim();
  const version = String(packageInfo?.version || '').trim();
  const sha256 = String(packageInfo?.sha256 || '').trim().toLowerCase();
  const bytes = Number(packageInfo?.bytes);
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(packageId)) throw clientError(503, 'secure_download_unavailable');
  if (!version || version.length > 80) throw clientError(503, 'secure_download_unavailable');
  if (!/^[a-f0-9]{64}$/.test(sha256)) throw clientError(503, 'secure_download_unavailable');
  if (!Number.isSafeInteger(bytes) || bytes <= 0) throw clientError(503, 'secure_download_unavailable');

  return Object.freeze({
    product_slug: String(value.product_slug || ''),
    download: Object.freeze({
      kind: 'signed-url',
      url: url.toString(),
      expires_at: new Date(expiresMs).toISOString(),
    }),
    package: Object.freeze({ package_id: packageId, version, sha256, bytes }),
  });
}

export function createLostSizzlerPurchaseClient({ baseUrl, getAccessToken, fetchImpl = globalThis.fetch, now = () => Date.now() } = {}) {
  const root = normalizeBaseUrl(baseUrl);
  if (typeof getAccessToken !== 'function') throw new Error('C64 Dungeon Carnage purchase client requires getAccessToken().');
  if (typeof fetchImpl !== 'function') throw new Error('C64 Dungeon Carnage purchase client requires fetch.');
  if (typeof now !== 'function') throw new Error('C64 Dungeon Carnage purchase client requires a clock.');

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

  async function requestOfflineDownload() {
    const body = await authenticated('/v1/lost-sizzler/commerce/downloads/offline', 'POST');
    return normalizeDownloadGrant(body, Number(now()));
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
    requestOfflineDownload,

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

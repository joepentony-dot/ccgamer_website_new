const CLOUD_SAVE_PATH = '/v1/lost-sizzler/cloud-save';
const MAX_SAVE_BYTES = 512 * 1024;

function canonicalize(value) {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('invalid_save_payload');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalize(entry)).join(',')}]`;
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`;
  }
  throw new Error('invalid_save_payload');
}

function canonicalSaveJson(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('invalid_save_payload');
  return canonicalize(payload);
}

function bytesToHex(bytes) {
  return [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
}

async function hashPayload(payload, cryptoImpl) {
  const canonical = canonicalSaveJson(payload);
  const bytes = new TextEncoder().encode(canonical);
  if (bytes.byteLength > MAX_SAVE_BYTES) throw new Error('save_payload_too_large');
  const digest = await cryptoImpl.subtle.digest('SHA-256', bytes);
  return Object.freeze({
    bytes: bytes.byteLength,
    sha256: bytesToHex(new Uint8Array(digest)),
  });
}

function normalizeBaseUrl(value) {
  const url = new URL(String(value || ''));
  const localHttp = url.protocol === 'http:' && ['127.0.0.1', 'localhost', '::1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !localHttp) throw new Error('ccg_backend_requires_https');
  url.pathname = url.pathname.replace(/\/+$/, '');
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
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

function classifyHttpFailure(status, body) {
  const remoteError = typeof body?.error === 'string' ? body.error : 'remote_error';
  if (status === 401) return { ok: false, kind: 'unauthorized', status, error: remoteError };
  if (status === 409) return { ok: false, kind: 'conflict', status, error: remoteError };
  return { ok: false, kind: 'remote_error', status, error: remoteError };
}

export function createLostSizzlerCloudSync({
  baseUrl,
  getAccessToken,
  fetchImpl = globalThis.fetch,
  cryptoImpl = globalThis.crypto,
} = {}) {
  const endpointBase = normalizeBaseUrl(baseUrl);
  if (typeof getAccessToken !== 'function') throw new Error('getAccessToken is required');
  if (typeof fetchImpl !== 'function') throw new Error('fetch implementation is required');
  if (!cryptoImpl?.subtle?.digest) throw new Error('Web Crypto SHA-256 support is required');

  async function request(method, body) {
    let token;
    try {
      token = String((await getAccessToken()) || '').trim();
    } catch {
      return Object.freeze({ ok: false, kind: 'unauthenticated', status: 0, error: 'token_unavailable' });
    }
    if (!token) return Object.freeze({ ok: false, kind: 'unauthenticated', status: 0, error: 'token_unavailable' });

    const headers = {
      accept: 'application/json',
      authorization: `Bearer ${token}`,
    };
    const options = { method, headers, credentials: 'omit' };
    if (body !== undefined) {
      headers['content-type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetchImpl(`${endpointBase}${CLOUD_SAVE_PATH}`, options);
      const responseBody = await decodeJson(response);
      if (!response.ok) return Object.freeze(classifyHttpFailure(response.status, responseBody));
      return Object.freeze({ ok: true, kind: 'success', status: response.status, body: responseBody });
    } catch {
      return Object.freeze({ ok: false, kind: 'network_error', status: 0, error: 'network_error' });
    }
  }

  return Object.freeze({
    async pull() {
      const result = await request('GET');
      if (!result.ok) return result;
      return Object.freeze({ ok: true, kind: 'success', status: result.status, save: result.body?.save ?? null });
    },

    async push({ payload, expectedRevision } = {}) {
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
        return Object.freeze({ ok: false, kind: 'invalid_request', status: 0, error: 'invalid_expected_revision' });
      }
      let proof;
      try {
        proof = await hashPayload(payload, cryptoImpl);
      } catch (error) {
        return Object.freeze({ ok: false, kind: 'invalid_request', status: 0, error: String(error?.message || error) });
      }
      const result = await request('PUT', {
        expected_revision: expectedRevision,
        payload,
        payload_sha256: proof.sha256,
      });
      if (!result.ok) return result;
      return Object.freeze({ ok: true, kind: 'success', status: result.status, save: result.body?.save ?? null });
    },
  });
}

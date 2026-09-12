const PRODUCT_SLUG = 'the-lost-sizzler-full-game';
const MAX_SIGNED_URL_TTL_MS = 15 * 60 * 1000;
const MIN_SIGNED_URL_TTL_MS = 5 * 1000;

function downloadError(statusCode, code, message = code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function requireUserId(value) {
  const userId = String(value || '').trim();
  if (!userId || userId.length > 256) throw downloadError(401, 'authentication_required');
  return userId;
}

function requireSignedUrl(value) {
  let url;
  try {
    url = new URL(String(value || ''));
  } catch {
    throw downloadError(503, 'secure_download_unavailable');
  }
  if (url.protocol !== 'https:') throw downloadError(503, 'secure_download_unavailable');
  if (url.username || url.password || url.hash) throw downloadError(503, 'secure_download_unavailable');
  return url.toString();
}

function requireIsoExpiry(value, nowMs) {
  const expiresMs = Date.parse(String(value || ''));
  if (!Number.isFinite(expiresMs)) throw downloadError(503, 'secure_download_unavailable');
  const ttl = expiresMs - nowMs;
  if (ttl < MIN_SIGNED_URL_TTL_MS || ttl > MAX_SIGNED_URL_TTL_MS) {
    throw downloadError(503, 'secure_download_unavailable');
  }
  return new Date(expiresMs).toISOString();
}

function requirePackage(value) {
  const packageId = String(value?.package_id || '').trim();
  const version = String(value?.version || '').trim();
  const sha256 = String(value?.sha256 || '').trim().toLowerCase();
  const bytes = Number(value?.bytes);

  if (!/^[A-Za-z0-9._-]{1,128}$/.test(packageId)) throw downloadError(503, 'secure_download_unavailable');
  if (!version || version.length > 80) throw downloadError(503, 'secure_download_unavailable');
  if (!/^[a-f0-9]{64}$/.test(sha256)) throw downloadError(503, 'secure_download_unavailable');
  if (!Number.isSafeInteger(bytes) || bytes <= 0) throw downloadError(503, 'secure_download_unavailable');

  return Object.freeze({ package_id: packageId, version, sha256, bytes });
}

export function createLostSizzlerSecureDownloadService({
  commerce,
  delivery,
  now = () => Date.now(),
} = {}) {
  if (!commerce?.entitlement) throw new Error('C64 Dungeon Carnage secure download requires the commerce entitlement service.');
  if (!delivery?.issueDownload) throw new Error('C64 Dungeon Carnage secure download requires a private package delivery adapter.');
  if (typeof now !== 'function') throw new Error('C64 Dungeon Carnage secure download requires a clock.');

  return Object.freeze({
    async issueOfflineDownload(userIdValue) {
      const userId = requireUserId(userIdValue);
      const entitlement = await commerce.entitlement(userId);

      if (!entitlement?.owned) throw downloadError(403, 'entitlement_required');
      if (!entitlement?.permanent || entitlement.product_slug !== PRODUCT_SLUG) {
        throw downloadError(403, 'permanent_entitlement_required');
      }

      const issued = await delivery.issueDownload(Object.freeze({
        userId,
        productSlug: PRODUCT_SLUG,
        purpose: 'desktop-offline',
        maxTtlSeconds: Math.floor(MAX_SIGNED_URL_TTL_MS / 1000),
      }));

      if (issued?.kind !== 'signed-url') throw downloadError(503, 'secure_download_unavailable');

      const nowMs = Number(now());
      if (!Number.isFinite(nowMs)) throw new Error('C64 Dungeon Carnage secure download clock returned an invalid value.');

      return Object.freeze({
        product_slug: PRODUCT_SLUG,
        download: Object.freeze({
          kind: 'signed-url',
          url: requireSignedUrl(issued.url),
          expires_at: requireIsoExpiry(issued.expiresAt, nowMs),
        }),
        package: requirePackage(issued.package),
      });
    },
  });
}

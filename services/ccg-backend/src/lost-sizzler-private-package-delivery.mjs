const DEFAULT_MAX_TTL_SECONDS = 15 * 60;

function deliveryError(message) {
  const error = new Error(message);
  error.code = 'invalid_private_package_delivery_config';
  return error;
}

function requireText(value, name, maxLength = 512) {
  const text = String(value || '').trim();
  if (!text || text.length > maxLength) throw deliveryError(`C64 Dungeon Carnage private delivery requires ${name}.`);
  return text;
}

function requirePackage(config = {}) {
  const packageId = requireText(config.packageId, 'package id', 128);
  const version = requireText(config.version, 'package version', 80);
  const objectKey = requireText(config.objectKey, 'private object key', 1024);
  const sha256 = String(config.sha256 || '').trim().toLowerCase();
  const bytes = Number(config.bytes);

  if (!/^[A-Za-z0-9._-]{1,128}$/.test(packageId)) throw deliveryError('C64 Dungeon Carnage private delivery package id is invalid.');
  if (!/^[a-f0-9]{64}$/.test(sha256)) throw deliveryError('C64 Dungeon Carnage private delivery SHA-256 is invalid.');
  if (!Number.isSafeInteger(bytes) || bytes <= 0) throw deliveryError('C64 Dungeon Carnage private delivery byte size is invalid.');
  if (objectKey.startsWith('/') || objectKey.includes('..') || /[?#\\]/.test(objectKey)) {
    throw deliveryError('C64 Dungeon Carnage private delivery object key is invalid.');
  }

  return Object.freeze({
    package_id: packageId,
    version,
    sha256,
    bytes,
    objectKey,
  });
}

function requireTtl(value) {
  const ttl = Number(value);
  if (!Number.isSafeInteger(ttl) || ttl < 5 || ttl > DEFAULT_MAX_TTL_SECONDS) {
    throw deliveryError('C64 Dungeon Carnage private delivery TTL is invalid.');
  }
  return ttl;
}

function validateSigner(signer) {
  if (!signer?.signPrivateGet) {
    throw deliveryError('C64 Dungeon Carnage private delivery requires a private GET signer.');
  }
  return signer;
}

export function createLostSizzlerPrivatePackageDelivery({
  signer,
  packageConfig,
  maxTtlSeconds = DEFAULT_MAX_TTL_SECONDS,
  now = () => Date.now(),
} = {}) {
  const privateSigner = validateSigner(signer);
  const packageMeta = requirePackage(packageConfig);
  const configuredMaxTtl = requireTtl(maxTtlSeconds);
  if (typeof now !== 'function') throw deliveryError('C64 Dungeon Carnage private delivery requires a clock.');

  return Object.freeze({
    async issueDownload(request = {}) {
      const purpose = String(request.purpose || '');
      if (purpose !== 'desktop-offline') throw deliveryError('C64 Dungeon Carnage private delivery purpose is invalid.');

      const requestedMax = Number(request.maxTtlSeconds);
      const ttlSeconds = Math.min(
        configuredMaxTtl,
        Number.isSafeInteger(requestedMax) && requestedMax >= 5 ? requestedMax : configuredMaxTtl
      );

      const issuedAt = Number(now());
      if (!Number.isFinite(issuedAt)) throw deliveryError('C64 Dungeon Carnage private delivery clock is invalid.');

      const signed = await privateSigner.signPrivateGet(Object.freeze({
        objectKey: packageMeta.objectKey,
        expiresInSeconds: ttlSeconds,
        disposition: `attachment; filename="${packageMeta.package_id}-${packageMeta.version}.zip"`,
      }));

      const url = String(signed?.url || '').trim();
      let parsed;
      try {
        parsed = new URL(url);
      } catch {
        throw deliveryError('C64 Dungeon Carnage private signer returned an invalid URL.');
      }
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hash) {
        throw deliveryError('C64 Dungeon Carnage private signer returned an insecure URL.');
      }

      const expiresAtMs = Date.parse(String(signed?.expiresAt || ''));
      const latestAllowed = issuedAt + ttlSeconds * 1000;
      if (!Number.isFinite(expiresAtMs) || expiresAtMs <= issuedAt || expiresAtMs > latestAllowed + 1000) {
        throw deliveryError('C64 Dungeon Carnage private signer returned an invalid expiry.');
      }

      return Object.freeze({
        kind: 'signed-url',
        url: parsed.toString(),
        expiresAt: new Date(expiresAtMs).toISOString(),
        package: Object.freeze({
          package_id: packageMeta.package_id,
          version: packageMeta.version,
          sha256: packageMeta.sha256,
          bytes: packageMeta.bytes,
        }),
      });
    },
  });
}

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSE_VALUES = new Set(['', '0', 'false', 'no', 'off']);
const DEFAULT_MAX_TTL_SECONDS = 15 * 60;

function readText(env, name) {
  return String(env?.[name] ?? '').trim();
}

function readBoolean(env, name, fallback = false) {
  const raw = readText(env, name).toLowerCase();
  if (!raw) return fallback;
  if (TRUE_VALUES.has(raw)) return true;
  if (FALSE_VALUES.has(raw)) return false;
  throw new Error(`C64 Dungeon Carnage package delivery environment variable ${name} must be a boolean value.`);
}

function requireText(env, name) {
  const value = readText(env, name);
  if (!value) throw new Error(`C64 Dungeon Carnage package delivery requires ${name}.`);
  return value;
}

function requirePositiveInteger(env, name) {
  const raw = requireText(env, name);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`C64 Dungeon Carnage package delivery ${name} must be a positive integer.`);
  }
  return value;
}

function readTtl(env) {
  const raw = readText(env, 'CCG_PACKAGE_DOWNLOAD_MAX_TTL_SECONDS');
  if (!raw) return DEFAULT_MAX_TTL_SECONDS;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 5 || value > DEFAULT_MAX_TTL_SECONDS) {
    throw new Error('C64 Dungeon Carnage package delivery CCG_PACKAGE_DOWNLOAD_MAX_TTL_SECONDS must be between 5 and 900 seconds.');
  }
  return value;
}

export function createLostSizzlerPackageDeliveryRuntimeConfig(env = process.env) {
  const enabled = readBoolean(env, 'CCG_PACKAGE_DOWNLOAD_ENABLED', false);
  if (!enabled) return Object.freeze({ enabled: false });

  const sha256 = requireText(env, 'CCG_PACKAGE_SHA256').toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(sha256)) {
    throw new Error('C64 Dungeon Carnage package delivery CCG_PACKAGE_SHA256 must be a 64-character SHA-256 digest.');
  }

  const objectKey = requireText(env, 'CCG_PACKAGE_OBJECT_KEY');
  if (objectKey.startsWith('/') || objectKey.includes('..') || /[?#\\]/.test(objectKey)) {
    throw new Error('C64 Dungeon Carnage package delivery CCG_PACKAGE_OBJECT_KEY is invalid.');
  }

  return Object.freeze({
    enabled: true,
    packageConfig: Object.freeze({
      packageId: requireText(env, 'CCG_PACKAGE_ID'),
      version: requireText(env, 'CCG_PACKAGE_VERSION'),
      objectKey,
      sha256,
      bytes: requirePositiveInteger(env, 'CCG_PACKAGE_BYTES'),
    }),
    maxTtlSeconds: readTtl(env),
  });
}

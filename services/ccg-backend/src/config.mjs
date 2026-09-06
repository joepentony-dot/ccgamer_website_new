function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function parseOrigins(value) {
  return new Set(
    String(value || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
  );
}

function readAuthMode() {
  const mode = String(process.env.CCG_AUTH_MODE || 'external').trim().toLowerCase();
  if (!['external', 'local'].includes(mode)) throw new Error(`Invalid CCG_AUTH_MODE: ${mode}`);
  return mode;
}

export function loadConfig() {
  const port = Number(process.env.PORT || 8787);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${process.env.PORT}`);
  }

  const allowedOrigins = parseOrigins(requireEnv('CCG_ALLOWED_ORIGINS'));
  if (allowedOrigins.size < 1) throw new Error('CCG_ALLOWED_ORIGINS must contain at least one origin.');

  const authMode = readAuthMode();
  const base = {
    port,
    databaseUrl: requireEnv('DATABASE_URL'),
    allowedOrigins,
    authMode,
    serviceName: 'ccg-backend',
  };

  if (authMode === 'external') {
    return Object.freeze({
      ...base,
      jwtIssuer: requireEnv('CCG_JWT_ISSUER'),
      jwtAudience: requireEnv('CCG_JWT_AUDIENCE'),
      jwtJwksUrl: requireEnv('CCG_JWT_JWKS_URL'),
      localAuth: null,
    });
  }

  const keyId = requireEnv('CCG_LOCAL_AUTH_KEY_ID');
  if (keyId.length > 128) throw new Error('CCG_LOCAL_AUTH_KEY_ID is too long.');

  return Object.freeze({
    ...base,
    jwtIssuer: null,
    jwtAudience: null,
    jwtJwksUrl: null,
    localAuth: Object.freeze({
      issuer: requireEnv('CCG_LOCAL_AUTH_ISSUER'),
      audience: requireEnv('CCG_LOCAL_AUTH_AUDIENCE'),
      privateJwkFile: requireEnv('CCG_LOCAL_AUTH_PRIVATE_JWK_FILE'),
      publicJwkFile: requireEnv('CCG_LOCAL_AUTH_PUBLIC_JWK_FILE'),
      keyId,
    }),
  });
}

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

export function loadConfig() {
  const port = Number(process.env.PORT || 8787);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${process.env.PORT}`);
  }

  const allowedOrigins = parseOrigins(requireEnv('CCG_ALLOWED_ORIGINS'));
  if (allowedOrigins.size < 1) throw new Error('CCG_ALLOWED_ORIGINS must contain at least one origin.');

  return Object.freeze({
    port,
    databaseUrl: requireEnv('DATABASE_URL'),
    jwtIssuer: requireEnv('CCG_JWT_ISSUER'),
    jwtAudience: requireEnv('CCG_JWT_AUDIENCE'),
    jwtJwksUrl: requireEnv('CCG_JWT_JWKS_URL'),
    allowedOrigins,
    serviceName: 'ccg-backend',
  });
}

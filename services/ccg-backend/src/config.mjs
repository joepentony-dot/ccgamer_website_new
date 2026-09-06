function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function optionalEnv(name) {
  return String(process.env[name] || '').trim();
}

function readBooleanEnv(name, defaultValue = false) {
  const value = optionalEnv(name).toLowerCase();
  if (!value) return defaultValue;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`Invalid ${name}: expected true or false.`);
}

function readIntegerEnv(name, defaultValue, min, max) {
  const raw = optionalEnv(name);
  const value = raw ? Number(raw) : defaultValue;
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`Invalid ${name}: expected an integer between ${min} and ${max}.`);
  }
  return value;
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function readFeedbackEmail() {
  const rawFrom = optionalEnv('EMAIL_FROM');
  const bracketed = rawFrom.match(/<([^<>]+)>/);
  const fromAddress = String(bracketed?.[1] || rawFrom).trim();
  const replyTo = optionalEnv('EMAIL_REPLY_TO');
  return Object.freeze({
    resendApiKey: optionalEnv('RESEND_API_KEY'),
    from: validEmail(fromAddress) ? `CCG <${fromAddress}>` : '',
    replyTo: validEmail(replyTo) ? replyTo : '',
    destination: 'info@cheekycommodoregamer.co.uk',
  });
}

function readPayPalConfig(enabled) {
  if (!enabled) {
    return Object.freeze({
      enabled: false,
      environment: 'sandbox',
      clientId: '',
      clientSecret: '',
      webhookId: '',
    });
  }

  const environment = String(process.env.CCG_PAYPAL_ENVIRONMENT || 'sandbox').trim().toLowerCase();
  if (!['sandbox', 'live'].includes(environment)) {
    throw new Error(`Invalid CCG_PAYPAL_ENVIRONMENT: ${environment}`);
  }

  return Object.freeze({
    enabled: true,
    environment,
    clientId: requireEnv('PAYPAL_CLIENT_ID'),
    clientSecret: requireEnv('PAYPAL_CLIENT_SECRET'),
    webhookId: requireEnv('PAYPAL_WEBHOOK_ID'),
  });
}

function validateAllowedOrigin(entry) {
  if (entry === '*') throw new Error('Wildcard CORS origins are not supported.');

  let url;
  try {
    url = new URL(entry);
  } catch {
    throw new Error(`Invalid CCG_ALLOWED_ORIGINS entry: ${entry}`);
  }

  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error(`CCG_ALLOWED_ORIGINS entries must be origins without credentials, paths, queries or fragments: ${entry}`);
  }

  const hostname = url.hostname.toLowerCase();
  const localHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(hostname);
  if (url.protocol !== 'https:' && !localHttp) {
    throw new Error(`CCG_ALLOWED_ORIGINS requires HTTPS except for loopback development origins: ${entry}`);
  }

  if (entry !== url.origin) {
    throw new Error(`CCG_ALLOWED_ORIGINS entry must use canonical origin form: ${entry}`);
  }

  return url.origin;
}

function parseOrigins(value) {
  const origins = new Set();
  for (const entry of String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)) {
    origins.add(validateAllowedOrigin(entry));
  }
  return origins;
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
  const lostSizzlerCommerceEnabled = readBooleanEnv('CCG_LOST_SIZZLER_COMMERCE_ENABLED', false);
  const base = {
    port,
    databaseUrl: requireEnv('DATABASE_URL'),
    allowedOrigins,
    authMode,
    serviceName: 'ccg-backend',
    feedbackEmail: readFeedbackEmail(),
    lostSizzlerRealtimeEnabled: readBooleanEnv('CCG_LOST_SIZZLER_REALTIME_ENABLED', false),
    lostSizzlerRealtimeMaxSockets: readIntegerEnv('CCG_LOST_SIZZLER_REALTIME_MAX_SOCKETS', 128, 1, 10_000),
    lostSizzlerCommerceEnabled,
    paypal: readPayPalConfig(lostSizzlerCommerceEnabled),
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

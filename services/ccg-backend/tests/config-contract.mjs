import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.mjs';

const ORIGINAL = { ...process.env };

function restore() {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL)) delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL);
}

function clearAuthEnv() {
  for (const key of [
    'CCG_AUTH_MODE',
    'CCG_JWT_ISSUER',
    'CCG_JWT_AUDIENCE',
    'CCG_JWT_JWKS_URL',
    'CCG_LOCAL_AUTH_ISSUER',
    'CCG_LOCAL_AUTH_AUDIENCE',
    'CCG_LOCAL_AUTH_PRIVATE_JWK_FILE',
    'CCG_LOCAL_AUTH_PUBLIC_JWK_FILE',
    'CCG_LOCAL_AUTH_KEY_ID',
    'RESEND_API_KEY',
    'EMAIL_FROM',
    'EMAIL_REPLY_TO',
  ]) delete process.env[key];
}

function withBaseEnv() {
  clearAuthEnv();
  process.env.DATABASE_URL = 'postgresql://example.invalid/ccg';
  process.env.CCG_ALLOWED_ORIGINS = 'https://www.cheekycommodoregamer.co.uk';
  process.env.CCG_JWT_ISSUER = 'https://identity.example.invalid/';
  process.env.CCG_JWT_AUDIENCE = 'ccg-backend';
  process.env.CCG_JWT_JWKS_URL = 'https://identity.example.invalid/.well-known/jwks.json';
  process.env.PORT = '8787';
}

function withLocalAuthEnv() {
  clearAuthEnv();
  process.env.DATABASE_URL = 'postgresql://example.invalid/ccg';
  process.env.CCG_ALLOWED_ORIGINS = 'https://www.cheekycommodoregamer.co.uk';
  process.env.CCG_AUTH_MODE = 'local';
  process.env.CCG_LOCAL_AUTH_ISSUER = 'https://auth.cheekycommodoregamer.co.uk/';
  process.env.CCG_LOCAL_AUTH_AUDIENCE = 'ccg-backend';
  process.env.CCG_LOCAL_AUTH_PRIVATE_JWK_FILE = '/run/secrets/ccg-auth-private.jwk';
  process.env.CCG_LOCAL_AUTH_PUBLIC_JWK_FILE = '/etc/ccg/ccg-auth-public.jwk';
  process.env.CCG_LOCAL_AUTH_KEY_ID = 'ccg-ed25519-1';
  process.env.PORT = '8787';
}

try {
  withBaseEnv();
  const config = loadConfig();
  assert.equal(config.port, 8787);
  assert.equal(config.authMode, 'external');
  assert.equal(config.localAuth, null);
  assert.equal(config.allowedOrigins.has('https://www.cheekycommodoregamer.co.uk'), true);
  assert.equal(config.allowedOrigins.has('*'), false);
  assert.deepEqual(config.feedbackEmail, {
    resendApiKey: '',
    from: '',
    replyTo: '',
    destination: 'info@cheekycommodoregamer.co.uk',
  });

  withBaseEnv();
  process.env.RESEND_API_KEY = 'test-resend-key';
  process.env.EMAIL_FROM = 'Lost Sizzler <feedback@example.test>';
  process.env.EMAIL_REPLY_TO = 'reply@example.test';
  const feedbackEmail = loadConfig().feedbackEmail;
  assert.deepEqual(feedbackEmail, {
    resendApiKey: 'test-resend-key',
    from: 'CCG <feedback@example.test>',
    replyTo: 'reply@example.test',
    destination: 'info@cheekycommodoregamer.co.uk',
  });

  withBaseEnv();
  process.env.EMAIL_FROM = 'not-an-email';
  assert.equal(loadConfig().feedbackEmail.from, '');

  withBaseEnv();
  delete process.env.DATABASE_URL;
  assert.throws(() => loadConfig(), /DATABASE_URL/);

  withBaseEnv();
  process.env.CCG_ALLOWED_ORIGINS = '';
  assert.throws(() => loadConfig(), /CCG_ALLOWED_ORIGINS/);

  withBaseEnv();
  process.env.CCG_ALLOWED_ORIGINS = '*';
  assert.throws(() => loadConfig(), /Wildcard CORS origins/);

  withBaseEnv();
  process.env.CCG_ALLOWED_ORIGINS = 'https://www.cheekycommodoregamer.co.uk/account';
  assert.throws(() => loadConfig(), /must be origins without credentials, paths, queries or fragments/);

  withBaseEnv();
  process.env.CCG_ALLOWED_ORIGINS = 'http://example.invalid';
  assert.throws(() => loadConfig(), /requires HTTPS/);

  withBaseEnv();
  process.env.CCG_ALLOWED_ORIGINS = 'http://localhost:8080';
  const localDevCors = loadConfig();
  assert.equal(localDevCors.allowedOrigins.has('http://localhost:8080'), true);

  withBaseEnv();
  process.env.CCG_ALLOWED_ORIGINS = 'https://www.cheekycommodoregamer.co.uk/';
  assert.throws(() => loadConfig(), /canonical origin form/);

  withBaseEnv();
  process.env.PORT = '0';
  assert.throws(() => loadConfig(), /Invalid PORT/);

  withBaseEnv();
  process.env.PORT = '70000';
  assert.throws(() => loadConfig(), /Invalid PORT/);

  withBaseEnv();
  process.env.CCG_AUTH_MODE = 'anything-else';
  assert.throws(() => loadConfig(), /Invalid CCG_AUTH_MODE/);

  withLocalAuthEnv();
  const local = loadConfig();
  assert.equal(local.authMode, 'local');
  assert.equal(local.jwtIssuer, null);
  assert.equal(local.jwtJwksUrl, null);
  assert.equal(local.localAuth.issuer, 'https://auth.cheekycommodoregamer.co.uk/');
  assert.equal(local.localAuth.keyId, 'ccg-ed25519-1');
  assert.equal(local.localAuth.privateJwkFile, '/run/secrets/ccg-auth-private.jwk');

  delete process.env.CCG_LOCAL_AUTH_PRIVATE_JWK_FILE;
  assert.throws(() => loadConfig(), /CCG_LOCAL_AUTH_PRIVATE_JWK_FILE/);

  withLocalAuthEnv();
  process.env.CCG_LOCAL_AUTH_KEY_ID = 'x'.repeat(129);
  assert.throws(() => loadConfig(), /CCG_LOCAL_AUTH_KEY_ID is too long/);

  console.log('CCG backend configuration contract passed for fail-closed CORS, optional feedback mail delivery, external auth and opt-in local authentication modes.');
} finally {
  restore();
}

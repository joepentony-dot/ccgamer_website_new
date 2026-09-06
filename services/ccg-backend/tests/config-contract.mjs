import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.mjs';

const ORIGINAL = { ...process.env };

function restore() {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL)) delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL);
}

function withBaseEnv() {
  process.env.DATABASE_URL = 'postgresql://example.invalid/ccg';
  process.env.CCG_ALLOWED_ORIGINS = 'https://www.cheekycommodoregamer.co.uk';
  process.env.CCG_JWT_ISSUER = 'https://identity.example.invalid/';
  process.env.CCG_JWT_AUDIENCE = 'ccg-backend';
  process.env.CCG_JWT_JWKS_URL = 'https://identity.example.invalid/.well-known/jwks.json';
  process.env.PORT = '8787';
}

try {
  withBaseEnv();
  const config = loadConfig();
  assert.equal(config.port, 8787);
  assert.equal(config.allowedOrigins.has('https://www.cheekycommodoregamer.co.uk'), true);
  assert.equal(config.allowedOrigins.has('*'), false);

  delete process.env.DATABASE_URL;
  assert.throws(() => loadConfig(), /DATABASE_URL/);

  withBaseEnv();
  process.env.CCG_ALLOWED_ORIGINS = '';
  assert.throws(() => loadConfig(), /CCG_ALLOWED_ORIGINS/);

  withBaseEnv();
  process.env.PORT = '0';
  assert.throws(() => loadConfig(), /Invalid PORT/);

  withBaseEnv();
  process.env.PORT = '70000';
  assert.throws(() => loadConfig(), /Invalid PORT/);

  console.log('CCG backend configuration contract passed.');
} finally {
  restore();
}

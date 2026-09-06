import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { loadConfig } from '../src/config.mjs';

const ORIGINAL = { ...process.env };

function restore() {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL)) delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL);
}

function externalAuthEnv() {
  process.env.DATABASE_URL = 'postgresql://example.invalid/ccg';
  process.env.CCG_ALLOWED_ORIGINS = 'https://www.cheekycommodoregamer.co.uk';
  process.env.CCG_AUTH_MODE = 'external';
  process.env.CCG_JWT_ISSUER = 'https://identity.example.invalid/';
  process.env.CCG_JWT_AUDIENCE = 'ccg-backend';
  process.env.CCG_JWT_JWKS_URL = 'https://identity.example.invalid/.well-known/jwks.json';
  process.env.PORT = '8787';
  delete process.env.CCG_BIND_HOST;
}

try {
  externalAuthEnv();
  assert.equal(loadConfig().bindHost, '127.0.0.1', 'Backend bind host must remain loopback by default.');

  externalAuthEnv();
  process.env.CCG_BIND_HOST = '0.0.0.0';
  assert.equal(loadConfig().bindHost, '0.0.0.0', 'Render-compatible all-interface bind must require explicit opt-in.');

  externalAuthEnv();
  process.env.CCG_BIND_HOST = '::';
  assert.equal(loadConfig().bindHost, '::');

  externalAuthEnv();
  process.env.CCG_BIND_HOST = 'localhost';
  assert.throws(() => loadConfig(), /Invalid CCG_BIND_HOST/);

  externalAuthEnv();
  process.env.CCG_BIND_HOST = 'backend.example.test';
  assert.throws(() => loadConfig(), /Invalid CCG_BIND_HOST/);

  const serverSource = await fs.readFile(new URL('../src/server.mjs', import.meta.url), 'utf8');
  assert.match(serverSource, /server\.listen\(config\.port,\s*config\.bindHost,/);
  assert.doesNotMatch(
    serverSource,
    /server\.listen\(config\.port,\s*['"]127\.0\.0\.1['"]/, 
    'Server startup must not bypass the validated bind-host configuration.'
  );

  console.log('CCG bind-host contract passed: loopback remains the default, public binding requires explicit allowlisted configuration, and server startup uses the validated host.');
} finally {
  restore();
}

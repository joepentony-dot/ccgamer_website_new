import assert from 'node:assert/strict';
import { createLostSizzlerCommerceRuntime } from '../src/lost-sizzler-commerce-runtime.mjs';

function baseEnv(overrides = {}) {
  return {
    DATABASE_URL: 'postgresql://ccg:test@db.example.invalid/ccg',
    CCG_JWT_ISSUER: 'https://auth.example.invalid/',
    CCG_JWT_AUDIENCE: 'ccg-web',
    CCG_JWT_JWKS_URL: 'https://auth.example.invalid/.well-known/jwks.json',
    CCG_COMMERCE_ENABLED: 'false',
    ...overrides,
  };
}

async function expectReject(action, pattern) {
  await assert.rejects(action, pattern);
}

{
  let databaseCalls = 0;
  let authCalls = 0;
  let appCalls = 0;
  let closed = 0;
  const database = { query() {}, transaction() {}, async close() { closed += 1; } };
  const auth = { verifyBearer() {} };

  const runtime = await createLostSizzlerCommerceRuntime({
    env: baseEnv(),
    createDatabaseImpl: async (url, options) => {
      databaseCalls += 1;
      assert.equal(url, 'postgresql://ccg:test@db.example.invalid/ccg');
      assert.deepEqual(options, { sslMode: 'verify-full' });
      return database;
    },
    createAuthImpl: async (config) => {
      authCalls += 1;
      assert.deepEqual(config, {
        jwtIssuer: 'https://auth.example.invalid/',
        jwtAudience: 'ccg-web',
        jwtJwksUrl: 'https://auth.example.invalid/.well-known/jwks.json',
      });
      return auth;
    },
    createRuntimeConfigImpl: (env) => {
      assert.equal(env.CCG_COMMERCE_ENABLED, 'false');
      return Object.freeze({ commerceEnabled: false });
    },
    createApplicationImpl: (input) => {
      appCalls += 1;
      assert.equal(input.database, database);
      assert.equal(input.auth, auth);
      assert.deepEqual(input.config, { commerceEnabled: false });
      return Object.freeze({ router: { handle() {} }, status: { commerce_enabled: false } });
    },
  });

  assert.equal(databaseCalls, 1);
  assert.equal(authCalls, 1);
  assert.equal(appCalls, 1);
  assert.equal(runtime.status.commerce_enabled, false);
  await runtime.close();
  assert.equal(closed, 1);
}

{
  let databaseCalls = 0;
  await expectReject(
    () => createLostSizzlerCommerceRuntime({
      env: baseEnv({ DATABASE_URL: '' }),
      createDatabaseImpl: async () => { databaseCalls += 1; return {}; },
      createAuthImpl: async () => ({}),
      createApplicationImpl: () => ({}),
      createRuntimeConfigImpl: () => ({ commerceEnabled: false }),
    }),
    /requires DATABASE_URL/,
  );
  assert.equal(databaseCalls, 0);
}

{
  await expectReject(
    () => createLostSizzlerCommerceRuntime({
      env: baseEnv({ CCG_JWT_JWKS_URL: '' }),
      createDatabaseImpl: async () => ({}),
      createAuthImpl: async () => ({}),
      createApplicationImpl: () => ({}),
      createRuntimeConfigImpl: () => ({ commerceEnabled: false }),
    }),
    /requires CCG_JWT_JWKS_URL/,
  );
}

{
  let seenOptions = null;
  await createLostSizzlerCommerceRuntime({
    env: baseEnv({ CCG_DB_SSL: 'disable' }),
    createDatabaseImpl: async (_url, options) => {
      seenOptions = options;
      return { async close() {} };
    },
    createAuthImpl: async () => ({ verifyBearer() {} }),
    createApplicationImpl: () => ({ router: {}, status: {} }),
    createRuntimeConfigImpl: () => ({ commerceEnabled: false }),
  });
  assert.deepEqual(seenOptions, { sslMode: 'disable' });
}

{
  await expectReject(
    () => createLostSizzlerCommerceRuntime({
      env: baseEnv({ CCG_DB_SSL: 'prefer' }),
      createDatabaseImpl: async () => ({ async close() {} }),
      createAuthImpl: async () => ({ verifyBearer() {} }),
      createApplicationImpl: () => ({ router: {}, status: {} }),
      createRuntimeConfigImpl: () => ({ commerceEnabled: false }),
    }),
    /CCG_DB_SSL must be disable or verify-full/,
  );
}

{
  let closed = 0;
  await expectReject(
    () => createLostSizzlerCommerceRuntime({
      env: baseEnv(),
      createDatabaseImpl: async () => ({ async close() { closed += 1; } }),
      createAuthImpl: async () => { throw new Error('auth-bootstrap-failed'); },
      createApplicationImpl: () => ({ router: {}, status: {} }),
      createRuntimeConfigImpl: () => ({ commerceEnabled: false }),
    }),
    /auth-bootstrap-failed/,
  );
  assert.equal(closed, 1);
}

{
  let closed = 0;
  await expectReject(
    () => createLostSizzlerCommerceRuntime({
      env: baseEnv(),
      createDatabaseImpl: async () => ({ async close() { closed += 1; } }),
      createAuthImpl: async () => ({ verifyBearer() {} }),
      createApplicationImpl: () => { throw new Error('application-bootstrap-failed'); },
      createRuntimeConfigImpl: () => ({ commerceEnabled: false }),
    }),
    /application-bootstrap-failed/,
  );
  assert.equal(closed, 1);
}

{
  let capturedConfig = null;
  const env = baseEnv({
    CCG_COMMERCE_ENABLED: 'true',
    CCG_COMMERCE_PAYPAL_ENVIRONMENT: 'sandbox',
    CCG_COMMERCE_PAYPAL_CLIENT_ID: 'public-client-id-fixture',
    CCG_COMMERCE_PAYPAL_CLIENT_SECRET: 'secret-fixture',
    CCG_COMMERCE_PAYPAL_WEBHOOK_ID: 'webhook-fixture',
  });
  await createLostSizzlerCommerceRuntime({
    env,
    createDatabaseImpl: async () => ({ async close() {} }),
    createAuthImpl: async () => ({ verifyBearer() {} }),
    createApplicationImpl: ({ config }) => {
      capturedConfig = config;
      return { router: {}, status: { commerce_enabled: true } };
    },
  });
  assert.equal(capturedConfig.commerceEnabled, true);
  assert.equal(capturedConfig.paypalEnvironment, 'sandbox');
  assert.equal(capturedConfig.paypalClientId, 'public-client-id-fixture');
  assert.equal(capturedConfig.paypalClientSecret, 'secret-fixture');
  assert.equal(capturedConfig.paypalWebhookId, 'webhook-fixture');
}

console.log('C64 Dungeon Carnage commerce runtime adapter contract passed.');

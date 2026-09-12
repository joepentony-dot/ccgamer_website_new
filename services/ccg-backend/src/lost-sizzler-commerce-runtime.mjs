import { createLostSizzlerCommerceApplication } from './lost-sizzler-commerce-app.mjs';
import { createLostSizzlerCommerceRuntimeConfig } from './lost-sizzler-commerce-runtime-config.mjs';

function readRequired(env, name) {
  const value = String(env?.[name] ?? '').trim();
  if (!value) throw new Error(`C64 Dungeon Carnage commerce runtime requires ${name}.`);
  return value;
}

function readDatabaseSslMode(env) {
  const value = String(env?.CCG_DB_SSL ?? 'verify-full').trim().toLowerCase();
  if (!['disable', 'verify-full'].includes(value)) {
    throw new Error('C64 Dungeon Carnage commerce runtime CCG_DB_SSL must be disable or verify-full.');
  }
  return value;
}

async function defaultDatabaseFactory(databaseUrl, options) {
  const { createDatabase } = await import('./db.mjs');
  return createDatabase(databaseUrl, options);
}

async function defaultAuthFactory(config) {
  const { createAuth } = await import('./auth.mjs');
  return createAuth(config);
}

export async function createLostSizzlerCommerceRuntime({
  env = process.env,
  createDatabaseImpl = defaultDatabaseFactory,
  createAuthImpl = defaultAuthFactory,
  createApplicationImpl = createLostSizzlerCommerceApplication,
  createRuntimeConfigImpl = createLostSizzlerCommerceRuntimeConfig,
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
  randomUuidImpl,
} = {}) {
  if (typeof createDatabaseImpl !== 'function') throw new TypeError('C64 Dungeon Carnage commerce runtime requires a database factory.');
  if (typeof createAuthImpl !== 'function') throw new TypeError('C64 Dungeon Carnage commerce runtime requires an authentication factory.');
  if (typeof createApplicationImpl !== 'function') throw new TypeError('C64 Dungeon Carnage commerce runtime requires an application factory.');
  if (typeof createRuntimeConfigImpl !== 'function') throw new TypeError('C64 Dungeon Carnage commerce runtime requires a runtime-config factory.');

  const databaseUrl = readRequired(env, 'DATABASE_URL');
  const authConfig = Object.freeze({
    jwtIssuer: readRequired(env, 'CCG_JWT_ISSUER'),
    jwtAudience: readRequired(env, 'CCG_JWT_AUDIENCE'),
    jwtJwksUrl: readRequired(env, 'CCG_JWT_JWKS_URL'),
  });
  const commerceConfig = createRuntimeConfigImpl(env);
  const database = await createDatabaseImpl(databaseUrl, { sslMode: readDatabaseSslMode(env) });

  let application;
  try {
    const auth = await createAuthImpl(authConfig);
    application = createApplicationImpl({
      database,
      auth,
      config: commerceConfig,
      fetchImpl,
      now,
      ...(randomUuidImpl ? { randomUuidImpl } : {}),
    });
  } catch (error) {
    try {
      await database?.close?.();
    } catch {
      // Preserve the original composition error.
    }
    throw error;
  }

  return Object.freeze({
    ...application,
    async close() {
      await database?.close?.();
    },
  });
}

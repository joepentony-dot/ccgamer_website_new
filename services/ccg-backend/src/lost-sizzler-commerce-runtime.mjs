import { createLostSizzlerCommerceApplication } from './lost-sizzler-commerce-app.mjs';
import { createLostSizzlerCommerceRuntimeConfig } from './lost-sizzler-commerce-runtime-config.mjs';
import { createLostSizzlerPackageDeliveryRuntimeConfig } from './lost-sizzler-package-delivery-runtime-config.mjs';
import { createLostSizzlerPrivatePackageDelivery } from './lost-sizzler-private-package-delivery.mjs';

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

async function unavailablePrivateSignerFactory() {
  throw new Error('C64 Dungeon Carnage package downloads are enabled but no private storage signer is configured.');
}

export async function createLostSizzlerCommerceRuntime({
  env = process.env,
  createDatabaseImpl = defaultDatabaseFactory,
  createAuthImpl = defaultAuthFactory,
  createApplicationImpl = createLostSizzlerCommerceApplication,
  createRuntimeConfigImpl = createLostSizzlerCommerceRuntimeConfig,
  createPackageDeliveryRuntimeConfigImpl = createLostSizzlerPackageDeliveryRuntimeConfig,
  createPrivatePackageDeliveryImpl = createLostSizzlerPrivatePackageDelivery,
  createPrivateSignerImpl = unavailablePrivateSignerFactory,
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
  randomUuidImpl,
} = {}) {
  if (typeof createDatabaseImpl !== 'function') throw new TypeError('C64 Dungeon Carnage commerce runtime requires a database factory.');
  if (typeof createAuthImpl !== 'function') throw new TypeError('C64 Dungeon Carnage commerce runtime requires an authentication factory.');
  if (typeof createApplicationImpl !== 'function') throw new TypeError('C64 Dungeon Carnage commerce runtime requires an application factory.');
  if (typeof createRuntimeConfigImpl !== 'function') throw new TypeError('C64 Dungeon Carnage commerce runtime requires a runtime-config factory.');
  if (typeof createPackageDeliveryRuntimeConfigImpl !== 'function') throw new TypeError('C64 Dungeon Carnage commerce runtime requires a package-delivery runtime-config factory.');
  if (typeof createPrivatePackageDeliveryImpl !== 'function') throw new TypeError('C64 Dungeon Carnage commerce runtime requires a private package-delivery factory.');
  if (typeof createPrivateSignerImpl !== 'function') throw new TypeError('C64 Dungeon Carnage commerce runtime requires a private signer factory.');

  const databaseUrl = readRequired(env, 'DATABASE_URL');
  const authConfig = Object.freeze({
    jwtIssuer: readRequired(env, 'CCG_JWT_ISSUER'),
    jwtAudience: readRequired(env, 'CCG_JWT_AUDIENCE'),
    jwtJwksUrl: readRequired(env, 'CCG_JWT_JWKS_URL'),
  });
  const commerceConfig = createRuntimeConfigImpl(env);
  const packageDeliveryConfig = createPackageDeliveryRuntimeConfigImpl(env);
  const database = await createDatabaseImpl(databaseUrl, { sslMode: readDatabaseSslMode(env) });

  let application;
  try {
    const auth = await createAuthImpl(authConfig);
    let packageDelivery = null;

    if (packageDeliveryConfig?.enabled === true) {
      const signer = await createPrivateSignerImpl(Object.freeze({ env }));
      packageDelivery = createPrivatePackageDeliveryImpl({
        signer,
        packageConfig: packageDeliveryConfig.packageConfig,
        maxTtlSeconds: packageDeliveryConfig.maxTtlSeconds,
        now,
      });
    }

    application = createApplicationImpl({
      database,
      auth,
      config: commerceConfig,
      ...(packageDelivery ? { packageDelivery } : {}),
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

import assert from 'node:assert/strict';
import { createLostSizzlerPackageDeliveryRuntimeConfig } from '../src/lost-sizzler-package-delivery-runtime-config.mjs';
import { createLostSizzlerCommerceRuntime } from '../src/lost-sizzler-commerce-runtime.mjs';

function baseRuntimeEnv(overrides = {}) {
  return {
    DATABASE_URL: 'postgresql://fixture:fixture@db.example.invalid/ccg',
    CCG_JWT_ISSUER: 'https://auth.example.invalid/',
    CCG_JWT_AUDIENCE: 'ccg-web',
    CCG_JWT_JWKS_URL: 'https://auth.example.invalid/.well-known/jwks.json',
    CCG_COMMERCE_ENABLED: 'false',
    ...overrides,
  };
}

function packageEnv(overrides = {}) {
  return baseRuntimeEnv({
    CCG_PACKAGE_DOWNLOAD_ENABLED: 'true',
    CCG_PACKAGE_ID: 'c64-dungeon-carnage-windows',
    CCG_PACKAGE_VERSION: '10.42.0',
    CCG_PACKAGE_OBJECT_KEY: 'releases/c64-dungeon-carnage/10.42.0/windows.zip',
    CCG_PACKAGE_SHA256: 'a'.repeat(64),
    CCG_PACKAGE_BYTES: '123456789',
    CCG_PACKAGE_DOWNLOAD_MAX_TTL_SECONDS: '600',
    ...overrides,
  });
}

{
  assert.deepEqual(createLostSizzlerPackageDeliveryRuntimeConfig(baseRuntimeEnv()), { enabled: false });
}

{
  const config = createLostSizzlerPackageDeliveryRuntimeConfig(packageEnv());
  assert.deepEqual(config, {
    enabled: true,
    packageConfig: {
      packageId: 'c64-dungeon-carnage-windows',
      version: '10.42.0',
      objectKey: 'releases/c64-dungeon-carnage/10.42.0/windows.zip',
      sha256: 'a'.repeat(64),
      bytes: 123456789,
    },
    maxTtlSeconds: 600,
  });
}

{
  assert.throws(
    () => createLostSizzlerPackageDeliveryRuntimeConfig(packageEnv({ CCG_PACKAGE_SHA256: 'bad' })),
    /SHA-256/,
  );
  assert.throws(
    () => createLostSizzlerPackageDeliveryRuntimeConfig(packageEnv({ CCG_PACKAGE_OBJECT_KEY: '../public.zip' })),
    /OBJECT_KEY is invalid/,
  );
  assert.throws(
    () => createLostSizzlerPackageDeliveryRuntimeConfig(packageEnv({ CCG_PACKAGE_BYTES: '0' })),
    /PACKAGE_BYTES must be a positive integer/,
  );
  assert.throws(
    () => createLostSizzlerPackageDeliveryRuntimeConfig(packageEnv({ CCG_PACKAGE_DOWNLOAD_MAX_TTL_SECONDS: '901' })),
    /between 5 and 900 seconds/,
  );
}

{
  let signerCalls = 0;
  let deliveryCalls = 0;
  let applicationInput = null;
  const database = { async close() {} };
  const auth = { verifyBearer() {} };

  await createLostSizzlerCommerceRuntime({
    env: baseRuntimeEnv(),
    createDatabaseImpl: async () => database,
    createAuthImpl: async () => auth,
    createRuntimeConfigImpl: () => ({ commerceEnabled: false }),
    createPrivateSignerImpl: async () => {
      signerCalls += 1;
      throw new Error('disabled package delivery must not create a signer');
    },
    createPrivatePackageDeliveryImpl: () => {
      deliveryCalls += 1;
      throw new Error('disabled package delivery must not compose delivery');
    },
    createApplicationImpl: (input) => {
      applicationInput = input;
      return { router: {}, status: { commerce_enabled: false, secure_download_enabled: false } };
    },
  });

  assert.equal(signerCalls, 0);
  assert.equal(deliveryCalls, 0);
  assert.equal(Object.hasOwn(applicationInput, 'packageDelivery'), false);
}

{
  const env = packageEnv();
  const database = { async close() {} };
  const auth = { verifyBearer() {} };
  const signer = { async signPrivateGet() {} };
  const delivery = { async issueDownload() {} };
  let signerInput = null;
  let deliveryInput = null;
  let applicationInput = null;

  const runtime = await createLostSizzlerCommerceRuntime({
    env,
    createDatabaseImpl: async () => database,
    createAuthImpl: async () => auth,
    createRuntimeConfigImpl: () => ({ commerceEnabled: false }),
    createPrivateSignerImpl: async (input) => {
      signerInput = input;
      return signer;
    },
    createPrivatePackageDeliveryImpl: (input) => {
      deliveryInput = input;
      return delivery;
    },
    createApplicationImpl: (input) => {
      applicationInput = input;
      return { router: {}, status: { commerce_enabled: false, secure_download_enabled: true } };
    },
  });

  assert.equal(signerInput.env, env);
  assert.equal(deliveryInput.signer, signer);
  assert.deepEqual(deliveryInput.packageConfig, {
    packageId: 'c64-dungeon-carnage-windows',
    version: '10.42.0',
    objectKey: 'releases/c64-dungeon-carnage/10.42.0/windows.zip',
    sha256: 'a'.repeat(64),
    bytes: 123456789,
  });
  assert.equal(deliveryInput.maxTtlSeconds, 600);
  assert.equal(applicationInput.packageDelivery, delivery);
  assert.equal(runtime.status.secure_download_enabled, true);
}

{
  let closed = 0;
  await assert.rejects(
    () => createLostSizzlerCommerceRuntime({
      env: packageEnv(),
      createDatabaseImpl: async () => ({ async close() { closed += 1; } }),
      createAuthImpl: async () => ({ verifyBearer() {} }),
      createRuntimeConfigImpl: () => ({ commerceEnabled: false }),
    }),
    /no private storage signer is configured/,
  );
  assert.equal(closed, 1);
}

console.log('C64 Dungeon Carnage package delivery runtime configuration contract passed.');

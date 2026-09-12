import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildPackageRuntimeEnvironment,
  loadPackageRuntimeEnvironment,
} from '../../../scripts/export-lost-sizzler-package-runtime-env.mjs';
import { createLostSizzlerPackageDeliveryRuntimeConfig } from '../src/lost-sizzler-package-delivery-runtime-config.mjs';

const descriptor = Object.freeze({
  schema: 'ccg-c64-dungeon-carnage-package-artifact-v1',
  package_id: 'c64-dungeon-carnage-windows',
  version: '10.42.0',
  object_key: 'releases/c64-dungeon-carnage/10.42.0/windows.zip',
  filename: 'C64-Dungeon-Carnage-10.42.0.zip',
  bytes: 123456789,
  sha256: 'b'.repeat(64),
});

{
  const env = buildPackageRuntimeEnvironment(descriptor, { maxTtlSeconds: 600 });
  assert.deepEqual(env, {
    CCG_PACKAGE_DOWNLOAD_ENABLED: 'true',
    CCG_PACKAGE_ID: descriptor.package_id,
    CCG_PACKAGE_VERSION: descriptor.version,
    CCG_PACKAGE_OBJECT_KEY: descriptor.object_key,
    CCG_PACKAGE_SHA256: descriptor.sha256,
    CCG_PACKAGE_BYTES: String(descriptor.bytes),
    CCG_PACKAGE_DOWNLOAD_MAX_TTL_SECONDS: '600',
  });

  assert.deepEqual(createLostSizzlerPackageDeliveryRuntimeConfig(env), {
    enabled: true,
    packageConfig: {
      packageId: descriptor.package_id,
      version: descriptor.version,
      objectKey: descriptor.object_key,
      sha256: descriptor.sha256,
      bytes: descriptor.bytes,
    },
    maxTtlSeconds: 600,
  });
}

{
  assert.throws(
    () => buildPackageRuntimeEnvironment({ ...descriptor, schema: 'unknown' }),
    /schema is unsupported/,
  );
  assert.throws(
    () => buildPackageRuntimeEnvironment({ ...descriptor, object_key: '../public/game.zip' }),
    /object key is invalid/,
  );
  assert.throws(
    () => buildPackageRuntimeEnvironment({ ...descriptor, object_key: 'private/game.zip\nCCG_PACKAGE_DOWNLOAD_ENABLED=false' }),
    /object key is invalid/,
  );
  assert.throws(
    () => buildPackageRuntimeEnvironment({ ...descriptor, object_key: 'private/game.zip=override' }),
    /object key is invalid/,
  );
  assert.throws(
    () => buildPackageRuntimeEnvironment({ ...descriptor, object_key: 'private/game file.zip' }),
    /object key is invalid/,
  );
  assert.throws(
    () => buildPackageRuntimeEnvironment({ ...descriptor, sha256: 'bad' }),
    /SHA-256 is invalid/,
  );
  assert.throws(
    () => buildPackageRuntimeEnvironment({ ...descriptor, bytes: 0 }),
    /byte size is invalid/,
  );
  assert.throws(
    () => buildPackageRuntimeEnvironment(descriptor, { maxTtlSeconds: 901 }),
    /between 5 and 900 seconds/,
  );
}

const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'ccg-package-runtime-handoff-'));
try {
  const descriptorPath = path.join(temp, 'descriptor.json');
  await fs.writeFile(descriptorPath, `${JSON.stringify(descriptor, null, 2)}\n`);
  const env = await loadPackageRuntimeEnvironment(descriptorPath, { maxTtlSeconds: 300 });
  assert.equal(env.CCG_PACKAGE_SHA256, descriptor.sha256);
  assert.equal(env.CCG_PACKAGE_BYTES, String(descriptor.bytes));
  assert.equal(env.CCG_PACKAGE_DOWNLOAD_MAX_TTL_SECONDS, '300');

  const linked = path.join(temp, 'linked.json');
  await fs.symlink(descriptorPath, linked);
  await assert.rejects(
    () => loadPackageRuntimeEnvironment(linked),
    /regular file/,
  );

  const malformed = path.join(temp, 'malformed.json');
  await fs.writeFile(malformed, '{ nope');
  await assert.rejects(
    () => loadPackageRuntimeEnvironment(malformed),
    /not valid JSON/,
  );
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}

console.log('C64 Dungeon Carnage package descriptor runtime handoff contract passed.');

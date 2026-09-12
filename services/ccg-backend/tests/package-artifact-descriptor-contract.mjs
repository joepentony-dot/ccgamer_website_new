import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildPackageArtifactDescriptor } from '../../../scripts/build-lost-sizzler-package-artifact-descriptor.mjs';

const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'ccg-package-artifact-'));
try {
  const artifact = path.join(temp, 'C64-Dungeon-Carnage-10.42.0.zip');
  const bytes = Buffer.from('fixture-package-bytes\n', 'utf8');
  await fs.writeFile(artifact, bytes);

  const descriptor = await buildPackageArtifactDescriptor({
    artifact,
    packageId: 'c64-dungeon-carnage-windows',
    version: '10.42.0',
    objectKey: 'releases/c64-dungeon-carnage/10.42.0/windows.zip',
  });

  assert.deepEqual(descriptor, {
    schema: 'ccg-c64-dungeon-carnage-package-artifact-v1',
    package_id: 'c64-dungeon-carnage-windows',
    version: '10.42.0',
    object_key: 'releases/c64-dungeon-carnage/10.42.0/windows.zip',
    filename: 'C64-Dungeon-Carnage-10.42.0.zip',
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });

  await assert.rejects(
    () => buildPackageArtifactDescriptor({
      artifact,
      packageId: 'c64-dungeon-carnage-windows',
      version: '10.42.0',
      objectKey: '../public/windows.zip',
    }),
    /object key is invalid/,
  );

  const empty = path.join(temp, 'empty.zip');
  await fs.writeFile(empty, '');
  await assert.rejects(
    () => buildPackageArtifactDescriptor({
      artifact: empty,
      packageId: 'c64-dungeon-carnage-windows',
      version: '10.42.0',
      objectKey: 'private/empty.zip',
    }),
    /must not be empty/,
  );

  const linked = path.join(temp, 'linked.zip');
  await fs.symlink(artifact, linked);
  await assert.rejects(
    () => buildPackageArtifactDescriptor({
      artifact: linked,
      packageId: 'c64-dungeon-carnage-windows',
      version: '10.42.0',
      objectKey: 'private/linked.zip',
    }),
    /regular file/,
  );
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}

console.log('C64 Dungeon Carnage package artifact descriptor contract passed.');

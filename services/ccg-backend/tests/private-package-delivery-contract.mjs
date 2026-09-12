import assert from 'node:assert/strict';
import { createLostSizzlerPrivatePackageDelivery } from '../src/lost-sizzler-private-package-delivery.mjs';

const NOW = Date.parse('2026-09-12T09:00:00.000Z');
const packageConfig = Object.freeze({
  packageId: 'c64-dungeon-carnage-windows',
  version: '10.42.0',
  objectKey: 'releases/c64-dungeon-carnage/10.42.0/windows.zip',
  sha256: 'a'.repeat(64),
  bytes: 123456789,
});

function createSigner() {
  const calls = [];
  return {
    calls,
    async signPrivateGet(input) {
      calls.push(input);
      return {
        url: 'https://private-downloads.example.test/signed/object?token=contract-only',
        expiresAt: new Date(NOW + input.expiresInSeconds * 1000).toISOString(),
      };
    },
  };
}

{
  const signer = createSigner();
  const delivery = createLostSizzlerPrivatePackageDelivery({
    signer,
    packageConfig,
    maxTtlSeconds: 600,
    now: () => NOW,
  });

  const issued = await delivery.issueDownload({
    userId: 'user-controlled-value-is-not-used-for-object-selection',
    productSlug: 'the-lost-sizzler-full-game',
    purpose: 'desktop-offline',
    maxTtlSeconds: 900,
  });

  assert.equal(issued.kind, 'signed-url');
  assert.equal(issued.package.package_id, packageConfig.packageId);
  assert.equal(issued.package.version, packageConfig.version);
  assert.equal(issued.package.sha256, packageConfig.sha256);
  assert.equal(issued.package.bytes, packageConfig.bytes);
  assert.equal(signer.calls.length, 1);
  assert.deepEqual(signer.calls[0], {
    objectKey: packageConfig.objectKey,
    expiresInSeconds: 600,
    disposition: 'attachment; filename="c64-dungeon-carnage-windows-10.42.0.zip"',
  });
  assert.equal(JSON.stringify(signer.calls[0]).includes('user-controlled-value'), false);
}

{
  const signer = createSigner();
  const delivery = createLostSizzlerPrivatePackageDelivery({
    signer,
    packageConfig,
    now: () => NOW,
  });
  await delivery.issueDownload({ purpose: 'desktop-offline', maxTtlSeconds: 120 });
  assert.equal(signer.calls[0].expiresInSeconds, 120);
}

{
  const signer = createSigner();
  const delivery = createLostSizzlerPrivatePackageDelivery({ signer, packageConfig, now: () => NOW });
  await assert.rejects(
    delivery.issueDownload({ purpose: 'browser-play' }),
    /purpose is invalid/
  );
  assert.equal(signer.calls.length, 0);
}

{
  assert.throws(
    () => createLostSizzlerPrivatePackageDelivery({ signer: createSigner(), packageConfig: { ...packageConfig, objectKey: '../public.zip' } }),
    /object key is invalid/
  );
  assert.throws(
    () => createLostSizzlerPrivatePackageDelivery({ signer: {}, packageConfig }),
    /private GET signer/
  );
  assert.throws(
    () => createLostSizzlerPrivatePackageDelivery({ signer: createSigner(), packageConfig: { ...packageConfig, sha256: 'bad' } }),
    /SHA-256 is invalid/
  );
}

{
  const delivery = createLostSizzlerPrivatePackageDelivery({
    signer: {
      async signPrivateGet() {
        return {
          url: 'http://public.example.test/release.zip',
          expiresAt: new Date(NOW + 60_000).toISOString(),
        };
      },
    },
    packageConfig,
    now: () => NOW,
  });
  await assert.rejects(delivery.issueDownload({ purpose: 'desktop-offline', maxTtlSeconds: 60 }), /insecure URL/);
}

{
  const delivery = createLostSizzlerPrivatePackageDelivery({
    signer: {
      async signPrivateGet(input) {
        return {
          url: 'https://private-downloads.example.test/signed/object?token=contract-only',
          expiresAt: new Date(NOW + (input.expiresInSeconds + 30) * 1000).toISOString(),
        };
      },
    },
    packageConfig,
    now: () => NOW,
  });
  await assert.rejects(delivery.issueDownload({ purpose: 'desktop-offline', maxTtlSeconds: 60 }), /invalid expiry/);
}

console.log('C64 Dungeon Carnage private package delivery contract passed.');

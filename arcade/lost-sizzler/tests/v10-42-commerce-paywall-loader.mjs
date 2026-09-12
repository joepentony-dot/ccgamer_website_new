#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  ENTRY_MODULE_URL,
  autoBootC64DungeonCarnagePaywall,
  bootC64DungeonCarnagePaywall,
} from '../js/v10-42-commerce-paywall-loader.mjs';

async function main() {
  let imports = 0;
  const disabled = await bootC64DungeonCarnagePaywall({
    config: { enabled: false },
    importer: async () => {
      imports += 1;
      throw new Error('disabled loader imported paywall entry');
    },
  });
  assert.equal(disabled.enabled, false);
  assert.equal(disabled.mounted, false);
  assert.equal(imports, 0, 'disabled loader must not request the paywall entry module');

  const missing = await autoBootC64DungeonCarnagePaywall({
    config: null,
    importer: async () => {
      imports += 1;
      throw new Error('missing configuration imported paywall entry');
    },
  });
  assert.equal(missing.reason, 'disabled');
  assert.equal(imports, 0, 'missing configuration must remain completely inert');

  const documentRef = { querySelector() { return null; } };
  const fetchImpl = async () => { throw new Error('network must remain entry-owned'); };
  const now = () => 123456;
  const config = {
    enabled: true,
    baseUrl: 'https://commerce.example.test',
    getAccessToken: async () => 'token',
    onDownloadGrant() {},
  };

  let importedUrl = null;
  let mountedArgs = null;
  const enabled = await bootC64DungeonCarnagePaywall({
    config,
    documentRef,
    fetchImpl,
    now,
    importer: async (url) => {
      imports += 1;
      importedUrl = url;
      return {
        mountLostSizzlerPaywallEntry(args) {
          mountedArgs = args;
          return Object.freeze({ enabled: true, mounted: true, start() {}, refresh() {}, destroy() {} });
        },
      };
    },
  });

  assert.equal(imports, 1);
  assert.equal(importedUrl, ENTRY_MODULE_URL);
  assert.equal(enabled.enabled, true);
  assert.equal(enabled.mounted, true);
  assert.equal(mountedArgs.config, config);
  assert.equal(mountedArgs.documentRef, documentRef);
  assert.equal(mountedArgs.fetchImpl, fetchImpl);
  assert.equal(mountedArgs.now, now);

  await assert.rejects(
    () => bootC64DungeonCarnagePaywall({
      config,
      importer: async () => ({}),
    }),
    /entry module is invalid/,
  );

  let reportedError = null;
  await assert.rejects(
    () => autoBootC64DungeonCarnagePaywall({
      config: { ...config, onError(error) { reportedError = error; } },
      importer: async () => { throw new Error('module load failed'); },
    }),
    /module load failed/,
  );
  assert.match(String(reportedError?.message || ''), /module load failed/);

  console.log('C64 Dungeon Carnage commerce paywall loader contract passed.');
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const modulePath = path.resolve(here, '../js/v10-42-commerce-paywall-page-entry.mjs');
const source = await readFile(modulePath, 'utf8');
const {
  startC64DungeonCarnagePaywallPageEntry,
} = await import(`${pathToFileURL(modulePath).href}?contract=${Date.now()}`);

function pathToFileURL(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return new URL(`file://${normalized.startsWith('/') ? '' : '/'}${normalized}`);
}

{
  let bootCalls = 0;
  const globalRef = {
    get document() {
      throw new Error('disabled page entry must not touch document');
    },
    get fetch() {
      throw new Error('disabled page entry must not touch fetch');
    },
  };
  const result = await startC64DungeonCarnagePaywallPageEntry({
    globalRef,
    boot() {
      bootCalls += 1;
      throw new Error('disabled page entry must not boot commerce');
    },
  });
  assert.equal(bootCalls, 0);
  assert.deepEqual(result, { enabled: false, mounted: false, reason: 'disabled' });
}

{
  let bootCalls = 0;
  const documentRef = Object.freeze({ marker: 'document' });
  const fetchImpl = Object.freeze(() => {});
  const config = Object.freeze({ enabled: true });
  const result = await startC64DungeonCarnagePaywallPageEntry({
    globalRef: {
      __CCG_DUNGEON_CARNAGE_COMMERCE__: config,
      document: documentRef,
      fetch: fetchImpl,
    },
    boot(options) {
      bootCalls += 1;
      assert.equal(options.config, config);
      assert.equal(options.documentRef, documentRef);
      assert.equal(options.fetchImpl, fetchImpl);
      assert.equal(typeof options.now, 'function');
      return { enabled: true, mounted: true, marker: 'delegated' };
    },
  });
  assert.equal(bootCalls, 1);
  assert.equal(result.marker, 'delegated');
}

{
  await assert.rejects(
    startC64DungeonCarnagePaywallPageEntry({
      globalRef: { __CCG_DUNGEON_CARNAGE_COMMERCE__: { enabled: true } },
      boot: null,
    }),
    /requires a boot function/,
  );
}

assert.match(source, /config\.enabled !== true/);
assert.match(source, /typeof window !== 'undefined'/);
assert.match(source, /autoStartC64DungeonCarnagePaywallPageEntry/);
assert.doesNotMatch(source, /paypal\.com|paypalobjects|window\.open|location\s*=|\.zip\b/i);
assert.doesNotMatch(source, /CHEEKY COMMODORE QUEST|THE LOST SIZZLER|ccg-release-loading/i);

console.log('C64 Dungeon Carnage paywall page entry contract passed.');

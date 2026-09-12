#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const gameRoot = path.resolve(testDir, '..');
const indexPath = path.join(gameRoot, 'index.html');
const entryPath = path.join(gameRoot, 'js', 'v10-42-commerce-paywall-page-entry.mjs');

const html = await readFile(indexPath, 'utf8');
const mountTag = '<script type="module" src="js/v10-42-commerce-paywall-page-entry.mjs?v=20260910r1"></script>';

assert.equal((html.match(/v10-42-commerce-paywall-page-entry\.mjs/g) || []).length, 1, 'public page must mount the commerce entry exactly once');
assert.ok(html.includes(mountTag), 'public page must use the expected deferred module mount');
assert.ok(html.indexOf('<h1>C64 Dungeon Carnage</h1>') < html.indexOf(mountTag), 'current C64 Dungeon Carnage first-paint identity must precede the commerce mount');
assert.ok(html.indexOf('js/v10-41-cache-guard.js') < html.indexOf(mountTag), 'cache/branding guard must execute before the commerce mount');
assert.ok(html.indexOf('js/version-check.js') < html.indexOf(mountTag), 'release/version bootstrap must remain ahead of commerce mount');
assert.ok(html.indexOf('js/v10-41-r30-buglog.js') < html.indexOf(mountTag), 'commerce mount must remain after the existing gameplay stack');
assert.ok(html.indexOf(mountTag) < html.indexOf('</body>'), 'commerce mount must stay at the end of body');
assert.ok(!html.includes('__CCG_DUNGEON_CARNAGE_COMMERCE__ ='), 'public page must not inline-enable commerce');
assert.ok(!html.includes('paypal.com/sdk/js'), 'public page must not load the PayPal SDK');

const entry = await import(pathToFileURL(entryPath).href);
let documentTouched = false;
let fetchTouched = false;
const inertGlobal = {};
Object.defineProperty(inertGlobal, 'document', {
  get() {
    documentTouched = true;
    throw new Error('disabled mount must not touch document');
  },
});
Object.defineProperty(inertGlobal, 'fetch', {
  get() {
    fetchTouched = true;
    throw new Error('disabled mount must not touch fetch');
  },
});

const result = await entry.startC64DungeonCarnagePaywallPageEntry({ globalRef: inertGlobal });
assert.deepEqual(result, { enabled: false, mounted: false, reason: 'disabled' });
assert.equal(documentTouched, false, 'disabled public mount must not touch document');
assert.equal(fetchTouched, false, 'disabled public mount must not touch fetch');

const forbiddenLegacy = [
  'CHEEKY COMMODORE QUEST',
  'THE LOST SIZZLER',
  'Preparing The Lost Sizzler game systems',
];
const mountLine = html.split('\n').find((line) => line.includes('v10-42-commerce-paywall-page-entry.mjs')) || '';
for (const text of forbiddenLegacy) {
  assert.ok(!mountLine.includes(text), `commerce mount must not introduce retired overlay text: ${text}`);
}

console.log('C64 Dungeon Carnage dormant public paywall mount contract passed.');

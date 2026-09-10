#!/usr/bin/env node

import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import process from 'node:process';
import vm from 'node:vm';

const MANIFEST_SCHEMA = 'ccg-lost-sizzler-desktop-package-manifest-v1';
const CATALOGUE_PATH = 'games/games.json';
const CONFIG_PATH = 'arcade/lost-sizzler/js/config.js';

function parseArgs(argv) {
  const options = { manifest: null, catalogue: CATALOGUE_PATH, config: CONFIG_PATH, selfTest: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--manifest') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error('--manifest requires a file path');
      options.manifest = value;
      index += 1;
      continue;
    }
    if (arg === '--catalogue') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error('--catalogue requires a file path');
      options.catalogue = value;
      index += 1;
      continue;
    }
    if (arg === '--config') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error('--config requires a file path');
      options.config = value;
      index += 1;
      continue;
    }
    if (arg === '--self-test') {
      options.selfTest = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/verify-lost-sizzler-offline-catalogue.mjs --manifest <manifest.json> [--catalogue games/games.json] [--config arcade/lost-sizzler/js/config.js]');
      console.log('       node scripts/verify-lost-sizzler-offline-catalogue.mjs --self-test');
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizedTitle(value) {
  return String(value ?? '').trim();
}

function sha256Text(value) {
  return crypto.createHash('sha256').update(Buffer.from(String(value), 'utf8')).digest('hex');
}

function deriveC64Titles(rows) {
  assert(Array.isArray(rows), 'Master game catalogue must be a top-level array.');
  const seen = new Set();
  const titles = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    if (String(row.system ?? '').trim().toUpperCase() !== 'C64') continue;
    const title = normalizedTitle(row.title);
    if (!title) continue;
    const key = title.toLocaleLowerCase('en-GB');
    if (seen.has(key)) continue;
    seen.add(key);
    titles.push(title);
  }
  return titles;
}

function readFallbackTitles(source) {
  const sandbox = { window: {} };
  vm.runInNewContext(String(source), sandbox, { filename: CONFIG_PATH, timeout: 1000 });
  const fallback = sandbox.window.CCG_CONFIG?.c64Loot;
  assert(Array.isArray(fallback) && fallback.length > 0, 'Lost Sizzler config must expose a non-empty C64 fallback loot catalogue.');
  const titles = fallback.map(normalizedTitle).filter(Boolean);
  assert(titles.length === fallback.length, 'Lost Sizzler C64 fallback loot catalogue must not contain blank titles.');
  return titles;
}

function validateManifest(manifest) {
  assert(manifest && typeof manifest === 'object', 'Package manifest must be an object.');
  assert(manifest.schema === MANIFEST_SCHEMA, `Unexpected package manifest schema: ${manifest.schema}`);
  assert(Array.isArray(manifest.files), 'Package manifest must contain a files array.');
  const matches = manifest.files.filter((entry) => entry?.path === CATALOGUE_PATH);
  assert(matches.length === 1, `Desktop package manifest must contain exactly one ${CATALOGUE_PATH} entry.`);
  const entry = matches[0];
  assert(entry.classification === 'catalogue', `${CATALOGUE_PATH} must be classified as catalogue data.`);
  assert(Number.isSafeInteger(entry.bytes) && entry.bytes > 0, `${CATALOGUE_PATH} must have a positive byte size.`);
  assert(/^[0-9a-f]{64}$/.test(entry.sha256 ?? ''), `${CATALOGUE_PATH} must retain SHA-256 provenance.`);
  assert(entry.sourceRepositoryPath === CATALOGUE_PATH, `${CATALOGUE_PATH} must be sourced from the master catalogue itself.`);
  return entry;
}

function validateCatalogueProvenance(entry, catalogueText) {
  const bytes = Buffer.byteLength(catalogueText, 'utf8');
  const sha256 = sha256Text(catalogueText);
  assert(entry.bytes === bytes, `Packaged ${CATALOGUE_PATH} byte size does not match the checked master catalogue.`);
  assert(entry.sha256 === sha256, `Packaged ${CATALOGUE_PATH} SHA-256 does not match the checked master catalogue.`);
  return { bytes, sha256 };
}

function validateCatalogue(rows, fallbackTitles) {
  const c64Titles = deriveC64Titles(rows);
  assert(c64Titles.length > fallbackTitles.length, `Packaged C64 catalogue must broaden the built-in fallback pool; found ${c64Titles.length} unique C64 titles versus ${fallbackTitles.length} fallback titles.`);
  return { c64Titles };
}

function fixtureManifest(catalogueText = '[{"system":"C64","title":"Paradroid"}]\n') {
  return {
    schema: MANIFEST_SCHEMA,
    files: [{
      path: CATALOGUE_PATH,
      classification: 'catalogue',
      bytes: Buffer.byteLength(catalogueText, 'utf8'),
      sha256: sha256Text(catalogueText),
      sourceRepositoryPath: CATALOGUE_PATH,
    }],
  };
}

function expectFailure(action, expectedText) {
  try {
    action();
  } catch (error) {
    if (!String(error?.message || error).includes(expectedText)) {
      throw new Error(`Self-test expected failure containing ${JSON.stringify(expectedText)}, got: ${error?.message || error}`);
    }
    return;
  }
  throw new Error(`Self-test expected failure containing ${JSON.stringify(expectedText)} but validation passed.`);
}

function runSelfTest() {
  const fixtureCatalogue = '[{"system":"C64","title":"Paradroid"}]\n';
  const validEntry = validateManifest(fixtureManifest(fixtureCatalogue));
  validateCatalogueProvenance(validEntry, fixtureCatalogue);

  const mixed = [
    { system: 'C64', title: 'Paradroid' },
    { system: 'amiga', title: 'Lemmings' },
    { system: ' C64 ', title: 'IK+' },
    { system: 'C64', title: 'paradroid' },
    { system: 'C64', title: ' ' },
    { system: 'ZX', title: 'Head Over Heels' },
  ];
  const derived = deriveC64Titles(mixed);
  assert(derived.length === 2 && derived[0] === 'Paradroid' && derived[1] === 'IK+', 'C64 catalogue derivation must retain C64 titles, exclude other systems and deduplicate case-insensitively.');
  assert(!derived.includes('Lemmings'), 'Amiga titles must never enter the derived C64 collectible pool.');

  expectFailure(() => validateManifest({ ...fixtureManifest(), files: [] }), 'exactly one');
  expectFailure(() => validateManifest({ ...fixtureManifest(), files: [{ ...fixtureManifest().files[0], classification: 'runtime' }] }), 'classified as catalogue');
  expectFailure(() => validateManifest({ ...fixtureManifest(), files: [{ ...fixtureManifest().files[0], bytes: 0 }] }), 'positive byte size');
  expectFailure(() => validateManifest({ ...fixtureManifest(), files: [{ ...fixtureManifest().files[0], sha256: 'pending' }] }), 'SHA-256 provenance');
  expectFailure(() => validateManifest({ ...fixtureManifest(), files: [{ ...fixtureManifest().files[0], sourceRepositoryPath: 'arcade/lost-sizzler/config.json' }] }), 'sourced from the master catalogue');
  expectFailure(() => validateCatalogueProvenance({ ...validEntry, bytes: validEntry.bytes + 1 }, fixtureCatalogue), 'byte size does not match');
  expectFailure(() => validateCatalogueProvenance({ ...validEntry, sha256: 'b'.repeat(64) }, fixtureCatalogue), 'SHA-256 does not match');
  expectFailure(() => deriveC64Titles({ games: mixed }), 'top-level array');
  expectFailure(() => validateCatalogue([{ system: 'AMIGA', title: 'Lemmings' }], ['Fallback']), 'broaden the built-in fallback pool');
  expectFailure(() => validateCatalogue([{ system: 'C64', title: 'Only One' }], ['A', 'B']), 'broaden the built-in fallback pool');

  console.log('Lost Sizzler offline catalogue self-test passed: package provenance, source binding and C64-only title derivation are enforced.');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.selfTest) {
    if (options.manifest) throw new Error('--self-test cannot be combined with --manifest');
    runSelfTest();
    return;
  }
  if (!options.manifest) throw new Error('--manifest is required');

  const [manifestText, catalogueText, configSource] = await Promise.all([
    fs.readFile(options.manifest, 'utf8'),
    fs.readFile(options.catalogue, 'utf8'),
    fs.readFile(options.config, 'utf8'),
  ]);
  const entry = validateManifest(JSON.parse(manifestText));
  validateCatalogueProvenance(entry, catalogueText);
  const fallbackTitles = readFallbackTitles(configSource);
  const { c64Titles } = validateCatalogue(JSON.parse(catalogueText), fallbackTitles);
  console.log(`Lost Sizzler offline catalogue verified: ${c64Titles.length} unique C64 titles broaden the ${fallbackTitles.length}-title built-in fallback pool with manifest-bound byte/SHA-256 provenance.`);
}

main().catch((error) => {
  console.error(`Lost Sizzler offline catalogue verification failed: ${error?.message || error}`);
  process.exitCode = 1;
});

#!/usr/bin/env node

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

function fail(message) { throw new Error(message); }
function sha256(data) { return createHash('sha256').update(data).digest('hex'); }
function readJson(file, label) {
  if (!file) fail(`${label} path is required.`);
  const absolute = path.resolve(file);
  if (!fs.existsSync(absolute) || !fs.lstatSync(absolute).isFile()) fail(`${label} must be an existing regular file: ${absolute}`);
  const raw = fs.readFileSync(absolute);
  let parsed;
  try { parsed = JSON.parse(raw.toString('utf8')); } catch (error) { fail(`${label} is not valid JSON: ${error.message}`); }
  return { absolute, raw, parsed };
}
function validateManifest(manifest) {
  if (manifest.schema !== 'ccg-lost-sizzler-desktop-package-manifest-v1') fail(`Unsupported package manifest schema: ${manifest.schema ?? 'missing'}`);
  const releaseIdentifier = String(manifest.releaseIdentifier ?? '').trim();
  if (!releaseIdentifier || releaseIdentifier === 'unknown') fail('Package manifest requires a non-empty, non-unknown releaseIdentifier.');
  if (!Number.isInteger(manifest.fileCount) || manifest.fileCount < 1) fail('Package manifest fileCount must be a positive integer.');
  if (!Number.isInteger(manifest.totalBytes) || manifest.totalBytes < 1) fail('Package manifest totalBytes must be a positive integer.');
  if (!Array.isArray(manifest.files) || manifest.files.length !== manifest.fileCount) fail('Package manifest files array must match fileCount.');
  return releaseIdentifier;
}
function buildProvenance(manifestRecord) {
  const releaseIdentifier = validateManifest(manifestRecord.parsed);
  return {
    schema: 'ccg-lost-sizzler-desktop-package-provenance-v1',
    releaseIdentifier,
    packageManifestSha256: sha256(manifestRecord.raw),
    packageManifestBytes: manifestRecord.raw.length,
    packageFileCount: manifestRecord.parsed.fileCount,
    packageTotalBytes: manifestRecord.parsed.totalBytes,
  };
}
function verifyProvenance(manifestRecord, provenanceRecord) {
  const expected = buildProvenance(manifestRecord);
  const actual = provenanceRecord.parsed;
  if (actual.schema !== expected.schema) fail(`Unsupported package provenance schema: ${actual.schema ?? 'missing'}`);
  for (const key of ['releaseIdentifier', 'packageManifestSha256', 'packageManifestBytes', 'packageFileCount', 'packageTotalBytes']) {
    if (actual[key] !== expected[key]) fail(`Package provenance mismatch for ${key}: expected ${expected[key]}, got ${actual[key]}`);
  }
  return expected;
}
function parseArgs(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--self-test') { args.set(token, true); continue; }
    if (!token.startsWith('--')) fail(`Unexpected argument: ${token}`);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) fail(`Missing value for ${token}`);
    args.set(token, value); i += 1;
  }
  return args;
}
function writeJson(file, value) {
  const absolute = path.resolve(file);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
function runSelfTest() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'lost-sizzler-provenance-'));
  try {
    const manifestPath = path.join(temp, 'package-manifest.json');
    const manifest = {
      schema: 'ccg-lost-sizzler-desktop-package-manifest-v1',
      releaseIdentifier: '10.41-test',
      sourceRoot: '.',
      requiredInputs: [],
      fileCount: 1,
      totalBytes: 8,
      classificationCounts: { runtime: 1 },
      files: [{ path: 'runtime.txt', bytes: 8, sha256: sha256(Buffer.from('build-a\n')), classification: 'runtime', sourceRepositoryPath: 'runtime.txt' }],
    };
    writeJson(manifestPath, manifest);
    const manifestRecord = readJson(manifestPath, 'package manifest');
    const provenance = buildProvenance(manifestRecord);
    const provenancePath = path.join(temp, 'provenance.json');
    writeJson(provenancePath, provenance);
    verifyProvenance(manifestRecord, readJson(provenancePath, 'package provenance'));

    fs.appendFileSync(manifestPath, ' ');
    let digestMismatchRejected = false;
    try { verifyProvenance(readJson(manifestPath, 'package manifest'), readJson(provenancePath, 'package provenance')); } catch { digestMismatchRejected = true; }
    if (!digestMismatchRejected) fail('Manifest byte mutation must invalidate package provenance even when parsed package metadata is unchanged.');

    writeJson(manifestPath, { ...manifest, releaseIdentifier: '10.41-other' });
    let releaseMismatchRejected = false;
    try { verifyProvenance(readJson(manifestPath, 'package manifest'), readJson(provenancePath, 'package provenance')); } catch { releaseMismatchRejected = true; }
    if (!releaseMismatchRejected) fail('Changed release identifier must invalidate package provenance.');

    console.log('Lost Sizzler package provenance self-test passed: release identity and exact manifest bytes are SHA-256 bound for offline reporting.');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

const args = parseArgs(process.argv.slice(2));
try {
  if (args.get('--self-test')) {
    runSelfTest();
  } else {
    const manifestRecord = readJson(args.get('--manifest'), 'package manifest');
    if (args.get('--verify')) {
      const provenanceRecord = readJson(args.get('--verify'), 'package provenance');
      const verified = verifyProvenance(manifestRecord, provenanceRecord);
      console.log(`Lost Sizzler package provenance verified: release=${verified.releaseIdentifier}; manifestSha256=${verified.packageManifestSha256}; files=${verified.packageFileCount}; bytes=${verified.packageTotalBytes}.`);
    } else {
      const provenance = buildProvenance(manifestRecord);
      const output = args.get('--output');
      if (output) writeJson(output, provenance);
      else process.stdout.write(`${JSON.stringify(provenance, null, 2)}\n`);
    }
  }
} catch (error) {
  console.error(`Lost Sizzler package provenance failed: ${error.message}`);
  process.exitCode = 1;
}

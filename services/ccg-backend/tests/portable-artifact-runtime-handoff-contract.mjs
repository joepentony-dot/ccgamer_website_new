#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(new URL('../../..', import.meta.url).pathname);
const BUNDLE = path.join(ROOT, 'scripts/build-lost-sizzler-portable-desktop-bundle.py');
const DESCRIPTOR = path.join(ROOT, 'scripts/build-lost-sizzler-package-artifact-descriptor.mjs');
const EXPORTER = path.join(ROOT, 'scripts/export-lost-sizzler-package-runtime-env.mjs');

const sha256 = (data) => createHash('sha256').update(data).digest('hex');

function run(command, args) {
  const result = spawnSync(command, args, { cwd: ROOT, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

async function writeFixture(root) {
  const application = path.join(root, 'application');
  const metadata = path.join(root, 'metadata');
  const files = new Map([
    ['arcade/lost-sizzler/index.html', '<!doctype html><title>C64 Dungeon Carnage</title>\n'],
    ['arcade/lost-sizzler/version.json', '{"version":"10.42"}\n'],
    ['arcade/lost-sizzler/js/online-services-gate.js', '/* offline */\n'],
    ['games/games.json', '[]\n'],
  ]);
  const entries = [];
  let totalBytes = 0;
  for (const [relative, text] of files) {
    const data = Buffer.from(text);
    const target = path.join(application, ...relative.split('/'));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, data);
    totalBytes += data.length;
    entries.push({ path: relative, bytes: data.length, sha256: sha256(data), classification: relative === 'games/games.json' ? 'catalogue' : 'runtime', sourceRepositoryPath: relative });
  }
  await mkdir(metadata, { recursive: true });
  const manifest = {
    schema: 'ccg-lost-sizzler-desktop-package-manifest-v1',
    releaseIdentifier: '10.42-portable-runtime-test',
    sourceRoot: '.',
    requiredInputs: [],
    fileCount: entries.length,
    totalBytes,
    classificationCounts: { runtime: 3, catalogue: 1 },
    files: entries.sort((a, b) => a.path.localeCompare(b.path)),
  };
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(path.join(metadata, 'package-manifest.json'), manifestBytes);
  await writeFile(path.join(metadata, 'package-provenance.json'), `${JSON.stringify({
    schema: 'ccg-lost-sizzler-desktop-package-provenance-v1',
    releaseIdentifier: manifest.releaseIdentifier,
    packageManifestSha256: sha256(manifestBytes),
    packageManifestBytes: manifestBytes.length,
    packageFileCount: manifest.fileCount,
    packageTotalBytes: manifest.totalBytes,
  }, null, 2)}\n`);
  await writeFile(path.join(root, 'desktop-staging.json'), `${JSON.stringify({
    schema: 'ccg-c64-dungeon-carnage-desktop-staging-v1',
    applicationId: 'uk.co.cheekycommodoregamer.c64-dungeon-carnage',
    stableProfileId: 'ccg-c64-dungeon-carnage',
    delivery: { mode: 'desktop-offline', onlineScripts: null },
    acceptance: { networkingRequired: false, websiteRootSupabaseBootstrapAllowed: false },
  }, null, 2)}\n`);
}

const temp = await mkdtemp(path.join(os.tmpdir(), 'ccg-portable-runtime-handoff-'));
try {
  const staging = path.join(temp, 'staging');
  await mkdir(staging);
  await writeFixture(staging);
  const artifact = path.join(temp, 'c64-dungeon-carnage-10.42.zip');
  run('python3', [BUNDLE, '--staging-root', staging, '--output', artifact]);

  const artifactBytes = await readFile(artifact);
  const descriptor = path.join(temp, 'artifact.json');
  run(process.execPath, [DESCRIPTOR, '--artifact', artifact, '--package-id', 'c64-dungeon-carnage', '--version', '10.42', '--object-key', 'c64-dungeon-carnage/10.42/c64-dungeon-carnage-10.42.zip', '--output', descriptor]);
  const descriptorJson = JSON.parse(await readFile(descriptor, 'utf8'));
  assert.equal(descriptorJson.bytes, artifactBytes.length);
  assert.equal(descriptorJson.sha256, sha256(artifactBytes));
  assert.equal(descriptorJson.filename, path.basename(artifact));

  const envFile = path.join(temp, 'package.env');
  run(process.execPath, [EXPORTER, '--descriptor', descriptor, '--output', envFile, '--max-ttl-seconds', '300']);
  const env = Object.fromEntries((await readFile(envFile, 'utf8')).trim().split('\n').map((line) => line.split(/=(.*)/s).slice(0, 2)));
  assert.equal(env.CCG_PACKAGE_DOWNLOAD_ENABLED, 'true');
  assert.equal(env.CCG_PACKAGE_ID, 'c64-dungeon-carnage');
  assert.equal(env.CCG_PACKAGE_VERSION, '10.42');
  assert.equal(env.CCG_PACKAGE_OBJECT_KEY, 'c64-dungeon-carnage/10.42/c64-dungeon-carnage-10.42.zip');
  assert.equal(env.CCG_PACKAGE_SHA256, sha256(artifactBytes));
  assert.equal(env.CCG_PACKAGE_BYTES, String(artifactBytes.length));
  assert.equal(env.CCG_PACKAGE_DOWNLOAD_MAX_TTL_SECONDS, '300');

  console.log('C64 Dungeon Carnage portable artifact runtime handoff contract passed.');
} finally {
  await rm(temp, { recursive: true, force: true });
}

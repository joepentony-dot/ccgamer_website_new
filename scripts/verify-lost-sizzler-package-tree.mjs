#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const MANIFEST_SCHEMA = 'ccg-lost-sizzler-desktop-package-manifest-v1';
const FORBIDDEN_PACKAGE_BASENAMES = new Set([
  'ccg-supabase-config.js',
  'ccg-supabase-client.js',
  'service-account.json',
  'service_account.json',
]);
const FORBIDDEN_CREDENTIAL_SUFFIXES = Object.freeze(['.pem', '.key', '.p12', '.pfx']);

function parseArgs(argv) {
  const options = { manifest: null, root: null, selfTest: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--manifest') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error('--manifest requires a file path');
      options.manifest = value;
      index += 1;
      continue;
    }
    if (arg === '--root') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error('--root requires a directory path');
      options.root = value;
      index += 1;
      continue;
    }
    if (arg === '--self-test') {
      options.selfTest = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/verify-lost-sizzler-package-tree.mjs --manifest <manifest.json> --root <package-root>');
      console.log('       node scripts/verify-lost-sizzler-package-tree.mjs --self-test');
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function assertAllowedPackagePath(value) {
  const basename = path.posix.basename(value).toLowerCase();
  if (FORBIDDEN_PACKAGE_BASENAMES.has(basename)) {
    throw new Error(`Package manifest contains forbidden bootstrap or credential file: ${value}`);
  }
  if (basename === '.env' || basename.startsWith('.env.')) {
    throw new Error(`Package manifest contains forbidden environment credential file: ${value}`);
  }
  if (FORBIDDEN_CREDENTIAL_SUFFIXES.some((suffix) => basename.endsWith(suffix))) {
    throw new Error(`Package manifest contains forbidden private credential material: ${value}`);
  }
}

function assertSafeRelativePath(value) {
  if (typeof value !== 'string' || !value) throw new Error('Package manifest entry is missing a path.');
  if (value.startsWith('/') || value.includes('\\') || value.split('/').includes('..') || path.posix.isAbsolute(value)) {
    throw new Error(`Unsafe package manifest path: ${value}`);
  }
  const normalized = path.posix.normalize(value);
  if (normalized !== value || normalized === '.' || normalized.startsWith('../')) {
    throw new Error(`Non-canonical package manifest path: ${value}`);
  }
  assertAllowedPackagePath(normalized);
  return normalized;
}

async function assertNoSymlinkComponents(target, label) {
  const resolved = path.resolve(target);
  const parsed = path.parse(resolved);
  const components = resolved.slice(parsed.root.length).split(path.sep).filter(Boolean);
  let current = parsed.root;
  for (const component of components) {
    current = path.join(current, component);
    try {
      const stat = await fs.lstat(current);
      if (stat.isSymbolicLink()) throw new Error(`${label} must not traverse a symbolic link: ${current}`);
    } catch (error) {
      if (error?.code === 'ENOENT') return;
      throw error;
    }
  }
}

async function hashFile(absolutePath) {
  const data = await fs.readFile(absolutePath);
  return {
    bytes: data.byteLength,
    sha256: createHash('sha256').update(data).digest('hex'),
  };
}

async function walkPackageTree(root) {
  const files = [];
  async function walk(directory, relativeDirectory = '') {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const relative = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Package tree refuses symbolic links: ${relative}`);
      if (entry.isDirectory()) {
        await walk(absolute, relative);
      } else if (entry.isFile()) {
        files.push(relative);
      } else {
        throw new Error(`Unsupported package tree entry type: ${relative}`);
      }
    }
  }
  await walk(root);
  files.sort();
  return files;
}

async function loadManifest(manifestPath) {
  await assertNoSymlinkComponents(manifestPath, 'Package manifest');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  if (manifest.schema !== MANIFEST_SCHEMA) throw new Error(`Unexpected package manifest schema: ${manifest.schema}`);
  if (!Array.isArray(manifest.files) || manifest.files.length < 1) throw new Error('Package manifest must contain a non-empty files array.');
  if (manifest.fileCount !== manifest.files.length) throw new Error('Package manifest fileCount does not match files array.');
  if (!Number.isSafeInteger(manifest.totalBytes) || manifest.totalBytes < 1) {
    throw new Error(`Package manifest totalBytes must be a positive safe integer: ${manifest.totalBytes}`);
  }
  return manifest;
}

async function verifyPackageTree(manifestPath, packageRoot) {
  const manifest = await loadManifest(manifestPath);
  await assertNoSymlinkComponents(packageRoot, 'Package root');
  const rootStat = await fs.lstat(packageRoot);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) throw new Error('Package root must be a real directory, not a symbolic link.');

  const expectedPaths = [];
  const seen = new Set();
  let verifiedBytes = 0;
  for (const entry of manifest.files) {
    const relative = assertSafeRelativePath(entry.path);
    if (seen.has(relative)) throw new Error(`Duplicate package manifest path: ${relative}`);
    seen.add(relative);
    expectedPaths.push(relative);

    if (!Number.isSafeInteger(entry.bytes) || entry.bytes < 0) throw new Error(`Invalid manifest byte count for ${relative}`);
    if (!/^[0-9a-f]{64}$/.test(entry.sha256 ?? '')) throw new Error(`Invalid manifest SHA-256 for ${relative}`);

    const absolute = path.resolve(packageRoot, ...relative.split('/'));
    const rootResolved = path.resolve(packageRoot);
    if (absolute !== rootResolved && !absolute.startsWith(`${rootResolved}${path.sep}`)) {
      throw new Error(`Package path escapes package root: ${relative}`);
    }

    let stat;
    try {
      stat = await fs.lstat(absolute);
    } catch (error) {
      if (error?.code === 'ENOENT') throw new Error(`Package file is missing: ${relative}`);
      throw error;
    }
    if (stat.isSymbolicLink()) throw new Error(`Package file must not be a symbolic link: ${relative}`);
    if (!stat.isFile()) throw new Error(`Package manifest path is not a file: ${relative}`);
    if (stat.size !== entry.bytes) throw new Error(`Package byte-size mismatch for ${relative}: expected ${entry.bytes}, got ${stat.size}`);

    const actual = await hashFile(absolute);
    if (actual.sha256 !== entry.sha256) {
      throw new Error(`Package SHA-256 mismatch for ${relative}: expected ${entry.sha256}, got ${actual.sha256}`);
    }
    verifiedBytes += actual.bytes;
  }

  expectedPaths.sort();
  const actualPaths = await walkPackageTree(packageRoot);
  if (actualPaths.length !== expectedPaths.length) {
    const extras = actualPaths.filter((value) => !seen.has(value));
    const missing = expectedPaths.filter((value) => !actualPaths.includes(value));
    throw new Error(`Package tree file-set mismatch: expected ${expectedPaths.length}, got ${actualPaths.length}; extras=${JSON.stringify(extras)} missing=${JSON.stringify(missing)}`);
  }
  for (let index = 0; index < expectedPaths.length; index += 1) {
    if (actualPaths[index] !== expectedPaths[index]) {
      throw new Error(`Package tree contains an unexpected file: ${actualPaths[index] ?? '<missing>'}; expected ${expectedPaths[index] ?? '<none>'}`);
    }
  }
  if (manifest.totalBytes !== verifiedBytes) {
    throw new Error(`Verified package byte total mismatch: expected ${manifest.totalBytes}, got ${verifiedBytes}`);
  }

  return { fileCount: expectedPaths.length, totalBytes: verifiedBytes };
}

async function writeFixtureManifest(root, entries) {
  const files = [];
  for (const relative of entries) {
    const actual = await hashFile(path.join(root, ...relative.split('/')));
    files.push({ path: relative, bytes: actual.bytes, sha256: actual.sha256, classification: 'runtime', sourceRepositoryPath: relative });
  }
  const manifest = {
    schema: MANIFEST_SCHEMA,
    releaseIdentifier: 'self-test',
    sourceRoot: '.',
    requiredInputs: [],
    fileCount: files.length,
    totalBytes: files.reduce((sum, entry) => sum + entry.bytes, 0),
    classificationCounts: { runtime: files.length },
    files,
  };
  const manifestPath = path.join(path.dirname(root), 'manifest.json');
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifestPath;
}

async function expectFailure(action, expectedText) {
  try {
    await action();
  } catch (error) {
    if (!String(error.message).includes(expectedText)) {
      throw new Error(`Self-test expected failure containing ${JSON.stringify(expectedText)}, got: ${error.message}`);
    }
    return;
  }
  throw new Error(`Self-test expected failure containing ${JSON.stringify(expectedText)} but verification passed.`);
}

async function runSelfTest() {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'lost-sizzler-package-tree-'));
  let externalRoot = null;
  try {
    const root = path.join(temp, 'package');
    await fs.mkdir(path.join(root, 'arcade/lost-sizzler'), { recursive: true });
    await fs.writeFile(path.join(root, 'arcade/lost-sizzler/index.html'), 'ABCD', 'utf8');
    await fs.writeFile(path.join(root, 'arcade/lost-sizzler/version.json'), '{}\n', 'utf8');
    const manifestPath = await writeFixtureManifest(root, ['arcade/lost-sizzler/index.html', 'arcade/lost-sizzler/version.json']);

    await verifyPackageTree(manifestPath, root);

    const validManifestText = await fs.readFile(manifestPath, 'utf8');
    const malformedTotalManifest = JSON.parse(validManifestText);
    malformedTotalManifest.totalBytes = null;
    await fs.writeFile(manifestPath, `${JSON.stringify(malformedTotalManifest, null, 2)}\n`, 'utf8');
    await expectFailure(() => verifyPackageTree(manifestPath, root), 'totalBytes must be a positive safe integer');
    await fs.writeFile(manifestPath, validManifestText, 'utf8');

    for (const forbidden of [
      'arcade/lost-sizzler/js/ccg-supabase-config.js',
      'arcade/lost-sizzler/.env',
      'arcade/lost-sizzler/assets/service-account.json',
      'arcade/lost-sizzler/assets/private-key.pem',
      'arcade/lost-sizzler/assets/signing.key',
    ]) {
      await expectFailure(async () => assertSafeRelativePath(forbidden), 'forbidden');
    }
    assertSafeRelativePath('arcade/lost-sizzler/js/game-main.js');

    await fs.writeFile(path.join(root, 'arcade/lost-sizzler/index.html'), 'WXYZ', 'utf8');
    await expectFailure(() => verifyPackageTree(manifestPath, root), 'SHA-256 mismatch');
    await fs.writeFile(path.join(root, 'arcade/lost-sizzler/index.html'), 'ABCD', 'utf8');

    await fs.writeFile(path.join(root, 'unexpected.txt'), 'extra', 'utf8');
    await expectFailure(() => verifyPackageTree(manifestPath, root), 'file-set mismatch');
    await fs.rm(path.join(root, 'unexpected.txt'));

    externalRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'lost-sizzler-package-tree-external-'));
    const externalPackage = path.join(externalRoot, 'package');
    await fs.mkdir(path.join(externalPackage, 'arcade/lost-sizzler'), { recursive: true });
    await fs.writeFile(path.join(externalPackage, 'arcade/lost-sizzler/index.html'), 'ABCD', 'utf8');
    await fs.writeFile(path.join(externalPackage, 'arcade/lost-sizzler/version.json'), '{}\n', 'utf8');
    const externalManifest = await writeFixtureManifest(externalPackage, ['arcade/lost-sizzler/index.html', 'arcade/lost-sizzler/version.json']);
    const linkedContainer = path.join(temp, 'linked-container');
    await fs.symlink(externalRoot, linkedContainer, 'dir');
    await expectFailure(
      () => verifyPackageTree(externalManifest, path.join(linkedContainer, 'package')),
      'Package root must not traverse a symbolic link'
    );

    const manifestLink = path.join(temp, 'manifest-link.json');
    await fs.symlink(manifestPath, manifestLink, 'file');
    await expectFailure(
      () => verifyPackageTree(manifestLink, root),
      'Package manifest must not traverse a symbolic link'
    );

    console.log('Lost Sizzler staged package verifier self-test passed: exact hashes, exact file set, mandatory aggregate byte totals, credential exclusions and symlink-free root/manifest ancestry are enforced.');
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
    if (externalRoot) await fs.rm(externalRoot, { recursive: true, force: true });
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.selfTest) {
    if (options.manifest || options.root) throw new Error('--self-test cannot be combined with --manifest or --root');
    await runSelfTest();
    return;
  }
  if (!options.manifest || !options.root) throw new Error('--manifest and --root are both required');
  const result = await verifyPackageTree(path.resolve(options.manifest), path.resolve(options.root));
  console.log(`Lost Sizzler staged package tree verified: ${result.fileCount} files, ${result.totalBytes} bytes.`);
}

main().catch((error) => {
  console.error(`Lost Sizzler staged package verification failed: ${error.message}`);
  process.exitCode = 1;
});

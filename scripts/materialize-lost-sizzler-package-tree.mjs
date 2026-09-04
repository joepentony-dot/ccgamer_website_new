#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';

const SCHEMA = 'ccg-lost-sizzler-desktop-package-manifest-v1';
const FORBIDDEN_PACKAGE_BASENAMES = new Set([
  'ccg-supabase-config.js',
  'ccg-supabase-client.js',
  'service-account.json',
  'service_account.json',
]);
const FORBIDDEN_CREDENTIAL_SUFFIXES = Object.freeze(['.pem', '.key', '.p12', '.pfx']);

function usage() {
  console.log('Usage: node scripts/materialize-lost-sizzler-package-tree.mjs --manifest <manifest.json> --output <directory> [--clean]');
  console.log('       node scripts/materialize-lost-sizzler-package-tree.mjs --self-test');
}

function parseArgs(argv) {
  const out = { clean: false, selfTest: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--clean') out.clean = true;
    else if (arg === '--manifest') out.manifest = argv[++i];
    else if (arg === '--output') out.output = argv[++i];
    else if (arg === '--self-test') out.selfTest = true;
    else if (arg === '--help' || arg === '-h') out.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return out;
}

function safeRelativePath(value) {
  if (typeof value !== 'string' || !value || value.startsWith('/') || value.includes('\\')) return false;
  const parts = value.split('/');
  return parts.every((part) => part && part !== '.' && part !== '..');
}

function assertAllowedPackagePath(value, label) {
  const basename = path.posix.basename(value).toLowerCase();
  if (FORBIDDEN_PACKAGE_BASENAMES.has(basename)) {
    throw new Error(`${label} contains forbidden bootstrap or credential file: ${value}`);
  }
  if (basename === '.env' || basename.startsWith('.env.')) {
    throw new Error(`${label} contains forbidden environment credential file: ${value}`);
  }
  if (FORBIDDEN_CREDENTIAL_SUFFIXES.some((suffix) => basename.endsWith(suffix))) {
    throw new Error(`${label} contains forbidden private credential material: ${value}`);
  }
}

async function sha256(file) {
  const data = await fs.readFile(file);
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function ensureOrdinaryFile(file, label) {
  const stat = await fs.lstat(file);
  if (stat.isSymbolicLink()) throw new Error(`${label} must not be a symbolic link: ${file}`);
  if (!stat.isFile()) throw new Error(`${label} must be a regular file: ${file}`);
  return stat;
}

async function ensureOrdinaryDirectory(directory, label) {
  const stat = await fs.lstat(directory);
  if (stat.isSymbolicLink()) throw new Error(`${label} must not be a symbolic link: ${directory}`);
  if (!stat.isDirectory()) throw new Error(`${label} must be a real directory: ${directory}`);
  return stat;
}

async function materialize({ manifestPath, outputRoot, clean }) {
  const manifestFile = path.resolve(manifestPath);
  const manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8'));
  if (manifest.schema !== SCHEMA) throw new Error(`Unexpected package manifest schema: ${manifest.schema}`);
  if (!Array.isArray(manifest.files) || manifest.files.length < 1) throw new Error('Package manifest must contain files.');
  if (!Number.isSafeInteger(manifest.fileCount) || manifest.fileCount !== manifest.files.length) {
    throw new Error(`Package manifest fileCount must exactly match files array: declared ${manifest.fileCount}, actual ${manifest.files.length}`);
  }
  if (!Number.isSafeInteger(manifest.totalBytes) || manifest.totalBytes < 1) {
    throw new Error(`Package manifest totalBytes must be a positive safe integer: ${manifest.totalBytes}`);
  }

  const root = path.resolve(outputRoot);
  const cwd = path.resolve(process.cwd());
  if (root === cwd || root === path.parse(root).root) throw new Error(`Refusing unsafe package output root: ${root}`);

  if (clean) await fs.rm(root, { recursive: true, force: true });
  await fs.mkdir(root, { recursive: true });
  await ensureOrdinaryDirectory(root, 'Package output root');

  const existing = await fs.readdir(root);
  if (existing.length) throw new Error('Package output directory must be empty before materialization. Use --clean for an explicitly disposable staging directory.');

  const seen = new Set();
  let copiedBytes = 0;
  for (const entry of manifest.files) {
    if (!entry || !safeRelativePath(entry.path)) throw new Error(`Unsafe package path: ${entry?.path}`);
    if (!safeRelativePath(entry.sourceRepositoryPath)) throw new Error(`Unsafe source repository path: ${entry?.sourceRepositoryPath}`);
    assertAllowedPackagePath(entry.path, 'Package manifest');
    assertAllowedPackagePath(entry.sourceRepositoryPath, 'Package source');
    if (seen.has(entry.path)) throw new Error(`Duplicate package path: ${entry.path}`);
    seen.add(entry.path);

    const source = path.resolve(cwd, ...entry.sourceRepositoryPath.split('/'));
    const relativeSource = path.relative(cwd, source);
    if (!relativeSource || relativeSource.startsWith('..') || path.isAbsolute(relativeSource)) {
      throw new Error(`Source escapes repository root: ${entry.sourceRepositoryPath}`);
    }

    const sourceStat = await ensureOrdinaryFile(source, 'Package source');
    if (!Number.isSafeInteger(entry.bytes) || sourceStat.size !== entry.bytes) {
      throw new Error(`Source byte mismatch for ${entry.path}: manifest ${entry.bytes}, source ${sourceStat.size}`);
    }
    const sourceHash = await sha256(source);
    if (sourceHash !== entry.sha256) throw new Error(`Source SHA-256 mismatch for ${entry.path}`);

    const destination = path.resolve(root, ...entry.path.split('/'));
    const relativeDestination = path.relative(root, destination);
    if (!relativeDestination || relativeDestination.startsWith('..') || path.isAbsolute(relativeDestination)) {
      throw new Error(`Destination escapes package root: ${entry.path}`);
    }

    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(source, destination);
    const destinationStat = await ensureOrdinaryFile(destination, 'Materialized package file');
    if (destinationStat.size !== entry.bytes) throw new Error(`Copied byte mismatch for ${entry.path}`);
    const destinationHash = await sha256(destination);
    if (destinationHash !== entry.sha256) throw new Error(`Copied SHA-256 mismatch for ${entry.path}`);
    copiedBytes += destinationStat.size;
  }

  if (copiedBytes !== manifest.totalBytes) {
    throw new Error(`Materialized byte total mismatch: manifest ${manifest.totalBytes}, copied ${copiedBytes}`);
  }

  console.log(`Lost Sizzler package tree materialized: ${seen.size} files, ${copiedBytes} bytes -> ${root}`);
}

async function expectFailure(action, expectedText) {
  try {
    await action();
  } catch (error) {
    const message = String(error?.message || error);
    if (!message.includes(expectedText)) {
      throw new Error(`Self-test expected failure containing ${JSON.stringify(expectedText)}, got: ${message}`);
    }
    return;
  }
  throw new Error(`Self-test expected failure containing ${JSON.stringify(expectedText)} but materialization passed.`);
}

async function assertDirectoryEmpty(directory) {
  const entries = await fs.readdir(directory);
  if (entries.length !== 0) {
    throw new Error(`Rejected manifest copied package content before failure: ${entries.join(', ')}`);
  }
}

async function runSelfTest() {
  const cwd = path.resolve(process.cwd());
  const temp = await fs.mkdtemp(path.join(cwd, '.lost-sizzler-materializer-self-test-'));
  try {
    const sourceRoot = path.join(temp, 'sources');
    const outputRoot = path.join(temp, 'output');
    await fs.mkdir(sourceRoot, { recursive: true });

    const safeSource = path.join(sourceRoot, 'safe.txt');
    const forbiddenSource = path.join(sourceRoot, 'private.key');
    await fs.writeFile(safeSource, 'safe package fixture\n', 'utf8');
    await fs.writeFile(forbiddenSource, 'credential fixture\n', 'utf8');

    const safeRelative = path.relative(cwd, safeSource).split(path.sep).join('/');
    const forbiddenRelative = path.relative(cwd, forbiddenSource).split(path.sep).join('/');
    const safeBytes = (await fs.lstat(safeSource)).size;
    const safeHash = await sha256(safeSource);
    const forbiddenBytes = (await fs.lstat(forbiddenSource)).size;
    const forbiddenHash = await sha256(forbiddenSource);
    const manifestPath = path.join(temp, 'manifest.json');

    async function writeManifest(entry, overrides = {}) {
      const manifest = {
        schema: SCHEMA,
        fileCount: 1,
        totalBytes: entry.bytes,
        files: [entry],
        ...overrides,
      };
      await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    }

    const safeEntry = {
      path: 'arcade/lost-sizzler/assets/self-test.txt',
      sourceRepositoryPath: safeRelative,
      bytes: safeBytes,
      sha256: safeHash,
      classification: 'runtime',
    };
    await writeManifest(safeEntry);
    await materialize({ manifestPath, outputRoot, clean: true });
    await fs.rm(outputRoot, { recursive: true, force: true });

    await writeManifest(safeEntry, { fileCount: 2 });
    await expectFailure(
      () => materialize({ manifestPath, outputRoot, clean: true }),
      'fileCount must exactly match files array'
    );
    await writeManifest(safeEntry, { totalBytes: null });
    await expectFailure(
      () => materialize({ manifestPath, outputRoot, clean: true }),
      'totalBytes must be a positive safe integer'
    );
    await writeManifest(safeEntry);

    const symlinkTarget = path.join(temp, 'symlink-target');
    await fs.mkdir(symlinkTarget, { recursive: true });
    await fs.symlink(symlinkTarget, outputRoot, 'dir');
    await expectFailure(
      () => materialize({ manifestPath, outputRoot, clean: false }),
      'Package output root must not be a symbolic link'
    );
    await assertDirectoryEmpty(symlinkTarget);
    await fs.rm(outputRoot, { force: true });

    const forbiddenDestinations = [
      'arcade/lost-sizzler/js/ccg-supabase-config.js',
      'arcade/lost-sizzler/.env.production',
      'arcade/lost-sizzler/assets/service-account.json',
      'arcade/lost-sizzler/assets/private.pem',
    ];
    for (const destination of forbiddenDestinations) {
      await writeManifest({
        path: destination,
        sourceRepositoryPath: safeRelative,
        bytes: safeBytes,
        sha256: safeHash,
        classification: 'runtime',
      });
      await expectFailure(
        () => materialize({ manifestPath, outputRoot, clean: true }),
        'forbidden'
      );
      await assertDirectoryEmpty(outputRoot);
    }

    await writeManifest({
      path: 'arcade/lost-sizzler/assets/renamed-safe.txt',
      sourceRepositoryPath: forbiddenRelative,
      bytes: forbiddenBytes,
      sha256: forbiddenHash,
      classification: 'runtime',
    });
    await expectFailure(
      () => materialize({ manifestPath, outputRoot, clean: true }),
      'forbidden private credential material'
    );
    await assertDirectoryEmpty(outputRoot);

    console.log('Lost Sizzler package materializer self-test passed: malformed manifests, symbolic-link output roots and forbidden bootstrap/credential paths are rejected before package copying.');
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
}

try {
  const args = parseArgs(process.argv);
  if (args.help) {
    usage();
    process.exit(0);
  }
  if (args.selfTest) {
    if (args.manifest || args.output || args.clean) throw new Error('--self-test cannot be combined with --manifest, --output or --clean.');
    await runSelfTest();
  } else {
    if (!args.manifest || !args.output) {
      usage();
      throw new Error('--manifest and --output are required.');
    }
    await materialize({ manifestPath: args.manifest, outputRoot: args.output, clean: args.clean });
  }
} catch (error) {
  console.error(`Lost Sizzler package materialization failed: ${error?.message || error}`);
  process.exit(1);
}

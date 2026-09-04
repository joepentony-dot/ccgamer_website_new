#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');

const REQUIRED_INPUTS = Object.freeze([
  { source: 'arcade/lost-sizzler/index.html', classification: 'runtime' },
  { source: 'arcade/lost-sizzler/version.json', classification: 'runtime' },
  { source: 'arcade/lost-sizzler/css', classification: 'runtime' },
  { source: 'arcade/lost-sizzler/js', classification: 'runtime' },
  { source: 'arcade/lost-sizzler/assets', classification: 'runtime' },
  { source: 'games/games.json', classification: 'catalogue' },
]);

const REQUIRED_OFFLINE_AUDIO = Object.freeze([
  'arcade/lost-sizzler/assets/audio/music/exploration.wav',
  'arcade/lost-sizzler/assets/audio/music/danger.wav',
  'arcade/lost-sizzler/assets/audio/music/sanctuary.wav',
  'arcade/lost-sizzler/assets/audio/music/named-enemy.wav',
  'arcade/lost-sizzler/assets/audio/music/count-loadula.wav',
]);

const FORBIDDEN_PACKAGE_BASENAMES = new Set([
  'ccg-supabase-config.js',
  'ccg-supabase-client.js',
  'service-account.json',
  'service_account.json',
]);

const FORBIDDEN_CREDENTIAL_SUFFIXES = Object.freeze([
  '.pem',
  '.key',
  '.p12',
  '.pfx',
]);

function parseArgs(argv) {
  const options = { check: false, output: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--check') {
      options.check = true;
      continue;
    }
    if (arg === '--output') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--output requires a file path');
      }
      options.output = value;
      i += 1;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/build-lost-sizzler-package-manifest.mjs [--check] [--output <file>]');
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function comparePortablePath(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

async function assertNoSymlinkComponents(absolutePath, label) {
  let current = path.resolve(absolutePath);
  const root = path.parse(current).root;
  while (current !== root) {
    try {
      const stat = await fs.lstat(current);
      if (stat.isSymbolicLink()) {
        throw new Error(`${label} must not traverse a symbolic link: ${current}`);
      }
    } catch (error) {
      if (!(error && error.code === 'ENOENT')) throw error;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

function classify(relativePath, fallback) {
  const normalized = toPosix(relativePath).toLowerCase();
  if (normalized.startsWith('arcade/lost-sizzler/assets/audio/')) return 'audio';
  return fallback;
}

function assertAllowedPackagePath(relativePath) {
  const normalized = toPosix(relativePath);
  const basename = path.posix.basename(normalized).toLowerCase();
  if (FORBIDDEN_PACKAGE_BASENAMES.has(basename)) {
    throw new Error(`Desktop package must not contain website bootstrap or credential file: ${normalized}`);
  }
  if (basename === '.env' || basename.startsWith('.env.')) {
    throw new Error(`Desktop package must not contain environment credential file: ${normalized}`);
  }
  if (FORBIDDEN_CREDENTIAL_SUFFIXES.some((suffix) => basename.endsWith(suffix))) {
    throw new Error(`Desktop package must not contain private credential material: ${normalized}`);
  }
}

function assertPackagePolicyExamples() {
  const rejected = [
    'arcade/lost-sizzler/js/ccg-supabase-config.js',
    'arcade/lost-sizzler/js/ccg-supabase-client.js',
    'arcade/lost-sizzler/.env',
    'arcade/lost-sizzler/assets/.env.production',
    'arcade/lost-sizzler/assets/service-account.json',
    'arcade/lost-sizzler/assets/private-key.pem',
    'arcade/lost-sizzler/assets/signing.key',
    'arcade/lost-sizzler/assets/certificate.p12',
    'arcade/lost-sizzler/assets/certificate.pfx',
  ];
  for (const candidate of rejected) {
    let failed = false;
    try {
      assertAllowedPackagePath(candidate);
    } catch {
      failed = true;
    }
    if (!failed) throw new Error(`Package credential policy self-check unexpectedly accepted: ${candidate}`);
  }
  assertAllowedPackagePath('arcade/lost-sizzler/assets/audio/music/example.mp3');
  assertAllowedPackagePath('arcade/lost-sizzler/js/game-main.js');
}

async function statRequired(absolutePath, sourcePath) {
  await assertNoSymlinkComponents(absolutePath, `Required package input ${sourcePath}`);
  let stat;
  try {
    stat = await fs.lstat(absolutePath);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      throw new Error(`Required package input is missing: ${sourcePath}`);
    }
    throw error;
  }
  if (stat.isSymbolicLink()) {
    throw new Error(`Package manifest refuses symbolic links: ${sourcePath}`);
  }
  return stat;
}

async function collectFiles(source, fallbackClassification) {
  const absolute = path.join(REPO_ROOT, source);
  const stat = await statRequired(absolute, source);

  if (stat.isFile()) {
    assertAllowedPackagePath(source);
    return [{ absolute, relative: source, classification: classify(source, fallbackClassification) }];
  }
  if (!stat.isDirectory()) {
    throw new Error(`Required package input is neither a file nor directory: ${source}`);
  }

  const results = [];
  async function walk(directory, relativeDirectory) {
    await assertNoSymlinkComponents(directory, `Package directory ${relativeDirectory}`);
    const dirents = await fs.readdir(directory, { withFileTypes: true });
    dirents.sort((a, b) => comparePortablePath(a.name, b.name));
    for (const dirent of dirents) {
      const childAbsolute = path.join(directory, dirent.name);
      const childRelative = toPosix(path.join(relativeDirectory, dirent.name));
      if (dirent.isSymbolicLink()) {
        throw new Error(`Package manifest refuses symbolic links: ${childRelative}`);
      }
      if (dirent.isDirectory()) {
        await walk(childAbsolute, childRelative);
      } else if (dirent.isFile()) {
        await assertNoSymlinkComponents(childAbsolute, `Package file ${childRelative}`);
        assertAllowedPackagePath(childRelative);
        results.push({
          absolute: childAbsolute,
          relative: childRelative,
          classification: classify(childRelative, fallbackClassification),
        });
      } else {
        throw new Error(`Unsupported package input type: ${childRelative}`);
      }
    }
  }

  await walk(absolute, source);
  if (results.length === 0) {
    throw new Error(`Required package directory is empty: ${source}`);
  }
  return results;
}

async function hashFile(file) {
  await assertNoSymlinkComponents(file.absolute, `Package file ${file.relative}`);
  const data = await fs.readFile(file.absolute);
  return {
    path: toPosix(file.relative),
    bytes: data.byteLength,
    sha256: createHash('sha256').update(data).digest('hex'),
    classification: file.classification,
    sourceRepositoryPath: toPosix(file.relative),
  };
}

async function readReleaseIdentifier() {
  const versionPath = path.join(REPO_ROOT, 'arcade/lost-sizzler/version.json');
  await assertNoSymlinkComponents(versionPath, 'Release version input');
  const parsed = JSON.parse(await fs.readFile(versionPath, 'utf8'));
  return String(parsed.version ?? parsed.build ?? parsed.release ?? 'unknown');
}

async function buildManifest() {
  const files = [];
  for (const input of REQUIRED_INPUTS) {
    files.push(...await collectFiles(input.source, input.classification));
  }

  const unique = new Map();
  for (const file of files) {
    if (unique.has(file.relative)) {
      throw new Error(`Duplicate package manifest path: ${file.relative}`);
    }
    unique.set(file.relative, file);
  }

  const entries = [];
  for (const file of [...unique.values()].sort((a, b) => comparePortablePath(a.relative, b.relative))) {
    entries.push(await hashFile(file));
  }

  const totalBytes = entries.reduce((sum, entry) => sum + entry.bytes, 0);
  const classificationCounts = entries.reduce((counts, entry) => {
    counts[entry.classification] = (counts[entry.classification] ?? 0) + 1;
    return counts;
  }, {});

  return {
    schema: 'ccg-lost-sizzler-desktop-package-manifest-v1',
    releaseIdentifier: await readReleaseIdentifier(),
    sourceRoot: '.',
    requiredInputs: REQUIRED_INPUTS.map(({ source }) => source),
    requiredOfflineAudio: [...REQUIRED_OFFLINE_AUDIO],
    fileCount: entries.length,
    totalBytes,
    classificationCounts,
    files: entries,
  };
}

function assertOfflineAudioCompleteness(manifest) {
  const byPath = new Map(manifest.files.map((entry) => [entry.path, entry]));
  for (const requiredPath of REQUIRED_OFFLINE_AUDIO) {
    const entry = byPath.get(requiredPath);
    if (!entry) throw new Error(`Desktop package is missing required offline music: ${requiredPath}`);
    if (entry.classification !== 'audio') throw new Error(`Required offline music is not classified as audio: ${requiredPath}`);
    if (!Number.isSafeInteger(entry.bytes) || entry.bytes < 1) throw new Error(`Required offline music is empty: ${requiredPath}`);
    if (!/^[0-9a-f]{64}$/.test(entry.sha256 ?? '')) throw new Error(`Required offline music is missing SHA-256 provenance: ${requiredPath}`);
  }
}

async function writeManifestOutput(outputPathValue, json) {
  const outputPath = path.resolve(process.cwd(), outputPathValue);
  await assertNoSymlinkComponents(outputPath, 'Package manifest output');
  try {
    await fs.lstat(outputPath);
    throw new Error(`Refusing to overwrite existing package manifest evidence: ${outputPath}`);
  } catch (error) {
    if (!(error && error.code === 'ENOENT')) throw error;
  }
  const parent = path.dirname(outputPath);
  await assertNoSymlinkComponents(parent, 'Package manifest output parent');
  await fs.mkdir(parent, { recursive: true });
  await assertNoSymlinkComponents(parent, 'Package manifest output parent');
  await fs.writeFile(outputPath, json, { encoding: 'utf8', flag: 'wx' });
}

async function assertManifestOutputPolicyExamples() {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'lost-sizzler-manifest-boundary-'));
  try {
    const safeRoot = path.join(temp, 'safe');
    const externalRoot = path.join(temp, 'external');
    await fs.mkdir(safeRoot, { recursive: true });
    await fs.mkdir(externalRoot, { recursive: true });
    const sentinel = path.join(externalRoot, 'sentinel.txt');
    await fs.writeFile(sentinel, 'preserve-me\n', 'utf8');

    const existing = path.join(safeRoot, 'existing.json');
    await fs.writeFile(existing, 'existing\n', 'utf8');
    let overwriteRejected = false;
    try {
      await writeManifestOutput(existing, '{}\n');
    } catch {
      overwriteRejected = true;
    }
    if (!overwriteRejected) throw new Error('Package manifest output self-check unexpectedly allowed overwrite.');
    if (await fs.readFile(existing, 'utf8') !== 'existing\n') throw new Error('Rejected package manifest overwrite changed existing evidence.');

    const linkedParent = path.join(safeRoot, 'linked-parent');
    await fs.symlink(externalRoot, linkedParent, 'dir');
    let symlinkRejected = false;
    try {
      await writeManifestOutput(path.join(linkedParent, 'manifest.json'), '{}\n');
    } catch {
      symlinkRejected = true;
    }
    if (!symlinkRejected) throw new Error('Package manifest output self-check unexpectedly accepted symlink ancestry.');
    if (await fs.readFile(sentinel, 'utf8') !== 'preserve-me\n') throw new Error('Rejected package manifest symlink output changed external data.');
    try {
      await fs.lstat(path.join(externalRoot, 'manifest.json'));
      throw new Error('Rejected package manifest symlink output unexpectedly created external evidence.');
    } catch (error) {
      if (!(error && error.code === 'ENOENT')) throw error;
    }
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.check) {
    assertPackagePolicyExamples();
    await assertManifestOutputPolicyExamples();
  }
  const manifest = await buildManifest();
  const json = `${JSON.stringify(manifest, null, 2)}\n`;

  if (options.output) {
    await writeManifestOutput(options.output, json);
  }

  if (options.check) {
    if (manifest.fileCount < 1 || manifest.totalBytes < 1) {
      throw new Error('Package manifest must contain at least one non-empty file');
    }
    const catalogue = manifest.files.find((entry) => entry.path === 'games/games.json');
    if (!catalogue || catalogue.classification !== 'catalogue') {
      throw new Error('Package manifest must include games/games.json as catalogue data');
    }
    const version = manifest.files.find((entry) => entry.path === 'arcade/lost-sizzler/version.json');
    if (!version) {
      throw new Error('Package manifest must include arcade/lost-sizzler/version.json');
    }
    assertOfflineAudioCompleteness(manifest);
    for (let index = 1; index < manifest.files.length; index += 1) {
      if (comparePortablePath(manifest.files[index - 1].path, manifest.files[index].path) > 0) {
        throw new Error(`Package manifest paths are not portably sorted at: ${manifest.files[index].path}`);
      }
    }
    console.log(`Lost Sizzler desktop package manifest OK: ${manifest.fileCount} files, ${manifest.totalBytes} bytes, ${REQUIRED_OFFLINE_AUDIO.length} required offline music roles, release ${manifest.releaseIdentifier}.`);
    return;
  }

  if (!options.output) process.stdout.write(json);
}

main().catch((error) => {
  console.error(`Lost Sizzler desktop package manifest failed: ${error.message}`);
  process.exitCode = 1;
});

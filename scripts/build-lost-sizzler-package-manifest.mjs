#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
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

function classify(relativePath, fallback) {
  const normalized = toPosix(relativePath).toLowerCase();
  if (normalized.startsWith('arcade/lost-sizzler/assets/audio/')) return 'audio';
  return fallback;
}

async function statRequired(absolutePath, sourcePath) {
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
    return [{ absolute, relative: source, classification: classify(source, fallbackClassification) }];
  }
  if (!stat.isDirectory()) {
    throw new Error(`Required package input is neither a file nor directory: ${source}`);
  }

  const results = [];
  async function walk(directory, relativeDirectory) {
    const dirents = await fs.readdir(directory, { withFileTypes: true });
    dirents.sort((a, b) => a.name.localeCompare(b.name));
    for (const dirent of dirents) {
      const childAbsolute = path.join(directory, dirent.name);
      const childRelative = toPosix(path.join(relativeDirectory, dirent.name));
      if (dirent.isSymbolicLink()) {
        throw new Error(`Package manifest refuses symbolic links: ${childRelative}`);
      }
      if (dirent.isDirectory()) {
        await walk(childAbsolute, childRelative);
      } else if (dirent.isFile()) {
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
  for (const file of [...unique.values()].sort((a, b) => a.relative.localeCompare(b.relative))) {
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
    fileCount: entries.length,
    totalBytes,
    classificationCounts,
    files: entries,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const manifest = await buildManifest();
  const json = `${JSON.stringify(manifest, null, 2)}\n`;

  if (options.output) {
    const outputPath = path.resolve(process.cwd(), options.output);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, json, 'utf8');
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
    console.log(`Lost Sizzler desktop package manifest OK: ${manifest.fileCount} files, ${manifest.totalBytes} bytes, release ${manifest.releaseIdentifier}.`);
    return;
  }

  if (!options.output) process.stdout.write(json);
}

main().catch((error) => {
  console.error(`Lost Sizzler desktop package manifest failed: ${error.message}`);
  process.exitCode = 1;
});

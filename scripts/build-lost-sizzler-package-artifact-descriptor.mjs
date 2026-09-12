#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!['--artifact', '--package-id', '--version', '--object-key', '--output'].includes(key)) {
      throw new Error(`Unknown argument: ${key}`);
    }
    if (!value || value.startsWith('--')) throw new Error(`${key} requires a value`);
    options[key.slice(2)] = value;
    i += 1;
  }
  for (const name of ['artifact', 'package-id', 'version', 'object-key', 'output']) {
    if (!options[name]) throw new Error(`Missing required argument --${name}`);
  }
  return options;
}

function requirePortableToken(value, label, max = 128) {
  const text = String(value || '').trim();
  if (!text || text.length > max || !/^[A-Za-z0-9._-]+$/.test(text)) {
    throw new Error(`${label} is invalid.`);
  }
  return text;
}

function requireObjectKey(value) {
  const text = String(value || '').trim();
  if (!text || text.startsWith('/') || text.includes('..') || /[?#\\]/.test(text)) {
    throw new Error('Package object key is invalid.');
  }
  return text;
}

async function assertRegularFile(filePath, label) {
  const absolute = path.resolve(filePath);
  const stat = await fs.lstat(absolute);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`${label} must be a regular file.`);
  return { absolute, stat };
}

async function sha256File(filePath) {
  const data = await fs.readFile(filePath);
  return createHash('sha256').update(data).digest('hex');
}

async function writeNewFile(outputPath, content) {
  const absolute = path.resolve(outputPath);
  const parent = path.dirname(absolute);
  await fs.mkdir(parent, { recursive: true });
  try {
    await fs.lstat(absolute);
    throw new Error(`Refusing to overwrite existing package artifact descriptor: ${absolute}`);
  } catch (error) {
    if (!(error && error.code === 'ENOENT')) throw error;
  }
  await fs.writeFile(absolute, content, { encoding: 'utf8', flag: 'wx' });
}

export async function buildPackageArtifactDescriptor({ artifact, packageId, version, objectKey }) {
  const { absolute, stat } = await assertRegularFile(artifact, 'Package artifact');
  if (!Number.isSafeInteger(stat.size) || stat.size <= 0) throw new Error('Package artifact must not be empty.');

  return Object.freeze({
    schema: 'ccg-c64-dungeon-carnage-package-artifact-v1',
    package_id: requirePortableToken(packageId, 'Package id'),
    version: requirePortableToken(version, 'Package version', 80),
    object_key: requireObjectKey(objectKey),
    filename: path.basename(absolute),
    bytes: stat.size,
    sha256: await sha256File(absolute),
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const descriptor = await buildPackageArtifactDescriptor({
    artifact: options.artifact,
    packageId: options['package-id'],
    version: options.version,
    objectKey: options['object-key'],
  });
  await writeNewFile(options.output, `${JSON.stringify(descriptor, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(descriptor)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  main().catch((error) => {
    console.error(error?.stack || error);
    process.exitCode = 1;
  });
}

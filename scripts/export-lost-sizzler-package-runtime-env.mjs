#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const SCHEMA = 'ccg-c64-dungeon-carnage-package-artifact-v1';
const DEFAULT_MAX_TTL_SECONDS = 15 * 60;

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!['--descriptor', '--output', '--max-ttl-seconds'].includes(key)) {
      throw new Error(`Unknown argument: ${key}`);
    }
    if (!value || value.startsWith('--')) throw new Error(`${key} requires a value`);
    options[key.slice(2)] = value;
    i += 1;
  }
  for (const name of ['descriptor', 'output']) {
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
  if (
    !text ||
    text.startsWith('/') ||
    text.includes('..') ||
    !/^[A-Za-z0-9._/-]+$/.test(text)
  ) {
    throw new Error('Package object key is invalid.');
  }
  return text;
}

function requireTtl(value = DEFAULT_MAX_TTL_SECONDS) {
  const ttl = Number(value);
  if (!Number.isSafeInteger(ttl) || ttl < 5 || ttl > DEFAULT_MAX_TTL_SECONDS) {
    throw new Error('Package download max TTL must be between 5 and 900 seconds.');
  }
  return ttl;
}

async function readDescriptorFile(filePath) {
  const absolute = path.resolve(filePath);
  const stat = await fs.lstat(absolute);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('Package artifact descriptor must be a regular file.');
  const source = await fs.readFile(absolute, 'utf8');
  let descriptor;
  try {
    descriptor = JSON.parse(source);
  } catch {
    throw new Error('Package artifact descriptor is not valid JSON.');
  }
  return descriptor;
}

export function buildPackageRuntimeEnvironment(descriptor, { maxTtlSeconds = DEFAULT_MAX_TTL_SECONDS } = {}) {
  if (!descriptor || typeof descriptor !== 'object' || Array.isArray(descriptor)) {
    throw new Error('Package artifact descriptor must be an object.');
  }
  if (descriptor.schema !== SCHEMA) throw new Error('Package artifact descriptor schema is unsupported.');

  const packageId = requirePortableToken(descriptor.package_id, 'Package id');
  const version = requirePortableToken(descriptor.version, 'Package version', 80);
  const objectKey = requireObjectKey(descriptor.object_key);
  const sha256 = String(descriptor.sha256 || '').trim().toLowerCase();
  const bytes = Number(descriptor.bytes);
  if (!/^[a-f0-9]{64}$/.test(sha256)) throw new Error('Package SHA-256 is invalid.');
  if (!Number.isSafeInteger(bytes) || bytes <= 0) throw new Error('Package byte size is invalid.');

  return Object.freeze({
    CCG_PACKAGE_DOWNLOAD_ENABLED: 'true',
    CCG_PACKAGE_ID: packageId,
    CCG_PACKAGE_VERSION: version,
    CCG_PACKAGE_OBJECT_KEY: objectKey,
    CCG_PACKAGE_SHA256: sha256,
    CCG_PACKAGE_BYTES: String(bytes),
    CCG_PACKAGE_DOWNLOAD_MAX_TTL_SECONDS: String(requireTtl(maxTtlSeconds)),
  });
}

export async function loadPackageRuntimeEnvironment(descriptorPath, options) {
  return buildPackageRuntimeEnvironment(await readDescriptorFile(descriptorPath), options);
}

function serializeEnv(env) {
  const order = [
    'CCG_PACKAGE_DOWNLOAD_ENABLED',
    'CCG_PACKAGE_ID',
    'CCG_PACKAGE_VERSION',
    'CCG_PACKAGE_OBJECT_KEY',
    'CCG_PACKAGE_SHA256',
    'CCG_PACKAGE_BYTES',
    'CCG_PACKAGE_DOWNLOAD_MAX_TTL_SECONDS',
  ];
  return `${order.map((name) => `${name}=${env[name]}`).join('\n')}\n`;
}

async function writeNewFile(outputPath, content) {
  const absolute = path.resolve(outputPath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  try {
    await fs.lstat(absolute);
    throw new Error(`Refusing to overwrite existing package runtime environment: ${absolute}`);
  } catch (error) {
    if (!(error && error.code === 'ENOENT')) throw error;
  }
  await fs.writeFile(absolute, content, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const env = await loadPackageRuntimeEnvironment(options.descriptor, {
    maxTtlSeconds: options['max-ttl-seconds'] ? Number(options['max-ttl-seconds']) : DEFAULT_MAX_TTL_SECONDS,
  });
  await writeNewFile(options.output, serializeEnv(env));
  process.stdout.write(`${JSON.stringify(env)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  main().catch((error) => {
    console.error(error?.stack || error);
    process.exitCode = 1;
  });
}

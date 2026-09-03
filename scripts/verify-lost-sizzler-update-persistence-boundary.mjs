#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function fail(message) {
  throw new Error(message);
}

function canonicalRoot(value, label) {
  if (!value) fail(`${label} is required.`);
  return path.resolve(value);
}

function assertDisjointRoots(packageRoot, userDataRoot) {
  const pkg = canonicalRoot(packageRoot, 'package root');
  const data = canonicalRoot(userDataRoot, 'user-data root');
  const relativePkgToData = path.relative(pkg, data);
  const relativeDataToPkg = path.relative(data, pkg);
  const dataInsidePackage = relativePkgToData === '' || (!relativePkgToData.startsWith(`..${path.sep}`) && relativePkgToData !== '..' && !path.isAbsolute(relativePkgToData));
  const packageInsideData = relativeDataToPkg === '' || (!relativeDataToPkg.startsWith(`..${path.sep}`) && relativeDataToPkg !== '..' && !path.isAbsolute(relativeDataToPkg));
  if (dataInsidePackage || packageInsideData) {
    fail(`Package root and user-data root must be disjoint: package=${pkg} userData=${data}`);
  }
  return { packageRoot: pkg, userDataRoot: data };
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function walkFiles(root, current = root, output = []) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const absolute = path.join(current, entry.name);
    const relative = path.relative(root, absolute).split(path.sep).join('/');
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) fail(`User-data snapshot refuses symbolic links: ${relative}`);
    if (stat.isDirectory()) {
      walkFiles(root, absolute, output);
      continue;
    }
    if (!stat.isFile()) fail(`User-data snapshot refuses non-regular files: ${relative}`);
    output.push({ path: relative, bytes: stat.size, sha256: sha256File(absolute) });
  }
  return output;
}

function snapshotUserData(userDataRoot) {
  const root = canonicalRoot(userDataRoot, 'user-data root');
  if (!fs.existsSync(root)) fail(`User-data root does not exist: ${root}`);
  if (!fs.statSync(root).isDirectory()) fail(`User-data root is not a directory: ${root}`);
  const files = walkFiles(root).sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return {
    schema: 'ccg-lost-sizzler-update-persistence-snapshot-v1',
    fileCount: files.length,
    totalBytes: files.reduce((sum, entry) => sum + entry.bytes, 0),
    files,
  };
}

function validateSnapshot(snapshot) {
  if (!snapshot || snapshot.schema !== 'ccg-lost-sizzler-update-persistence-snapshot-v1') fail('Unexpected persistence snapshot schema.');
  if (!Array.isArray(snapshot.files) || snapshot.fileCount !== snapshot.files.length) fail('Persistence snapshot fileCount mismatch.');
  const seen = new Set();
  let previous = '';
  let total = 0;
  for (const entry of snapshot.files) {
    if (!entry || typeof entry.path !== 'string' || !entry.path || entry.path.startsWith('/') || entry.path.includes('\\') || entry.path.split('/').includes('..')) fail(`Unsafe persistence snapshot path: ${entry?.path}`);
    if (entry.path < previous) fail(`Persistence snapshot paths are not sorted: ${entry.path}`);
    previous = entry.path;
    if (seen.has(entry.path)) fail(`Duplicate persistence snapshot path: ${entry.path}`);
    seen.add(entry.path);
    if (!Number.isSafeInteger(entry.bytes) || entry.bytes < 0) fail(`Invalid persistence byte count: ${entry.path}`);
    if (!/^[0-9a-f]{64}$/.test(entry.sha256 ?? '')) fail(`Invalid persistence SHA-256: ${entry.path}`);
    total += entry.bytes;
  }
  if (snapshot.totalBytes !== total) fail('Persistence snapshot totalBytes mismatch.');
}

function verifySnapshot(userDataRoot, expected) {
  validateSnapshot(expected);
  const actual = snapshotUserData(userDataRoot);
  const expectedText = JSON.stringify(expected);
  const actualText = JSON.stringify(actual);
  if (actualText !== expectedText) {
    fail('User-data contents changed across package replacement/update boundary.');
  }
  return actual;
}

function parseArgs(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) fail(`Unexpected argument: ${token}`);
    if (token === '--self-test') {
      args.set(token, true);
      continue;
    }
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) fail(`Missing value for ${token}`);
    args.set(token, value);
    i += 1;
  }
  return args;
}

function runSelfTest() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'lost-sizzler-update-boundary-'));
  try {
    const packageRoot = path.join(temp, 'package');
    const userDataRoot = path.join(temp, 'profile');
    fs.mkdirSync(packageRoot);
    fs.mkdirSync(userDataRoot);

    fs.writeFileSync(path.join(packageRoot, 'runtime.js'), 'build-a\n');
    fs.writeFileSync(path.join(packageRoot, 'removed-in-build-b.txt'), 'only-build-a\n');
    const buildAHash = sha256File(path.join(packageRoot, 'runtime.js'));

    fs.writeFileSync(path.join(userDataRoot, 'solo-save.json'), '{"floor":7}\n');
    fs.writeFileSync(path.join(userDataRoot, 'achievements.json'), '{"earned":["first"]}\n');
    const snapshot = snapshotUserData(userDataRoot);
    assertDisjointRoots(packageRoot, userDataRoot);

    fs.rmSync(packageRoot, { recursive: true, force: true });
    fs.mkdirSync(packageRoot);
    fs.writeFileSync(path.join(packageRoot, 'runtime.js'), 'build-b-with-different-runtime\n');
    fs.writeFileSync(path.join(packageRoot, 'added-in-build-b.txt'), 'only-build-b\n');
    const buildBHash = sha256File(path.join(packageRoot, 'runtime.js'));

    if (buildAHash === buildBHash) fail('Self-test expected Build A and Build B runtime hashes to differ.');
    if (fs.existsSync(path.join(packageRoot, 'removed-in-build-b.txt'))) fail('Self-test expected Build A-only package content to be removed.');
    if (!fs.existsSync(path.join(packageRoot, 'added-in-build-b.txt'))) fail('Self-test expected Build B-only package content to exist.');
    verifySnapshot(userDataRoot, snapshot);

    let overlapRejected = false;
    try {
      assertDisjointRoots(packageRoot, path.join(packageRoot, 'profile'));
    } catch {
      overlapRejected = true;
    }
    if (!overlapRejected) fail('Self-test expected overlapping package/user-data roots to be rejected.');

    fs.writeFileSync(path.join(userDataRoot, 'solo-save.json'), '{"floor":8}\n');
    let mutationRejected = false;
    try {
      verifySnapshot(userDataRoot, snapshot);
    } catch {
      mutationRejected = true;
    }
    if (!mutationRejected) fail('Self-test expected changed user data to fail verification.');
    console.log('Lost Sizzler update persistence boundary self-test passed: distinct Build A -> Build B replacement preserved external profile state.');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

const args = parseArgs(process.argv.slice(2));
if (args.get('--self-test')) {
  runSelfTest();
  process.exit(0);
}

const packageRoot = args.get('--package-root');
const userDataRoot = args.get('--user-data-root');
assertDisjointRoots(packageRoot, userDataRoot);

if (args.has('--snapshot')) {
  const output = args.get('--snapshot');
  const snapshot = snapshotUserData(userDataRoot);
  fs.writeFileSync(output, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`Lost Sizzler persistence snapshot written: ${snapshot.fileCount} files, ${snapshot.totalBytes} bytes.`);
  process.exit(0);
}

if (args.has('--verify')) {
  const snapshotPath = args.get('--verify');
  const expected = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  const actual = verifySnapshot(userDataRoot, expected);
  console.log(`Lost Sizzler persistence boundary verified unchanged: ${actual.fileCount} files, ${actual.totalBytes} bytes.`);
  process.exit(0);
}

fail('Specify --self-test, --snapshot <file>, or --verify <file>.');

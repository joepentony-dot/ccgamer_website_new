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

function pathIsInsideOrEqual(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function assertNoSymlinkComponents(root, label) {
  let current = root;
  const parsed = path.parse(root);
  while (current !== parsed.root) {
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) {
      fail(`${label} must not traverse a symbolic link: ${current}`);
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

function assertDisjointRoots(packageRoot, userDataRoot) {
  const pkg = canonicalRoot(packageRoot, 'package root');
  const data = canonicalRoot(userDataRoot, 'user-data root');
  assertNoSymlinkComponents(pkg, 'package root');
  assertNoSymlinkComponents(data, 'user-data root');
  const dataInsidePackage = pathIsInsideOrEqual(pkg, data);
  const packageInsideData = pathIsInsideOrEqual(data, pkg);
  if (dataInsidePackage || packageInsideData) {
    fail(`Package root and user-data root must be disjoint: package=${pkg} userData=${data}`);
  }
  return { packageRoot: pkg, userDataRoot: data };
}

function assertEvidenceOutputPath(output, packageRoot, userDataRoot) {
  if (!output) fail('snapshot output is required.');
  const target = path.resolve(output);
  assertNoSymlinkComponents(target, 'persistence evidence output');
  if (pathIsInsideOrEqual(packageRoot, target)) fail(`Persistence evidence must not be written inside the package root: ${target}`);
  if (pathIsInsideOrEqual(userDataRoot, target)) fail(`Persistence evidence must not be written inside the user-data root: ${target}`);
  if (fs.existsSync(target)) fail(`Refusing to overwrite existing persistence evidence: ${target}`);
  return target;
}

function assertEvidenceInputPath(input, packageRoot, userDataRoot) {
  if (!input) fail('persistence evidence input is required.');
  const target = path.resolve(input);
  assertNoSymlinkComponents(target, 'persistence evidence input');
  if (pathIsInsideOrEqual(packageRoot, target)) fail(`Persistence evidence must not be read from inside the package root: ${target}`);
  if (pathIsInsideOrEqual(userDataRoot, target)) fail(`Persistence evidence must not be read from inside the user-data root: ${target}`);
  if (!fs.existsSync(target)) fail(`Persistence evidence input does not exist: ${target}`);
  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink() || !stat.isFile()) fail(`Persistence evidence input must be a real file: ${target}`);
  return target;
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
  assertNoSymlinkComponents(root, 'user-data root');
  if (!fs.existsSync(root)) fail(`User-data root does not exist: ${root}`);
  if (!fs.lstatSync(root).isDirectory()) fail(`User-data root is not a directory: ${root}`);
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

function writeSnapshotEvidence(output, snapshot, packageRoot, userDataRoot) {
  const target = assertEvidenceOutputPath(output, packageRoot, userDataRoot);
  fs.writeFileSync(target, `${JSON.stringify(snapshot, null, 2)}\n`, { flag: 'wx' });
  return target;
}

function readSnapshotEvidence(input, packageRoot, userDataRoot) {
  const target = assertEvidenceInputPath(input, packageRoot, userDataRoot);
  return JSON.parse(fs.readFileSync(target, 'utf8'));
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
    const roots = assertDisjointRoots(packageRoot, userDataRoot);

    const evidence = path.join(temp, 'persistence-evidence.json');
    writeSnapshotEvidence(evidence, snapshot, roots.packageRoot, roots.userDataRoot);
    const storedEvidence = readSnapshotEvidence(evidence, roots.packageRoot, roots.userDataRoot);
    validateSnapshot(storedEvidence);

    let overwriteRejected = false;
    try {
      writeSnapshotEvidence(evidence, snapshot, roots.packageRoot, roots.userDataRoot);
    } catch {
      overwriteRejected = true;
    }
    if (!overwriteRejected) fail('Self-test expected existing persistence evidence to be protected from overwrite.');

    for (const forbiddenEvidence of [path.join(packageRoot, 'snapshot.json'), path.join(userDataRoot, 'snapshot.json')]) {
      let protectedRootRejected = false;
      try {
        writeSnapshotEvidence(forbiddenEvidence, snapshot, roots.packageRoot, roots.userDataRoot);
      } catch {
        protectedRootRejected = true;
      }
      if (!protectedRootRejected) fail(`Self-test expected persistence evidence inside a protected root to be rejected: ${forbiddenEvidence}`);
      if (fs.existsSync(forbiddenEvidence)) fail(`Rejected persistence evidence path was unexpectedly created: ${forbiddenEvidence}`);
    }

    const packageEvidence = path.join(packageRoot, 'persistence-evidence.json');
    const userDataEvidence = path.join(userDataRoot, 'persistence-evidence.json');
    fs.copyFileSync(evidence, packageEvidence);
    fs.copyFileSync(evidence, userDataEvidence);
    for (const forbiddenInput of [packageEvidence, userDataEvidence]) {
      let protectedInputRejected = false;
      try {
        readSnapshotEvidence(forbiddenInput, roots.packageRoot, roots.userDataRoot);
      } catch {
        protectedInputRejected = true;
      }
      if (!protectedInputRejected) fail(`Self-test expected persistence evidence input inside a protected root to be rejected: ${forbiddenInput}`);
    }
    fs.rmSync(packageEvidence, { force: true });
    fs.rmSync(userDataEvidence, { force: true });

    if (process.platform !== 'win32') {
      const packageLink = path.join(temp, 'package-link');
      fs.symlinkSync(packageRoot, packageLink, 'dir');
      let packageSymlinkRejected = false;
      try {
        assertDisjointRoots(packageLink, userDataRoot);
      } catch {
        packageSymlinkRejected = true;
      }
      if (!packageSymlinkRejected) fail('Self-test expected a symlinked package root to be rejected.');

      const userDataLink = path.join(temp, 'profile-link');
      fs.symlinkSync(userDataRoot, userDataLink, 'dir');
      let userDataSymlinkRejected = false;
      try {
        assertDisjointRoots(packageRoot, userDataLink);
      } catch {
        userDataSymlinkRejected = true;
      }
      if (!userDataSymlinkRejected) fail('Self-test expected a symlinked Tier-A user-data root to be rejected.');

      const evidenceParentLink = path.join(temp, 'evidence-parent-link');
      fs.symlinkSync(userDataRoot, evidenceParentLink, 'dir');
      const redirectedEvidence = path.join(evidenceParentLink, 'redirected-snapshot.json');
      let redirectedEvidenceRejected = false;
      try {
        writeSnapshotEvidence(redirectedEvidence, snapshot, roots.packageRoot, roots.userDataRoot);
      } catch {
        redirectedEvidenceRejected = true;
      }
      if (!redirectedEvidenceRejected) fail('Self-test expected persistence evidence traversing a symlinked parent to be rejected.');
      if (fs.existsSync(path.join(userDataRoot, 'redirected-snapshot.json'))) fail('Rejected redirected persistence evidence was unexpectedly written into Tier-A user data.');

      const externalEvidenceDirectory = path.join(temp, 'external-evidence');
      fs.mkdirSync(externalEvidenceDirectory);
      const externalEvidence = path.join(externalEvidenceDirectory, 'snapshot.json');
      fs.copyFileSync(evidence, externalEvidence);
      const evidenceInputLink = path.join(temp, 'evidence-input-link');
      fs.symlinkSync(externalEvidenceDirectory, evidenceInputLink, 'dir');
      let redirectedInputRejected = false;
      try {
        readSnapshotEvidence(path.join(evidenceInputLink, 'snapshot.json'), roots.packageRoot, roots.userDataRoot);
      } catch {
        redirectedInputRejected = true;
      }
      if (!redirectedInputRejected) fail('Self-test expected persistence evidence input traversing a symlinked parent to be rejected.');
    }

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
    console.log('Lost Sizzler update persistence boundary self-test passed: distinct Build A -> Build B replacement preserved a non-symlinked external profile and protected snapshot evidence for both writes and verification reads.');
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
const roots = assertDisjointRoots(packageRoot, userDataRoot);

if (args.has('--snapshot')) {
  const output = args.get('--snapshot');
  const snapshot = snapshotUserData(roots.userDataRoot);
  const target = writeSnapshotEvidence(output, snapshot, roots.packageRoot, roots.userDataRoot);
  console.log(`Lost Sizzler persistence snapshot written: ${snapshot.fileCount} files, ${snapshot.totalBytes} bytes -> ${target}`);
  process.exit(0);
}

if (args.has('--verify')) {
  const expected = readSnapshotEvidence(args.get('--verify'), roots.packageRoot, roots.userDataRoot);
  const actual = verifySnapshot(roots.userDataRoot, expected);
  console.log(`Lost Sizzler persistence boundary verified unchanged: ${actual.fileCount} files, ${actual.totalBytes} bytes.`);
  process.exit(0);
}

fail('Specify --self-test, --snapshot <file>, or --verify <file>.');

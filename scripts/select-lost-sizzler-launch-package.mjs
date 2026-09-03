#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

function fail(message) { throw new Error(message); }

function canonicalRoot(value, label) {
  if (!value) fail(`${label} is required.`);
  const root = path.resolve(value);
  if (root === path.parse(root).root) fail(`${label} must not be a filesystem root: ${root}`);
  return root;
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function assertNoSymlinkComponents(root, label) {
  let current = root;
  const parsed = path.parse(root);
  while (current !== parsed.root) {
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) fail(`${label} must not traverse a symbolic link: ${current}`);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

function validateRoots(activeValue, userDataValue) {
  const activeRoot = canonicalRoot(activeValue, 'active package root');
  const userDataRoot = canonicalRoot(userDataValue, 'user-data root');
  if (isInside(activeRoot, userDataRoot) || isInside(userDataRoot, activeRoot)) fail(`Active package root and user-data root must be disjoint: ${activeRoot} <> ${userDataRoot}`);
  assertNoSymlinkComponents(activeRoot, 'active package root');
  assertNoSymlinkComponents(userDataRoot, 'user-data root');
  if (!fs.existsSync(activeRoot)) fail('Active package is missing. Launch is refused until interrupted-activation recovery resolves the package state.');
  const activeStat = fs.lstatSync(activeRoot);
  if (activeStat.isSymbolicLink() || !activeStat.isDirectory()) fail(`Active package root must be a real directory: ${activeRoot}`);
  if (fs.existsSync(userDataRoot)) {
    const userStat = fs.lstatSync(userDataRoot);
    if (userStat.isSymbolicLink() || !userStat.isDirectory()) fail(`User-data root must be a real directory when present: ${userDataRoot}`);
  }
  return { activeRoot, userDataRoot };
}

function verifyActivePackage(manifestValue, activeRoot) {
  if (!manifestValue) fail('active package manifest is required.');
  const manifest = path.resolve(manifestValue);
  if (!fs.existsSync(manifest) || !fs.lstatSync(manifest).isFile()) fail(`Active package manifest does not exist: ${manifest}`);
  assertNoSymlinkComponents(manifest, 'active package manifest');
  const verifier = fileURLToPath(new URL('./verify-lost-sizzler-package-tree.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [verifier, '--manifest', manifest, '--root', activeRoot], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim();
    fail(`Active package failed cryptographic launch verification${detail ? `: ${detail}` : '.'}`);
  }
  return manifest;
}

function selectLaunchPackage(activeValue, manifestValue, userDataValue) {
  const roots = validateRoots(activeValue, userDataValue);
  const manifest = verifyActivePackage(manifestValue, roots.activeRoot);
  return { ...roots, manifest };
}

function writeFixtureManifest(packageRoot, manifestPath) {
  const relative = 'runtime.txt';
  const data = fs.readFileSync(path.join(packageRoot, relative));
  const entry = { path: relative, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex'), classification: 'runtime', sourceRepositoryPath: relative };
  const manifest = { schema: 'ccg-lost-sizzler-desktop-package-manifest-v1', releaseIdentifier: 'launch-fixture', sourceRoot: '.', requiredInputs: [], fileCount: 1, totalBytes: data.length, classificationCounts: { runtime: 1 }, files: [entry] };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function expectFailure(fn, message) {
  let failed = false;
  try { fn(); } catch { failed = true; }
  if (!failed) fail(message);
}

function runSelfTest() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'lost-sizzler-launch-selection-'));
  try {
    const activeRoot = path.join(temp, 'packages', 'active');
    const userDataRoot = path.join(temp, 'user-data');
    const manifest = path.join(temp, 'active.manifest.json');
    fs.mkdirSync(activeRoot, { recursive: true });
    fs.mkdirSync(userDataRoot, { recursive: true });
    fs.writeFileSync(path.join(activeRoot, 'runtime.txt'), 'verified-build\n');
    fs.writeFileSync(path.join(userDataRoot, 'solo-save.json'), '{"floor":12}\n');
    const profileBefore = fs.readFileSync(path.join(userDataRoot, 'solo-save.json'));
    writeFixtureManifest(activeRoot, manifest);

    const selected = selectLaunchPackage(activeRoot, manifest, userDataRoot);
    if (selected.activeRoot !== path.resolve(activeRoot)) fail('Verified active package was not selected.');
    if (!fs.readFileSync(path.join(userDataRoot, 'solo-save.json')).equals(profileBefore)) fail('Tier-A profile changed during launch selection.');

    fs.writeFileSync(path.join(activeRoot, 'runtime.txt'), 'damaged-build!\n');
    expectFailure(() => selectLaunchPackage(activeRoot, manifest, userDataRoot), 'Damaged active package must be refused before launch.');
    if (!fs.readFileSync(path.join(userDataRoot, 'solo-save.json')).equals(profileBefore)) fail('Tier-A profile changed after refused damaged-package launch.');

    fs.rmSync(activeRoot, { recursive: true, force: true });
    expectFailure(() => selectLaunchPackage(activeRoot, manifest, userDataRoot), 'Missing active package must be refused until recovery runs.');
    if (!fs.readFileSync(path.join(userDataRoot, 'solo-save.json')).equals(profileBefore)) fail('Tier-A profile changed after refused missing-package launch.');

    console.log('Lost Sizzler launch-selection self-test passed: only a cryptographically verified active package is launchable and Tier-A data remains outside selection.');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

function parseArgs(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) fail(`Unexpected argument: ${token}`);
    if (token === '--self-test') { args.set(token, true); continue; }
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) fail(`Missing value for ${token}`);
    args.set(token, value);
    i += 1;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (args.get('--self-test')) {
  runSelfTest();
} else {
  const selected = selectLaunchPackage(args.get('--active-root'), args.get('--active-manifest'), args.get('--user-data-root'));
  console.log(`Lost Sizzler launch authorized: active=${selected.activeRoot}; manifest=${selected.manifest}; userData=${selected.userDataRoot}`);
}

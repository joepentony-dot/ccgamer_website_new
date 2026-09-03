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
function assertDirectoryIfPresent(root, label) {
  if (!fs.existsSync(root)) return;
  const stat = fs.lstatSync(root);
  if (stat.isSymbolicLink() || !stat.isDirectory()) fail(`${label} must be a real directory: ${root}`);
}
function validateRoots(activeValue, candidateValue, previousValue, userDataValue) {
  const activeRoot = canonicalRoot(activeValue, 'active package root');
  const candidateRoot = canonicalRoot(candidateValue, 'candidate package root');
  const previousRoot = canonicalRoot(previousValue, 'previous package root');
  const userDataRoot = canonicalRoot(userDataValue, 'user-data root');
  const container = path.dirname(activeRoot);
  for (const [label, root] of [['candidate package root', candidateRoot], ['previous package root', previousRoot]]) {
    if (path.dirname(root) !== container) fail(`${label} must be a sibling of the active package root under ${container}: ${root}`);
  }
  if (new Set([activeRoot, candidateRoot, previousRoot]).size !== 3) fail('Active, candidate and previous package roots must all be different.');
  for (const packageRoot of [activeRoot, candidateRoot, previousRoot]) {
    if (isInside(packageRoot, userDataRoot) || isInside(userDataRoot, packageRoot)) fail(`Package roots and user-data root must be disjoint: ${packageRoot} <> ${userDataRoot}`);
  }
  for (const [label, root] of [['active package root', activeRoot], ['candidate package root', candidateRoot], ['previous package root', previousRoot], ['user-data root', userDataRoot]]) {
    assertNoSymlinkComponents(root, label);
    assertDirectoryIfPresent(root, label);
  }
  return { activeRoot, candidateRoot, previousRoot, userDataRoot };
}
function verifyPackageTree(manifestValue, root, label) {
  if (!manifestValue) return false;
  const manifest = path.resolve(manifestValue);
  if (!fs.existsSync(root) || !fs.existsSync(manifest) || !fs.lstatSync(manifest).isFile()) return false;
  const verifier = fileURLToPath(new URL('./verify-lost-sizzler-package-tree.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [verifier, '--manifest', manifest, '--root', root], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.status === 0) return true;
  if (label) process.stderr.write(`${label} is not cryptographically verified and will not be selected.\n`);
  return false;
}
function recover(roots, manifests) {
  if (fs.existsSync(roots.activeRoot)) {
    const activeVerified = verifyPackageTree(manifests.activeManifest, roots.activeRoot, 'Active package');
    if (!activeVerified) fail('Active package exists but is not verified. Recovery fails closed without moving or deleting diagnostic remnants.');
    return 'ACTIVE_ALREADY_VERIFIED';
  }
  const previousVerified = verifyPackageTree(manifests.previousManifest, roots.previousRoot, 'Previous package');
  const candidateVerified = verifyPackageTree(manifests.candidateManifest, roots.candidateRoot, 'Candidate package');
  if (previousVerified) {
    fs.renameSync(roots.previousRoot, roots.activeRoot);
    if (!verifyPackageTree(manifests.previousManifest, roots.activeRoot, 'Restored previous package')) fail('Restored previous package failed verification after rename.');
    return 'RESTORED_PREVIOUS';
  }
  if (candidateVerified) {
    fs.renameSync(roots.candidateRoot, roots.activeRoot);
    if (!verifyPackageTree(manifests.candidateManifest, roots.activeRoot, 'Promoted candidate package')) fail('Promoted candidate package failed verification after rename.');
    return 'PROMOTED_CANDIDATE';
  }
  fail('No verified package is available for interrupted activation recovery. No package remnant was deleted or overwritten.');
}
function writeFixtureManifest(packageRoot, manifestPath) {
  const relative = 'runtime.txt';
  const data = fs.readFileSync(path.join(packageRoot, relative));
  const entry = { path: relative, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex'), classification: 'runtime', sourceRepositoryPath: relative };
  fs.writeFileSync(manifestPath, `${JSON.stringify({ schema: 'ccg-lost-sizzler-desktop-package-manifest-v1', releaseIdentifier: path.basename(packageRoot), sourceRoot: '.', requiredInputs: [], fileCount: 1, totalBytes: data.length, classificationCounts: { runtime: 1 }, files: [entry] }, null, 2)}\n`);
}
function fixture(temp, includePrevious = true, includeCandidate = true) {
  const packages = path.join(temp, 'packages');
  const roots = { activeRoot: path.join(packages, 'active'), candidateRoot: path.join(packages, 'candidate'), previousRoot: path.join(packages, 'previous'), userDataRoot: path.join(temp, 'user-data') };
  fs.mkdirSync(roots.userDataRoot, { recursive: true });
  fs.writeFileSync(path.join(roots.userDataRoot, 'solo-save.json'), '{"floor":9}\n');
  const manifests = { previousManifest: path.join(temp, 'previous.manifest.json'), candidateManifest: path.join(temp, 'candidate.manifest.json'), activeManifest: path.join(temp, 'active.manifest.json') };
  if (includePrevious) { fs.mkdirSync(roots.previousRoot, { recursive: true }); fs.writeFileSync(path.join(roots.previousRoot, 'runtime.txt'), 'build-a\n'); writeFixtureManifest(roots.previousRoot, manifests.previousManifest); }
  if (includeCandidate) { fs.mkdirSync(roots.candidateRoot, { recursive: true }); fs.writeFileSync(path.join(roots.candidateRoot, 'runtime.txt'), 'build-b\n'); writeFixtureManifest(roots.candidateRoot, manifests.candidateManifest); }
  return { roots, manifests };
}
function runSelfTest() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'lost-sizzler-activation-recovery-'));
  try {
    const first = fixture(path.join(temp, 'previous-wins'));
    const profileBefore = fs.readFileSync(path.join(first.roots.userDataRoot, 'solo-save.json'));
    const validated = validateRoots(first.roots.activeRoot, first.roots.candidateRoot, first.roots.previousRoot, first.roots.userDataRoot);
    if (recover(validated, first.manifests) !== 'RESTORED_PREVIOUS') fail('Interrupted transition did not prefer verified previous package.');
    if (!fs.existsSync(first.roots.candidateRoot)) fail('Candidate remnant must be preserved when previous package is restored.');
    if (!fs.readFileSync(path.join(first.roots.userDataRoot, 'solo-save.json')).equals(profileBefore)) fail('Tier-A profile changed during previous-package recovery.');

    const second = fixture(path.join(temp, 'candidate-only'), false, true);
    const secondBefore = fs.readFileSync(path.join(second.roots.userDataRoot, 'solo-save.json'));
    const secondRoots = validateRoots(second.roots.activeRoot, second.roots.candidateRoot, second.roots.previousRoot, second.roots.userDataRoot);
    if (recover(secondRoots, second.manifests) !== 'PROMOTED_CANDIDATE') fail('Verified candidate was not promoted when no verified previous package existed.');
    if (!fs.readFileSync(path.join(second.roots.userDataRoot, 'solo-save.json')).equals(secondBefore)) fail('Tier-A profile changed during candidate recovery.');

    const third = fixture(path.join(temp, 'invalid-active'), true, false);
    fs.mkdirSync(third.roots.activeRoot, { recursive: true });
    fs.writeFileSync(path.join(third.roots.activeRoot, 'runtime.txt'), 'damaged-active\n');
    const thirdRoots = validateRoots(third.roots.activeRoot, third.roots.candidateRoot, third.roots.previousRoot, third.roots.userDataRoot);
    let failedClosed = false;
    try { recover(thirdRoots, { ...third.manifests, activeManifest: third.manifests.previousManifest }); } catch { failedClosed = true; }
    if (!failedClosed || !fs.existsSync(third.roots.previousRoot)) fail('Invalid existing active package must fail closed and preserve previous remnant.');
    console.log('Lost Sizzler interrupted activation recovery self-test passed: only verified packages are selected, remnants are preserved, and Tier-A data stays outside recovery.');
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
    args.set(token, value); i += 1;
  }
  return args;
}
const args = parseArgs(process.argv.slice(2));
if (args.get('--self-test')) runSelfTest();
else {
  const roots = validateRoots(args.get('--active-root'), args.get('--candidate-root'), args.get('--previous-root'), args.get('--user-data-root'));
  const result = recover(roots, { activeManifest: args.get('--active-manifest'), candidateManifest: args.get('--candidate-manifest'), previousManifest: args.get('--previous-manifest') });
  console.log(`Lost Sizzler activation recovery result: ${result}; active=${roots.activeRoot}; userData=${roots.userDataRoot}`);
}

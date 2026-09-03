#!/usr/bin/env node

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function fail(message) {
  throw new Error(message);
}

function canonicalRoot(value, label) {
  if (!value) fail(`${label} is required.`);
  const resolved = path.resolve(value);
  if (resolved === path.parse(resolved).root) fail(`${label} must not be a filesystem root: ${resolved}`);
  return resolved;
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

function assertDirectory(root, label) {
  if (!fs.existsSync(root)) fail(`${label} does not exist: ${root}`);
  const stat = fs.lstatSync(root);
  if (stat.isSymbolicLink() || !stat.isDirectory()) fail(`${label} must be a real directory: ${root}`);
}

function validateRoots(activeValue, candidateValue, backupValue, userDataValue) {
  const activeRoot = canonicalRoot(activeValue, 'active package root');
  const candidateRoot = canonicalRoot(candidateValue, 'candidate package root');
  const backupRoot = canonicalRoot(backupValue, 'backup package root');
  const userDataRoot = canonicalRoot(userDataValue, 'user-data root');
  const packageContainer = path.dirname(activeRoot);

  for (const [label, root] of [['candidate package root', candidateRoot], ['backup package root', backupRoot]]) {
    if (path.dirname(root) !== packageContainer) fail(`${label} must be a sibling of the active package root under ${packageContainer}: ${root}`);
  }
  if (new Set([activeRoot, candidateRoot, backupRoot]).size !== 3) fail('Active, candidate and backup package roots must all be different.');
  for (const packageRoot of [activeRoot, candidateRoot, backupRoot]) {
    if (isInside(packageRoot, userDataRoot) || isInside(userDataRoot, packageRoot)) fail(`Package roots and user-data root must be disjoint: ${packageRoot} <> ${userDataRoot}`);
  }
  for (const [label, root] of [['active package root', activeRoot], ['candidate package root', candidateRoot], ['backup package root', backupRoot], ['user-data root', userDataRoot]]) {
    assertNoSymlinkComponents(root, label);
  }
  assertDirectory(activeRoot, 'active package root');
  assertDirectory(candidateRoot, 'candidate package root');
  if (fs.existsSync(backupRoot)) fail(`Backup package root must not already exist: ${backupRoot}`);
  if (fs.existsSync(userDataRoot)) assertDirectory(userDataRoot, 'user-data root');
  return { activeRoot, candidateRoot, backupRoot, userDataRoot };
}

function verifyPackageTree(manifestValue, root, label) {
  if (!manifestValue) fail(`${label} manifest is required.`);
  const manifest = path.resolve(manifestValue);
  if (!fs.existsSync(manifest) || !fs.lstatSync(manifest).isFile()) fail(`${label} manifest does not exist: ${manifest}`);
  const verifier = fileURLToPath(new URL('./verify-lost-sizzler-package-tree.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [verifier, '--manifest', manifest, '--root', root], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim();
    fail(`${label} failed cryptographic package verification${detail ? `: ${detail}` : '.'}`);
  }
}

function restoreAfterPromotionFailure(roots) {
  if (!fs.existsSync(roots.activeRoot) || !fs.existsSync(roots.backupRoot)) fail('Cannot restore the previous package after failed promotion because the active or backup package root is missing.');
  if (fs.existsSync(roots.candidateRoot)) fail(`Cannot preserve the failed promoted package because candidate root already exists: ${roots.candidateRoot}`);
  fs.renameSync(roots.activeRoot, roots.candidateRoot);
  try {
    fs.renameSync(roots.backupRoot, roots.activeRoot);
  } catch (error) {
    if (!fs.existsSync(roots.activeRoot) && fs.existsSync(roots.candidateRoot)) fs.renameSync(roots.candidateRoot, roots.activeRoot);
    throw error;
  }
}

function activateTransition(roots, activeManifest, candidateManifest, hooks = {}) {
  verifyPackageTree(activeManifest, roots.activeRoot, 'Active package');
  verifyPackageTree(candidateManifest, roots.candidateRoot, 'Candidate package');
  let activeMoved = false;
  let candidatePromoted = false;
  try {
    fs.renameSync(roots.activeRoot, roots.backupRoot);
    activeMoved = true;
    hooks.afterActiveBackup?.();
    fs.renameSync(roots.candidateRoot, roots.activeRoot);
    candidatePromoted = true;
    hooks.afterCandidatePromotion?.();
  } catch (error) {
    if (candidatePromoted && fs.existsSync(roots.activeRoot) && fs.existsSync(roots.backupRoot) && !fs.existsSync(roots.candidateRoot)) {
      restoreAfterPromotionFailure(roots);
    } else if (activeMoved && !fs.existsSync(roots.activeRoot) && fs.existsSync(roots.backupRoot)) {
      fs.renameSync(roots.backupRoot, roots.activeRoot);
    }
    throw error;
  }

  try {
    verifyPackageTree(candidateManifest, roots.activeRoot, 'Promoted active package');
    verifyPackageTree(activeManifest, roots.backupRoot, 'Rollback backup package');
  } catch (error) {
    restoreAfterPromotionFailure(roots);
    verifyPackageTree(activeManifest, roots.activeRoot, 'Restored active package');
    throw error;
  }
}

function writeFixtureManifest(packageRoot, manifestPath) {
  const relative = 'runtime.txt';
  const data = fs.readFileSync(path.join(packageRoot, relative));
  const entry = { path: relative, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex'), classification: 'runtime', sourceRepositoryPath: relative };
  const manifest = { schema: 'ccg-lost-sizzler-desktop-package-manifest-v1', releaseIdentifier: path.basename(packageRoot), sourceRoot: '.', requiredInputs: [], fileCount: 1, totalBytes: data.length, classificationCounts: { runtime: 1 }, files: [entry] };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function createFixture(temp, name) {
  const packages = path.join(temp, name, 'packages');
  const activeRoot = path.join(packages, 'active');
  const candidateRoot = path.join(packages, 'candidate');
  const backupRoot = path.join(packages, 'previous');
  const userDataRoot = path.join(temp, name, 'user-data');
  fs.mkdirSync(activeRoot, { recursive: true });
  fs.mkdirSync(candidateRoot, { recursive: true });
  fs.mkdirSync(userDataRoot, { recursive: true });
  fs.writeFileSync(path.join(activeRoot, 'runtime.txt'), 'build-a\n');
  fs.writeFileSync(path.join(candidateRoot, 'runtime.txt'), 'build-b-different\n');
  fs.writeFileSync(path.join(userDataRoot, 'solo-save.json'), '{"floor":7}\n');
  const activeManifest = path.join(temp, name, 'build-a.manifest.json');
  const candidateManifest = path.join(temp, name, 'build-b.manifest.json');
  writeFixtureManifest(activeRoot, activeManifest);
  writeFixtureManifest(candidateRoot, candidateManifest);
  return {
    roots: validateRoots(activeRoot, candidateRoot, backupRoot, userDataRoot),
    activeManifest,
    candidateManifest,
    profileBefore: fs.readFileSync(path.join(userDataRoot, 'solo-save.json')),
  };
}

function assertProfileUnchanged(fixture, label) {
  const current = fs.readFileSync(path.join(fixture.roots.userDataRoot, 'solo-save.json'));
  if (!current.equals(fixture.profileBefore)) fail(`Tier-A profile changed during ${label}.`);
}

function runSelfTest() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'lost-sizzler-package-transition-'));
  try {
    const success = createFixture(temp, 'success');
    activateTransition(success.roots, success.activeManifest, success.candidateManifest);
    if (fs.readFileSync(path.join(success.roots.activeRoot, 'runtime.txt'), 'utf8') !== 'build-b-different\n') fail('Build B was not promoted.');
    if (fs.readFileSync(path.join(success.roots.backupRoot, 'runtime.txt'), 'utf8') !== 'build-a\n') fail('Build A was not retained as rollback backup.');
    assertProfileUnchanged(success, 'Build A to Build B transition');

    const failed = createFixture(temp, 'post-verify-failure');
    let rejected = false;
    try {
      activateTransition(failed.roots, failed.activeManifest, failed.candidateManifest, {
        afterCandidatePromotion() {
          fs.appendFileSync(path.join(failed.roots.activeRoot, 'runtime.txt'), 'corrupt-after-promotion\n');
        },
      });
    } catch (error) {
      rejected = /Promoted active package failed cryptographic package verification/.test(String(error?.message || error));
    }
    if (!rejected) fail('A post-promotion cryptographic failure was not rejected.');
    if (fs.readFileSync(path.join(failed.roots.activeRoot, 'runtime.txt'), 'utf8') !== 'build-a\n') fail('Build A was not restored after post-promotion verification failed.');
    if (!fs.existsSync(failed.roots.candidateRoot)) fail('Failed Build B was not preserved in the candidate slot for diagnosis.');
    if (fs.existsSync(failed.roots.backupRoot)) fail('Rollback backup should be consumed when Build A is restored.');
    assertProfileUnchanged(failed, 'post-promotion verification rollback');

    console.log('Lost Sizzler package transition self-test passed: distinct manifests activate atomically, failed promoted builds restore Build A, and Tier-A profile remains outside the transaction.');
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
  const roots = validateRoots(args.get('--active-root'), args.get('--candidate-root'), args.get('--backup-root'), args.get('--user-data-root'));
  activateTransition(roots, args.get('--active-manifest'), args.get('--candidate-manifest'));
  console.log(`Lost Sizzler package transition completed: active=${roots.activeRoot} previous=${roots.backupRoot} userData=${roots.userDataRoot}`);
}

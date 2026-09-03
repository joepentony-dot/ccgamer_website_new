#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) {
      fail(`${label} must not traverse a symbolic link: ${current}`);
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

function assertDirectory(root, label) {
  if (!fs.existsSync(root)) fail(`${label} does not exist: ${root}`);
  const stat = fs.lstatSync(root);
  if (stat.isSymbolicLink()) fail(`${label} must not be a symbolic link: ${root}`);
  if (!stat.isDirectory()) fail(`${label} must be a directory: ${root}`);
}

function validateRoots(activeValue, candidateValue, backupValue, userDataValue) {
  const activeRoot = canonicalRoot(activeValue, 'active package root');
  const candidateRoot = canonicalRoot(candidateValue, 'candidate package root');
  const backupRoot = canonicalRoot(backupValue, 'backup package root');
  const userDataRoot = canonicalRoot(userDataValue, 'user-data root');
  const packageContainer = path.dirname(activeRoot);

  for (const [label, root] of [
    ['candidate package root', candidateRoot],
    ['backup package root', backupRoot],
  ]) {
    if (path.dirname(root) !== packageContainer) {
      fail(`${label} must be a sibling of the active package root under ${packageContainer}: ${root}`);
    }
  }

  const packageRoots = [activeRoot, candidateRoot, backupRoot];
  if (new Set(packageRoots).size !== packageRoots.length) {
    fail('Active, candidate and backup package roots must all be different.');
  }

  for (const packageRoot of packageRoots) {
    if (isInside(packageRoot, userDataRoot) || isInside(userDataRoot, packageRoot)) {
      fail(`Package roots and user-data root must be disjoint: ${packageRoot} <> ${userDataRoot}`);
    }
  }

  for (const [label, root] of [
    ['active package root', activeRoot],
    ['candidate package root', candidateRoot],
    ['backup package root', backupRoot],
    ['user-data root', userDataRoot],
  ]) {
    assertNoSymlinkComponents(root, label);
  }

  assertDirectory(activeRoot, 'active package root');
  assertDirectory(candidateRoot, 'candidate package root');
  if (fs.existsSync(backupRoot)) fail(`Backup package root must not already exist: ${backupRoot}`);
  if (fs.existsSync(userDataRoot)) assertDirectory(userDataRoot, 'user-data root');

  return { activeRoot, candidateRoot, backupRoot, userDataRoot, packageContainer };
}

function activatePackage(roots, hooks = {}) {
  const { activeRoot, candidateRoot, backupRoot } = roots;
  let activeMoved = false;
  try {
    fs.renameSync(activeRoot, backupRoot);
    activeMoved = true;
    hooks.afterActiveBackup?.();
    fs.renameSync(candidateRoot, activeRoot);
    hooks.afterCandidatePromotion?.();
  } catch (error) {
    if (activeMoved && !fs.existsSync(activeRoot) && fs.existsSync(backupRoot)) {
      fs.renameSync(backupRoot, activeRoot);
    }
    throw error;
  }

  if (!fs.existsSync(activeRoot)) fail('Activation completed without an active package root.');
  if (fs.existsSync(candidateRoot)) fail('Candidate package root still exists after activation.');
  if (!fs.existsSync(backupRoot)) fail('Previous active package was not retained as the rollback backup.');
}

function runSelfTest() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'lost-sizzler-atomic-activation-'));
  try {
    const packages = path.join(temp, 'packages');
    const activeRoot = path.join(packages, 'active');
    const candidateRoot = path.join(packages, 'candidate');
    const backupRoot = path.join(packages, 'previous');
    const userDataRoot = path.join(temp, 'lost-sizzler-user-data');
    fs.mkdirSync(activeRoot, { recursive: true });
    fs.mkdirSync(candidateRoot, { recursive: true });
    fs.mkdirSync(userDataRoot, { recursive: true });
    fs.writeFileSync(path.join(activeRoot, 'runtime.txt'), 'build-a\n');
    fs.writeFileSync(path.join(candidateRoot, 'runtime.txt'), 'build-b\n');
    fs.writeFileSync(path.join(userDataRoot, 'solo-save.json'), '{"floor":7}\n');
    const profileBefore = fs.readFileSync(path.join(userDataRoot, 'solo-save.json'), 'utf8');

    const roots = validateRoots(activeRoot, candidateRoot, backupRoot, userDataRoot);
    activatePackage(roots);
    if (fs.readFileSync(path.join(activeRoot, 'runtime.txt'), 'utf8') !== 'build-b\n') fail('Candidate build was not promoted to active.');
    if (fs.readFileSync(path.join(backupRoot, 'runtime.txt'), 'utf8') !== 'build-a\n') fail('Previous active build was not retained as rollback backup.');
    if (fs.readFileSync(path.join(userDataRoot, 'solo-save.json'), 'utf8') !== profileBefore) fail('Tier-A profile changed during successful activation.');

    fs.rmSync(backupRoot, { recursive: true, force: true });
    fs.rmSync(candidateRoot, { recursive: true, force: true });
    fs.mkdirSync(candidateRoot, { recursive: true });
    fs.writeFileSync(path.join(candidateRoot, 'runtime.txt'), 'build-c\n');
    const activeBeforeFailure = fs.readFileSync(path.join(activeRoot, 'runtime.txt'), 'utf8');
    const failingRoots = validateRoots(activeRoot, candidateRoot, backupRoot, userDataRoot);
    let failed = false;
    try {
      activatePackage(failingRoots, {
        afterActiveBackup() {
          throw new Error('simulated promotion failure');
        },
      });
    } catch {
      failed = true;
    }
    if (!failed) fail('Self-test expected simulated activation failure.');
    if (!fs.existsSync(activeRoot)) fail('Failed activation did not restore the previous active package.');
    if (fs.readFileSync(path.join(activeRoot, 'runtime.txt'), 'utf8') !== activeBeforeFailure) fail('Failed activation restored the wrong active package content.');
    if (fs.readFileSync(path.join(userDataRoot, 'solo-save.json'), 'utf8') !== profileBefore) fail('Tier-A profile changed during failed activation rollback.');

    console.log('Lost Sizzler atomic activation self-test passed: verified sibling packages swap with rollback while Tier-A profile stays outside the transaction.');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
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

const args = parseArgs(process.argv.slice(2));
if (args.get('--self-test')) {
  runSelfTest();
  process.exit(0);
}

const roots = validateRoots(
  args.get('--active-root'),
  args.get('--candidate-root'),
  args.get('--backup-root'),
  args.get('--user-data-root'),
);
activatePackage(roots);
console.log(`Lost Sizzler package activation completed: active=${roots.activeRoot} previous=${roots.backupRoot} userData=${roots.userDataRoot}`);

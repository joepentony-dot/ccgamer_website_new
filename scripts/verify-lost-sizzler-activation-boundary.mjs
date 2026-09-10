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
  const parsed = path.parse(resolved);
  if (resolved === parsed.root) fail(`${label} must not be a filesystem root: ${resolved}`);
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

function assertDirectoryIfPresent(root, label) {
  if (!fs.existsSync(root)) return;
  const stat = fs.lstatSync(root);
  if (stat.isSymbolicLink()) fail(`${label} must not be a symbolic link: ${root}`);
  if (!stat.isDirectory()) fail(`${label} must be a directory when present: ${root}`);
}

function assertActivationBoundary(activeRootValue, candidateRootValue, userDataRootValue) {
  const activeRoot = canonicalRoot(activeRootValue, 'active package root');
  const candidateRoot = canonicalRoot(candidateRootValue, 'candidate package root');
  const userDataRoot = canonicalRoot(userDataRootValue, 'user-data root');

  if (activeRoot === candidateRoot) fail('Active and candidate package roots must be different.');
  if (path.dirname(activeRoot) !== path.dirname(candidateRoot)) {
    fail(`Active and candidate package roots must be siblings under one package container: active=${activeRoot} candidate=${candidateRoot}`);
  }

  const roots = [
    ['active package root', activeRoot],
    ['candidate package root', candidateRoot],
    ['user-data root', userDataRoot],
  ];

  for (let i = 0; i < roots.length; i += 1) {
    for (let j = i + 1; j < roots.length; j += 1) {
      const [labelA, rootA] = roots[i];
      const [labelB, rootB] = roots[j];
      if (isInside(rootA, rootB) || isInside(rootB, rootA)) {
        fail(`${labelA} and ${labelB} must be disjoint: ${rootA} <> ${rootB}`);
      }
    }
  }

  assertNoSymlinkComponents(activeRoot, 'active package root');
  assertNoSymlinkComponents(candidateRoot, 'candidate package root');
  assertNoSymlinkComponents(userDataRoot, 'user-data root');
  assertDirectoryIfPresent(activeRoot, 'active package root');
  assertDirectoryIfPresent(candidateRoot, 'candidate package root');
  assertDirectoryIfPresent(userDataRoot, 'user-data root');

  return {
    packageContainer: path.dirname(activeRoot),
    activeRoot,
    candidateRoot,
    userDataRoot,
  };
}

function runSelfTest() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'lost-sizzler-activation-boundary-'));
  try {
    const packageContainer = path.join(temp, 'packages');
    const activeRoot = path.join(packageContainer, 'active');
    const candidateRoot = path.join(packageContainer, 'candidate');
    const userDataRoot = path.join(temp, 'lost-sizzler-user-data');
    fs.mkdirSync(activeRoot, { recursive: true });
    fs.mkdirSync(candidateRoot, { recursive: true });
    fs.mkdirSync(userDataRoot, { recursive: true });
    fs.writeFileSync(path.join(activeRoot, 'runtime.js'), 'verified-active-runtime\n');
    fs.writeFileSync(path.join(candidateRoot, 'runtime.js'), 'candidate-runtime\n');
    fs.writeFileSync(path.join(userDataRoot, 'solo-save.json'), '{"floor":7}\n');

    assertActivationBoundary(activeRoot, candidateRoot, userDataRoot);

    const unsafeCases = [
      [activeRoot, activeRoot, userDataRoot],
      [activeRoot, path.join(activeRoot, 'candidate'), userDataRoot],
      [activeRoot, path.join(temp, 'other-container', 'candidate'), userDataRoot],
      [activeRoot, candidateRoot, path.join(activeRoot, 'profile')],
      [activeRoot, candidateRoot, packageContainer],
    ];

    for (const [active, candidate, profile] of unsafeCases) {
      let rejected = false;
      try {
        assertActivationBoundary(active, candidate, profile);
      } catch {
        rejected = true;
      }
      if (!rejected) fail(`Self-test expected unsafe activation roots to be rejected: active=${active} candidate=${candidate} profile=${profile}`);
    }

    if (process.platform !== 'win32') {
      const linkRoot = path.join(packageContainer, 'candidate-link');
      fs.symlinkSync(candidateRoot, linkRoot, 'dir');
      let rejected = false;
      try {
        assertActivationBoundary(activeRoot, linkRoot, userDataRoot);
      } catch {
        rejected = true;
      }
      if (!rejected) fail('Self-test expected a symlinked candidate package root to be rejected.');
    }

    const activeBefore = fs.readFileSync(path.join(activeRoot, 'runtime.js'), 'utf8');
    const profileBefore = fs.readFileSync(path.join(userDataRoot, 'solo-save.json'), 'utf8');
    fs.writeFileSync(path.join(candidateRoot, 'runtime.js'), 'broken-candidate-runtime\n');
    const activeAfter = fs.readFileSync(path.join(activeRoot, 'runtime.js'), 'utf8');
    const profileAfter = fs.readFileSync(path.join(userDataRoot, 'solo-save.json'), 'utf8');
    if (activeAfter !== activeBefore) fail('Self-test detected active-package mutation while candidate staging changed.');
    if (profileAfter !== profileBefore) fail('Self-test detected user-data mutation while candidate staging changed.');

    console.log('Lost Sizzler activation boundary self-test passed: candidate staging is isolated from the active package and external Tier-A data.');
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

const result = assertActivationBoundary(
  args.get('--active-root'),
  args.get('--candidate-root'),
  args.get('--user-data-root'),
);
console.log(`Lost Sizzler activation staging boundary verified: active=${result.activeRoot} candidate=${result.candidateRoot} userData=${result.userDataRoot}`);

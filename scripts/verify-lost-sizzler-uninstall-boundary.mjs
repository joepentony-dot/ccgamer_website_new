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

function assertRealDirectory(root, label) {
  if (!fs.existsSync(root)) fail(`${label} does not exist: ${root}`);
  const stat = fs.lstatSync(root);
  if (stat.isSymbolicLink() || !stat.isDirectory()) fail(`${label} must be a real directory: ${root}`);
}

function assertUninstallBoundary(packageRootValue, userDataRootValue, targetValue) {
  const packageRoot = canonicalRoot(packageRootValue, 'package root');
  const userDataRoot = canonicalRoot(userDataRootValue, 'user-data root');
  const target = canonicalRoot(targetValue, 'uninstall target');

  assertNoSymlinkComponents(packageRoot, 'package root');
  assertNoSymlinkComponents(userDataRoot, 'user-data root');
  assertNoSymlinkComponents(target, 'uninstall target');
  assertRealDirectory(packageRoot, 'package root');
  assertRealDirectory(userDataRoot, 'user-data root');

  if (isInside(packageRoot, userDataRoot) || isInside(userDataRoot, packageRoot)) {
    fail(`Package root and user-data root must be disjoint: package=${packageRoot} userData=${userDataRoot}`);
  }
  if (target !== packageRoot) {
    fail(`Uninstall target must exactly equal the owned package root: target=${target} package=${packageRoot}`);
  }
  if (isInside(target, userDataRoot) || isInside(userDataRoot, target)) {
    fail(`Uninstall target must not contain, equal, or be contained by the stable user-data root: target=${target} userData=${userDataRoot}`);
  }

  return { packageRoot, userDataRoot, target };
}

function runSelfTest() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'lost-sizzler-uninstall-boundary-'));
  try {
    const packagesRoot = path.join(temp, 'packages');
    const packageRoot = path.join(packagesRoot, '1.1.0');
    const userDataRoot = path.join(temp, 'lost-sizzler-user-data');
    fs.mkdirSync(packageRoot, { recursive: true });
    fs.mkdirSync(userDataRoot, { recursive: true });
    fs.writeFileSync(path.join(packageRoot, 'runtime.js'), 'package-runtime\n');
    fs.writeFileSync(path.join(userDataRoot, 'solo-save.json'), '{"floor":7}\n');

    assertUninstallBoundary(packageRoot, userDataRoot, packageRoot);

    const rejectedTargets = [
      temp,
      packagesRoot,
      userDataRoot,
      path.join(userDataRoot, 'nested'),
      path.join(packageRoot, 'runtime.js'),
    ];

    for (const target of rejectedTargets) {
      let rejected = false;
      try {
        assertUninstallBoundary(packageRoot, userDataRoot, target);
      } catch {
        rejected = true;
      }
      if (!rejected) fail(`Self-test expected unsafe uninstall target to be rejected: ${target}`);
    }

    const missingPackageRoot = path.join(packagesRoot, 'missing-build');
    let missingPackageRejected = false;
    try {
      assertUninstallBoundary(missingPackageRoot, userDataRoot, missingPackageRoot);
    } catch {
      missingPackageRejected = true;
    }
    if (!missingPackageRejected) fail('Self-test expected a nonexistent package root to be rejected.');

    const missingUserDataRoot = path.join(temp, 'missing-user-data');
    let missingUserDataRejected = false;
    try {
      assertUninstallBoundary(packageRoot, missingUserDataRoot, packageRoot);
    } catch {
      missingUserDataRejected = true;
    }
    if (!missingUserDataRejected) fail('Self-test expected a nonexistent Tier-A user-data root to be rejected.');

    const packageFile = path.join(temp, 'package-file');
    fs.writeFileSync(packageFile, 'not-a-package-directory\n');
    let packageFileRejected = false;
    try {
      assertUninstallBoundary(packageFile, userDataRoot, packageFile);
    } catch {
      packageFileRejected = true;
    }
    if (!packageFileRejected) fail('Self-test expected a non-directory package root to be rejected.');

    const userDataFile = path.join(temp, 'user-data-file');
    fs.writeFileSync(userDataFile, 'not-a-user-data-directory\n');
    let userDataFileRejected = false;
    try {
      assertUninstallBoundary(packageRoot, userDataFile, packageRoot);
    } catch {
      userDataFileRejected = true;
    }
    if (!userDataFileRejected) fail('Self-test expected a non-directory Tier-A user-data root to be rejected.');

    if (process.platform !== 'win32') {
      const packageLink = path.join(temp, 'package-link');
      fs.symlinkSync(packageRoot, packageLink, 'dir');
      let packageSymlinkRejected = false;
      try {
        assertUninstallBoundary(packageLink, userDataRoot, packageLink);
      } catch {
        packageSymlinkRejected = true;
      }
      if (!packageSymlinkRejected) fail('Self-test expected a symlinked package root to be rejected.');

      const packagesLink = path.join(temp, 'packages-link');
      fs.symlinkSync(packagesRoot, packagesLink, 'dir');
      const packageViaLinkedParent = path.join(packagesLink, '1.1.0');
      let linkedParentRejected = false;
      try {
        assertUninstallBoundary(packageViaLinkedParent, userDataRoot, packageViaLinkedParent);
      } catch {
        linkedParentRejected = true;
      }
      if (!linkedParentRejected) fail('Self-test expected a package path traversing a symlinked parent to be rejected.');

      const userDataLink = path.join(temp, 'user-data-link');
      fs.symlinkSync(userDataRoot, userDataLink, 'dir');
      let userDataSymlinkRejected = false;
      try {
        assertUninstallBoundary(packageRoot, userDataLink, packageRoot);
      } catch {
        userDataSymlinkRejected = true;
      }
      if (!userDataSymlinkRejected) fail('Self-test expected a symlinked Tier-A user-data root to be rejected.');
    }

    const saveBefore = fs.readFileSync(path.join(userDataRoot, 'solo-save.json'), 'utf8');
    fs.rmSync(packageRoot, { recursive: true, force: true });
    if (fs.existsSync(packageRoot)) fail('Self-test expected the owned package root to be removable.');
    const saveAfter = fs.readFileSync(path.join(userDataRoot, 'solo-save.json'), 'utf8');
    if (saveAfter !== saveBefore) fail('Self-test detected user-data mutation during package removal.');

    console.log('Lost Sizzler uninstall boundary self-test passed: only the exact existing non-symlinked package directory is removable and the existing external Tier-A directory is preserved.');
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

const result = assertUninstallBoundary(
  args.get('--package-root'),
  args.get('--user-data-root'),
  args.get('--target'),
);
console.log(`Lost Sizzler uninstall target verified: ${result.target}`);

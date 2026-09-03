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

function assertUninstallBoundary(packageRootValue, userDataRootValue, targetValue) {
  const packageRoot = canonicalRoot(packageRootValue, 'package root');
  const userDataRoot = canonicalRoot(userDataRootValue, 'user-data root');
  const target = canonicalRoot(targetValue, 'uninstall target');

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
    const packageRoot = path.join(temp, 'packages', '1.1.0');
    const userDataRoot = path.join(temp, 'lost-sizzler-user-data');
    fs.mkdirSync(packageRoot, { recursive: true });
    fs.mkdirSync(userDataRoot, { recursive: true });
    fs.writeFileSync(path.join(packageRoot, 'runtime.js'), 'package-runtime\n');
    fs.writeFileSync(path.join(userDataRoot, 'solo-save.json'), '{"floor":7}\n');

    assertUninstallBoundary(packageRoot, userDataRoot, packageRoot);

    const rejectedTargets = [
      temp,
      path.join(temp, 'packages'),
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

    const saveBefore = fs.readFileSync(path.join(userDataRoot, 'solo-save.json'), 'utf8');
    fs.rmSync(packageRoot, { recursive: true, force: true });
    if (fs.existsSync(packageRoot)) fail('Self-test expected the owned package root to be removable.');
    const saveAfter = fs.readFileSync(path.join(userDataRoot, 'solo-save.json'), 'utf8');
    if (saveAfter !== saveBefore) fail('Self-test detected user-data mutation during package removal.');

    console.log('Lost Sizzler uninstall boundary self-test passed: only the exact package root is removable and external Tier-A data is preserved.');
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

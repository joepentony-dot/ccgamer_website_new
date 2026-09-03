#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
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
function assertDisjoint(a, aLabel, b, bLabel) {
  if (isInside(a, b) || isInside(b, a)) fail(`${aLabel} and ${bLabel} must be disjoint: ${a} <> ${b}`);
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
function requireRegularFile(file, label) {
  const absolute = path.resolve(file ?? '');
  if (!file || !fs.existsSync(absolute)) fail(`${label} must be an existing regular file: ${absolute}`);
  const stat = fs.lstatSync(absolute);
  if (stat.isSymbolicLink() || !stat.isFile()) fail(`${label} must be an existing regular file: ${absolute}`);
  assertNoSymlinkComponents(absolute, label);
  return absolute;
}
function requireDirectory(root, label) {
  if (!fs.existsSync(root)) fail(`${label} must exist: ${root}`);
  const stat = fs.lstatSync(root);
  if (stat.isSymbolicLink() || !stat.isDirectory()) fail(`${label} must be a real directory: ${root}`);
  assertNoSymlinkComponents(root, label);
}
function runNode(script, args, label) {
  const result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.status !== 0) fail(`${label} failed: ${(result.stderr || result.stdout || '').trim() || `exit ${result.status}`}`);
  return result.stdout.trim();
}
function sha256File(file) { return createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function copyDirectory(source, destination) {
  fs.mkdirSync(destination, { recursive: false });
  for (const entry of fs.readdirSync(source, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    const stat = fs.lstatSync(from);
    if (stat.isSymbolicLink()) fail(`Release handoff refuses symbolic links in package tree: ${from}`);
    if (stat.isDirectory()) copyDirectory(from, to);
    else if (stat.isFile()) fs.copyFileSync(from, to);
    else fail(`Release handoff refuses unsupported package entry: ${from}`);
  }
}
function validateRoots(packageValue, outputValue, userDataValue) {
  const packageRoot = canonicalRoot(packageValue, 'package root');
  const outputRoot = canonicalRoot(outputValue, 'handoff output root');
  const userDataRoot = canonicalRoot(userDataValue, 'user-data root');
  requireDirectory(packageRoot, 'package root');
  assertNoSymlinkComponents(outputRoot, 'handoff output root');
  assertNoSymlinkComponents(userDataRoot, 'user-data root');
  assertDisjoint(packageRoot, 'package root', outputRoot, 'handoff output root');
  assertDisjoint(packageRoot, 'package root', userDataRoot, 'user-data root');
  assertDisjoint(outputRoot, 'handoff output root', userDataRoot, 'user-data root');
  if (fs.existsSync(outputRoot)) fail(`Handoff output root must not already exist; existing release evidence is never overwritten: ${outputRoot}`);
  return { packageRoot, outputRoot, userDataRoot };
}
function assemble({ packageRoot, outputRoot, userDataRoot }, manifestValue, provenanceValue) {
  const manifest = requireRegularFile(manifestValue, 'package manifest');
  const provenance = requireRegularFile(provenanceValue, 'package provenance');
  const verifyTree = fileURLToPath(new URL('./verify-lost-sizzler-package-tree.mjs', import.meta.url));
  const verifyProvenance = fileURLToPath(new URL('./build-lost-sizzler-package-provenance.mjs', import.meta.url));

  runNode(verifyTree, ['--manifest', manifest, '--root', packageRoot], 'Source package verification');
  runNode(verifyProvenance, ['--manifest', manifest, '--verify', provenance], 'Source package provenance verification');

  const profileSnapshot = fs.existsSync(userDataRoot) && fs.lstatSync(userDataRoot).isDirectory()
    ? snapshotTree(userDataRoot)
    : null;

  fs.mkdirSync(outputRoot, { recursive: false });
  const applicationRoot = path.join(outputRoot, 'application');
  const metadataRoot = path.join(outputRoot, 'metadata');
  copyDirectory(packageRoot, applicationRoot);
  fs.mkdirSync(metadataRoot, { recursive: false });
  const copiedManifest = path.join(metadataRoot, 'package-manifest.json');
  const copiedProvenance = path.join(metadataRoot, 'package-provenance.json');
  fs.copyFileSync(manifest, copiedManifest);
  fs.copyFileSync(provenance, copiedProvenance);

  if (sha256File(manifest) !== sha256File(copiedManifest)) fail('Copied package manifest bytes differ from source manifest.');
  if (sha256File(provenance) !== sha256File(copiedProvenance)) fail('Copied package provenance bytes differ from source provenance.');
  runNode(verifyTree, ['--manifest', copiedManifest, '--root', applicationRoot], 'Handoff package verification');
  runNode(verifyProvenance, ['--manifest', copiedManifest, '--verify', copiedProvenance], 'Handoff provenance verification');

  if (profileSnapshot !== null && snapshotTree(userDataRoot) !== profileSnapshot) fail('Tier-A user data changed while assembling release handoff.');
  return { applicationRoot, copiedManifest, copiedProvenance };
}
function snapshotTree(root) {
  const hash = createHash('sha256');
  function walk(directory, relative) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const absolute = path.join(directory, entry.name);
      const rel = relative ? `${relative}/${entry.name}` : entry.name;
      const stat = fs.lstatSync(absolute);
      if (stat.isSymbolicLink()) fail(`Tier-A user data must not contain symbolic links during handoff verification: ${absolute}`);
      hash.update(`${entry.isDirectory() ? 'D' : 'F'}\0${rel}\0`);
      if (entry.isDirectory()) walk(absolute, rel);
      else if (entry.isFile()) hash.update(fs.readFileSync(absolute));
      else fail(`Unsupported Tier-A user-data entry: ${absolute}`);
    }
  }
  walk(root, '');
  return hash.digest('hex');
}
function writeFixtureManifest(packageRoot, manifestPath, releaseIdentifier = '10.41-handoff-test') {
  const data = fs.readFileSync(path.join(packageRoot, 'runtime.txt'));
  const entry = { path: 'runtime.txt', bytes: data.length, sha256: createHash('sha256').update(data).digest('hex'), classification: 'runtime', sourceRepositoryPath: 'runtime.txt' };
  fs.writeFileSync(manifestPath, `${JSON.stringify({ schema: 'ccg-lost-sizzler-desktop-package-manifest-v1', releaseIdentifier, sourceRoot: '.', requiredInputs: [], fileCount: 1, totalBytes: data.length, classificationCounts: { runtime: 1 }, files: [entry] }, null, 2)}\n`);
}
function writeFixtureProvenance(manifestPath, provenancePath) {
  const builder = fileURLToPath(new URL('./build-lost-sizzler-package-provenance.mjs', import.meta.url));
  runNode(builder, ['--manifest', manifestPath, '--output', provenancePath], 'Fixture provenance generation');
}
function runSelfTest() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'lost-sizzler-release-handoff-'));
  try {
    const packageRoot = path.join(temp, 'package');
    const userDataRoot = path.join(temp, 'user-data');
    const outputRoot = path.join(temp, 'handoff');
    fs.mkdirSync(packageRoot, { recursive: true });
    fs.mkdirSync(userDataRoot, { recursive: true });
    fs.writeFileSync(path.join(packageRoot, 'runtime.txt'), 'build-a\n');
    fs.writeFileSync(path.join(userDataRoot, 'solo-save.json'), '{"floor":12}\n');
    const manifest = path.join(temp, 'manifest.json');
    const provenance = path.join(temp, 'provenance.json');
    writeFixtureManifest(packageRoot, manifest);
    writeFixtureProvenance(manifest, provenance);
    const before = snapshotTree(userDataRoot);
    const roots = validateRoots(packageRoot, outputRoot, userDataRoot);
    const result = assemble(roots, manifest, provenance);
    if (!fs.existsSync(path.join(result.applicationRoot, 'runtime.txt'))) fail('Release handoff application tree was not assembled.');
    if (snapshotTree(userDataRoot) !== before) fail('Tier-A profile changed during release handoff self-test.');
    if (fs.existsSync(path.join(outputRoot, 'user-data')) || fs.existsSync(path.join(outputRoot, 'solo-save.json'))) fail('Tier-A profile leaked into release handoff.');

    let overlapRejected = false;
    try { validateRoots(packageRoot, path.join(temp, 'other-handoff'), path.join(packageRoot, 'profile')); } catch { overlapRejected = true; }
    if (!overlapRejected) fail('Package/profile overlap must be rejected.');
    let existingRejected = false;
    try { validateRoots(packageRoot, outputRoot, userDataRoot); } catch { existingRejected = true; }
    if (!existingRejected) fail('Existing handoff output must never be overwritten.');
    console.log('Lost Sizzler release handoff self-test passed: verified application + manifest + provenance are assembled without Tier-A persistence or overwrite behavior.');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
function parseArgs(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--self-test') { args.set(token, true); continue; }
    if (!token.startsWith('--')) fail(`Unexpected argument: ${token}`);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) fail(`Missing value for ${token}`);
    args.set(token, value); i += 1;
  }
  return args;
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.get('--self-test')) runSelfTest();
  else {
    const roots = validateRoots(args.get('--package-root'), args.get('--output'), args.get('--user-data-root'));
    const result = assemble(roots, args.get('--manifest'), args.get('--provenance'));
    console.log(`Lost Sizzler release handoff assembled: application=${result.applicationRoot}; manifest=${result.copiedManifest}; provenance=${result.copiedProvenance}; Tier-A user data excluded=${roots.userDataRoot}.`);
  }
} catch (error) {
  console.error(`Lost Sizzler release handoff failed: ${error.message}`);
  process.exitCode = 1;
}

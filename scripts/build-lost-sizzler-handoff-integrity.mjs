#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCHEMA = 'ccg-lost-sizzler-release-handoff-integrity-v1';

function fail(message) { throw new Error(message); }
function sha256(data) { return createHash('sha256').update(data).digest('hex'); }
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
function requireDirectory(root, label) {
  if (!fs.existsSync(root)) fail(`${label} must exist: ${root}`);
  const stat = fs.lstatSync(root);
  if (stat.isSymbolicLink() || !stat.isDirectory()) fail(`${label} must be a real directory: ${root}`);
  assertNoSymlinkComponents(root, label);
}
function requireRegularFile(file, label) {
  if (!fs.existsSync(file)) fail(`${label} must exist: ${file}`);
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink() || !stat.isFile()) fail(`${label} must be a regular file: ${file}`);
  assertNoSymlinkComponents(file, label);
}
function comparePortablePath(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
function toPosix(value) { return value.split(path.sep).join('/'); }
function runNode(script, args, label) {
  const result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.status !== 0) fail(`${label} failed: ${(result.stderr || result.stdout || '').trim() || `exit ${result.status}`}`);
  return result.stdout.trim();
}
function collectFiles(root) {
  const files = [];
  function walk(directory, relativeDirectory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => comparePortablePath(a.name, b.name));
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const relative = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      const stat = fs.lstatSync(absolute);
      if (stat.isSymbolicLink()) fail(`Release handoff integrity refuses symbolic links: ${absolute}`);
      if (stat.isDirectory()) walk(absolute, relative);
      else if (stat.isFile()) {
        const data = fs.readFileSync(absolute);
        files.push({ path: toPosix(relative), bytes: data.length, sha256: sha256(data) });
      } else fail(`Release handoff integrity refuses unsupported entry: ${absolute}`);
    }
  }
  walk(root, '');
  files.sort((a, b) => comparePortablePath(a.path, b.path));
  if (!files.length) fail('Release handoff must contain at least one file.');
  return files;
}
function treeDigest(files) {
  const hash = createHash('sha256');
  for (const file of files) hash.update(`F\0${file.path}\0${file.bytes}\0${file.sha256}\0`);
  return hash.digest('hex');
}
function readJson(file, label) {
  requireRegularFile(file, label);
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { fail(`${label} is not valid JSON: ${error.message}`); }
}
function validateHandoff(handoffValue, userDataValue) {
  const handoffRoot = canonicalRoot(handoffValue, 'handoff root');
  const userDataRoot = canonicalRoot(userDataValue, 'user-data root');
  requireDirectory(handoffRoot, 'handoff root');
  assertNoSymlinkComponents(userDataRoot, 'user-data root');
  assertDisjoint(handoffRoot, 'handoff root', userDataRoot, 'user-data root');

  const applicationRoot = path.join(handoffRoot, 'application');
  const metadataRoot = path.join(handoffRoot, 'metadata');
  const manifest = path.join(metadataRoot, 'package-manifest.json');
  const provenance = path.join(metadataRoot, 'package-provenance.json');
  requireDirectory(applicationRoot, 'handoff application root');
  requireDirectory(metadataRoot, 'handoff metadata root');
  requireRegularFile(manifest, 'handoff package manifest');
  requireRegularFile(provenance, 'handoff package provenance');
  return { handoffRoot, userDataRoot, applicationRoot, manifest, provenance };
}
function buildIntegrity(roots) {
  const verifyTree = fileURLToPath(new URL('./verify-lost-sizzler-package-tree.mjs', import.meta.url));
  const verifyProvenance = fileURLToPath(new URL('./build-lost-sizzler-package-provenance.mjs', import.meta.url));
  runNode(verifyTree, ['--manifest', roots.manifest, '--root', roots.applicationRoot], 'Handoff package verification');
  runNode(verifyProvenance, ['--manifest', roots.manifest, '--verify', roots.provenance], 'Handoff provenance verification');

  const manifest = readJson(roots.manifest, 'handoff package manifest');
  const provenance = readJson(roots.provenance, 'handoff package provenance');
  const releaseIdentifier = String(manifest.releaseIdentifier ?? '').trim();
  if (!releaseIdentifier || releaseIdentifier === 'unknown') fail('Handoff package manifest requires a non-empty, non-unknown releaseIdentifier.');
  if (provenance.releaseIdentifier !== releaseIdentifier) fail('Handoff provenance releaseIdentifier does not match package manifest.');

  const files = collectFiles(roots.handoffRoot);
  return {
    schema: SCHEMA,
    releaseIdentifier,
    handoffFileCount: files.length,
    handoffTotalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
    handoffTreeSha256: treeDigest(files),
    files,
  };
}
function verifyIntegrity(roots, integrityPath) {
  const expected = buildIntegrity(roots);
  const actual = readJson(path.resolve(integrityPath), 'handoff integrity record');
  if (actual.schema !== SCHEMA) fail(`Unsupported handoff integrity schema: ${actual.schema ?? 'missing'}`);
  for (const key of ['releaseIdentifier', 'handoffFileCount', 'handoffTotalBytes', 'handoffTreeSha256']) {
    if (actual[key] !== expected[key]) fail(`Handoff integrity mismatch for ${key}: expected ${expected[key]}, got ${actual[key]}`);
  }
  if (JSON.stringify(actual.files) !== JSON.stringify(expected.files)) fail('Handoff integrity file inventory does not match the current handoff tree.');
  return expected;
}
function writeJson(file, value, handoffRoot) {
  const absolute = path.resolve(file);
  if (isInside(handoffRoot, absolute)) fail(`Integrity record must remain outside the handoff tree to avoid recursive self-inclusion: ${absolute}`);
  assertNoSymlinkComponents(absolute, 'integrity output');
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
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
function writeFixtureManifest(packageRoot, manifestPath) {
  const data = fs.readFileSync(path.join(packageRoot, 'runtime.txt'));
  const entry = { path: 'runtime.txt', bytes: data.length, sha256: sha256(data), classification: 'runtime', sourceRepositoryPath: 'runtime.txt' };
  fs.writeFileSync(manifestPath, `${JSON.stringify({ schema: 'ccg-lost-sizzler-desktop-package-manifest-v1', releaseIdentifier: '10.41-integrity-test', sourceRoot: '.', requiredInputs: [], fileCount: 1, totalBytes: data.length, classificationCounts: { runtime: 1 }, files: [entry] }, null, 2)}\n`);
}
function runSelfTest() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'lost-sizzler-handoff-integrity-'));
  try {
    const handoff = path.join(temp, 'handoff');
    const application = path.join(handoff, 'application');
    const metadata = path.join(handoff, 'metadata');
    const userData = path.join(temp, 'user-data');
    fs.mkdirSync(application, { recursive: true });
    fs.mkdirSync(metadata, { recursive: true });
    fs.mkdirSync(userData, { recursive: true });
    fs.writeFileSync(path.join(application, 'runtime.txt'), 'build-a\n');
    fs.writeFileSync(path.join(userData, 'solo-save.json'), '{"floor":27}\n');
    const manifest = path.join(metadata, 'package-manifest.json');
    const provenance = path.join(metadata, 'package-provenance.json');
    writeFixtureManifest(application, manifest);
    const provenanceBuilder = fileURLToPath(new URL('./build-lost-sizzler-package-provenance.mjs', import.meta.url));
    runNode(provenanceBuilder, ['--manifest', manifest, '--output', provenance], 'Fixture provenance generation');

    const profileBefore = sha256(fs.readFileSync(path.join(userData, 'solo-save.json')));
    const roots = validateHandoff(handoff, userData);
    const integrity = buildIntegrity(roots);
    const record = path.join(temp, 'handoff-integrity.json');
    writeJson(record, integrity, roots.handoffRoot);
    verifyIntegrity(roots, record);
    if (sha256(fs.readFileSync(path.join(userData, 'solo-save.json'))) !== profileBefore) fail('Tier-A profile changed during integrity generation or verification.');

    fs.appendFileSync(path.join(application, 'runtime.txt'), 'tamper');
    let tamperRejected = false;
    try { verifyIntegrity(roots, record); } catch { tamperRejected = true; }
    if (!tamperRejected) fail('Handoff byte mutation must invalidate the integrity record.');

    let recursiveOutputRejected = false;
    try { writeJson(path.join(handoff, 'integrity.json'), integrity, roots.handoffRoot); } catch { recursiveOutputRejected = true; }
    if (!recursiveOutputRejected) fail('Integrity record output inside the handoff must be rejected.');

    let overlapRejected = false;
    try { validateHandoff(handoff, path.join(handoff, 'user-data')); } catch { overlapRejected = true; }
    if (!overlapRejected) fail('Handoff/Tier-A profile overlap must be rejected.');

    console.log('Lost Sizzler handoff integrity self-test passed: every handoff file is SHA-256 bound, tampering is rejected, and Tier-A persistence remains external.');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.get('--self-test')) runSelfTest();
  else {
    const roots = validateHandoff(args.get('--handoff'), args.get('--user-data-root'));
    if (args.get('--verify')) {
      const verified = verifyIntegrity(roots, args.get('--verify'));
      console.log(`Lost Sizzler handoff integrity verified: release=${verified.releaseIdentifier}; files=${verified.handoffFileCount}; bytes=${verified.handoffTotalBytes}; treeSha256=${verified.handoffTreeSha256}.`);
    } else {
      const integrity = buildIntegrity(roots);
      const output = args.get('--output');
      if (output) writeJson(output, integrity, roots.handoffRoot);
      else process.stdout.write(`${JSON.stringify(integrity, null, 2)}\n`);
    }
  }
} catch (error) {
  console.error(`Lost Sizzler handoff integrity failed: ${error.message}`);
  process.exitCode = 1;
}

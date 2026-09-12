#!/usr/bin/env node

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const APPLICATION_ID = 'uk.co.cheekycommodoregamer.c64-dungeon-carnage';
const PROFILE_ID = 'ccg-c64-dungeon-carnage';
const ENTRYPOINT = 'application/arcade/lost-sizzler/index.html';
const VERSION_MANIFEST = 'application/arcade/lost-sizzler/version.json';
const CATALOGUE = 'application/games/games.json';

function fail(message) { throw new Error(message); }
function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}
function assertDisjoint(a, aLabel, b, bLabel) {
  if (isInside(a, b) || isInside(b, a)) fail(`${aLabel} and ${bLabel} must be disjoint: ${a} <> ${b}`);
}
function assertNoSymlinkComponents(target, label) {
  let current = path.resolve(target);
  const parsed = path.parse(current);
  while (current !== parsed.root) {
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) fail(`${label} must not traverse a symbolic link: ${current}`);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
}
function requireDirectory(value, label) {
  if (!value) fail(`${label} is required.`);
  const absolute = path.resolve(value);
  assertNoSymlinkComponents(absolute, label);
  if (!fs.existsSync(absolute) || !fs.lstatSync(absolute).isDirectory()) fail(`${label} must be an existing real directory: ${absolute}`);
  return absolute;
}
function requireRegularFile(file, label) {
  assertNoSymlinkComponents(file, label);
  if (!fs.existsSync(file)) fail(`${label} is missing: ${file}`);
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink() || !stat.isFile()) fail(`${label} must be a regular file: ${file}`);
  return file;
}
function runNode(script, args, label) {
  const result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.status !== 0) fail(`${label} failed: ${(result.stderr || result.stdout || '').trim() || `exit ${result.status}`}`);
}
function copyTree(source, destination) {
  fs.mkdirSync(destination, { recursive: false });
  for (const entry of fs.readdirSync(source, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    const stat = fs.lstatSync(from);
    if (stat.isSymbolicLink()) fail(`Desktop staging refuses symbolic links: ${from}`);
    if (stat.isDirectory()) copyTree(from, to);
    else if (stat.isFile()) fs.copyFileSync(from, to);
    else fail(`Desktop staging refuses unsupported entry: ${from}`);
  }
}
function sha256File(file) { return createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function stagingConfig() {
  return Object.freeze({
    schema: 'ccg-c64-dungeon-carnage-desktop-staging-v1',
    applicationId: APPLICATION_ID,
    stableProfileId: PROFILE_ID,
    delivery: Object.freeze({
      mode: 'desktop-offline',
      entrypoint: ENTRYPOINT,
      versionManifest: VERSION_MANIFEST,
      catalogue: CATALOGUE,
      injectBefore: null,
      onlineScripts: null,
    }),
    acceptance: Object.freeze({
      networkingRequired: false,
      websiteRootSupabaseBootstrapAllowed: false,
      rendererArbitraryFilesystemAccessAllowed: false,
      rendererArbitraryProcessExecutionAllowed: false,
      externalNavigation: 'system-browser-allowlist',
      nativeBridge: 'narrow-capabilities-only',
    }),
  });
}
function validateHandoff(handoffRoot) {
  const application = path.join(handoffRoot, 'application');
  const metadata = path.join(handoffRoot, 'metadata');
  if (!fs.existsSync(application) || !fs.lstatSync(application).isDirectory()) fail('Verified release handoff is missing application/.');
  if (!fs.existsSync(metadata) || !fs.lstatSync(metadata).isDirectory()) fail('Verified release handoff is missing metadata/.');
  assertNoSymlinkComponents(application, 'handoff application');
  assertNoSymlinkComponents(metadata, 'handoff metadata');
  const manifest = requireRegularFile(path.join(metadata, 'package-manifest.json'), 'package manifest');
  const provenance = requireRegularFile(path.join(metadata, 'package-provenance.json'), 'package provenance');
  const verifyTree = fileURLToPath(new URL('./verify-lost-sizzler-package-tree.mjs', import.meta.url));
  const verifyProvenance = fileURLToPath(new URL('./build-lost-sizzler-package-provenance.mjs', import.meta.url));
  runNode(verifyTree, ['--manifest', manifest, '--root', application], 'Verified handoff application check');
  runNode(verifyProvenance, ['--manifest', manifest, '--verify', provenance], 'Verified handoff provenance check');
  for (const relative of [
    'arcade/lost-sizzler/index.html',
    'arcade/lost-sizzler/version.json',
    'games/games.json',
  ]) requireRegularFile(path.join(application, ...relative.split('/')), `desktop-required packaged file ${relative}`);
  return { application, metadata, manifest, provenance };
}
function assemble(handoffValue, outputValue) {
  const handoffRoot = requireDirectory(handoffValue, 'verified release handoff');
  if (!outputValue) fail('desktop staging output is required.');
  const outputRoot = path.resolve(outputValue);
  if (outputRoot === path.parse(outputRoot).root) fail('desktop staging output must not be a filesystem root.');
  assertNoSymlinkComponents(outputRoot, 'desktop staging output');
  assertDisjoint(handoffRoot, 'verified release handoff', outputRoot, 'desktop staging output');
  if (fs.existsSync(outputRoot)) fail(`Desktop staging output must not already exist: ${outputRoot}`);
  const outputParent = path.dirname(outputRoot);
  requireDirectory(outputParent, 'desktop staging output parent');
  const source = validateHandoff(handoffRoot);
  const partial = fs.mkdtempSync(path.join(outputParent, `.${path.basename(outputRoot)}.partial-`));
  let published = false;
  try {
    copyTree(source.application, path.join(partial, 'application'));
    copyTree(source.metadata, path.join(partial, 'metadata'));
    const configPath = path.join(partial, 'desktop-staging.json');
    fs.writeFileSync(configPath, `${JSON.stringify(stagingConfig(), null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    const copiedManifest = path.join(partial, 'metadata', 'package-manifest.json');
    const copiedProvenance = path.join(partial, 'metadata', 'package-provenance.json');
    if (sha256File(source.manifest) !== sha256File(copiedManifest)) fail('Desktop staging changed package manifest bytes.');
    if (sha256File(source.provenance) !== sha256File(copiedProvenance)) fail('Desktop staging changed package provenance bytes.');
    validateHandoff(partial);
    fs.renameSync(partial, outputRoot);
    published = true;
    return { outputRoot, configPath: path.join(outputRoot, 'desktop-staging.json') };
  } finally {
    if (!published && fs.existsSync(partial)) fs.rmSync(partial, { recursive: true, force: true });
  }
}
function writeFixtureManifest(application, manifest) {
  const files = [];
  function walk(dir, rel = '') {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const absolute = path.join(dir, entry.name);
      const relative = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(absolute, relative);
      else if (entry.isFile()) {
        const data = fs.readFileSync(absolute);
        files.push({ path: relative, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex'), classification: relative === 'games/games.json' ? 'catalogue' : 'runtime', sourceRepositoryPath: relative });
      }
    }
  }
  walk(application);
  const totalBytes = files.reduce((sum, item) => sum + item.bytes, 0);
  const classificationCounts = files.reduce((out, item) => ({ ...out, [item.classification]: (out[item.classification] || 0) + 1 }), {});
  fs.writeFileSync(manifest, `${JSON.stringify({ schema: 'ccg-lost-sizzler-desktop-package-manifest-v1', releaseIdentifier: '10.42-desktop-stage-test', sourceRoot: '.', requiredInputs: [], fileCount: files.length, totalBytes, classificationCounts, files }, null, 2)}\n`);
}
function runSelfTest() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ccg-desktop-stage-'));
  try {
    const handoff = path.join(temp, 'handoff');
    const application = path.join(handoff, 'application');
    const metadata = path.join(handoff, 'metadata');
    fs.mkdirSync(path.join(application, 'arcade/lost-sizzler'), { recursive: true });
    fs.mkdirSync(path.join(application, 'games'), { recursive: true });
    fs.mkdirSync(metadata, { recursive: true });
    fs.writeFileSync(path.join(application, 'arcade/lost-sizzler/index.html'), '<!doctype html><title>C64 Dungeon Carnage</title>\n');
    fs.writeFileSync(path.join(application, 'arcade/lost-sizzler/version.json'), '{"version":"10.42"}\n');
    fs.writeFileSync(path.join(application, 'games/games.json'), '[]\n');
    const manifest = path.join(metadata, 'package-manifest.json');
    const provenance = path.join(metadata, 'package-provenance.json');
    writeFixtureManifest(application, manifest);
    const provenanceBuilder = fileURLToPath(new URL('./build-lost-sizzler-package-provenance.mjs', import.meta.url));
    runNode(provenanceBuilder, ['--manifest', manifest, '--output', provenance], 'Fixture provenance generation');
    const output = path.join(temp, 'desktop-stage');
    const result = assemble(handoff, output);
    const config = JSON.parse(fs.readFileSync(result.configPath, 'utf8'));
    if (config.delivery.mode !== 'desktop-offline') fail('Desktop staging did not lock offline startup mode.');
    if (config.stableProfileId !== PROFILE_ID) fail('Desktop staging profile identity drifted.');
    if (config.delivery.injectBefore !== null) fail('Current verified offline package must not declare a nonexistent pre-gate injection target.');
    if (config.delivery.onlineScripts !== null) fail('Offline desktop staging must not configure online scripts.');
    if (config.acceptance.websiteRootSupabaseBootstrapAllowed !== false) fail('Offline desktop staging must refuse website-root Supabase bootstrap.');
    if (!fs.existsSync(path.join(output, ...ENTRYPOINT.split('/')))) fail('Desktop staging entrypoint is missing.');
    if (!fs.existsSync(path.join(output, ...CATALOGUE.split('/')))) fail('Desktop staging catalogue is missing.');
    let overwriteRejected = false;
    try { assemble(handoff, output); } catch { overwriteRejected = true; }
    if (!overwriteRejected) fail('Desktop staging must refuse overwrite.');
    fs.rmSync(path.join(handoff, 'application/games/games.json'));
    let missingCatalogueRejected = false;
    try { assemble(handoff, path.join(temp, 'missing-catalogue-stage')); } catch { missingCatalogueRejected = true; }
    if (!missingCatalogueRejected) fail('Desktop staging must reject a handoff without the packaged catalogue.');
    console.log('C64 Dungeon Carnage desktop staging self-test passed: current verified offline package shape copied atomically with stable startup/profile metadata and required local assets.');
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
    const result = assemble(args.get('--handoff-root'), args.get('--output'));
    console.log(`C64 Dungeon Carnage desktop staging assembled: ${result.outputRoot}; config=${result.configPath}.`);
  }
} catch (error) {
  console.error(`C64 Dungeon Carnage desktop staging failed: ${error.message}`);
  process.exitCode = 1;
}

#!/usr/bin/env node

import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import process from 'node:process';
import vm from 'node:vm';

const MANIFEST_SCHEMA = 'ccg-lost-sizzler-desktop-package-manifest-v1';
const AUDIO_MAP_PATH = 'arcade/lost-sizzler/js/audio-assets.js';
const OFFLINE_MUSIC_ROLES = Object.freeze({
  normal: 'arcade/lost-sizzler/assets/audio/music/exploration.wav',
  danger: 'arcade/lost-sizzler/assets/audio/music/danger.wav',
  sanctuary: 'arcade/lost-sizzler/assets/audio/music/sanctuary.wav',
  named: 'arcade/lost-sizzler/assets/audio/music/named-enemy.wav',
  stalker: 'arcade/lost-sizzler/assets/audio/music/count-loadula.wav',
});
const REQUIRED_OFFLINE_AUDIO = Object.freeze(Object.values(OFFLINE_MUSIC_ROLES));

function parseArgs(argv) {
  const options = { manifest: null, selfTest: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--manifest') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error('--manifest requires a file path');
      options.manifest = value;
      index += 1;
      continue;
    }
    if (arg === '--self-test') {
      options.selfTest = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/verify-lost-sizzler-offline-package-content.mjs --manifest <manifest.json>');
      console.log('       node scripts/verify-lost-sizzler-offline-package-content.mjs --self-test');
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256Buffer(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function repositoryToRuntimePath(value) {
  const prefix = 'arcade/lost-sizzler/';
  assert(value.startsWith(prefix), `Offline package path is outside Lost Sizzler runtime root: ${value}`);
  return value.slice(prefix.length);
}

function runtimeToRepositoryPath(value) {
  assert(typeof value === 'string' && value.startsWith('assets/audio/music/'), `Offline playlist asset must remain package-local: ${value}`);
  assert(!value.includes('..') && !/^[a-z][a-z0-9+.-]*:/i.test(value), `Offline playlist asset must not escape the package-local music root: ${value}`);
  return `arcade/lost-sizzler/${value}`;
}

function validateManifest(manifest) {
  assert(manifest && typeof manifest === 'object', 'Offline package manifest must be an object.');
  assert(manifest.schema === MANIFEST_SCHEMA, `Unexpected package manifest schema: ${manifest.schema}`);
  assert(Array.isArray(manifest.files) && manifest.files.length > 0, 'Package manifest must contain files.');
  assert(Array.isArray(manifest.requiredOfflineAudio), 'Package manifest must declare requiredOfflineAudio.');
  assert(
    manifest.requiredOfflineAudio.length === REQUIRED_OFFLINE_AUDIO.length &&
      manifest.requiredOfflineAudio.every((value, index) => value === REQUIRED_OFFLINE_AUDIO[index]),
    'Package manifest requiredOfflineAudio must exactly match the frozen minimum offline music roles.'
  );

  const seenPaths = new Set();
  for (const entry of manifest.files) {
    assert(entry && typeof entry.path === 'string' && entry.path.length > 0, 'Package manifest file entries must declare a path.');
    assert(!seenPaths.has(entry.path), `Package manifest contains duplicate file path: ${entry.path}`);
    seenPaths.add(entry.path);
  }

  const byPath = new Map(manifest.files.map((entry) => [entry.path, entry]));
  const requiredEntries = [];
  for (const requiredPath of REQUIRED_OFFLINE_AUDIO) {
    const entry = byPath.get(requiredPath);
    assert(entry, `Desktop package is missing required offline music: ${requiredPath}`);
    assert(entry.classification === 'audio', `Required offline music is not classified as audio: ${requiredPath}`);
    assert(Number.isSafeInteger(entry.bytes) && entry.bytes > 0, `Required offline music is empty: ${requiredPath}`);
    assert(/^[0-9a-f]{64}$/.test(entry.sha256 ?? ''), `Required offline music is missing SHA-256 provenance: ${requiredPath}`);
    assert(entry.sourceRepositoryPath === requiredPath, `Required offline music must be sourced from its packaged local asset: ${requiredPath}`);
    requiredEntries.push({ requiredPath, entry });
  }

  return { requiredOfflineAudio: REQUIRED_OFFLINE_AUDIO.length, requiredEntries, byPath };
}

function validateAudioProvenance(requiredPath, entry, data) {
  const bytes = data.length;
  const sha256 = sha256Buffer(data);
  assert(entry.bytes === bytes, `Required offline music byte size does not match bundled asset: ${requiredPath}`);
  assert(entry.sha256 === sha256, `Required offline music SHA-256 does not match bundled asset: ${requiredPath}`);
  return { bytes, sha256 };
}

function validateRuntimeAudioMap(source) {
  const sandbox = { window: {} };
  vm.runInNewContext(String(source), sandbox, { filename: AUDIO_MAP_PATH, timeout: 1000 });
  const music = sandbox.window.CCG_AUDIO_ASSETS?.music;
  assert(music && typeof music === 'object', 'Offline runtime audio map must expose CCG_AUDIO_ASSETS.music.');
  assert(music.playlists && typeof music.playlists === 'object', 'Offline runtime audio map must expose local music playlists.');

  const playlistRepositoryPaths = [];
  const seenPlaylistPaths = new Set();
  for (const [role, repositoryPath] of Object.entries(OFFLINE_MUSIC_ROLES)) {
    const runtimePath = repositoryToRuntimePath(repositoryPath);
    assert(music[role] === runtimePath, `Offline runtime music role ${role} must resolve to packaged fallback ${runtimePath}.`);
    const playlist = music.playlists[role];
    assert(Array.isArray(playlist) && playlist.length > 0, `Offline runtime music role ${role} must retain at least one local playlist asset.`);
    for (const playlistPath of playlist) {
      const repositoryPlaylistPath = runtimeToRepositoryPath(playlistPath);
      assert(!seenPlaylistPaths.has(repositoryPlaylistPath), `Offline runtime music playlists contain duplicate asset ${playlistPath}.`);
      seenPlaylistPaths.add(repositoryPlaylistPath);
      playlistRepositoryPaths.push(repositoryPlaylistPath);
    }
  }

  return { runtimeRoles: Object.keys(OFFLINE_MUSIC_ROLES).length, playlistRepositoryPaths };
}

function validatePlaylistManifestEntries(byPath, playlistRepositoryPaths) {
  for (const playlistPath of playlistRepositoryPaths) {
    const entry = byPath.get(playlistPath);
    assert(entry, `Desktop package is missing runtime playlist music: ${playlistPath}`);
    assert(entry.classification === 'audio', `Runtime playlist music is not classified as audio: ${playlistPath}`);
    assert(Number.isSafeInteger(entry.bytes) && entry.bytes > 0, `Runtime playlist music is empty: ${playlistPath}`);
    assert(/^[0-9a-f]{64}$/.test(entry.sha256 ?? ''), `Runtime playlist music is missing SHA-256 provenance: ${playlistPath}`);
    assert(entry.sourceRepositoryPath === playlistPath, `Runtime playlist music must be sourced from its packaged local asset: ${playlistPath}`);
  }
  return { playlistAssets: playlistRepositoryPaths.length };
}

function fixtureAudio() {
  return Buffer.from('x', 'utf8');
}

function fixtureManifest() {
  const audio = fixtureAudio();
  return {
    schema: MANIFEST_SCHEMA,
    requiredOfflineAudio: [...REQUIRED_OFFLINE_AUDIO],
    files: REQUIRED_OFFLINE_AUDIO.map((path) => ({
      path,
      bytes: audio.length,
      sha256: sha256Buffer(audio),
      classification: 'audio',
      sourceRepositoryPath: path,
    })),
  };
}

function runtimeFixtureSource() {
  const music = { playlists: {} };
  for (const [role, repositoryPath] of Object.entries(OFFLINE_MUSIC_ROLES)) {
    const runtimePath = repositoryToRuntimePath(repositoryPath);
    music[role] = runtimePath;
    music.playlists[role] = [runtimePath];
  }
  return `window.CCG_AUDIO_ASSETS=${JSON.stringify({ music })};`;
}

function expectManifestFailure(mutator, expectedText) {
  const manifest = fixtureManifest();
  mutator(manifest);
  try {
    validateManifest(manifest);
  } catch (error) {
    if (!String(error?.message || error).includes(expectedText)) {
      throw new Error(`Self-test expected failure containing ${JSON.stringify(expectedText)}, got: ${error?.message || error}`);
    }
    return;
  }
  throw new Error(`Self-test expected failure containing ${JSON.stringify(expectedText)} but validation passed.`);
}

function expectProvenanceFailure(entryMutator, expectedText) {
  const manifest = fixtureManifest();
  const { requiredEntries } = validateManifest(manifest);
  const target = { ...requiredEntries[0].entry };
  entryMutator(target);
  try {
    validateAudioProvenance(requiredEntries[0].requiredPath, target, fixtureAudio());
  } catch (error) {
    if (!String(error?.message || error).includes(expectedText)) {
      throw new Error(`Self-test expected provenance failure containing ${JSON.stringify(expectedText)}, got: ${error?.message || error}`);
    }
    return;
  }
  throw new Error(`Self-test expected provenance failure containing ${JSON.stringify(expectedText)} but validation passed.`);
}

function expectRuntimeFailure(source, expectedText) {
  try {
    validateRuntimeAudioMap(source);
  } catch (error) {
    if (!String(error?.message || error).includes(expectedText)) {
      throw new Error(`Self-test expected runtime failure containing ${JSON.stringify(expectedText)}, got: ${error?.message || error}`);
    }
    return;
  }
  throw new Error(`Self-test expected failure containing ${JSON.stringify(expectedText)} but validation passed.`);
}

function runSelfTest() {
  const manifestResult = validateManifest(fixtureManifest());
  for (const { requiredPath, entry } of manifestResult.requiredEntries) validateAudioProvenance(requiredPath, entry, fixtureAudio());
  expectManifestFailure((manifest) => manifest.requiredOfflineAudio.pop(), 'must exactly match');
  expectManifestFailure((manifest) => { manifest.files.push({ ...manifest.files[0] }); }, 'duplicate file path');
  expectManifestFailure((manifest) => { manifest.files = manifest.files.filter((entry) => entry.path !== REQUIRED_OFFLINE_AUDIO[0]); }, 'missing required offline music');
  expectManifestFailure((manifest) => { manifest.files[0].classification = 'runtime'; }, 'not classified as audio');
  expectManifestFailure((manifest) => { manifest.files[0].bytes = 0; }, 'is empty');
  expectManifestFailure((manifest) => { manifest.files[0].sha256 = 'pending'; }, 'missing SHA-256 provenance');
  expectManifestFailure((manifest) => { manifest.files[0].sourceRepositoryPath = 'arcade/lost-sizzler/assets/audio/music/other.wav'; }, 'sourced from its packaged local asset');
  expectProvenanceFailure((entry) => { entry.bytes += 1; }, 'byte size does not match bundled asset');
  expectProvenanceFailure((entry) => { entry.sha256 = 'b'.repeat(64); }, 'SHA-256 does not match bundled asset');

  const validRuntime = runtimeFixtureSource();
  validateRuntimeAudioMap(validRuntime);
  expectRuntimeFailure(validRuntime.replace('"normal":"assets/audio/music/exploration.wav"', '"normal":"assets/audio/music/missing.wav"'), 'music role normal');
  expectRuntimeFailure(validRuntime.replace('["assets/audio/music/danger.wav"]', '[]'), 'role danger');
  expectRuntimeFailure(validRuntime.replace('"assets/audio/music/danger.wav"]', '"https://example.invalid/danger.mp3"]'), 'package-local');

  console.log(`Lost Sizzler offline package content self-test passed: ${REQUIRED_OFFLINE_AUDIO.length} minimum local music roles, source bindings, byte/SHA-256 provenance and runtime playlist locality are independently enforced.`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.selfTest) {
    if (options.manifest) throw new Error('--self-test cannot be combined with --manifest');
    runSelfTest();
    return;
  }
  if (!options.manifest) throw new Error('--manifest is required');
  const [manifestText, audioMapSource] = await Promise.all([
    fs.readFile(options.manifest, 'utf8'),
    fs.readFile(AUDIO_MAP_PATH, 'utf8'),
  ]);
  const manifestResult = validateManifest(JSON.parse(manifestText));
  for (const { requiredPath, entry } of manifestResult.requiredEntries) {
    const data = await fs.readFile(requiredPath);
    validateAudioProvenance(requiredPath, entry, data);
  }
  const runtimeResult = validateRuntimeAudioMap(audioMapSource);
  const playlistResult = validatePlaylistManifestEntries(manifestResult.byPath, runtimeResult.playlistRepositoryPaths);
  console.log(`Lost Sizzler offline package content verified: ${manifestResult.requiredOfflineAudio} fail-safe local music roles and ${playlistResult.playlistAssets} runtime playlist assets are package-local with manifest provenance across ${runtimeResult.runtimeRoles} offline runtime roles.`);
}

main().catch((error) => {
  console.error(`Lost Sizzler offline package content verification failed: ${error?.message || error}`);
  process.exitCode = 1;
});
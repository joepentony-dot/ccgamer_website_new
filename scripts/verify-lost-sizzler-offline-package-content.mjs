#!/usr/bin/env node

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

function repositoryToRuntimePath(value) {
  const prefix = 'arcade/lost-sizzler/';
  assert(value.startsWith(prefix), `Offline package path is outside Lost Sizzler runtime root: ${value}`);
  return value.slice(prefix.length);
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

  const byPath = new Map(manifest.files.map((entry) => [entry?.path, entry]));
  for (const requiredPath of REQUIRED_OFFLINE_AUDIO) {
    const entry = byPath.get(requiredPath);
    assert(entry, `Desktop package is missing required offline music: ${requiredPath}`);
    assert(entry.classification === 'audio', `Required offline music is not classified as audio: ${requiredPath}`);
    assert(Number.isSafeInteger(entry.bytes) && entry.bytes > 0, `Required offline music is empty: ${requiredPath}`);
    assert(/^[0-9a-f]{64}$/.test(entry.sha256 ?? ''), `Required offline music is missing SHA-256 provenance: ${requiredPath}`);
  }

  return { requiredOfflineAudio: REQUIRED_OFFLINE_AUDIO.length };
}

function validateRuntimeAudioMap(source) {
  const sandbox = { window: {} };
  vm.runInNewContext(String(source), sandbox, { filename: AUDIO_MAP_PATH, timeout: 1000 });
  const music = sandbox.window.CCG_AUDIO_ASSETS?.music;
  assert(music && typeof music === 'object', 'Offline runtime audio map must expose CCG_AUDIO_ASSETS.music.');
  assert(music.playlists && typeof music.playlists === 'object', 'Offline runtime audio map must expose local music playlists.');

  for (const [role, repositoryPath] of Object.entries(OFFLINE_MUSIC_ROLES)) {
    const runtimePath = repositoryToRuntimePath(repositoryPath);
    assert(music[role] === runtimePath, `Offline runtime music role ${role} must resolve to packaged file ${runtimePath}.`);
    const playlist = music.playlists[role];
    assert(Array.isArray(playlist), `Offline runtime music role ${role} must retain a local playlist fallback.`);
    assert(playlist.length === 1 && playlist[0] === runtimePath, `Offline runtime music playlist ${role} must contain exactly packaged fallback ${runtimePath}.`);
  }

  return { runtimeRoles: Object.keys(OFFLINE_MUSIC_ROLES).length };
}

function fixtureManifest() {
  return {
    schema: MANIFEST_SCHEMA,
    requiredOfflineAudio: [...REQUIRED_OFFLINE_AUDIO],
    files: REQUIRED_OFFLINE_AUDIO.map((path) => ({
      path,
      bytes: 1,
      sha256: 'a'.repeat(64),
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

function expectRuntimeFailure(source, expectedText) {
  try {
    validateRuntimeAudioMap(source);
  } catch (error) {
    if (!String(error?.message || error).includes(expectedText)) {
      throw new Error(`Self-test expected runtime failure containing ${JSON.stringify(expectedText)}, got: ${error?.message || error}`);
    }
    return;
  }
  throw new Error(`Self-test expected runtime failure containing ${JSON.stringify(expectedText)} but validation passed.`);
}

function runSelfTest() {
  validateManifest(fixtureManifest());
  expectManifestFailure((manifest) => manifest.requiredOfflineAudio.pop(), 'must exactly match');
  expectManifestFailure((manifest) => { manifest.files = manifest.files.filter((entry) => entry.path !== REQUIRED_OFFLINE_AUDIO[0]); }, 'missing required offline music');
  expectManifestFailure((manifest) => { manifest.files[0].classification = 'runtime'; }, 'not classified as audio');
  expectManifestFailure((manifest) => { manifest.files[0].bytes = 0; }, 'is empty');
  expectManifestFailure((manifest) => { manifest.files[0].sha256 = 'pending'; }, 'missing SHA-256 provenance');

  const validRuntime = runtimeFixtureSource();
  validateRuntimeAudioMap(validRuntime);
  expectRuntimeFailure(validRuntime.replace('"normal":"assets/audio/music/exploration.wav"', '"normal":"assets/audio/music/missing.wav"'), 'music role normal');
  expectRuntimeFailure(validRuntime.replace('["assets/audio/music/danger.wav"]', '[]'), 'playlist danger');

  console.log(`Lost Sizzler offline package content self-test passed: ${REQUIRED_OFFLINE_AUDIO.length} minimum local music roles and runtime bindings are independently enforced.`);
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
  const runtimeResult = validateRuntimeAudioMap(audioMapSource);
  console.log(`Lost Sizzler offline package content verified: ${manifestResult.requiredOfflineAudio} required local music files bound to ${runtimeResult.runtimeRoles} offline runtime roles.`);
}

main().catch((error) => {
  console.error(`Lost Sizzler offline package content verification failed: ${error?.message || error}`);
  process.exitCode = 1;
});

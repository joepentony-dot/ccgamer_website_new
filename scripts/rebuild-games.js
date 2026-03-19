#!/usr/bin/env node

const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');

function fail(message) {
  console.error(`[rebuild-games] ${message}`);
  process.exit(1);
}

function runNodeScript(scriptName) {
  const scriptPath = path.join(__dirname, scriptName);
  const result = spawnSync(process.execPath, [scriptPath], { cwd: repoRoot, stdio: 'inherit' });
  if (result.status !== 0) {
    fail(`${scriptName} failed with status ${result.status ?? 1}.`);
  }
}

function refreshChangedGamesOnly() {
  runNodeScript('build-games.js');
  runNodeScript('generate-sitemaps.js');
  runNodeScript('verify-seo.mjs');
  console.log('[rebuild-games] Incremental refresh completed for changed/outdated game outputs only.');
}

refreshChangedGamesOnly();

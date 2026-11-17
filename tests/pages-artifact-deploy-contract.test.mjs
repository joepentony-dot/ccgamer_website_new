import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workflow = readFileSync(resolve(repo, '.github/workflows/deploy-github-pages-omega-stable.yml'), 'utf8');
const artifactName = 'github-pages-\\$\\{\\{ github\\.run_attempt \\}\\}';
const uploadStart = workflow.indexOf('      - name: Upload Pages artifact');
const waitStart = workflow.indexOf("      - name: Wait for this attempt's Pages artifact metadata");
const deployStart = workflow.indexOf('      - name: Deploy to GitHub Pages');
const verifyStart = workflow.indexOf('      - name: Verify deployed public pages');

test('Pages build uses one attempt-scoped upload and matching deploy artifact', () => {
  assert(uploadStart > 0 && waitStart > uploadStart && deployStart > waitStart && verifyStart > deployStart);
  const upload = workflow.slice(uploadStart, waitStart);
  const deploy = workflow.slice(deployStart, verifyStart);
  assert.match(upload, new RegExp('uses: actions/upload-pages-artifact@v4[\\s\\S]*?path: _site\\n\\s+name: ' + artifactName));
  assert.match(deploy, new RegExp('uses: actions/deploy-pages@v4[\\s\\S]*?artifact_name: ' + artifactName));
  assert.doesNotMatch(upload, /name: github-pages\\s*(?:\\n|$)/);
});

test('Pages deployment refuses zero or multiple artifact metadata matches', () => {
  const wait = workflow.slice(waitStart, deployStart);
  assert.match(wait, new RegExp('PAGES_ARTIFACT_NAME: ' + artifactName));
  assert.match(wait, /repos\\/\\$\\{GITHUB_REPOSITORY\\}\\/actions\\/runs\\/\\$\\{GITHUB_RUN_ID\\}\\/artifacts/);
  assert.match(wait, /--arg name "\\$PAGES_ARTIFACT_NAME" --argjson run "\\$GITHUB_RUN_ID"/);
  assert.match(wait, /select\\(\\.name == \\$name and \\.expired == false and \\.workflow_run\\.id == \\$run\\)/);
  assert.match(wait, /if \\[ "\\$artifact_count" -eq 1 \\]/);
  assert.match(wait, /if \\[ "\\$artifact_count" -gt 1 \\]/);
  assert.match(wait, /for attempt in \\{1\\.\\.18\\}/);
  assert.match(wait, /sleep 5/);
  assert.match(wait, /refusing deployment/);
  assert.match(wait, /exit 1/);
});

test('existing build, SEO, release safety and served-page checks remain mandatory', () => {
  for (const marker of [
    'Build and validate canonical game, retro, genre and sitemap SEO',
    'Fail closed on C64 emulator links and game-page SEO parity',
    'Verify staged public features',
    'Guarantee GoatCounter on every staged HTML page',
    'Check published-site size',
    'Verify deployed public pages',
    'Verify served approved emulator CTAs on GitHub Pages'
  ]) {
    assert(workflow.includes(marker), 'Missing mandatory deployment step: ' + marker);
  }
});

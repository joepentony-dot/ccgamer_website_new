import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workflow = readFileSync(resolve(repo, '.github/workflows/deploy-github-pages-omega-stable.yml'), 'utf8');
const probe = readFileSync(resolve(repo, 'scripts/wait-for-pages-artifact-service.cjs'), 'utf8');
const artifactName = 'github-pages-${{ github.run_attempt }}';
const uploadStart = workflow.indexOf('      - name: Upload Pages artifact');
const installStart = workflow.indexOf('      - name: Install pinned internal artifact client');
const waitStart = workflow.indexOf("      - name: Wait for this attempt's Pages artifact metadata");
const deployStart = workflow.indexOf('      - name: Deploy to GitHub Pages');
const verifyStart = workflow.indexOf('      - name: Verify deployed public pages');

test('upload and deploy use the identical unique run-attempt artifact name', () => {
  assert(uploadStart > 0 && installStart > uploadStart && waitStart > installStart);
  assert(deployStart > waitStart && verifyStart > deployStart);
  const upload = workflow.slice(uploadStart, installStart);
  const deploy = workflow.slice(deployStart, verifyStart);
  assert(upload.includes('uses: actions/upload-pages-artifact@v4'));
  assert(upload.includes('path: _site'));
  assert(upload.includes('name: ' + artifactName));
  assert(deploy.includes('uses: actions/deploy-pages@v4'));
  assert(deploy.includes('artifact_name: ' + artifactName));
});

test('Twirp probe runs within a JS action with runtime token injection', () => {
  const install = workflow.slice(installStart, waitStart);
  const wait = workflow.slice(waitStart, deployStart);
  assert(install.includes('npm install --prefix "$RUNNER_TEMP/ccg-pages-artifact-probe"'));
  assert(install.includes('--no-save --ignore-scripts --no-audit --no-fund'));
  assert(install.includes('@actions/artifact@2.3.2'));
  assert(wait.includes('uses: actions/github-script@v7'));
  assert(wait.includes('script: |'));
  assert(!wait.includes('shell: bash'));
  assert(!wait.includes('run: |'));
  assert(wait.includes('ACTIONS_RUNTIME_TOKEN'));
  assert(wait.includes('ACTIONS_RESULTS_URL'));
  assert(wait.includes('CCG_PAGES_ARTIFACT_NAME: ' + artifactName));
  assert(wait.includes('new DefaultArtifactClient()'));
  assert(wait.includes('listArtifacts: () => client.listArtifacts()'));
  assert(wait.includes('await waitForArtifact({'));
  assert(wait.includes("'scripts', 'wait-for-pages-artifact-service.cjs'"));
  assert(!wait.includes('gh api'), 'REST polling cannot replace internal artifact service');
  assert(probe.includes('matching.length > 1'));
  assert(probe.includes('attempt <= maxAttempts'));
  assert(!probe.includes('require.main'), 'Do not accidentally run Twirp client in a shell context');
});

test('existing source gates and post-deploy checks have not been removed', () => {
  for (const marker of [
    'Build and validate canonical game, retro, genre and sitemap SEO',
    'Fail closed on C64 emulator links and game-page SEO parity',
    'Verify staged public features',
    'Guarantee GoatCounter on every staged HTML page',
    'Check published-site size',
    'Verify deployed public pages',
    'Verify served approved emulator CTAs on GitHub Pages'
  ]) assert(workflow.includes(marker), 'Missing release safeguard: ' + marker);
});

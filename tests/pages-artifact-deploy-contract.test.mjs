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
const waitStart = workflow.indexOf("      - name: Wait for this attempt's Pages artifact metadata");
const deployStart = workflow.indexOf('      - name: Deploy to GitHub Pages');
const verifyStart = workflow.indexOf('      - name: Verify deployed public pages');

test('Pages upload and deployment share the current-attempt artifact name', () => {
  assert(uploadStart > 0 && waitStart > uploadStart && deployStart > waitStart && verifyStart > deployStart);
  const upload = workflow.slice(uploadStart, waitStart);
  const deploy = workflow.slice(deployStart, verifyStart);
  assert(upload.includes('uses: actions/upload-pages-artifact@v4'));
  assert(upload.includes('path: _site'));
  assert(upload.includes('name: ' + artifactName));
  assert(deploy.includes('uses: actions/deploy-pages@v4'));
  assert(deploy.includes('artifact_name: ' + artifactName));
  assert(!upload.split('\n').some(line => line.trim() === 'name: github-pages'));
});

test('metadata preflight uses the same internal artifact service as deploy-pages', () => {
  const wait = workflow.slice(waitStart, deployStart);
  for (const required of [
    'CCG_PAGES_ARTIFACT_NAME: ' + artifactName,
    'npm install --prefix "$RUNNER_TEMP/ccg-pages-artifact-probe"',
    '--no-save --ignore-scripts --no-audit --no-fund',
    '@actions/artifact@2.3.2',
    'node scripts/wait-for-pages-artifact-service.cjs'
  ]) assert(wait.includes(required), 'Missing internal service preflight: ' + required);
  assert(!wait.includes('gh api'), 'REST artifact polling is not equivalent to Twirp visibility');
  assert(probe.includes('new DefaultArtifactClient()'));
  assert(probe.includes('client.listArtifacts()'));
  assert(probe.includes('matching.length > 1'));
  assert(probe.includes('attempt <= maxAttempts'));
});

test('all prior SEO, size, emulator and served-site checks remain mandatory', () => {
  for (const marker of [
    'Build and validate canonical game, retro, genre and sitemap SEO',
    'Fail closed on C64 emulator links and game-page SEO parity',
    'Verify staged public features',
    'Guarantee GoatCounter on every staged HTML page',
    'Check published-site size',
    'Verify deployed public pages',
    'Verify served approved emulator CTAs on GitHub Pages'
  ]) assert(workflow.includes(marker), 'Missing mandatory deployment step: ' + marker);
});

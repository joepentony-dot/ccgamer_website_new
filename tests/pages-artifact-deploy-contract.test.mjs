import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workflow = readFileSync(resolve(repo, '.github/workflows/deploy-github-pages-omega-stable.yml'), 'utf8');
const artifactName = 'github-pages-${{ github.run_attempt }}';
const uploadStart = workflow.indexOf('      - name: Upload Pages artifact');
const waitStart = workflow.indexOf("      - name: Wait for this attempt's Pages artifact metadata");
const deployStart = workflow.indexOf('      - name: Deploy to GitHub Pages');
const verifyStart = workflow.indexOf('      - name: Verify deployed public pages');

test('Pages upload and deployment use the same unique attempt-scoped artifact name', () => {
  assert(uploadStart > 0 && waitStart > uploadStart && deployStart > waitStart && verifyStart > deployStart);
  const upload = workflow.slice(uploadStart, waitStart);
  const deploy = workflow.slice(deployStart, verifyStart);
  assert(upload.includes('uses: actions/upload-pages-artifact@v4'));
  assert(upload.includes('path: _site'));
  assert(upload.includes('name: ' + artifactName));
  assert(deploy.includes('uses: actions/deploy-pages@v4'));
  assert(deploy.includes('artifact_name: ' + artifactName));
  assert(!upload.split('\n').some(line => line.trim() === 'name: github-pages'), 'Do not reuse a fixed name on retries');
});

test('metadata gate checks this run and attempt, fails on ambiguity and stays bounded', () => {
  const wait = workflow.slice(waitStart, deployStart);
  for (const required of [
    'PAGES_ARTIFACT_NAME: ' + artifactName,
    'GH_TOKEN: ${{ github.token }}',
    '/actions/runs/${GITHUB_RUN_ID}/artifacts?per_page=100',
    '--arg name "$PAGES_ARTIFACT_NAME" --argjson run "$GITHUB_RUN_ID"',
    'select(.name == $name and .expired == false and .workflow_run.id == $run)',
    'if [ "$artifact_count" -eq 1 ]; then',
    'if [ "$artifact_count" -gt 1 ]; then',
    'for attempt in {1..18}; do',
    'sleep 5',
    'refusing deployment.',
    'exit 1'
  ]) {
    assert(wait.includes(required), 'Missing artifact admission safeguard: ' + required);
  }
});

test('all prior build and deployed-site verification steps are retained', () => {
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

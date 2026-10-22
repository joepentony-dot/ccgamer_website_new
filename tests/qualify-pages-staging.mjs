import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const workflowPath = '.github/workflows/deploy-github-pages-omega-stable.yml';

// Execute the existing deployment owner's pre-upload run blocks verbatim.
// This qualification harness has no artifact publishing or deployment step.
export function stagingSteps(source) {
  const starts = [...source.matchAll(/^      - name: (.+)\r?$/gm)];
  const upload = starts.findIndex(match => match[1] === 'Upload Pages artifact');
  assert(upload > 0, 'Missing existing Pages upload boundary');
  const steps = [];
  for (let i = 0; i < upload; i++) {
    const block = source.slice(starts[i].index, starts[i + 1].index);
    const run = block.match(/^        run: \|\r?\n((?:(?: {10}[^\n]*)?\r?\n)+)/m);
    if (!run) {
      assert(!/^        run:/m.test(block), 'Unsupported run block: ' + starts[i][1]);
      continue;
    }
    steps.push({ name: starts[i][1], script: run[1].replace(/^ {10}/gm, '').replace(/\r\n/g, '\n') });
  }
  assert.deepEqual(steps.map(step => step.name), [
    'Stage public website only',
    'Build and validate canonical game, retro, genre and sitemap SEO',
    'Canonicalize first-paint public header shell',
    'Fail closed on C64 emulator links and game-page SEO parity',
    'Verify staged public features',
    'Guarantee GoatCounter on every staged HTML page',
    'Check published-site size',
  ], 'Qualification must include every existing pre-upload run block');
  return steps;
}

export function qualify(root = process.cwd()) {
  if (process.platform === 'win32') throw new Error('Exact Pages staging requires Linux bash and rsync; run its read-only CI job.');
  root = path.resolve(root);
  assert(fs.statSync(path.join(root, workflowPath)).isFile());
  assert.equal(path.resolve(root, '_site'), path.join(root, '_site'));
  const temp = process.env.RUNNER_TEMP || fs.mkdtempSync(path.join(os.tmpdir(), 'ccg-pages-qualification-'));
  const env = { ...process.env, RUNNER_TEMP: temp,
    GITHUB_STEP_SUMMARY: process.env.GITHUB_STEP_SUMMARY || path.join(temp, 'step-summary.md') };
  for (const step of stagingSteps(fs.readFileSync(path.join(root, workflowPath), 'utf8'))) {
    console.log('Qualifying Pages owner: ' + step.name);
    const result = spawnSync('bash', ['--noprofile', '--norc', '-e', '-o', 'pipefail', '-c', step.script],
      { cwd: root, env, stdio: 'inherit' });
    if (result.error) throw result.error;
    assert.equal(result.status, 0, 'Pages staging failed: ' + step.name);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--run')) qualify();
  else stagingSteps(fs.readFileSync(workflowPath, 'utf8')).forEach(step => console.log(step.name));
}

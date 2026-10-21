import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { stagingSteps, workflowPath } from './qualify-pages-staging.mjs';

const workflow = fs.readFileSync(workflowPath, 'utf8');
test('Pages preserves publisher-owned game HTML and validates it before upload', () => {
  const steps = stagingSteps(workflow);
  assert.doesNotMatch(workflow, /node scripts\/prepare-seo-game-routes\.js --output-root _site/);
  assert.match(steps[0].script, /rsync -a --prune-empty-dirs/);
  assert.match(steps[1].script, /node scripts\/validate-seo-game-routes\.js --root _site/);
  assert.match(steps[1].script, /node scripts\/prepare-seo-genre-links\.js --root _site/);
  assert.match(steps[1].script, /node scripts\/generate-retro-pages\.js --root _site/);
  assert.match(steps[1].script, /node scripts\/generate-sitemaps\.js/);
  assert.match(steps[2].script, /normalize-public-header-shell\.js --root _site --check/);
  assert.match(steps[3].script, /python3 scripts\/ccg_game_page_release_audit\.py/);
  assert.match(steps[3].script, /--media-check/);
  assert.match(steps[3].script, /--report-dir "\$RUNNER_TEMP\/ccg-game-page-release"/);
  assert.match(workflow, /uses: actions\/upload-pages-artifact@v4/);
  assert.match(workflow, /uses: actions\/deploy-pages@v4/);
});

test('production CTA smoke follows the existing deployment and precedes navigation checks', () => {
  const smoke = workflow.indexOf('name: Verify served approved emulator CTAs on GitHub Pages');
  assert(smoke > workflow.indexOf('uses: actions/deploy-pages@v4'));
  assert(smoke < workflow.indexOf('name: Dispatch custom-domain navigation verification'));
  const body = workflow.slice(smoke);
  for (const slug of ['chuckie-egg', 'friday-the-13th', 'samurai-warrior-the-battles-of-usagi-yojimbo']) assert(body.includes(slug));
  assert.match(body, /data-ccg-play-in-emulator="true"/);
  assert.match(body, /PAGE_URL: \$\{\{ steps\.deployment\.outputs\.page_url \}\}/);
});

test('qualification executes complete original shell blocks, with no upload/deploy commands', () => {
  const steps = stagingSteps(workflow);
  for (const step of steps) {
    assert(step.script.startsWith('set -euo pipefail\n'));
    assert.doesNotMatch(step.script, /actions\/(?:upload-pages-artifact|deploy-pages)|gh (?:pr merge|workflow run)/);
  }
  assert.match(steps[0].script, /cat > _site\/arcade\/lost-sizzler\/index\.html <<'EOF'[\s\S]*\nEOF\n/);
  assert.match(steps.at(-1).script, /du -sb _site/);
  assert.throws(() => stagingSteps(workflow.replace('        run: |', '        run: echo unsupported')), /Unsupported run block/);
  assert.throws(() => stagingSteps(workflow.replace('      - name: Check published-site size', '      - name: Unexpected step')), /every existing pre-upload/);
});

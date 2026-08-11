import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const optimizer = fs.readFileSync('admin/js/content-publisher-image-optimizer.js', 'utf8');
const publisher = fs.readFileSync('admin/content-publisher.html', 'utf8');
const budget = fs.readFileSync('scripts/image-performance-budget.py', 'utf8');

test('Content Publisher loads the isolated thumbnail optimiser', () => {
  assert.match(publisher, /content-publisher-image-optimizer\.js/);
  assert.match(publisher, /content-publisher\.js/);
  assert.match(optimizer, /data-game-thumbnail-file/);
  assert.match(optimizer, /data-publish-game/);
});

test('thumbnail optimisation is local, downward-only and WebP based', () => {
  assert.match(optimizer, /MAX_WIDTH = 1280/);
  assert.match(optimizer, /MAX_HEIGHT = 960/);
  assert.match(optimizer, /Math\.min\(1, MAX_WIDTH \/ sourceWidth, MAX_HEIGHT \/ sourceHeight\)/);
  assert.match(optimizer, /canvas\.toBlob\(resolve, 'image\/webp'/);
  assert.match(optimizer, /new DataTransfer\(\)/);
  assert.match(optimizer, /new File\(\[finalBlob\]/);
  assert.doesNotMatch(optimizer, /fetch\(|XMLHttpRequest|localStorage|sessionStorage/);
});

test('publisher is disabled while a thumbnail is being transformed', () => {
  assert.match(optimizer, /publishButton\.disabled = busy/);
  assert.match(optimizer, /fileInput\.disabled = busy/);
  assert.match(optimizer, /data-thumbnail-optimization-status/);
});

test('performance budgets apply only to added or modified raster files', () => {
  assert.match(budget, /--diff-filter=AM/);
  assert.match(budget, /f"\{base\}\.\.\.HEAD"/);
  assert.match(budget, /THUMBNAIL_PREFIX = "resources\/images\/thumbnails\/all\/"/);
  assert.match(budget, /THUMBNAIL_MAX_BYTES = 900 \* 1024/);
  assert.match(budget, /GENERAL_MAX_BYTES = 2 \* 1024 \* 1024/);
  assert.match(budget, /TOTAL_CHANGED_IMAGE_BYTES = 12 \* 1024 \* 1024/);
});

test('budget validator verifies image bytes instead of trusting extensions', () => {
  assert.match(budget, /image\.verify\(\)/);
  assert.match(budget, /extension-mismatch/);
  assert.match(budget, /pixel-count/);
  assert.doesNotMatch(budget, /unlink\(|rename\(|replace\(|shutil\.move/);
});

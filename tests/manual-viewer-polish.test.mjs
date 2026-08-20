import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  SCRIPT_SRC,
  STYLE_HREF,
  injectManualViewerPolish,
} = require('../scripts/ensure-manual-viewer-polish.js');

const runtime = fs.readFileSync('js/ccg-manual-viewer-polish.js', 'utf8');
const css = fs.readFileSync('resources/css/ccg-manual-viewer-polish.css', 'utf8');

test('publishing materializes the manual viewer stylesheet and runtime once', () => {
  const source = '<!doctype html><html><head></head><body><div id="manualModal"></div></body></html>';
  const first = injectManualViewerPolish(source);
  const second = injectManualViewerPolish(first);

  assert.match(first, new RegExp(STYLE_HREF.replaceAll('/', '\\/')));
  assert.match(first, new RegExp(SCRIPT_SRC.replaceAll('/', '\\/')));
  assert.equal(second, first);
  assert.equal((first.match(/data-ccg-manual-viewer-polish/g) || []).length, 2);
});

test('non-manual pages are left untouched by the publisher normalizer', () => {
  const source = '<!doctype html><html><head></head><body><main>Games</main></body></html>';
  assert.equal(injectManualViewerPolish(source), source);
});

test('manual runtime preserves the pre-open scroll position and repairs the existing modal lock', () => {
  assert.match(runtime, /#\$\{BUTTON_ID\}/);
  assert.match(runtime, /currentScrollTop\(\)/);
  assert.match(runtime, /document\.addEventListener\("click"[\s\S]*\{ capture: true \}\)/);
  assert.match(runtime, /body\.dataset\.modalScrollTop = String\(scrollTop\)/);
  assert.match(runtime, /window\.scrollTo\(\{ top: scrollTop, behavior: "auto" \}\)/);
  assert.doesNotMatch(runtime, /window\.scrollTo\(\{ top: 0/);
});

test('manual runtime supplies an external PDF fallback without affecting other media modals', () => {
  assert.match(runtime, /Open manual in new tab/);
  assert.match(runtime, /target="_blank"/);
  assert.match(runtime, /rel="noopener noreferrer"/);
  assert.doesNotMatch(runtime, /ccgModal|box3d/i);
});

test('manual viewer presentation uses a light reading surface and a mobile viewport contract', () => {
  assert.match(css, /#manualModal \.manual-content/);
  assert.match(css, /background: #f3f5f7/);
  assert.match(css, /#manualModal \.ccg-pdf-frame/);
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.match(css, /height: 100dvh/);
});

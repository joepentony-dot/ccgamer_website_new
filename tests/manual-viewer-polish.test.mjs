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

test('manual runtime anchors the viewer to the button that launched it', () => {
  assert.match(runtime, /#\$\{BUTTON_ID\}/);
  assert.match(runtime, /getBoundingClientRect\(\)/);
  assert.match(runtime, /--ccg-manual-anchor-top/);
  assert.match(runtime, /positionViewerNearButton\(button\)/);
  assert.match(runtime, /document\.addEventListener\("click"[\s\S]*\{ capture: true \}\)/);
});

test('manual runtime releases the page scroll lock and tracks the live page position', () => {
  assert.match(runtime, /body\.classList\.remove\("modal-open"\)/);
  assert.match(runtime, /body\.style\.top = ""/);
  assert.match(runtime, /window\.addEventListener\("scroll", syncScrollRestorePoint, \{ passive: true \}\)/);
  assert.match(runtime, /body\.dataset\.modalScrollTop = String\(currentScrollTop\(\)\)/);
  assert.doesNotMatch(runtime, /body\.classList\.add\("modal-open"\)/);
  assert.doesNotMatch(runtime, /body\.style\.top = `-\$\{scrollTop\}px`/);
  assert.doesNotMatch(runtime, /window\.scrollTo\(\{ top: 0/);
});

test('manual runtime supplies an external PDF fallback without affecting other media modals', () => {
  assert.match(runtime, /Open manual in new tab/);
  assert.match(runtime, /target="_blank"/);
  assert.match(runtime, /rel="noopener noreferrer"/);
  assert.doesNotMatch(runtime, /ccgModal|box3d/i);
});

test('manual viewer presentation is non-blocking and uses an anchored reading surface', () => {
  assert.match(css, /data-ccg-manual-anchored="true"/);
  assert.match(css, /position: absolute !important/);
  assert.match(css, /pointer-events: none !important/);
  assert.match(css, /\.manual-content[\s\S]*pointer-events: auto !important/);
  assert.match(css, /background: transparent !important/);
  assert.match(css, /background: #f3f5f7/);
});

test('mobile manual viewer stays bounded instead of taking over the full viewport', () => {
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.match(css, /height: min\(68dvh, 620px\) !important/);
  assert.doesNotMatch(css, /height: 100dvh/);
});

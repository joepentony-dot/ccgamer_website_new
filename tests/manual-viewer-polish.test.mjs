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

test('manual runtime stores the source internally and removes it from the public button', () => {
  assert.match(runtime, /const MANUAL_URLS = new WeakMap\(\)/);
  assert.match(runtime, /delete button\.dataset\.manualUrl/);
  assert.match(runtime, /button\.setAttribute\("href", `#\$\{MODAL_ID\}`\)/);
  assert.match(runtime, /button\.removeAttribute\("target"\)/);
  assert.match(runtime, /button\.removeAttribute\("rel"\)/);
  assert.match(runtime, /MutationObserver/);
});

test('manual runtime never exposes an external-tab fallback', () => {
  assert.doesNotMatch(runtime, /Open manual in new tab/i);
  assert.doesNotMatch(runtime, /target="_blank"/i);
  assert.doesNotMatch(runtime, /noopener noreferrer/i);
  assert.doesNotMatch(runtime, /data-ccg-manual-open-external/i);
});

test('manual runtime takes over the manual click without moving the page to the top', () => {
  assert.match(runtime, /document\.addEventListener\("click"[\s\S]*\{ capture: true \}\)/);
  assert.match(runtime, /event\.preventDefault\(\)/);
  assert.match(runtime, /event\.stopPropagation\(\)/);
  assert.match(runtime, /frame\.src = manualUrl/);
  assert.match(runtime, /body\.classList\.add\("modal-open"\)/);
  assert.doesNotMatch(runtime, /window\.scrollTo\(\{ top: 0/);
});

test('manual runtime keeps failure messaging inside the viewer', () => {
  assert.match(runtime, /Manual failed to load\. Close the viewer and try again\./);
  assert.doesNotMatch(runtime, /new tab/i);
});

test('manual viewer fills the viewport and leaves PDF controls inside the popup', () => {
  assert.match(css, /#manualModal\.ccg-modal--doc[\s\S]*position: fixed !important/);
  assert.match(css, /inset: 0 !important/);
  assert.match(css, /width: 100vw !important/);
  assert.match(css, /height: 100dvh !important/);
  assert.match(css, /#manualModal \.manual-content[\s\S]*height: 100dvh !important/);
  assert.match(css, /#manualModal \.ccg-pdf-frame[\s\S]*flex: 1 1 auto !important/);
  assert.match(runtime, /Use the PDF toolbar to zoom, print or download/);
  assert.doesNotMatch(css, /data-ccg-manual-anchored/);
});

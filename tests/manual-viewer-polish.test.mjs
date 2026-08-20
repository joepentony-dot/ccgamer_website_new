import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
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

test('manual runtime keeps an authoritative in-memory source across hydration', () => {
  assert.match(runtime, /let activeManualUrl = ""/);
  assert.match(runtime, /resolveManualUrlFromGame/);
  assert.match(runtime, /captureManualSource\(button, eventManualUrl\)/);
  assert.match(runtime, /window\.addEventListener\("ccg:game-loaded", syncManualButton\)/);
  assert.doesNotMatch(runtime, /new WeakMap/);
});

test('manual runtime removes the source from the public button', () => {
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

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  add(...values) {
    values.forEach((value) => this.values.add(value));
  }

  remove(...values) {
    values.forEach((value) => this.values.delete(value));
  }

  contains(value) {
    return this.values.has(value);
  }
}

class FakeElement {
  constructor(tagName = 'div', id = '') {
    this.tagName = String(tagName).toUpperCase();
    this.id = id;
    this.dataset = {};
    this.attributes = new Map();
    this.classList = new FakeClassList();
    this.className = '';
    this.children = [];
    this.parentElement = null;
    this.style = {};
    this.hidden = false;
    this.listeners = new Map();
    this.innerHTML = '';
    this.src = '';
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  addEventListener(name, handler) {
    this.listeners.set(name, handler);
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  insertBefore(child, reference) {
    child.parentElement = this;
    const index = this.children.indexOf(reference);
    if (index < 0) this.children.push(child);
    else this.children.splice(index, 0, child);
    return child;
  }

  querySelector(selector) {
    if (selector === '.manual-content' && this.className.split(/\s+/).includes('manual-content')) return this;
    if (selector === '[data-ccg-manual-toolbar]' && this.hasAttribute('data-ccg-manual-toolbar')) return this;

    for (const child of this.children) {
      const match = child.querySelector(selector);
      if (match) return match;
    }
    return null;
  }

  querySelectorAll() {
    return [];
  }

  closest(selector) {
    return selector === `#${this.id}` ? this : null;
  }

  focus() {}
}

function createManualRuntimeHarness() {
  const documentListeners = new Map();
  const windowListeners = new Map();
  const elements = new Map();

  const body = new FakeElement('body', 'body');
  const button = new FakeElement('a', 'gameManualBtn');
  button.setAttribute('href', '#');

  const modal = new FakeElement('div', 'manualModal');
  modal.setAttribute('aria-hidden', 'true');
  const content = new FakeElement('div');
  content.className = 'manual-content';
  const status = new FakeElement('p', 'manualModalStatus');
  const close = new FakeElement('button', 'manualModalClose');
  const frame = new FakeElement('iframe', 'gameManualEmbed');

  content.appendChild(status);
  content.appendChild(close);
  content.appendChild(frame);
  modal.appendChild(content);
  body.appendChild(modal);

  [button, modal, status, close, frame].forEach((element) => elements.set(element.id, element));

  class FakeMutationObserver {
    constructor(callback) {
      this.callback = callback;
    }
    observe() {}
  }

  const document = {
    readyState: 'complete',
    body,
    documentElement: { scrollTop: 0 },
    getElementById(id) {
      return elements.get(id) || null;
    },
    createElement(tagName) {
      return new FakeElement(tagName);
    },
    addEventListener(name, handler) {
      documentListeners.set(name, handler);
    },
  };

  const window = {
    scrollY: 480,
    CSS: { supports: () => false },
    addEventListener(name, handler) {
      windowListeners.set(name, handler);
    },
  };

  const context = {
    window,
    document,
    Element: FakeElement,
    MutationObserver: FakeMutationObserver,
    requestAnimationFrame: (callback) => callback(),
    queueMicrotask,
    console,
    URL,
    URLSearchParams,
  };

  vm.runInNewContext(runtime, context, { filename: 'ccg-manual-viewer-polish.js' });

  return {
    button,
    modal,
    frame,
    body,
    documentListeners,
    windowListeners,
  };
}

test('hydrated manual button opens the full-screen viewer on click', () => {
  const harness = createManualRuntimeHarness();
  const rawDriveUrl = 'https://drive.google.com/file/d/abc123xyz/view?usp=drive_link';
  const previewUrl = 'https://drive.google.com/file/d/abc123xyz/preview';

  const gameLoaded = harness.windowListeners.get('ccg:game-loaded');
  assert.equal(typeof gameLoaded, 'function');
  gameLoaded({ detail: { game: { manual: rawDriveUrl } } });

  assert.equal(harness.button.getAttribute('href'), '#manualModal');
  assert.equal(harness.button.hasAttribute('target'), false);
  assert.equal(harness.button.hasAttribute('rel'), false);
  assert.equal(harness.button.dataset.manualUrl, undefined);

  let prevented = false;
  let stopped = false;
  const clickHandler = harness.documentListeners.get('click');
  assert.equal(typeof clickHandler, 'function');
  clickHandler({
    target: harness.button,
    preventDefault() { prevented = true; },
    stopPropagation() { stopped = true; },
  });

  assert.equal(prevented, true);
  assert.equal(stopped, true);
  assert.equal(harness.frame.src, previewUrl);
  assert.equal(harness.modal.classList.contains('open'), true);
  assert.equal(harness.modal.classList.contains('active'), true);
  assert.equal(harness.modal.getAttribute('aria-hidden'), 'false');
  assert.equal(harness.body.classList.contains('modal-open'), true);
  assert.equal(harness.body.dataset.modalScrollTop, '480');
  assert.equal(harness.button.getAttribute('aria-expanded'), 'true');
});

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
  assert.match(runtime, /button\.setAttribute\("href", `#\$\{DIALOG_ID\}`\)/);
  assert.match(runtime, /button\.removeAttribute\("target"\)/);
  assert.match(runtime, /button\.removeAttribute\("rel"\)/);
  assert.match(runtime, /MutationObserver/);
});

test('manual runtime uses native top-layer dialog instead of the document modal', () => {
  assert.match(runtime, /document\.createElement\("dialog"\)/);
  assert.match(runtime, /dialog\.showModal\(\)/);
  assert.match(runtime, /dialog\.addEventListener\("close"/);
  assert.match(runtime, /stopImmediatePropagation/);
  assert.doesNotMatch(runtime, /window\.scrollTo/);
});

test('manual runtime never exposes an external-tab fallback', () => {
  assert.doesNotMatch(runtime, /Open manual in new tab/i);
  assert.doesNotMatch(runtime, /target="_blank"/i);
  assert.doesNotMatch(runtime, /noopener noreferrer/i);
  assert.doesNotMatch(runtime, /data-ccg-manual-open-external/i);
});

test('manual viewer CSS uses the browser top layer and disables the legacy document modal', () => {
  assert.match(css, /#manualModal\.ccg-modal--doc\s*\{\s*display: none !important;/);
  assert.match(css, /\.ccg-manual-dialog\s*\{[\s\S]*position: fixed;/);
  assert.match(css, /\.ccg-manual-dialog::backdrop/);
  assert.match(css, /height: 100dvh;/);
  assert.match(css, /\.ccg-manual-dialog__frame[\s\S]*flex: 1 1 auto;/);
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
    this.src = '';
    this.textContent = '';
    this.type = '';
    this.open = false;
    this.showModalCalls = 0;
    this.closeCalls = 0;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === 'id') this.id = String(value);
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
    if (name === 'src') this.src = '';
  }

  addEventListener(name, handler) {
    this.listeners.set(name, handler);
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  querySelector(selector) {
    const attrMatch = selector.match(/^\[([^\]]+)\]$/);
    if (attrMatch && this.hasAttribute(attrMatch[1])) return this;

    if (selector.startsWith('.') && this.className.split(/\s+/).includes(selector.slice(1))) {
      return this;
    }

    for (const child of this.children) {
      const match = child.querySelector(selector);
      if (match) return match;
    }
    return null;
  }

  closest(selector) {
    return selector === `#${this.id}` ? this : null;
  }

  focus() {}

  showModal() {
    this.open = true;
    this.showModalCalls += 1;
    this.setAttribute('open', '');
  }

  close() {
    if (!this.open) return;
    this.open = false;
    this.closeCalls += 1;
    this.removeAttribute('open');
    const handler = this.listeners.get('close');
    if (handler) handler({ target: this });
  }
}

function createManualRuntimeHarness() {
  const documentListeners = new Map();
  const windowListeners = new Map();
  const elements = new Map();
  const scrollToCalls = [];

  const documentElement = new FakeElement('html', 'html');
  documentElement.scrollTop = 0;

  const body = new FakeElement('body', 'body');
  const button = new FakeElement('a', 'gameManualBtn');
  button.setAttribute('href', '#');
  body.appendChild(button);

  const legacyModal = new FakeElement('div', 'manualModal');
  legacyModal.classList.add('ccg-modal--doc');
  legacyModal.setAttribute('aria-hidden', 'true');
  const legacyFrame = new FakeElement('iframe', 'gameManualEmbed');
  legacyModal.appendChild(legacyFrame);
  body.appendChild(legacyModal);

  [button, legacyModal, legacyFrame].forEach((element) => elements.set(element.id, element));

  class FakeMutationObserver {
    constructor(callback) {
      this.callback = callback;
    }
    observe() {}
  }

  const document = {
    readyState: 'complete',
    body,
    documentElement,
    getElementById(id) {
      if (elements.has(id)) return elements.get(id);
      const walk = (node) => {
        if (node.id === id) return node;
        for (const child of node.children) {
          const match = walk(child);
          if (match) return match;
        }
        return null;
      };
      return walk(body);
    },
    querySelector(selector) {
      return body.querySelector(selector);
    },
    createElement(tagName) {
      return new FakeElement(tagName);
    },
    addEventListener(name, handler) {
      documentListeners.set(name, handler);
    },
  };

  const window = {
    scrollY: 3180,
    addEventListener(name, handler) {
      windowListeners.set(name, handler);
    },
    scrollTo(...args) {
      scrollToCalls.push(args);
    },
  };

  const context = {
    window,
    document,
    Element: FakeElement,
    MutationObserver: FakeMutationObserver,
    requestAnimationFrame: (callback) => callback(),
    console,
  };

  vm.runInNewContext(runtime, context, { filename: 'ccg-manual-viewer-polish.js' });

  return {
    body,
    button,
    legacyModal,
    legacyFrame,
    document,
    documentElement,
    documentListeners,
    window,
    windowListeners,
    scrollToCalls,
  };
}

test('hydrated manual opens in native top layer while the page is deeply scrolled', () => {
  const harness = createManualRuntimeHarness();
  const rawDriveUrl = 'https://drive.google.com/file/d/abc123xyz/view?usp=drive_link';
  const previewUrl = 'https://drive.google.com/file/d/abc123xyz/preview';

  const gameLoaded = harness.windowListeners.get('ccg:game-loaded');
  assert.equal(typeof gameLoaded, 'function');
  gameLoaded({ detail: { game: { manual: rawDriveUrl } } });

  assert.equal(harness.button.getAttribute('href'), '#ccgManualDialog');
  assert.equal(harness.button.hasAttribute('target'), false);
  assert.equal(harness.button.hasAttribute('rel'), false);
  assert.equal(harness.button.dataset.manualUrl, undefined);

  let prevented = false;
  let stopped = false;
  let stoppedImmediate = false;
  const clickHandler = harness.documentListeners.get('click');
  assert.equal(typeof clickHandler, 'function');

  clickHandler({
    target: harness.button,
    preventDefault() { prevented = true; },
    stopPropagation() { stopped = true; },
    stopImmediatePropagation() { stoppedImmediate = true; },
  });

  const dialog = harness.document.querySelector('[data-ccg-manual-dialog]');
  const frame = dialog?.querySelector('[data-ccg-manual-frame]');

  assert.equal(prevented, true);
  assert.equal(stopped, true);
  assert.equal(stoppedImmediate, true);
  assert.ok(dialog);
  assert.equal(dialog.tagName, 'DIALOG');
  assert.equal(dialog.parentElement, harness.body);
  assert.equal(dialog.open, true);
  assert.equal(dialog.showModalCalls, 1);
  assert.equal(frame.src, previewUrl);
  assert.equal(harness.legacyModal.classList.contains('open'), false);
  assert.equal(harness.legacyModal.getAttribute('aria-hidden'), 'true');
  assert.equal(harness.button.getAttribute('aria-expanded'), 'true');
  assert.equal(harness.documentElement.style.overflow, 'hidden');
  assert.equal(harness.body.style.overflow, 'hidden');
  assert.equal(harness.window.scrollY, 3180);
  assert.equal(harness.scrollToCalls.length, 0);
});

test('closing the native manual dialog restores page scrolling without changing page position', () => {
  const harness = createManualRuntimeHarness();
  const gameLoaded = harness.windowListeners.get('ccg:game-loaded');
  gameLoaded({
    detail: {
      game: {
        manual: 'https://drive.google.com/file/d/abc123xyz/view?usp=drive_link',
      },
    },
  });

  const clickHandler = harness.documentListeners.get('click');
  clickHandler({
    target: harness.button,
    preventDefault() {},
    stopPropagation() {},
    stopImmediatePropagation() {},
  });

  const dialog = harness.document.querySelector('[data-ccg-manual-dialog]');
  assert.equal(dialog.open, true);
  dialog.close();

  assert.equal(dialog.open, false);
  assert.equal(harness.documentElement.style.overflow, undefined);
  assert.equal(harness.body.style.overflow, undefined);
  assert.equal(harness.window.scrollY, 3180);
  assert.equal(harness.scrollToCalls.length, 0);
  assert.equal(harness.button.getAttribute('aria-expanded'), 'false');
});

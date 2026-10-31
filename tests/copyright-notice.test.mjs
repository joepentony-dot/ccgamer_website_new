import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = readFileSync(path.join(root, 'js/ccg-copyright-notice.js'), 'utf8');
const bootstrap = readFileSync(path.join(root, 'js/analytics.js'), 'utf8');
const styles = readFileSync(path.join(root, 'resources/css/ccg-copyright-notice.css'), 'utf8');

function target(type, options = {}) {
  return {
    closest(selector) {
      if (selector === 'img, picture, [data-ccg-protected-content]') {
        return type === 'image' || type === 'protected-text' ? {} : null;
      }
      if (selector === 'img') return type === 'image' ? {} : null;
      if (selector.startsWith('a, ')) return options.link ? {} : null;
      if (selector.startsWith('input, textarea')) {
        const selectors = selector.split(',').map((entry) => entry.trim());
        return options.interactive || (options.link && selectors.includes('a')) ? {} : null;
      }
      if (selector.startsWith('[data-ccg-allow-contextmenu]')) return options.excluded ? {} : null;
      return null;
    }
  };
}

function run(pathname = '/home.html', page = 'home') {
  const handlers = new Map();
  const appended = [];
  const timers = [];
  const cleared = new Set();
  const window = {
    location: { pathname },
    setTimeout: (fn, delay) => {
      const id = timers.length + 1;
      timers.push({ id, fn, delay });
      return id;
    },
    clearTimeout: (id) => { cleared.add(id); }
  };
  const document = {
    activeElement: null,
    documentElement: { getAttribute: () => page },
    body: { appendChild: (node) => appended.push(node) },
    addEventListener: (name, fn) => handlers.set(name, fn),
    createElement: (tag) => ({
      tag,
      children: [],
      listeners: new Map(),
      appendChild(child) { this.children.push(child); },
      contains(node) {
        if (!node) return false;
        return this === node || this.children.some((child) => child === node || child.contains?.(node));
      },
      setAttribute() {},
      addEventListener(name, fn) { this.listeners.set(name, fn); },
      remove() { this.removed = true; }
    })
  };
  vm.runInNewContext(script, { window, document });
  return { handlers, appended, window, timers, cleared, document };
}

function dispatch(handlers, name, item) {
  let prevented = false;
  const handler = handlers.get(name);
  assert.equal(typeof handler, 'function');
  handler({
    target: item,
    preventDefault: () => { prevented = true; }
  });
  return prevented;
}

test('artwork right-click is intercepted and the rights-aware CCG notice appears', () => {
  const site = run();
  assert.equal(dispatch(site.handlers, 'contextmenu', target('image')), true);
  assert.equal(site.appended.length, 1);
  const toast = site.appended[0];
  assert.equal(toast.className, 'ccg-copyright-toast');
  assert.match(toast.children[0].textContent, /Cheeky Commodore Gamer/);
  assert.match(toast.children[1].textContent, /Third-party artwork/);
  assert.equal(toast.children[2].children[0].href, '/copyright.html');
});

test('ordinary text and interactive areas retain standard browser right-click', () => {
  const site = run();
  assert.equal(dispatch(site.handlers, 'contextmenu', target('text')), false);
  assert.equal(dispatch(site.handlers, 'contextmenu', target('image', { interactive: true })), false);
  assert.equal(dispatch(site.handlers, 'contextmenu', target('image', { excluded: true })), false);
  assert.equal(site.appended.length, 0);
});

test('linked artwork and protected content retain the native browser context menu', () => {
  const site = run();
  assert.equal(dispatch(site.handlers, 'contextmenu', target('image', { link: true })), false);
  assert.equal(dispatch(site.handlers, 'contextmenu', target('protected-text', { link: true })), false);
  assert.equal(dispatch(site.handlers, 'contextmenu', target('image')), true);
  assert.equal(site.appended.length, 1);
});

test('opt-in protected text triggers notice but linked images are still draggable', () => {
  const site = run();
  assert.equal(dispatch(site.handlers, 'contextmenu', target('protected-text')), true);
  assert.equal(dispatch(site.handlers, 'dragstart', target('image', { link: true })), false);
  assert.equal(dispatch(site.handlers, 'dragstart', target('image')), true);
});

test('keyboard focus pauses notice expiry until focus leaves its controls', () => {
  const site = run();
  assert.equal(dispatch(site.handlers, 'contextmenu', target('image')), true);
  const toast = site.appended[0];
  const originalTimer = site.timers.at(-1);
  assert.equal(originalTimer.delay, 4500);
  site.document.activeElement = toast.children[2].children[0];
  toast.listeners.get('focusin')();
  assert.ok(site.cleared.has(originalTimer.id));
  originalTimer.fn(); // Even an already queued callback must not remove focused content.
  assert.equal(toast.removed, undefined);
  site.document.activeElement = null;
  toast.listeners.get('focusout')();
  const settleTimer = site.timers.at(-1);
  assert.equal(settleTimer.delay, 0);
  settleTimer.fn();
  const resumedTimer = site.timers.at(-1);
  assert.equal(resumedTimer.delay, 4500);
  resumedTimer.fn();
  assert.equal(toast.removed, true);
});

test('pointer hover pauses expiry and leaving resumes it', () => {
  const site = run();
  dispatch(site.handlers, 'contextmenu', target('image'));
  const toast = site.appended[0];
  const originalTimer = site.timers.at(-1);
  toast.listeners.get('mouseenter')();
  assert.ok(site.cleared.has(originalTimer.id));
  originalTimer.fn();
  assert.equal(toast.removed, undefined);
  toast.listeners.get('mouseleave')();
  const resumedTimer = site.timers.at(-1);
  assert.equal(resumedTimer.delay, 4500);
  resumedTimer.fn();
  assert.equal(toast.removed, true);
});

test('emulator and arcade, admin and intro surfaces have no listeners', () => {
  for (const [pathname, page] of [
    ['/emulator/c64/', 'emulator'],
    ['/arcade/lost-sizzler/', 'arcade'],
    ['/admin/', 'admin'],
    ['/auth/login.html', 'auth'],
    ['/', 'intro']
  ]) {
    const site = run(pathname, page);
    assert.equal(site.handlers.size, 0, pathname);
  }
});

test('only one set of delegated listeners can load', () => {
  const site = run();
  const savedScript = site.window.ccgCopyrightNoticeLoaded;
  assert.equal(savedScript, true);
  assert.equal(site.handlers.size, 2);
});

test('shared bootstrap preserves separate JS and CSS ownership', () => {
  assert.match(bootstrap, /function loadCopyrightNotice\(\)/);
  assert.match(bootstrap, /\/js\/ccg-copyright-notice\.js/);
  assert.match(bootstrap, /\/resources\/css\/ccg-copyright-notice\.css/);
  assert.match(bootstrap, /function initDomFeatures\(\) \{\s*loadCopyrightNotice\(\)/);
  assert.match(styles, /\.ccg-copyright-toast\s*\{\s*box-sizing: border-box;\s*position: fixed;/);
});

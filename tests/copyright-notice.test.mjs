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
  const window = {
    location: { pathname },
    setTimeout: () => 17,
    clearTimeout: () => {}
  };
  const document = {
    documentElement: { getAttribute: () => page },
    body: { appendChild: (node) => appended.push(node) },
    addEventListener: (name, fn) => handlers.set(name, fn),
    createElement: (tag) => ({
      tag,
      children: [],
      appendChild(child) { this.children.push(child); },
      setAttribute() {},
      addEventListener() {},
      remove() { this.removed = true; }
    })
  };
  vm.runInNewContext(script, { window, document });
  return { handlers, appended, window };
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

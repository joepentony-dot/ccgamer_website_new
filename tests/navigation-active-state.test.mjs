import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = fs.readFileSync(new URL('../js/ccg-nav-core.js', import.meta.url), 'utf8');

function createLink(href) {
  const classes = new Set(['ccg-nav__link']);
  const attributes = new Map([['href', href]]);
  return {
    classList: {
      toggle(name, enabled) {
        if (enabled) classes.add(name);
        else classes.delete(name);
      },
      contains(name) {
        return classes.has(name);
      }
    },
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
    isActive() {
      return classes.has('ccg-nav__link--active');
    },
    ariaCurrent() {
      return attributes.get('aria-current') ?? null;
    }
  };
}

function runActiveState(pathname) {
  const hrefs = [
    '/home.html',
    '/games/',
    '/games/genres/',
    '/games/publishers/',
    '/games/collections/',
    '/music/',
    '/games/ccg-games/',
    '/games/discover/',
    '/zzap64/',
    '/quiz/quiz.html',
    '/emulation.html',
    '/install-app.html',
    '/about.html',
    '/contact.html'
  ];
  const links = hrefs.map(createLink);
  const header = { querySelectorAll: () => links };
  const window = {
    location: { href: `https://www.cheekycommodoregamer.co.uk${pathname}` }
  };
  const document = {
    readyState: 'complete',
    querySelector: () => null,
    addEventListener: () => {}
  };

  vm.runInNewContext(source, { window, document, URL });
  window.CCGUnifiedNavCore.markActive(header);

  return hrefs.filter((_href, index) => links[index].isActive()).map((href) => ({
    href,
    ariaCurrent: links[hrefs.indexOf(href)].ariaCurrent()
  }));
}

function assertOnlyActive(pathname, expectedHref) {
  const active = runActiveState(pathname);
  assert.deepEqual(active, [{ href: expectedHref, ariaCurrent: 'page' }]);
}

test('Games landing, CCG Games and Find Me a Game never highlight as one shared group', () => {
  assertOnlyActive('/games/', '/games/');
  assertOnlyActive('/games/ccg-games/', '/games/ccg-games/');
  assertOnlyActive('/games/discover/', '/games/discover/');
});

test('ordinary game details fall back to Browse Games', () => {
  assertOnlyActive('/games/dan-dare-pilot-of-the-future/', '/games/');
});

test('specific Games sections outrank the generic Games fallback', () => {
  assertOnlyActive('/games/genres/shoot-em-up/', '/games/genres/');
  assertOnlyActive('/games/publishers/ocean-software/', '/games/publishers/');
  assertOnlyActive('/games/collections/retro-specials.html', '/games/collections/');
});

test('other site sections retain a single current navigation owner', () => {
  assertOnlyActive('/music/composers/rob-hubbard/', '/music/');
  assertOnlyActive('/zzap64/awards/1986/', '/zzap64/');
  assertOnlyActive('/quiz/quiz.html', '/quiz/quiz.html');
  assertOnlyActive('/about.html', '/about.html');
  assertOnlyActive('/contact.html', '/contact.html');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const template = read('admin/templates/retro-video-template.html');
const runtime = read('js/ccg-visitor-metrics.js');
const css = read('resources/css/retro-video-pages.css');
const generator = read('scripts/generate-retro-pages.js');
const collector = read('scripts/ensure-goatcounter-coverage.js');
const roots = ['retro-specials', 'retro-events', 'amiga-demo-music'];

test('one canonical retro template gives every generated detail page a visible footer counter', () => {
  assert.match(template, /data-ccg-page="retro-video"/);
  assert.match(template, /<footer class="ccg-footer">/);
  assert.match(template, /class="ccg-retro-views"/);
  assert.match(template, /id="ccg-retro-view-count"/);
  assert.match(template, /Feature visits/);
  assert.match(template, /data-goatcounter="https:\/\/cheekycommodoregamer\.goatcounter\.com\/count"/);
  assert.match(template, /src="https:\/\/gc\.zgo\.at\/count\.js"/);
  assert.equal((template.match(/data-goatcounter=/g) || []).length, 1);
  assert.match(generator, /readTemplate\(retroVideoTemplatePath\)/);
  assert.match(css, /html\[data-ccg-page="retro-video"\] \.ccg-footer \.ccg-retro-views/);
  assert.match(collector, /if \(related\.length === 1\) return \{ html, status: "present" \}/);
});

function simulate(route, canonical = route, pageType = 'retro-video', initialCounter = true) {
  const calls = [];
  const nodes = [];
  const origin = 'https://www.cheekycommodoregamer.co.uk';
  function el(tag) {
    return {
      tag, children: [], attrs: {}, textContent: '', id: null, className: '',
      setAttribute(key, value) { this.attrs[key] = value; },
      getAttribute(key) { return this.attrs[key] ?? null; },
      appendChild(child) { this.children.push(child); nodes.push(child); },
    };
  }
  const count = initialCounter ? el('span') : null;
  if (count) count.id = 'ccg-retro-view-count';
  const footer = el('footer');
  const inner = el('div');
  footer.querySelector = (selector) => selector === '.ccg-footer__inner' ? inner : null;
  const doc = {
    readyState: 'complete',
    documentElement: { getAttribute: (name) => name === 'data-ccg-page' ? pageType : null },
    getElementById: (name) => name === 'ccg-retro-view-count' ? count : null,
    querySelector(selector) {
      if (selector === 'link[rel="canonical"][href]') return { href: origin + canonical };
      if (selector === '.ccg-footer') return footer;
      if (selector === 'script[data-goatcounter]') return {};
      return null;
    },
    createElement: el,
  };
  const location = { origin };
  const window = {
    location: { pathname: route },
    fetch(url) {
      calls.push(url);
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({count: '1,234'}) });
    },
    setInterval() { return 1; },
    clearInterval() {},
    localStorage: { getItem() { return null; }, setItem() {} },
  };
  vm.runInNewContext(runtime, { window, document: doc, URL, location });
  return { calls, count, inner, footer, nodes };
}

test('each of the three canonical collection detail pages requests only its own GoatCounter total', async () => {
  for (const root of roots) {
    const path = '/' + root + '/sample-feature/';
    const result = simulate(path);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(result.calls.length, 1, root);
    assert.equal(result.calls[0],
      'https://cheekycommodoregamer.goatcounter.com/counter/' + encodeURIComponent(path.slice(0, -1)) + '.json');
    assert.equal(result.count.textContent, '1,234');
    assert.equal(result.count.attrs['data-ccg-counter-loaded'], 'true');
    assert.equal(result.inner.children.length, 0, 'no duplicate with template counter');
  }
});

test('older collection pages receive one footer counter when the static markup is missing', async () => {
  const result = simulate('/retro-specials/older-feature/', '/retro-specials/older-feature/', 'retro-video', false);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(result.inner.children.length, 1);
  const badge = result.inner.children[0];
  assert.equal(badge.className, 'ccg-retro-views');
  assert.equal(badge.children.length, 2);
  assert.equal(badge.children[1].textContent, '1,234');
  assert.equal(result.calls.length, 1);
});

test('rejects canonical mismatches, unrelated URLs and game pages', () => {
  const cases = [
    ['/retro-specials/old-feature/', '/retro-specials/new-feature/', 'retro-video'],
    ['/retro-specials/old-feature.html', '/retro-specials/old-feature/', 'retro-video'],
    ['/games/chuckie-egg/', '/games/chuckie-egg/', 'retro-video'],
    ['/retro-events/feature/', '/retro-events/feature/', 'single-game'],
  ];
  for (const [route, canonical, pageType] of cases) {
    assert.equal(simulate(route, canonical, pageType).calls.length, 0, route);
  }
});

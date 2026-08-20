import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const script = fs.readFileSync('admin/js/seo-opportunity-managed-routes.js', 'utf8');
const css = fs.readFileSync('resources/css/ccg-seo-opportunity-centre.css', 'utf8');

test('SEO work queue exposes a real resolution action column', () => {
  assert.match(script, /th\.textContent = "Resolve"/);
  assert.match(script, /const label = resolutionState\.loaded \? "Resolve" : "Loading…"/);
  assert.match(script, /Resolve SEO opportunity/);
  assert.match(script, /Mark fixed &amp; monitor/);
  assert.match(script, /Dismiss \/ intentional/);
});

test('resolution decisions persist only in the existing admin-only activity log', () => {
  assert.match(script, /EVENT_TYPE = "seo_opportunity_resolution"/);
  assert.match(script, /\.from\("admin_activity_log"\)/);
  assert.match(script, /event_type: EVENT_TYPE/);
  assert.match(script, /actor_user_id: resolutionState\.userId/);
  assert.doesNotMatch(script, /googleAccessToken|refresh_token|client_secret|private_key/);
  assert.doesNotMatch(script, /localStorage|sessionStorage|indexedDB/);
});

test('fixed items enter monitoring and automatically resolve or reopen', () => {
  assert.match(script, /MONITOR_DAYS = 7/);
  assert.match(script, /status === "monitoring"/);
  assert.match(script, /Monitoring period ended and Search Console still reports the issue/);
  assert.match(script, /Monitoring period ended and the Search Console work-queue signal is no longer present/);
  assert.match(script, /Previously resolved Search Console signal has returned/);
  assert.match(script, /autoTransition\(item, "open"/);
  assert.match(script, /autoTransition\(fromSaved\(saved\), "resolved"/);
});

test('resolution monitor allows manual reopening and keeps intentional legacy routes diagnostic only', () => {
  assert.match(script, /SEO Resolution Monitor/);
  assert.match(script, />Reopen<\/button>/);
  assert.match(script, /reconcileWorkQueue/);
  assert.match(script, /Managed noindex,follow game handler/);
  assert.match(script, /Managed noindex,follow composer handler/);
  assert.match(script, /Monitor Google retirement/);
});

test('resolution observer cannot recursively watch its own table decorations', () => {
  assert.match(script, /let reconcileQueued = false/);
  assert.match(script, /let reconciling = false/);
  assert.match(script, /if \(reconciling\) return/);
  assert.match(script, /if \(reconcileQueued\) return/);
  assert.match(script, /queueMicrotask\(\(\) =>/);
  assert.match(script, /new MutationObserver\(\(\) => scheduleReconcile\(\)\)\.observe\(host, \{ childList: true \}\)/);
  assert.doesNotMatch(script, /observe\(host, \{ childList: true, subtree: true \}\)/);
  assert.match(script, /if \(button\.textContent !== label\) button\.textContent = label/);
  assert.match(script, /if \(button\.disabled !== disabled\) button\.disabled = disabled/);
});

test('observer bursts coalesce to one reconciliation task at runtime', async () => {
  const observers = [];
  const queued = [];
  const host = {
    querySelector: () => null,
    querySelectorAll: () => [],
  };

  const document = {
    readyState: 'complete',
    querySelector(selector) {
      if (selector === '[data-seo-table="workQueue"]') return host;
      if (selector === '[data-seo-table="legacy"]') return host;
      return null;
    },
    querySelectorAll: () => [],
    addEventListener: () => {},
  };

  class FakeMutationObserver {
    constructor(callback) {
      this.callback = callback;
      observers.push(this);
    }

    observe(target, options) {
      this.target = target;
      this.options = options;
    }
  }

  const chain = {
    select() { return this; },
    eq() { return this; },
    order() { return this; },
    async limit() { return { data: [], error: null }; },
  };
  const supabase = {
    auth: { async getUser() { return { data: { user: { id: 'admin-test' } }, error: null }; } },
    from() { return chain; },
  };

  vm.runInNewContext(script, {
    window: {
      location: { origin: 'https://www.cheekycommodoregamer.co.uk' },
      ccgSupabase: { async getClient() { return supabase; } },
    },
    document,
    MutationObserver: FakeMutationObserver,
    queueMicrotask(callback) { queued.push(callback); },
    setTimeout,
    URL,
    Date,
    Blob,
    navigator: { clipboard: { async writeText() {} } },
    console,
  });

  assert.equal(observers.length, 2);
  for (const observer of observers) {
    assert.equal(observer.options?.childList, true);
    assert.equal(observer.options?.subtree, undefined);
  }

  for (let index = 0; index < 100; index += 1) observers[0].callback([]);
  assert.equal(queued.length, 1, 'a mutation burst should queue one reconciliation');

  queued.shift()();
  for (let index = 0; index < 100; index += 1) observers[0].callback([]);
  assert.equal(queued.length, 1, 'a later mutation burst should queue one new reconciliation');

  await new Promise((resolve) => setImmediate(resolve));
});

test('resolution presentation lives in the stylesheet rather than runtime style injection', () => {
  assert.doesNotMatch(script, /createElement\(["']style["']\)/);
  assert.doesNotMatch(script, /seo-resolution-style/);
  assert.match(css, /\.seo-resolution-message\s*\{/);
  assert.match(css, /\.seo-resolution-dialog\s*\{/);
  assert.match(css, /\.seo-resolution-actions/);
});

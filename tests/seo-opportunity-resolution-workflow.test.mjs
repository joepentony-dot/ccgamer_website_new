import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const script = fs.readFileSync('admin/js/seo-opportunity-managed-routes.js', 'utf8');

test('SEO work queue exposes a real resolution action column', () => {
  assert.match(script, /th\.textContent = "Resolve"/);
  assert.match(script, /button\.textContent = resolutionState\.loaded \? "Resolve" : "Loading…"/);
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

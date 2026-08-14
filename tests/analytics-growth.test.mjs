import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const page = fs.readFileSync('admin/analytics-growth.html', 'utf8');
const script = fs.readFileSync('admin/js/analytics-growth.js', 'utf8');
const register = fs.readFileSync('auth/register.html', 'utf8');
const nav = fs.readFileSync('admin/js/admin-nav.js', 'utf8');
const dashboard = fs.readFileSync('admin/dashboard.html', 'utf8');

test('analytics growth dashboard is private and linked from admin navigation', () => {
  assert.match(page, /noindex,nofollow/);
  assert.match(page, /Website ↔ YouTube/);
  assert.match(page, /Recently discovered by Google/);
  assert.match(nav, /href="\/admin\/analytics-growth\.html"[^>]*>Analytics &amp; Growth</);
  assert.match(dashboard, /href="\/admin\/analytics-growth\.html"[^>]*>Analytics &amp; Growth</);
});

test('dashboard uses existing read-only Google OAuth configuration and current APIs', () => {
  assert.match(script, /webmasters\.readonly/);
  assert.match(script, /analytics\.readonly/);
  assert.match(script, /analyticsadmin\.googleapis\.com\/v1beta\/accountSummaries/);
  assert.match(script, /analyticsdata\.googleapis\.com\/v1beta/);
  assert.match(script, /search-console-opportunities/);
  assert.doesNotMatch(script, /localStorage\.setItem\([^)]*google/i);
});

test('member totals page safely beyond the existing 500-row RPC limit', () => {
  assert.match(script, /MEMBER_PAGE_SIZE = 500/);
  assert.match(script, /admin_list_members/);
  assert.match(script, /p_offset: offset/);
  assert.match(script, /offset \+= MEMBER_PAGE_SIZE/);
});

test('newly discovered pages require current impressions and no preceding impressions', () => {
  assert.match(script, /row\.current\.impressions > 0 && row\.previous\.impressions === 0/);
  assert.match(script, /\['query', 'page'\]/);
});

test('GA4 report covers games, acquisition, audience and YouTube crossover', () => {
  assert.match(script, /sessionSource/);
  assert.match(script, /sessionMedium/);
  assert.match(script, /newVsReturning/);
  assert.match(script, /pagePath/);
  assert.match(script, /linkDomain/);
  assert.match(script, /exactFilter\('eventName', 'click'\)/);
  assert.match(script, /isGameDetailPath/);
  assert.match(script, /isYouTubeLink/);
});

test('successful consented registrations emit the standard GA4 sign_up event', () => {
  assert.match(register, /ccgConsentState\?\.analytics/);
  assert.match(register, /gtag\('event', 'sign_up', \{ method: 'email' \}\)/);
  assert.match(register, /trackSuccessfulRegistration\(\)/);
});

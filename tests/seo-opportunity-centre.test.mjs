import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const page = fs.readFileSync('admin/seo-opportunity-centre.html', 'utf8');
const controller = fs.readFileSync('admin/js/seo-opportunity-centre.js', 'utf8');
const edge = fs.readFileSync('supabase/functions/search-console-opportunities/index.ts', 'utf8');
const nav = fs.readFileSync('admin/js/admin-nav.js', 'utf8');

test('SEO Opportunity Centre is private and administrator-gated', () => {
  assert.match(page, /noindex,nofollow/);
  assert.match(page, /data-admin-shell/);
  assert.match(controller, /ensureRole\(\['admin', 'superadmin'\]\)/);
  assert.match(controller, /search-console-opportunities/);
  assert.match(nav, /seo-opportunity-centre\.html/);
});

test('Search Console secrets remain server-side', () => {
  assert.doesNotMatch(page, /GSC_SERVICE_ACCOUNT_JSON|private_key|webmasters\.readonly/);
  assert.doesNotMatch(controller, /GSC_SERVICE_ACCOUNT_JSON|private_key|oauth2\.googleapis\.com/);
  assert.match(edge, /GSC_SERVICE_ACCOUNT_JSON/);
  assert.match(edge, /GSC_SITE_URL/);
  assert.match(edge, /https:\/\/www\.googleapis\.com\/auth\/webmasters\.readonly/);
  assert.match(edge, /RSASSA-PKCS1-v1_5/);
});

test('Search Console report is read-only and not persisted in browser storage', () => {
  assert.doesNotMatch(controller, /localStorage|sessionStorage|indexedDB/);
  assert.doesNotMatch(edge, /\.insert\(|\.update\(|\.delete\(/);
  assert.match(edge, /searchAnalytics\/query/);
  assert.match(edge, /dimensions: \["query", "page"\]/);
  assert.match(edge, /dimensions: \["page"\]/);
});

test('Edge Function independently verifies origin, session and administrator role', () => {
  assert.match(edge, /ALLOWED_ORIGIN = "https:\/\/www\.cheekycommodoregamer\.co\.uk"/);
  assert.match(edge, /Origin not allowed/);
  assert.match(edge, /\/auth\/v1\/user/);
  assert.match(edge, /\["admin", "superadmin"\]\.includes\(role\)/);
  assert.match(edge, /Cache-Control": "no-store"/);
});

test('opportunity thresholds avoid low-signal query noise', () => {
  assert.match(edge, /impressions >= 20/);
  assert.match(edge, /position >= 4 && row\.position <= 20/);
  assert.match(edge, /impressions >= 50 && row\.position <= 10/);
  assert.match(edge, /MAX_QUERY_ROWS = 5000/);
});

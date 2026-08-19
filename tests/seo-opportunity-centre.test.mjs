import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const page = fs.readFileSync('admin/seo-opportunity-centre.html', 'utf8');
const controller = fs.readFileSync('admin/js/seo-opportunity-centre.js', 'utf8');
const managedRoutes = fs.readFileSync('admin/js/seo-opportunity-managed-routes.js', 'utf8');
const edge = fs.readFileSync('supabase/functions/search-console-opportunities/index.ts', 'utf8');
const nav = fs.readFileSync('admin/js/admin-nav.js', 'utf8');

test('SEO Opportunity Centre is private and administrator-gated', () => {
  assert.match(page, /noindex,nofollow/);
  assert.match(page, /data-admin-shell/);
  assert.match(controller, /ensureRole\(\['admin', 'superadmin'\]\)/);
  assert.match(controller, /search-console-opportunities/);
  assert.match(nav, /seo-opportunity-centre\.html/);
});

test('Search Console uses keyless Google Identity Services authorization', () => {
  assert.match(controller, /https:\/\/accounts\.google\.com\/gsi\/client/);
  assert.match(controller, /initTokenClient/);
  assert.match(controller, /requestAccessToken/);
  assert.match(controller, /https:\/\/www\.googleapis\.com\/auth\/webmasters\.readonly/);
  assert.match(edge, /GSC_OAUTH_CLIENT_ID/);
  assert.match(edge, /GSC_SITE_URL/);
  assert.match(edge, /tokenStorage: "browser-memory-only"/);
  assert.doesNotMatch(edge, /GSC_SERVICE_ACCOUNT_JSON|private_key|RSASSA-PKCS1-v1_5|oauth2\.googleapis\.com\/token/);
  assert.doesNotMatch(controller, /client_secret|refresh_token|GSC_SERVICE_ACCOUNT_JSON|private_key/);
});

test('Search Console report is read-only and not persisted in browser storage', () => {
  assert.doesNotMatch(controller, /localStorage|sessionStorage|indexedDB/);
  assert.doesNotMatch(edge, /\.insert\(|\.update\(|\.delete\(/);
  assert.match(controller, /searchAnalytics\/query/);
  assert.match(controller, /dimensions: \['query', 'page'\]/);
  assert.match(controller, /dimensions: \['page'\]/);
  assert.match(controller, /cache: 'no-store'/);
});

test('Google access token stays transient in administrator browser memory', () => {
  assert.match(controller, /googleAccessToken: ''/);
  assert.match(controller, /googleTokenExpiresAt: 0/);
  assert.match(controller, /Authorization.*Bearer/);
  assert.match(controller, /clearGoogleToken/);
  assert.doesNotMatch(edge, /googleAccessToken|access_token|Authorization: `Bearer/);
});

test('Edge Function independently verifies origin, session and administrator role before returning OAuth configuration', () => {
  assert.match(edge, /ALLOWED_ORIGIN = "https:\/\/www\.cheekycommodoregamer\.co\.uk"/);
  assert.match(edge, /Origin not allowed/);
  assert.match(edge, /\/auth\/v1\/user/);
  assert.match(edge, /\["admin", "superadmin"\]\.includes\(role\)/);
  assert.match(edge, /Cache-Control": "no-store"/);
  assert.match(edge, /action !== "config"/);
});

test('opportunity thresholds avoid low-signal query noise', () => {
  assert.match(controller, /impressions >= 20/);
  assert.match(controller, /position >= 4 && row\.position <= 20/);
  assert.match(controller, /impressions >= 50 && row\.position <= 10/);
  assert.match(controller, /MAX_QUERY_ROWS = 5000/);
});

test('dashboard builds a prioritised work queue with estimated click opportunity', () => {
  assert.match(page, /SEO Work Queue/);
  assert.match(controller, /buildWorkQueue/);
  assert.match(controller, /priorityScore/);
  assert.match(controller, /recommendedAction/);
  assert.match(controller, /potentialClicks/);
  assert.match(controller, /Est\. extra clicks/);
});

test('ranking and CTR opportunities are grouped by page', () => {
  assert.match(controller, /function groupQueryRows/);
  assert.match(controller, /renderQueryGroupTable\('ranking'/);
  assert.match(controller, /renderQueryGroupTable\('ctr'/);
  assert.match(page, /grouped by page/);
});

test('mixed trend signals are separated from growth and decline', () => {
  assert.match(page, /data-seo-section="mixed"/);
  assert.match(controller, /hasPositiveTrend/);
  assert.match(controller, /hasNegativeTrend/);
  assert.match(controller, /hasNegativeTrend\(row\) && !hasPositiveTrend\(row\)/);
  assert.match(controller, /hasPositiveTrend\(row\) && !hasNegativeTrend\(row\)/);
});

test('legacy route detection remains conservative and diagnostic only', () => {
  assert.match(page, /Managed legacy URLs still appearing in Google/);
  assert.match(controller, /\/games\\\/game\\\.html/);
  assert.match(controller, /\/music\\\/composer\\\.html/);
  assert.match(controller, /Do not remove the old URL blindly/);
  assert.doesNotMatch(controller, /location\.replace|location\.assign|fetch\([^\n]+method:\s*['"](?:PUT|PATCH|DELETE)/i);
});

test('intentional noindex compatibility routes stay out of the actionable work queue', () => {
  assert.match(page, /Intentional noindex legacy compatibility routes are kept out of this actionable queue/);
  assert.match(page, /noindex,follow/);
  assert.match(page, /seo-opportunity-managed-routes\.js/);
  assert.match(managedRoutes, /\["\/games\/game\.html", "Managed noindex,follow game handler"\]/);
  assert.match(managedRoutes, /\["\/music\/composer\.html", "Managed noindex,follow composer handler"\]/);
  assert.match(managedRoutes, /reconcileWorkQueue/);
  assert.match(managedRoutes, /row\.remove\(\)/);
  assert.match(managedRoutes, /Monitor Google retirement/);
  assert.match(managedRoutes, /Search Console impressions are not an SEO fault by themselves/);
});

test('visible CSV export uses the reconciled tables rather than hidden pre-reconciliation data', () => {
  assert.match(page, /Export visible report CSV/);
  assert.match(managedRoutes, /function visibleReportRows/);
  assert.match(managedRoutes, /document\.querySelectorAll\("\[data-seo-section\]"\)/);
  assert.match(managedRoutes, /if \(section\.hidden\) return/);
  assert.match(managedRoutes, /function exportVisibleReport/);
  assert.match(managedRoutes, /reconcile\(\)/);
  assert.match(managedRoutes, /ccg-seo-visible-report-/);
  assert.match(managedRoutes, /stopImmediatePropagation\(\)/);
});

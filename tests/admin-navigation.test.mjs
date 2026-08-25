import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const nav = fs.readFileSync('admin/js/admin-nav.js', 'utf8');
const dashboard = fs.readFileSync('admin/dashboard.html', 'utf8');
const dashboardJs = fs.readFileSync('admin/js/dashboard.js', 'utf8');
const help = fs.readFileSync('admin/help.html', 'utf8');
const legacyLanding = fs.readFileSync('admin/admin.html', 'utf8');
const css = fs.readFileSync('resources/css/ccg-admin.css', 'utf8');

test('shared admin navigation keeps Content Publisher prominent and groups all tools by purpose', () => {
  assert.match(nav, /href:\s*"\/admin\/content-publisher\.html"[\s\S]*label:\s*"Content Publisher"/);
  assert.match(nav, /adminGroup\("Core",\s*"core"/);
  assert.match(nav, /adminGroup\("Members",\s*"members"/);
  assert.match(nav, /adminGroup\("Lost Sizzler",\s*"lost-sizzler"/);
  assert.match(nav, /adminGroup\("Site & Growth",\s*"site-growth"/);
  assert.match(nav, /adminGroup\("Maintenance",\s*"maintenance"/);
  assert.match(nav, /href:\s*"\/admin\/arcade-assets\.html"[\s\S]*label:\s*"Arcade Asset Manager"/);
  assert.match(nav, /href:\s*"\/admin\/lost-sizzler-voices\.html"[\s\S]*label:\s*"Voice Overrides"/);
  assert.match(nav, /href:\s*"\/admin\/lost-sizzler-feedback\.html"[\s\S]*label:\s*"Bug Reports"/);
  assert.match(nav, /href:\s*"\/admin\/lost-sizzler-ratings\.html"[\s\S]*label:\s*"Game Ratings"/);
  assert.match(nav, /href:\s*"\/admin\/analytics-growth\.html"[\s\S]*label:\s*"Analytics &amp; Growth"/);
  assert.match(nav, /href:\s*"\/admin\/seo-opportunity-centre\.html"[\s\S]*label:\s*"SEO Opportunity Centre"/);
  assert.match(nav, /label:\s*"Legacy Game Builder"/);
  assert.doesNotMatch(nav, /games-json-editor\.html/);
  assert.doesNotMatch(nav, /Game Builder Wizard \(Primary\)/);
});

test('shared admin navigation provides separate non-logout exit and logout controls', () => {
  assert.match(nav, /omega-admin-links__session-actions/);
  assert.match(nav, /href="\/home\.html"[^>]*data-nav="exit"[^>]*>Exit Admin<\/a>/);
  assert.match(nav, /omega-admin-links__exit/);
  assert.match(nav, /data-admin-logout>Logout<\/button>/);
  assert.match(nav, /window\.location\.href = "\/admin\/login\.html"/);
});

test('dashboard follows the automated publishing workflow', () => {
  assert.match(dashboard, /Open CCG Content Publisher/);
  assert.match(dashboard, /automated repository workflows regenerate/i);
  assert.match(dashboard, /Publishing Status/);
  assert.match(dashboard, /Analytics &amp; Growth/);
  assert.match(dashboard, /SEO Opportunity Centre/);
  assert.match(dashboard, /Legacy Game Builder/);
  assert.doesNotMatch(dashboard, /Game Builder Wizard \(Primary\)/);
  assert.doesNotMatch(dashboard, /Export updated games\.json/);
  assert.doesNotMatch(dashboard, /Legacy Bulk Editor/);
  assert.match(dashboardJs, /video-metadata\.json/);
});

test('help documents the unified source-to-automation flow', () => {
  assert.match(help, /CCG Content Publisher/);
  assert.match(help, /GitHub workflows then regenerate/i);
  assert.match(help, /YOUTUBE_API_KEY/);
  assert.match(help, /Legacy Game Builder/);
  assert.doesNotMatch(help, /Replace repository files manually/);
  assert.doesNotMatch(help, /complete all 7 publish checklist steps/);
});

test('old admin.html landing no longer exposes the outdated editor', () => {
  assert.match(legacyLanding, /noindex,nofollow/);
  assert.match(legacyLanding, /\/admin\/dashboard\.html/);
  assert.match(legacyLanding, /window\.location\.search \+ window\.location\.hash/);
  assert.doesNotMatch(legacyLanding, /games\.json/);
});

test('admin navigation styling separates tool groups and remains responsive', () => {
  assert.match(css, /\.omega-admin-links__group-grid/);
  assert.match(css, /grid-template-columns:\s*repeat\(5,/);
  assert.match(css, /\.omega-admin-links__group-card/);
  assert.match(css, /data-admin-group="lost-sizzler"/);
  assert.match(css, /\.omega-admin-links__session-actions/);
  assert.match(css, /@media \(max-width: 620px\)/);
});

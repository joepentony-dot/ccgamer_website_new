import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const nav = fs.readFileSync('admin/js/admin-nav.js', 'utf8');
const dashboard = fs.readFileSync('admin/dashboard.html', 'utf8');
const dashboardJs = fs.readFileSync('admin/js/dashboard.js', 'utf8');
const help = fs.readFileSync('admin/help.html', 'utf8');
const legacyLanding = fs.readFileSync('admin/admin.html', 'utf8');
const css = fs.readFileSync('resources/css/ccg-admin.css', 'utf8');

test('shared admin navigation makes Content Publisher primary', () => {
  assert.match(nav, /href="\/admin\/content-publisher\.html"[^>]*>Content Publisher</);
  assert.match(nav, /omega-admin-links__group--primary/);
  assert.match(nav, /omega-admin-links__group--tools/);
  assert.match(nav, /href="\/admin\/seo-opportunity-centre\.html"[^>]*>SEO Opportunity Centre</);
  assert.match(nav, />Legacy Game Builder</);
  assert.doesNotMatch(nav, /games-json-editor\.html/);
  assert.doesNotMatch(nav, /Game Builder Wizard \(Primary\)/);
});

test('dashboard follows the automated publishing workflow', () => {
  assert.match(dashboard, /Open CCG Content Publisher/);
  assert.match(dashboard, /automated repository workflows regenerate/i);
  assert.match(dashboard, /Publishing Status/);
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

test('admin navigation styling visually separates diagnostic tools', () => {
  assert.match(css, /\.omega-admin-links__group--tools/);
  assert.match(css, /\.omega-admin-links__label/);
  assert.match(css, /\.omega-admin-links__logout/);
});

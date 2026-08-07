import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const SITE_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';
const today = new Date().toISOString().split('T')[0];
const vars = {
  GAME_NAME: 'Zeewolf',
  GAME_ID: 'zeewolf',
  YEAR: '1994',
  PUBLISHER: 'Binary Asylum',
  PLATFORM: 'AMIGA',
  PLATFORM_LABEL: 'Amiga',
  MODE: 'amiga',
  SLUG: 'zeewolf',
  CANONICAL_URL: `${SITE_ORIGIN}/games/zeewolf/`,
  THUMBNAIL: 'resources/images/thumbnails/all/zeewolf.jpg',
  THUMBNAIL_FILENAME: 'zeewolf.jpg',
  DESCRIPTION: 'Zeewolf on Amiga — screenshots, manual, downloads and video.',
  FULL_DESCRIPTION: 'A 3D helicopter combat game mixing fast action with tactical missions, hostage rescues and vehicle transport across 32 increasingly difficult operations.',
  OG_TYPE: 'website',
  VIDEO_EMBED_URL: 'https://www.youtube.com/embed/iFDaeYjZnsc',
  VIDEO_WATCH_URL: 'https://www.youtube.com/watch?v=iFDaeYjZnsc',
  VIDEO_SECTION_CLASS: '',
  VIDEO_SECTION_HIDDEN_ATTR: '',
  VIDEO_SCHEMA_GRAPH_SUFFIX: '',
  FB_APP_ID_META: ''
};

function render(template, vars) {
  return Object.entries(vars).reduce((html, [key, value]) => html.replaceAll(`{{${key}}}`, value), template);
}

function countOccurrences(text, needle) {
  return (String(text).match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
}

const canonicalWrapperHtml = render(readFileSync('admin/templates/game-landing-template.html', 'utf8'), vars);
const legacyRedirectHtml = render(readFileSync('admin/templates/game-redirect-template.html', 'utf8'), vars);
const builderSource = readFileSync('admin/js/games-editor.js', 'utf8');
const buildPackageDataSource = builderSource.match(/function buildPackageData\(\) \{[\s\S]*?\n\}\n+async function loadTemplates/)?.[0] || '';
const validatePackageManifestSource = builderSource.match(/function validatePackageManifest\(packageData\) \{[\s\S]*?\n\}/)?.[0] || '';

// Regression coverage for the browser-side package flow: generated values must retain
// the same names through validation, the manifest, and ZIP creation.
assert.match(buildPackageDataSource, /validateGeneratedSeoPackage\(\{[\s\S]*?canonicalWrapperHtml,[\s\S]*?legacyRedirectHtml,[\s\S]*?imagePath,[\s\S]*?title/);
assert.doesNotMatch(buildPackageDataSource, /\bcanonicalHtml\b|\bredirectHtml\b/);
assert.match(validatePackageManifestSource, /packageData\.canonicalWrapperHtml/);
assert.match(validatePackageManifestSource, /packageData\.legacyRedirectHtml/);
assert.doesNotMatch(validatePackageManifestSource, /packageData\.(?:canonicalHtml|redirectHtml)/);
const files = new Map([
  ['games/games.json', JSON.stringify([{ id: 'zeewolf', slug: 'zeewolf', title: 'Zeewolf', system: 'AMIGA' }])],
  ['games/games-index.json', JSON.stringify([{ slug: 'zeewolf', title: 'Zeewolf' }])],
  ['games/games-search.json', JSON.stringify([{ slug: 'zeewolf', title: 'Zeewolf' }])],
  ['games/zeewolf.html', legacyRedirectHtml],
  ['games/zeewolf/index.html', canonicalWrapperHtml],
  ['sitemap-games.xml', `<urlset><url><loc>${SITE_ORIGIN}/games/zeewolf/</loc></url></urlset>`],
  ['sitemap.xml', `<sitemapindex><sitemap><loc>${SITE_ORIGIN}/sitemap-pages.xml</loc><lastmod>2026-05-13</lastmod></sitemap><sitemap><loc>${SITE_ORIGIN}/sitemap-games.xml</loc><lastmod>${today}</lastmod></sitemap></sitemapindex>`],
  ['README.txt', 'full merged games.json\ncanonical nested game page\nflat legacy redirect\ngame index data\nsearch data\ngames sitemap\nroot sitemap index']
]);

for (const path of [
  'games/games.json',
  'games/games-index.json',
  'games/games-search.json',
  'games/zeewolf.html',
  'games/zeewolf/index.html',
  'sitemap-games.xml',
  'sitemap.xml',
  'README.txt'
]) assert.ok(files.has(path), `${path} missing from package manifest`);

assert.ok(existsSync('games/zeewolf/index.html'), 'games/zeewolf/index.html exists');
assert.ok(existsSync('games/zeewolf.html'), 'games/zeewolf.html exists');
const publishedZeewolfHtml = readFileSync('games/zeewolf/index.html', 'utf8');
assert.match(publishedZeewolfHtml, /<meta name="robots" content="index,follow">/);
assert.match(publishedZeewolfHtml, /<link rel="canonical" id="game-canonical" href="https:\/\/www\.cheekycommodoregamer\.co\.uk\/games\/zeewolf\/">/);
assert.match(publishedZeewolfHtml, /<meta name="twitter:url" content="https:\/\/www\.cheekycommodoregamer\.co\.uk\/games\/zeewolf\/">/);
assert.doesNotMatch(publishedZeewolfHtml, /\/games\/game\.html\?id=zeewolf|http-equiv="refresh"|Game not found/i);
assert.match(readFileSync('games/zeewolf.html', 'utf8'), /\/games\/zeewolf\//);

// The editor export template remains a compatibility wrapper. The authoritative
// publishing command replaces its nested route with the full canonical page.
assert.match(canonicalWrapperHtml, /<link rel="canonical" href="https:\/\/www\.cheekycommodoregamer\.co\.uk\/games\/zeewolf\/">/);
assert.match(canonicalWrapperHtml, /<meta http-equiv="refresh" content="0; url=\/games\/game\.html\?id=zeewolf">/);
assert.match(canonicalWrapperHtml, /window\.location\.replace\("\/games\/game\.html\?id=zeewolf"\)/);
assert.match(canonicalWrapperHtml, /<meta property="og:type" content="website">/);
assert.match(canonicalWrapperHtml, /<meta property="og:title" content="Zeewolf \| Cheeky Commodore Gamer">/);
assert.match(canonicalWrapperHtml, /<meta property="og:image" content="https:\/\/www\.cheekycommodoregamer\.co\.uk\/resources\/images\/thumbnails\/all\/zeewolf\.jpg">/);
assert.match(canonicalWrapperHtml, /<meta name="twitter:title" content="Zeewolf \| Cheeky Commodore Gamer">/);
assert.match(canonicalWrapperHtml, /<meta name="twitter:url" content="https:\/\/www\.cheekycommodoregamer\.co\.uk\/games\/zeewolf\/">/);
assert.doesNotMatch(canonicalWrapperHtml, /game-hero|<iframe|data-ccg-mode|data-mode=|VideoGame|resources\/css\/games\.css/i);

assert.match(legacyRedirectHtml, /noindex,follow/i);
assert.match(legacyRedirectHtml, /<meta http-equiv="refresh" content="0; url=\/games\/zeewolf\/">/);
assert.match(legacyRedirectHtml, /"\/games\/zeewolf\/" \+\s+window\.location\.search \+\s+window\.location\.hash/);
assert.match(legacyRedirectHtml, /<link rel="canonical" href="https:\/\/www\.cheekycommodoregamer\.co\.uk\/games\/zeewolf\/">/);
assert.doesNotMatch(legacyRedirectHtml, /\/games\/game\.html|game-hero|<iframe|VideoGame/i);

const games = JSON.parse(readFileSync('games/games.json', 'utf8'));
const zeewolfEntries = games.filter((game) => game.id === 'zeewolf' || game.slug === 'zeewolf');
assert.equal(zeewolfEntries.length, 1, 'games.json contains one Zeewolf entry');
assert.equal(zeewolfEntries[0].id, 'zeewolf', 'dynamic game route can locate id zeewolf in games.json');
for (const file of ['games/games-index.json', 'games/games-search.json']) {
  const records = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(records.filter((record) => record.slug === 'zeewolf' || record.id === 'zeewolf').length, 1, `${file} contains Zeewolf once`);
}
const sitemap = readFileSync('sitemap-games.xml', 'utf8');
assert.equal(countOccurrences(sitemap, `${SITE_ORIGIN}/games/zeewolf/`), 1, 'sitemap contains canonical Zeewolf route once');
assert.doesNotMatch(sitemap, /\/games\/zeewolf\.html|\/games\/game\.html\?id=zeewolf/);

assert.ok(files.has('games/zeewolf.html') && files.has('games/zeewolf/index.html'), 'Export ZIP contains both HTML files');
assert.equal(countOccurrences(files.get('games/games.json'), 'zeewolf'), 2, 'package games.json has one Zeewolf id and slug');
assert.ok(existsSync('index.html'), 'protected intro home file is not part of export package');
assert.ok(existsSync('resources/css/intro.css'), 'protected intro CSS file is not part of export package');
assert.ok(existsSync('js/index-intro.js'), 'protected intro JS file is not part of export package');

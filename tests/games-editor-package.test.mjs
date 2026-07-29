import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const SITE_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';
const today = new Date().toISOString().split('T')[0];
const canonicalUrl = `${SITE_ORIGIN}/games/zeewolf/`;
const schemaGraph = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'VideoGame',
      '@id': `${canonicalUrl}#game`,
      name: 'Zeewolf',
      description: 'A 3D helicopter combat game mixing fast action with tactical missions, hostage rescues and vehicle transport across 32 increasingly difficult operations.',
      url: canonicalUrl,
      datePublished: '1994',
      gamePlatform: 'Amiga',
      genre: 'action',
      publisher: { '@type': 'Organization', name: 'Binary Asylum' },
      image: `${SITE_ORIGIN}/resources/images/thumbnails/all/zeewolf.jpg`
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${canonicalUrl}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_ORIGIN },
        { '@type': 'ListItem', position: 2, name: 'Games', item: `${SITE_ORIGIN}/games/` },
        { '@type': 'ListItem', position: 3, name: 'Zeewolf', item: canonicalUrl }
      ]
    }
  ]
};
const vars = {
  GAME_NAME: 'Zeewolf',
  GAME_ID: 'zeewolf',
  YEAR: '1994',
  PUBLISHER: 'Binary Asylum',
  PLATFORM: 'AMIGA',
  PLATFORM_LABEL: 'Amiga',
  MODE: 'amiga',
  SLUG: 'zeewolf',
  CANONICAL_URL: canonicalUrl,
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
  FB_APP_ID_META: '',
  GAME_SCHEMA_JSON: JSON.stringify(schemaGraph)
};

function render(template, values) {
  return Object.entries(values).reduce((html, [key, value]) => html.replaceAll(`{{${key}}}`, value), template);
}

function countOccurrences(text, needle) {
  return (String(text).match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
}

function extractJsonLd(html) {
  return [...String(html).matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => JSON.parse(match[1].trim()));
}

const canonicalWrapperHtml = render(readFileSync('admin/templates/game-landing-template.html', 'utf8'), vars);
const legacyRedirectHtml = render(readFileSync('admin/templates/game-redirect-template.html', 'utf8'), vars);
const builderSource = readFileSync('admin/js/games-editor.js', 'utf8');
const buildPackageDataSource = builderSource.match(/function buildPackageData\(\) \{[\s\S]*?\n\}\n+async function loadTemplates/)?.[0] || '';
const validatePackageManifestSource = builderSource.match(/function validatePackageManifest\(packageData\) \{[\s\S]*?\n\}/)?.[0] || '';

assert.match(buildPackageDataSource, /validateGeneratedSeoPackage\(\{[\s\S]*?canonicalWrapperHtml,[\s\S]*?legacyRedirectHtml,[\s\S]*?imagePath,[\s\S]*?title/);
assert.doesNotMatch(buildPackageDataSource, /\bcanonicalHtml\b|\bredirectHtml\b/);
assert.match(validatePackageManifestSource, /packageData\.canonicalWrapperHtml/);
assert.match(validatePackageManifestSource, /packageData\.legacyRedirectHtml/);
assert.doesNotMatch(validatePackageManifestSource, /packageData\.(?:canonicalHtml|redirectHtml)/);
assert.match(builderSource, /GAME_SCHEMA_JSON/);
assert.match(builderSource, /buildGameSchemaForTemplate/);

const files = new Map([
  ['games/games.json', JSON.stringify([{ id: 'zeewolf', slug: 'zeewolf', title: 'Zeewolf', system: 'AMIGA' }])],
  ['games/games-index.json', JSON.stringify([{ slug: 'zeewolf', title: 'Zeewolf' }])],
  ['games/games-search.json', JSON.stringify([{ slug: 'zeewolf', title: 'Zeewolf' }])],
  ['games/zeewolf.html', legacyRedirectHtml],
  ['games/zeewolf/index.html', canonicalWrapperHtml],
  ['sitemap-games.xml', `<urlset><url><loc>${canonicalUrl}</loc></url></urlset>`],
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
assert.match(readFileSync('games/zeewolf/index.html', 'utf8'), /\/games\/game\.html\?id=zeewolf/);
assert.match(readFileSync('games/zeewolf.html', 'utf8'), /\/games\/zeewolf\//);

assert.match(canonicalWrapperHtml, /<link rel="canonical" href="https:\/\/www\.cheekycommodoregamer\.co\.uk\/games\/zeewolf\/">/);
assert.match(canonicalWrapperHtml, /<meta http-equiv="refresh" content="0; url=\/games\/game\.html\?id=zeewolf">/);
assert.match(canonicalWrapperHtml, /window\.location\.replace\("\/games\/game\.html\?id=zeewolf"\)/);
assert.match(canonicalWrapperHtml, /<meta property="og:type" content="website">/);
assert.match(canonicalWrapperHtml, /<meta property="og:title" content="Zeewolf \| Cheeky Commodore Gamer">/);
assert.match(canonicalWrapperHtml, /<meta property="og:image" content="https:\/\/www\.cheekycommodoregamer\.co\.uk\/resources\/images\/thumbnails\/all\/zeewolf\.jpg">/);
assert.match(canonicalWrapperHtml, /<meta name="twitter:title" content="Zeewolf \| Cheeky Commodore Gamer">/);
assert.match(canonicalWrapperHtml, /<meta name="twitter:url" content="https:\/\/www\.cheekycommodoregamer\.co\.uk\/games\/zeewolf\/">/);
assert.doesNotMatch(canonicalWrapperHtml, /game-hero|<iframe|data-ccg-mode|data-mode=|resources\/css\/games\.css/i);

const schemaBlocks = extractJsonLd(canonicalWrapperHtml);
assert.equal(schemaBlocks.length, 1, 'canonical wrapper contains one JSON-LD block');
const graph = schemaBlocks[0]['@graph'];
assert.ok(Array.isArray(graph), 'canonical wrapper schema contains a graph');
assert.equal(graph.filter((node) => node['@type'] === 'VideoGame').length, 1, 'canonical wrapper contains one VideoGame');
assert.equal(graph.filter((node) => node['@type'] === 'BreadcrumbList').length, 1, 'canonical wrapper contains one BreadcrumbList');
assert.equal(graph.find((node) => node['@type'] === 'VideoGame').url, canonicalUrl, 'VideoGame owns canonical URL');
assert.equal(graph.find((node) => node['@type'] === 'VideoGame').gamePlatform, 'Amiga', 'VideoGame platform matches source');

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
assert.equal(countOccurrences(sitemap, canonicalUrl), 1, 'sitemap contains canonical Zeewolf route once');
assert.doesNotMatch(sitemap, /\/games\/zeewolf\.html|\/games\/game\.html\?id=zeewolf/);

assert.ok(files.has('games/zeewolf.html') && files.has('games/zeewolf/index.html'), 'Export ZIP contains both HTML files');
assert.equal(countOccurrences(files.get('games/games.json'), 'zeewolf'), 2, 'package games.json has one Zeewolf id and slug');
assert.ok(existsSync('index.html'), 'protected intro home file is not part of export package');
assert.ok(existsSync('resources/css/intro.css'), 'protected intro CSS file is not part of export package');
assert.ok(existsSync('js/index-intro.js'), 'protected intro JS file is not part of export package');

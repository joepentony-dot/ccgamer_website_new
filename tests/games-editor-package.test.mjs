import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SITE_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';
const today = new Date().toISOString().split('T')[0];
const vars = {
  GAME_NAME: 'Zeewolf',
  GAME_ID: 'zeewolf',
  YEAR: '1994',
  PUBLISHER: 'Binary Asylum',
  PLATFORM: 'AMIGA',
  MODE: 'amiga',
  SLUG: 'zeewolf',
  CANONICAL_URL: `${SITE_ORIGIN}/games/zeewolf/`,
  THUMBNAIL: 'resources/images/thumbnails/all/zeewolf.jpg',
  THUMBNAIL_FILENAME: 'zeewolf.jpg',
  DESCRIPTION: 'Zeewolf helicopter action for Amiga.',
  OG_TYPE: 'video.other',
  VIDEO_EMBED_URL: 'https://www.youtube.com/embed/iFDaeYjZnsc',
  VIDEO_WATCH_URL: 'https://www.youtube.com/watch?v=iFDaeYjZnsc',
  VIDEO_SECTION_CLASS: '',
  VIDEO_SECTION_HIDDEN_ATTR: '',
  VIDEO_SCHEMA_GRAPH_SUFFIX: `,
            {
            "@type": "VideoObject",
            "name": "Zeewolf Gameplay Video",
            "description": "Zeewolf helicopter action for Amiga.",
            "thumbnailUrl": "https://i.ytimg.com/vi/iFDaeYjZnsc/hqdefault.jpg",
            "embedUrl": "https://www.youtube.com/embed/iFDaeYjZnsc",
            "url": "${SITE_ORIGIN}/games/zeewolf/"
            }`,
  FB_APP_ID_META: ''
};

function render(template, vars) {
  return Object.entries(vars).reduce((html, [key, value]) => html.replaceAll(`{{${key}}}`, value), template);
}

const canonicalHtml = render(readFileSync('admin/templates/game-landing-template.html', 'utf8'), vars);
const redirectHtml = render(readFileSync('admin/templates/game-redirect-template.html', 'utf8'), vars);
const files = new Map([
  ['games/games.json', JSON.stringify([{ id: 'zeewolf', slug: 'zeewolf', title: 'Zeewolf', system: 'AMIGA' }])],
  ['games/games-index.json', JSON.stringify([{ slug: 'zeewolf', title: 'Zeewolf' }])],
  ['games/games-search.json', JSON.stringify([{ id: 'zeewolf', title: 'Zeewolf' }])],
  ['games/zeewolf.html', redirectHtml],
  ['games/zeewolf/index.html', canonicalHtml],
  ['sitemap-games.xml', `<urlset><url><loc>${SITE_ORIGIN}/games/zeewolf/</loc></url></urlset>`],
  ['sitemap.xml', `<sitemapindex><sitemap><loc>${SITE_ORIGIN}/sitemap-pages.xml</loc><lastmod>2026-05-13</lastmod></sitemap><sitemap><loc>${SITE_ORIGIN}/sitemap-games.xml</loc><lastmod>${today}</lastmod></sitemap></sitemapindex>`],
  ['README.txt', 'full merged games.json\ncanonical nested game page\nflat legacy redirect\ngame index data\nsearch data\ngames sitemap\nroot sitemap index']
]);

const required = [
  'games/games.json',
  'games/games-index.json',
  'games/games-search.json',
  'games/zeewolf.html',
  'games/zeewolf/index.html',
  'sitemap-games.xml',
  'sitemap.xml',
  'README.txt'
];
for (const path of required) assert.ok(files.has(path), `${path} missing from package manifest`);
assert.ok(files.get('games/zeewolf.html').trim(), 'flat redirect is non-empty');
assert.match(redirectHtml, /noindex,follow/i);
assert.match(redirectHtml, /http-equiv="refresh"/i);
assert.match(redirectHtml, /location\.replace\("\/games\/zeewolf\/" \+ suffix\)/);
assert.match(redirectHtml, /<a href="\/games\/zeewolf\/">/);
assert.doesNotMatch(redirectHtml, /\/games\/game\.html/);
assert.doesNotMatch(redirectHtml, /VideoGame|game-hero__title/);

assert.ok(files.get('games/zeewolf/index.html').trim(), 'canonical page is non-empty');
assert.match(canonicalHtml, new RegExp(`${SITE_ORIGIN}/games/zeewolf/`));
assert.match(canonicalHtml, /\/games\/game\.html\?id=zeewolf/);
assert.match(canonicalHtml, /data-ccg-mode="amiga"/);
assert.match(canonicalHtml, /data-mode="amiga"/);
assert.doesNotMatch(canonicalHtml, /data-mode="c64"/);
assert.doesNotMatch(canonicalHtml, /\.\.\/resources\//);
assert.doesNotMatch(canonicalHtml, /\.\.\/js\//);
assert.match(canonicalHtml, /\/resources\/css\/ccg-master\.css/);
assert.match(canonicalHtml, /\/resources\/images\/thumbnails\/all\/zeewolf\.jpg/);
assert.match(canonicalHtml, /VideoGame/);
assert.match(canonicalHtml, /VideoObject/);
assert.match(canonicalHtml, /BreadcrumbList/);
assert.match(files.get('sitemap-games.xml'), /https:\/\/www\.cheekycommodoregamer\.co\.uk\/games\/zeewolf\//);
assert.match(files.get('sitemap.xml'), new RegExp(`<lastmod>${today}</lastmod>`));

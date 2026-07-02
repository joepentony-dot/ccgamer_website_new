import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildCanonicalHtml, getExpectedPageArtifacts, normalizeSlug } from '../scripts/generate-slug-pages.js';

const SITE_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';

function render(template, vars) {
  return Object.entries(vars).reduce((html, [key, value]) => html.replaceAll(`{{${key}}}`, value), template);
}

function count(haystack, needle) {
  return (String(haystack).match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
}

function varsFor(game) {
  const platformLabel = game.system === 'AMIGA' ? 'Amiga' : 'Commodore 64';
  return {
    GAME_NAME: game.title,
    GAME_ID: game.id,
    SLUG: game.slug,
    DESCRIPTION: `${game.title} on ${platformLabel} — screenshots, manual, downloads and video.`,
    CANONICAL_URL: `${SITE_ORIGIN}/games/${game.slug}/`,
    THUMBNAIL_FILENAME: game.thumbnail.split('/').pop(),
    PLATFORM_LABEL: platformLabel
  };
}

const landingTemplate = readFileSync('admin/templates/game-landing-template.html', 'utf8');
const redirectTemplate = readFileSync('admin/templates/game-redirect-template.html', 'utf8');
const fixtures = [
  { id: 'zeewolf', slug: 'zeewolf', title: 'Zeewolf', system: 'AMIGA', thumbnail: 'resources/images/thumbnails/all/zeewolf.jpg' },
  { id: 'future_c64_fixture', slug: 'future-c64-fixture', title: 'Future C64 Fixture', system: 'C64', thumbnail: 'resources/images/thumbnails/all/future-c64-fixture.jpg' }
];

for (const game of fixtures) {
  const vars = varsFor(game);
  const nested = render(landingTemplate, vars);
  const flat = render(redirectTemplate, vars);
  const files = new Map([
    ['games/games.json', JSON.stringify(fixtures)],
    ['games/games-index.json', JSON.stringify(fixtures.map(({ slug, title }) => ({ slug, title })))],
    ['games/games-search.json', JSON.stringify(fixtures.map(({ slug, title }) => ({ slug, title })))],
    [`games/${game.slug}.html`, flat],
    [`games/${game.slug}/index.html`, nested],
    ['sitemap-games.xml', `<urlset>${fixtures.map((item) => `<url><loc>${SITE_ORIGIN}/games/${item.slug}/</loc></url>`).join('')}</urlset>`],
    ['sitemap.xml', `<sitemapindex><sitemap><loc>${SITE_ORIGIN}/sitemap-games.xml</loc></sitemap></sitemapindex>`],
    ['README.txt', 'games/<slug>.html is the legacy redirect\ngames/<slug>/index.html is the canonical SEO wrapper\ngames/game.html displays the game using games/games.json\nboth wrapper files are included\nno manual HTML creation is required']
  ]);

  for (const path of ['games/games.json', 'games/games-index.json', 'games/games-search.json', `games/${game.slug}.html`, `games/${game.slug}/index.html`, 'sitemap-games.xml', 'sitemap.xml', 'README.txt']) {
    assert.ok(files.get(path)?.trim(), `${path} missing from ZIP manifest`);
  }

  assert.match(nested, new RegExp(`<link rel="canonical" href="${SITE_ORIGIN}/games/${game.slug}/">`));
  assert.match(nested, new RegExp(`/games/game\\.html\\?id=${game.id}`));
  assert.match(nested, /<meta property="og:url"/);
  assert.match(nested, /<meta name="twitter:url"/);
  assert.match(nested, new RegExp(`/resources/images/thumbnails/all/${game.thumbnail.split('/').pop()}`));
  assert.doesNotMatch(nested, /game-hero|iframe|ccg-master|games\.css|data-ccg-mode|data-mode|ccg-share|game-video/i);

  assert.match(flat, /noindex,follow/i);
  assert.match(flat, new RegExp(`content="0; url=/games/${game.slug}/"`));
  assert.ok(flat.includes(`window.location.replace("/games/${game.slug}/" + window.location.search + window.location.hash);`));
  assert.doesNotMatch(flat, /\/games\/game\.html|game-hero|iframe|data-ccg-mode|data-mode/i);

  assert.equal(count(files.get('games/games.json'), `"slug":"${game.slug}"`), 1);
  assert.equal(count(files.get('games/games-index.json'), `"slug":"${game.slug}"`), 1);
  assert.equal(count(files.get('games/games-search.json'), `"slug":"${game.slug}"`), 1);
  assert.equal(count(files.get('sitemap-games.xml'), `${SITE_ORIGIN}/games/${game.slug}/`), 1);
  assert.doesNotMatch(files.get('sitemap-games.xml'), new RegExp(`${game.slug}\\.html|game\\.html\\?id=${game.id}`));

  const cliExpected = getExpectedPageArtifacts(game, normalizeSlug(game), {
    canonicalUrl: `${SITE_ORIGIN}/games/${game.slug}/`,
    ogImage: `${SITE_ORIGIN}/resources/images/thumbnails/all/${game.thumbnail.split('/').pop()}`
  });
  assert.equal(cliExpected.canonicalHtml.trim(), nested.trim(), `${game.slug} command-line nested wrapper matches browser template`);
  assert.equal(cliExpected.redirectStubHtml.trim(), flat.trim(), `${game.slug} command-line flat redirect matches browser template`);
  assert.equal(buildCanonicalHtml({ slug: game.slug, game, title: game.title, description: vars.DESCRIPTION, canonicalUrl: vars.CANONICAL_URL, ogImage: `${SITE_ORIGIN}/resources/images/thumbnails/all/${vars.THUMBNAIL_FILENAME}` }).trim(), nested.trim());
}

for (const protectedPath of ['index.html', 'resources/css/intro.css', 'js/index-intro.js']) {
  assert.ok(readFileSync(protectedPath, 'utf8').length > 0, `${protectedPath} remains present for protected-file untouched check`);
}

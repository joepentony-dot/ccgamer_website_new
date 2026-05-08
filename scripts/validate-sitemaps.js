const fs = require('fs');

const SITE_URL = 'https://www.cheekycommodoregamer.co.uk';
const SITEMAP_XMLNS = 'http://www.sitemaps.org/schemas/sitemap/0.9';
const CHILD_SITEMAPS = ['sitemap-pages.xml', 'sitemap-games.xml'];

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertXmlRoot(xml, rootTag, filePath) {
  assert(
    xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n'),
    `${filePath} must start with the UTF-8 XML declaration.`
  );
  assert(
    xml.includes(`<${rootTag} xmlns="${SITEMAP_XMLNS}">`),
    `${filePath} must use the ${rootTag} root and sitemap namespace.`
  );
  assert(xml.trim().endsWith(`</${rootTag}>`), `${filePath} must close ${rootTag}.`);
}

function toUrl(loc, filePath) {
  try {
    return new URL(loc);
  } catch (err) {
    throw new Error(`${filePath} contains an invalid URL: ${loc}`);
  }
}

function assertNoDuplicates(locs, filePath) {
  const seen = new Set();
  const duplicates = new Set();

  for (const loc of locs) {
    if (seen.has(loc)) duplicates.add(loc);
    seen.add(loc);
  }

  assert(
    duplicates.size === 0,
    `${filePath} contains duplicate URLs: ${[...duplicates].join(', ')}`
  );
}

function assertCanonicalSitemapUrl(loc, filePath) {
  const url = toUrl(loc, filePath);

  assert(url.origin === SITE_URL, `${filePath} URL must use ${SITE_URL}: ${loc}`);
  assert(!url.search && !url.hash, `${filePath} URL must not include query strings or fragments: ${loc}`);
  assert(!url.pathname.endsWith('/index.html'), `${filePath} must not include /index.html URLs: ${loc}`);
  assert(url.pathname !== '/home.html', `${filePath} must not include the home.html duplicate: ${loc}`);
  assert(url.pathname !== '/games/game.html', `${filePath} must not include the dynamic game shell: ${loc}`);
}

function validateSitemapIndex() {
  const filePath = 'sitemap.xml';
  const xml = readFile(filePath);
  assertXmlRoot(xml, 'sitemapindex', filePath);
  assert(!xml.includes('<urlset'), `${filePath} must be a sitemap index, not a URL sitemap.`);

  const locs = extractLocs(xml);
  const expectedLocs = CHILD_SITEMAPS.map((name) => `${SITE_URL}/${name}`);

  assert(locs.length === expectedLocs.length, `${filePath} must list exactly the child sitemaps.`);
  for (const loc of expectedLocs) {
    assert(locs.includes(loc), `${filePath} missing child sitemap: ${loc}`);
  }

  console.log('[validate-sitemaps] sitemap.xml index structure valid.');
}

function validateUrlSitemap(filePath) {
  const xml = readFile(filePath);
  assertXmlRoot(xml, 'urlset', filePath);

  const locs = extractLocs(xml);
  assert(locs.length > 0, `${filePath} must contain at least one URL.`);
  assertNoDuplicates(locs, filePath);

  for (const loc of locs) {
    assertCanonicalSitemapUrl(loc, filePath);
    if (filePath === 'sitemap-games.xml') {
      const pathname = toUrl(loc, filePath).pathname;
      assert(!pathname.endsWith('.html'), `${filePath} game URLs must use canonical directory URLs: ${loc}`);
    }
  }

  console.log(`[validate-sitemaps] ${filePath} canonical URL checks valid (${locs.length} URLs).`);
}

function main() {
  validateSitemapIndex();
  for (const child of CHILD_SITEMAPS) {
    validateUrlSitemap(child);
  }
}

main();

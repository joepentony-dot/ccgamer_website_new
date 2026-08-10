const fs = require('fs');

const SITE_URL = 'https://www.cheekycommodoregamer.co.uk';
const SITEMAP_XMLNS = 'http://www.sitemaps.org/schemas/sitemap/0.9';
const VIDEO_XMLNS = 'http://www.google.com/schemas/sitemap-video/1.1';
const CORE_CHILD_SITEMAPS = ['sitemap-pages.xml', 'sitemap-games.xml'];
const CHILD_SITEMAP_PATTERN = /^sitemap-[a-z0-9-]+\.xml$/i;

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
  const rootMatch = xml.slice(xml.indexOf('\n') + 1).match(new RegExp(`^<${rootTag}\\b([^>]*)>`));
  assert(rootMatch, `${filePath} must use the ${rootTag} root.`);
  assert(
    new RegExp(`\\bxmlns=["']${SITEMAP_XMLNS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(rootMatch[1]),
    `${filePath} must declare the standard sitemap namespace.`
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

function sitemapFileFromLoc(loc, filePath) {
  const url = toUrl(loc, filePath);
  assert(url.origin === SITE_URL, `${filePath} child sitemap must use ${SITE_URL}: ${loc}`);
  assert(!url.search && !url.hash, `${filePath} child sitemap must not include query strings or fragments: ${loc}`);
  assert(
    /^\/sitemap-[a-z0-9-]+\.xml$/i.test(url.pathname),
    `${filePath} child sitemap must be a root-level sitemap-*.xml file: ${loc}`
  );

  const child = url.pathname.slice(1);
  assert(fs.existsSync(child), `${filePath} references missing local child sitemap: ${child}`);
  return child;
}

function localChildSitemaps() {
  return fs.readdirSync('.')
    .filter((filename) => CHILD_SITEMAP_PATTERN.test(filename))
    .sort();
}

function validateSitemapIndex() {
  const filePath = 'sitemap.xml';
  const xml = readFile(filePath);
  assertXmlRoot(xml, 'sitemapindex', filePath);
  assert(!xml.includes('<urlset'), `${filePath} must be a sitemap index, not a URL sitemap.`);

  const locs = extractLocs(xml);
  assert(locs.length >= CORE_CHILD_SITEMAPS.length, `${filePath} must list the core child sitemaps.`);
  assertNoDuplicates(locs, filePath);

  const expectedLocs = CORE_CHILD_SITEMAPS.map((name) => `${SITE_URL}/${name}`);
  for (const loc of expectedLocs) {
    assert(locs.includes(loc), `${filePath} missing core child sitemap: ${loc}`);
  }

  const children = locs.map((loc) => sitemapFileFromLoc(loc, filePath));
  const indexedChildren = new Set(children);
  for (const child of localChildSitemaps()) {
    assert(indexedChildren.has(child), `${filePath} is missing local child sitemap: ${child}`);
  }

  console.log(`[validate-sitemaps] sitemap.xml index structure valid (${children.length} child sitemaps).`);
  return children;
}

function validateVideoSitemap(filePath, xml, locs) {
  const rootMatch = xml.slice(xml.indexOf('\n') + 1).match(/^<urlset\b([^>]*)>/);
  assert(
    rootMatch && new RegExp(`\\bxmlns:video=["']${VIDEO_XMLNS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(rootMatch[1]),
    `${filePath} must declare the Google video sitemap namespace.`
  );

  const videoBlocks = [...xml.matchAll(/<video:video>([\s\S]*?)<\/video:video>/g)].map((match) => match[1]);
  assert(videoBlocks.length > 0, `${filePath} must contain at least one video entry.`);
  assert(videoBlocks.length === locs.length, `${filePath} must contain exactly one video entry per page URL.`);

  const requiredTags = ['thumbnail_loc', 'title', 'description', 'player_loc'];
  videoBlocks.forEach((block, index) => {
    for (const tag of requiredTags) {
      assert(
        new RegExp(`<video:${tag}>[^<]+<\\/video:${tag}>`).test(block),
        `${filePath} video entry ${index + 1} is missing video:${tag}.`
      );
    }

    const title = (block.match(/<video:title>([\s\S]*?)<\/video:title>/) || [])[1] || '';
    const description = (block.match(/<video:description>([\s\S]*?)<\/video:description>/) || [])[1] || '';
    assert(title.length <= 500, `${filePath} video entry ${index + 1} title is unexpectedly long.`);
    assert(description.length <= 4096, `${filePath} video entry ${index + 1} description is unexpectedly long.`);

    const player = (block.match(/<video:player_loc>([^<]+)<\/video:player_loc>/) || [])[1] || '';
    const isYouTubePlayer = /^https:\/\/www\.youtube\.com\/embed\/[A-Za-z0-9_-]+$/.test(player);
    const isGoogleDrivePlayer = /^https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]+\/preview$/.test(player);
    assert(isYouTubePlayer || isGoogleDrivePlayer, `${filePath} video entry ${index + 1} has an invalid supported player URL.`);

    const duration = (block.match(/<video:duration>([^<]+)<\/video:duration>/) || [])[1];
    if (duration) {
      const seconds = Number(duration);
      assert(Number.isInteger(seconds) && seconds > 0 && seconds <= 28800, `${filePath} video entry ${index + 1} has an invalid duration.`);
    }
  });
}

function validateUrlSitemap(filePath) {
  const xml = readFile(filePath);
  assertXmlRoot(xml, 'urlset', filePath);

  const locs = extractLocs(xml);
  assert(locs.length > 0, `${filePath} must contain at least one URL.`);
  assertNoDuplicates(locs, filePath);

  for (const loc of locs) {
    assertCanonicalSitemapUrl(loc, filePath);
    if (filePath === 'sitemap-games.xml' || filePath === 'sitemap-videos.xml') {
      const pathname = toUrl(loc, filePath).pathname;
      assert(!pathname.endsWith('.html'), `${filePath} game URLs must use canonical directory URLs: ${loc}`);
      assert(/^\/games\/[a-z0-9-]+\/$/.test(pathname), `${filePath} must contain canonical game routes only: ${loc}`);
    }
  }

  if (filePath === 'sitemap-videos.xml') {
    validateVideoSitemap(filePath, xml, locs);
  }

  console.log(`[validate-sitemaps] ${filePath} canonical URL checks valid (${locs.length} URLs).`);
}

function main() {
  const children = validateSitemapIndex();
  for (const child of children) {
    validateUrlSitemap(child);
  }
}

main();
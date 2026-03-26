#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..', '..');
const gamesJsonPath = path.join(repoRoot, 'games', 'games.json');
const staticPagesConfigPath = path.join(repoRoot, 'tools', 'seo', 'static-pages.json');
const sitemapGamesPath = path.join(repoRoot, 'sitemap-games.xml');
const sitemapPagesPath = path.join(repoRoot, 'sitemap-pages.xml');
const sitemapIndexPath = path.join(repoRoot, 'sitemap.xml');

const DEFAULT_SITE_URL = 'https://www.cheekycommodoregamer.co.uk';
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SITEMAP_XMLNS = 'http://www.sitemaps.org/schemas/sitemap/0.9';
const DEFAULT_STATIC_PATHS = [
  '',
  'about.html',
  'complete-index.html',
  'contact.html',
  'emulation.html',
  'home.html',
  'games/collections/bpjs-indexed-games.html',
  'games/collections/cartridge-games.html',
  'games/collections/index.html',
  'games/collections/licensed-games.html',
  'games/collections/retro-events.html',
  'games/collections/retro-specials.html',
  'games/collections/amiga-demo-music.html',
  'games/collections/top-picks.html',
  'games/genres/action-adventure-games.html',
  'games/genres/adventure-games.html',
  'games/genres/arcade-games.html',
  'games/genres/casino-games.html',
  'games/genres/fighting-games.html',
  'games/genres/horror-games.html',
  'games/genres/index.html',
  'games/genres/miscellaneous.html',
  'games/genres/platform-games.html',
  'games/genres/puzzle-games.html',
  'games/genres/quiz-games.html',
  'games/genres/racing-games.html',
  'games/genres/role-playing-games.html',
  'games/genres/shooting-games.html',
  'games/genres/sports-games.html',
  'games/genres/strategy-games.html',
  'games/index.html',
  'quiz/index.html',
  'quiz/quiz.html',
  'viewer/manual.html',
];
const MIN_ARCHIVE_CREDITS = 5;
const FEATURED_COMPOSERS = [
  { name: 'Rob Hubbard', slug: 'rob-hubbard' },
  { name: 'Martin Galway', slug: 'martin-galway' },
  { name: 'Ben Daglish', slug: 'ben-daglish' },
  { name: 'Matt Gray', slug: 'matt-gray' },
  { name: 'David Whittaker', slug: 'david-whittaker' },
  { name: 'Jeroen Tel', slug: 'jeroen-tel' },
  { name: 'Fred Gray', slug: 'fred-gray' },
  { name: 'Chris Hülsbeck', slug: 'chris-huelsbeck' },
];

function normalizeComposerKey(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function toComposerList(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === '') return [];
  return [value];
}

function getComposerValues(game) {
  const seen = new Set();
  return [
    ...toComposerList(game && game.composer),
    ...toComposerList(game && game.credits && game.credits.musician),
    ...toComposerList(game && game.music),
  ]
    .map((entry) => String(entry || '').trim())
    .filter(Boolean)
    .filter((entry) => !/\.mp3$/i.test(entry))
    .filter((entry) => {
      const key = normalizeComposerKey(entry);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function composerSlug(name, featuredByName) {
  const featured = featuredByName.get(normalizeComposerKey(name));
  if (featured) return featured.slug;
  return normalizeComposerKey(name).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function buildComposerUrls(siteUrl, games) {
  const featuredByName = new Map(
    FEATURED_COMPOSERS.map((entry) => [normalizeComposerKey(entry.name), entry])
  );
  const composerCount = new Map();

  for (const game of games) {
    for (const composer of getComposerValues(game)) {
      const key = normalizeComposerKey(composer);
      composerCount.set(key, (composerCount.get(key) || 0) + 1);
    }
  }

  const eligibleSlugs = new Set(FEATURED_COMPOSERS.map((entry) => entry.slug));

  for (const [key, count] of composerCount.entries()) {
    if (featuredByName.has(key) || count >= MIN_ARCHIVE_CREDITS) {
      const canonicalName = featuredByName.has(key) ? featuredByName.get(key).name : key;
      const slug = composerSlug(canonicalName, featuredByName);
      if (slug) eligibleSlugs.add(slug);
    }
  }

  const musicDir = path.join(repoRoot, 'music');
  const composerEntries = [];
  for (const slug of [...eligibleSlugs].sort((a, b) => a.localeCompare(b))) {
    const filePath = path.join(musicDir, `${slug}.html`);
    if (!fs.existsSync(filePath)) continue;
    composerEntries.push({
      loc: `${siteUrl}/music/${slug}/`,
      lastmod: getGitLastMod(filePath),
      filePath,
    });
  }

  const musicIndex = path.join(musicDir, 'index.html');
  if (fs.existsSync(musicIndex)) {
    composerEntries.unshift({
      loc: `${siteUrl}/music/`,
      lastmod: getGitLastMod(musicIndex),
      filePath: musicIndex,
    });
  }

  return composerEntries;
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : data.games || data.items || [];
}

function readSiteUrl() {
  const cnamePath = path.join(repoRoot, 'CNAME');
  if (fs.existsSync(cnamePath)) {
    const cname = fs.readFileSync(cnamePath, 'utf8').trim();
    if (cname) {
      return `https://${cname}`;
    }
  }
  return DEFAULT_SITE_URL;
}

function toRepoRelative(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function getGitLastMod(filePath) {
  const relativePath = toRepoRelative(filePath);
  try {
    const output = execFileSync('git', ['log', '-1', '--format=%cI', '--', relativePath], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    if (output) {
      return output.slice(0, 10);
    }
  } catch (err) {
    // Fall through to date fallback.
  }

  return new Date().toISOString().slice(0, 10);
}

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function hasInvalidXmlChars(value) {
  // Disallow control characters that are invalid in XML 1.0.
  return /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value);
}

function ensureUtf8(value, context) {
  const roundTrip = Buffer.from(value, 'utf8').toString('utf8');
  if (roundTrip !== value) {
    throw new Error(`${context} is not valid UTF-8.`);
  }
}

function validateXmlDocument(xml, expectedRootTag) {
  const header = '<?xml version="1.0" encoding="UTF-8"?>\n';
  if (!xml.startsWith(header)) {
    throw new Error('XML header is missing or incorrect.');
  }

  ensureUtf8(xml, expectedRootTag);

  if (hasInvalidXmlChars(xml)) {
    throw new Error(`${expectedRootTag} contains invalid XML control characters.`);
  }

  const afterHeader = xml.slice(header.length);
  if (!afterHeader.startsWith(`<${expectedRootTag}`)) {
    throw new Error(`${expectedRootTag} root element is missing.`);
  }

  const rootTagEnd = afterHeader.indexOf('>');
  const rootTag = rootTagEnd >= 0 ? afterHeader.slice(0, rootTagEnd + 1) : '';
  if (!rootTag.includes(`xmlns="${SITEMAP_XMLNS}"`)) {
    throw new Error(`${expectedRootTag} root element or xmlns attribute is invalid.`);
  }

  if (!xml.trim().endsWith(`</${expectedRootTag}>`)) {
    throw new Error(`${expectedRootTag} closing tag is missing.`);
  }
}


function readHtmlSeoMeta(filePath) {
  if (!fs.existsSync(filePath) || path.extname(filePath).toLowerCase() !== '.html') {
    return { canonical: '', robots: '', isRedirect: false };
  }

  const html = fs.readFileSync(filePath, 'utf8');
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  const robots = html.match(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']+)["']/i);
  const isRedirect =
    /<meta[^>]+http-equiv=["']refresh["']/i.test(html) ||
    /window\.location\.(?:replace|href|assign)\s*\(/i.test(html);

  return {
    canonical: canonical ? canonical[1].trim() : '',
    robots: robots ? robots[1].trim() : '',
    isRedirect,
  };
}

function resolveCanonicalLoc(filePath, fallbackLoc, siteUrl, warnings) {
  const seoMeta = readHtmlSeoMeta(filePath);
  if (/noindex/i.test(seoMeta.robots)) {
    warnings.push(`Excluding noindex page from sitemap: ${toRepoRelative(filePath)}.`);
    return null;
  }

  if (seoMeta.isRedirect) {
    warnings.push(`Excluding redirect page from sitemap: ${toRepoRelative(filePath)}.`);
    return null;
  }

  if (!seoMeta.canonical) {
    return fallbackLoc;
  }

  if (!seoMeta.canonical.startsWith(siteUrl)) {
    warnings.push(`Canonical for ${toRepoRelative(filePath)} points outside ${siteUrl}; using fallback sitemap URL.`);
    return fallbackLoc;
  }

  return seoMeta.canonical.replace(/[?#].*$/, '');
}

function buildUrlEntry(loc, lastmod) {
  return [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    `    <lastmod>${escapeXml(lastmod)}</lastmod>`,
    '  </url>',
  ].join('\n');
}

function buildSitemapEntry(loc, lastmod) {
  return [
    '  <sitemap>',
    `    <loc>${escapeXml(loc)}</loc>`,
    `    <lastmod>${escapeXml(lastmod)}</lastmod>`,
    '  </sitemap>',
  ].join('\n');
}

function writeFile(filePath, contents) {
  fs.writeFileSync(filePath, contents, { encoding: 'utf8' });
}

function getLatestLastmod(entries) {
  if (entries.length === 0) {
    return new Date().toISOString().slice(0, 10);
  }
  return entries
    .map((entry) => entry.lastmod)
    .slice()
    .sort()
    .pop();
}

function loadStaticPaths(warnings) {
  if (!fs.existsSync(staticPagesConfigPath)) {
    warnings.push('Static pages config not found at tools/seo/static-pages.json. Using defaults.');
    return DEFAULT_STATIC_PATHS;
  }

  try {
    const raw = fs.readFileSync(staticPagesConfigPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    warnings.push('Static pages config is empty or invalid. Using defaults.');
    return DEFAULT_STATIC_PATHS;
  } catch (err) {
    warnings.push(`Failed to parse static pages config: ${err.message}. Using defaults.`);
    return DEFAULT_STATIC_PATHS;
  }
}

function resolveStaticPath(relPath) {
  const normalized = typeof relPath === 'string' ? relPath.trim().replace(/^\/+/, '') : '';
  if (!normalized) {
    return {
      locPath: '',
      filePath: path.join(repoRoot, 'index.html'),
    };
  }

  if (normalized === 'home.html') {
    return {
      locPath: '',
      filePath: path.join(repoRoot, normalized),
    };
  }

  if (normalized.endsWith('/index.html')) {
    return {
      locPath: normalized.slice(0, -'index.html'.length),
      filePath: path.join(repoRoot, normalized),
    };
  }

  return {
    locPath: normalized,
    filePath: path.join(repoRoot, normalized),
  };
}

function generateGameSitemap(siteUrl, games) {
  const slugToGames = new Map();
  const errors = [];
  const warnings = [];

  for (const game of games) {
    const slug = typeof game.slug === 'string' ? game.slug.trim() : '';
    if (!slug) {
      errors.push(`Missing slug for game id=${game.id || 'unknown'} title="${game.title || 'unknown'}".`);
      continue;
    }

    if (!SLUG_PATTERN.test(slug)) {
      errors.push(`Invalid slug format "${slug}" for game id=${game.id || 'unknown'} title="${game.title || 'unknown'}".`);
      continue;
    }

    if (!slugToGames.has(slug)) {
      slugToGames.set(slug, []);
    }
    slugToGames.get(slug).push(game);
  }

  const duplicateSlugs = [...slugToGames.entries()]
    .filter(([, entries]) => entries.length > 1)
    .map(([slug, entries]) => ({ slug, entries }));

  if (duplicateSlugs.length > 0) {
    for (const dup of duplicateSlugs) {
      const ids = dup.entries.map((entry) => entry.id || 'unknown').join(', ');
      errors.push(`Duplicate slug "${dup.slug}" found for ids: ${ids}.`);
    }
  }

  const validSlugs = [...slugToGames.keys()].sort((a, b) => a.localeCompare(b));
  const entries = [];

  for (const slug of validSlugs) {
    const dirIndexPath = path.join(repoRoot, 'games', slug, 'index.html');
    const filePath = fs.existsSync(dirIndexPath) ? dirIndexPath : path.join(repoRoot, 'games', `${slug}.html`);

    if (!fs.existsSync(filePath)) {
      warnings.push(`No HTML file found for slug "${slug}" at games/${slug}/index.html or games/${slug}.html. Excluding from sitemap.`);
      continue;
    }

    const loc = resolveCanonicalLoc(filePath, `${siteUrl}/games/${slug}/`, siteUrl, warnings);
    if (!loc) {
      continue;
    }

    const lastmod = getGitLastMod(filePath);
    entries.push({
      loc,
      lastmod,
      filePath,
    });
  }

  const urlEntries = entries.map((entry) => buildUrlEntry(entry.loc, entry.lastmod));
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<urlset xmlns="${SITEMAP_XMLNS}">`,
    ...urlEntries,
    '</urlset>',
    '',
  ].join('\n');

  validateXmlDocument(xml, 'urlset');
  writeFile(sitemapGamesPath, xml);

  return {
    errors,
    warnings,
    validSlugs,
    entries,
    latestLastmod: getLatestLastmod(entries),
  };
}


function collectCuratedRetroEntries(siteUrl, warnings) {
  const roots = ['retro-events', 'retro-specials', 'amiga-demo-music'];
  const entries = [];

  for (const root of roots) {
    const rootPath = path.join(repoRoot, root);
    if (!fs.existsSync(rootPath) || !fs.statSync(rootPath).isDirectory()) continue;

    const children = fs.readdirSync(rootPath, { withFileTypes: true });
    for (const child of children) {
      if (!child.isDirectory()) continue;
      const filePath = path.join(rootPath, child.name, 'index.html');
      if (!fs.existsSync(filePath)) continue;

      const fallbackLoc = `${siteUrl}/${root}/${child.name}/`;
      const loc = resolveCanonicalLoc(filePath, fallbackLoc, siteUrl, warnings);
      if (!loc) continue;

      entries.push({
        loc,
        lastmod: getGitLastMod(filePath),
        filePath,
      });
    }

    const rootEntries = entries.filter((entry) => entry.loc.startsWith(`${siteUrl}/${root}/`));
    if (rootEntries.length > 0) {
      const latestLastmod = rootEntries
        .map((entry) => entry.lastmod)
        .slice()
        .sort()
        .pop();
      entries.push({
        loc: `${siteUrl}/${root}/`,
        lastmod: latestLastmod,
        filePath: rootPath,
      });
    }
  }

  return entries;
}

function generateStaticSitemap(siteUrl, games) {
  const warnings = [];
  const staticPaths = loadStaticPaths(warnings);
  const entriesByLoc = new Map();

  for (const relPath of staticPaths) {
    const resolved = resolveStaticPath(relPath);
    if (!fs.existsSync(resolved.filePath)) {
      warnings.push(`Static page not found at ${toRepoRelative(resolved.filePath)}. Excluding from sitemap-pages.xml.`);
      continue;
    }

    const fallbackLoc = resolved.locPath ? `${siteUrl}/${resolved.locPath}` : `${siteUrl}/`;
    const loc = resolveCanonicalLoc(resolved.filePath, fallbackLoc, siteUrl, warnings);
    if (!loc) {
      continue;
    }

    const nextEntry = {
      loc,
      lastmod: getGitLastMod(resolved.filePath),
      filePath: resolved.filePath,
    };

    if (!entriesByLoc.has(loc)) {
      entriesByLoc.set(loc, nextEntry);
      continue;
    }

    const existing = entriesByLoc.get(loc);
    if (nextEntry.lastmod > existing.lastmod) {
      entriesByLoc.set(loc, nextEntry);
    }
  }

  const curatedRetroEntries = collectCuratedRetroEntries(siteUrl, warnings);
  for (const entry of curatedRetroEntries) {
    if (!entriesByLoc.has(entry.loc) || entry.lastmod > entriesByLoc.get(entry.loc).lastmod) {
      entriesByLoc.set(entry.loc, entry);
    }
  }

  const composerEntries = buildComposerUrls(siteUrl, games);
  for (const entry of composerEntries) {
    if (!entriesByLoc.has(entry.loc) || entry.lastmod > entriesByLoc.get(entry.loc).lastmod) {
      entriesByLoc.set(entry.loc, entry);
    }
  }

  const entries = [...entriesByLoc.values()];
  entries.sort((a, b) => a.loc.localeCompare(b.loc));

  const urlEntries = entries.map((entry) => buildUrlEntry(entry.loc, entry.lastmod));
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<urlset xmlns="${SITEMAP_XMLNS}">`,
    ...urlEntries,
    '</urlset>',
    '',
  ].join('\n');

  validateXmlDocument(xml, 'urlset');
  writeFile(sitemapPagesPath, xml);

  return {
    entries,
    warnings,
    latestLastmod: getLatestLastmod(entries),
  };
}

function generateSitemapIndex(siteUrl, sitemapEntries) {
  const xmlEntries = sitemapEntries.map((entry) => buildSitemapEntry(entry.loc, entry.lastmod));
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<sitemapindex xmlns="${SITEMAP_XMLNS}">`,
    ...xmlEntries,
    '</sitemapindex>',
    '',
  ].join('\n');

  validateXmlDocument(xml, 'sitemapindex');
  writeFile(sitemapIndexPath, xml);
}

function main() {
  const siteUrlArgIndex = process.argv.indexOf('--base-url');
  const siteUrlFromArg = siteUrlArgIndex >= 0 ? process.argv[siteUrlArgIndex + 1] : null;
  const siteUrl = (siteUrlFromArg || readSiteUrl()).replace(/\/+$/, '');

  const games = readJson(gamesJsonPath);
  const gameResult = generateGameSitemap(siteUrl, games);
  const staticResult = generateStaticSitemap(siteUrl, games);

  const sitemapEntries = [
    {
      loc: `${siteUrl}/sitemap-pages.xml`,
      lastmod: staticResult.latestLastmod,
    },
    {
      loc: `${siteUrl}/sitemap-games.xml`,
      lastmod: gameResult.latestLastmod,
    },
  ];

  generateSitemapIndex(siteUrl, sitemapEntries);

  console.log('[generate-sitemap] Site URL:', siteUrl);
  console.log('[generate-sitemap] Games in JSON:', games.length);
  console.log('[generate-sitemap] Unique valid slugs:', gameResult.validSlugs.length);
  console.log('[generate-sitemap] Game URLs written:', gameResult.entries.length);
  console.log('[generate-sitemap] Static URLs written:', staticResult.entries.length);

  const warnings = [...gameResult.warnings, ...staticResult.warnings];
  if (warnings.length > 0) {
    console.log('\nWarnings:');
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (gameResult.errors.length > 0) {
    console.error('\nErrors:');
    for (const error of gameResult.errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('\nSitemaps generated successfully.');
}

main();

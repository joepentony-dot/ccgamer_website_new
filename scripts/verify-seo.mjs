#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const repoRoot = process.cwd();
const DEFAULT_SITE_URL = 'https://www.cheekycommodoregamer.co.uk';
const SITEMAP_XMLNS = 'http://www.sitemaps.org/schemas/sitemap/0.9';
const REPORT_PATH = path.join(repoRoot, 'seo-audit-report.md');
const REQUIRED_FILES = [
  'robots.txt',
  'sitemap.xml',
  'sitemap-games.xml',
  'sitemap-pages.xml',
  'games/index.html',
  'games/games.json',
  'games/games-index.json',
  'games/games-search.json',
];

function readSiteUrl() {
  const cnamePath = path.join(repoRoot, 'CNAME');
  if (fs.existsSync(cnamePath)) {
    const cname = fs.readFileSync(cnamePath, 'utf8').trim();
    if (cname) return `https://${cname}`;
  }
  return DEFAULT_SITE_URL;
}

function toRepoRelative(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function ensureFile(relPath, errors, checks) {
  const fullPath = path.join(repoRoot, relPath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`Missing required output: ${relPath}`);
    return null;
  }
  checks.push(`Found required file \`${relPath}\`.`);
  return fullPath;
}

function parseLocs(xml, tagName) {
  const regex = new RegExp(`<${tagName}>\\s*<loc>([^<]+)</loc>(?:\\s*<lastmod>([^<]+)</lastmod>)?\\s*</${tagName}>`, 'g');
  const entries = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    entries.push({ loc: match[1].trim(), lastmod: (match[2] || '').trim() });
  }
  return entries;
}

function validateXmlShape(name, xml, rootTag, errors, checks) {
  const header = '<?xml version="1.0" encoding="UTF-8"?>';
  if (!xml.startsWith(header)) {
    errors.push(`${name} is missing the XML declaration.`);
  }
  if (!xml.includes(`<${rootTag} xmlns="${SITEMAP_XMLNS}"`)) {
    errors.push(`${name} does not declare the sitemap XML namespace.`);
  }
  if (!xml.trim().endsWith(`</${rootTag}>`)) {
    errors.push(`${name} is missing the closing </${rootTag}> tag.`);
  }
  if (!/[\r\n]/.test(xml)) {
    errors.push(`${name} does not look like valid XML output.`);
  }
  checks.push(`Validated XML wrapper for \`${name}\`.`);
}

function validateAbsoluteHttpsUrls(entries, sourceName, siteUrl, errors, warnings, checks) {
  const seen = new Set();
  for (const entry of entries) {
    if (!entry.loc.startsWith(`${siteUrl}/`) && entry.loc !== `${siteUrl}/`) {
      errors.push(`${sourceName} contains URL outside canonical site root: ${entry.loc}`);
      continue;
    }
    if (!entry.loc.startsWith('https://')) {
      errors.push(`${sourceName} contains non-HTTPS URL: ${entry.loc}`);
    }
    if (seen.has(entry.loc)) {
      errors.push(`${sourceName} contains duplicate URL: ${entry.loc}`);
    }
    seen.add(entry.loc);
    if (/\s/.test(entry.loc)) {
      errors.push(`${sourceName} contains whitespace in URL: ${entry.loc}`);
    }
    if (entry.lastmod && !/^\d{4}-\d{2}-\d{2}$/.test(entry.lastmod)) {
      errors.push(`${sourceName} contains invalid lastmod: ${entry.loc} -> ${entry.lastmod}`);
    }
    if (/\/games\/[^/]+\.html$/i.test(entry.loc)) {
      errors.push(`${sourceName} includes legacy .html game stub URL: ${entry.loc}`);
    }
    if (/\/redirect\.html$/i.test(entry.loc)) {
      errors.push(`${sourceName} includes redirect-only URL: ${entry.loc}`);
    }
    if (/\?/.test(entry.loc) || /#/.test(entry.loc)) {
      warnings.push(`${sourceName} contains query/hash URL: ${entry.loc}`);
    }
  }
  checks.push(`Validated ${entries.length} URL entries in \`${sourceName}\`.`);
}

function readHtmlMeta(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1]?.trim() || '';
  const ogUrl = html.match(/<meta[^>]+property=["']og:url["'][^>]*content=["']([^"']+)["']/i)?.[1]?.trim() || '';
  const robots = html.match(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']+)["']/i)?.[1]?.trim() || '';
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() || '';
  const description = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1]?.trim() || '';
  return { html, canonical, ogUrl, robots, title, description };
}

function validateHtmlPage(relPath, expectedCanonical, { requireOgUrl = false, allowNoindex = false } = {}, errors, warnings, checks) {
  const filePath = path.join(repoRoot, relPath);
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing sampled HTML page: ${relPath}`);
    return;
  }

  const meta = readHtmlMeta(filePath);
  if (!meta.title) {
    errors.push(`${relPath} is missing a <title>.`);
  }
  if (!meta.description) {
    warnings.push(`${relPath} is missing a meta description.`);
  }
  if (!meta.canonical) {
    errors.push(`${relPath} is missing a canonical URL.`);
  } else if (expectedCanonical && meta.canonical !== expectedCanonical) {
    errors.push(`${relPath} canonical mismatch. Expected ${expectedCanonical} but found ${meta.canonical}`);
  }
  if (requireOgUrl && meta.ogUrl !== meta.canonical) {
    errors.push(`${relPath} og:url mismatch. canonical=${meta.canonical || '(missing)'} og:url=${meta.ogUrl || '(missing)'}`);
  }
  if (!allowNoindex && /noindex/i.test(meta.robots)) {
    errors.push(`${relPath} is unexpectedly marked noindex.`);
  }
  checks.push(`Validated HTML metadata for \`${relPath}\`.`);
}

function main() {
  const siteUrl = readSiteUrl().replace(/\/+$/, '');
  const errors = [];
  const warnings = [];
  const checks = [];

  for (const relPath of REQUIRED_FILES) {
    ensureFile(relPath, errors, checks);
  }

  const robotsPath = path.join(repoRoot, 'robots.txt');
  const robots = fs.readFileSync(robotsPath, 'utf8');
  const sitemapLine = robots.split(/\r?\n/).find((line) => /^Sitemap:/i.test(line));
  if (!sitemapLine) {
    errors.push('robots.txt is missing a Sitemap directive.');
  } else {
    const robotsSitemapUrl = sitemapLine.replace(/^Sitemap:\s*/i, '').trim();
    const expected = `${siteUrl}/sitemap.xml`;
    if (robotsSitemapUrl !== expected) {
      errors.push(`robots.txt Sitemap directive mismatch. Expected ${expected} but found ${robotsSitemapUrl}`);
    }
    checks.push('Validated robots.txt sitemap directive.');
  }
  if (/Disallow:\s*\/\s*$/mi.test(robots)) {
    errors.push('robots.txt blocks the entire site.');
  }

  const sitemapIndexXml = fs.readFileSync(path.join(repoRoot, 'sitemap.xml'), 'utf8');
  const gamesSitemapXml = fs.readFileSync(path.join(repoRoot, 'sitemap-games.xml'), 'utf8');
  const pagesSitemapXml = fs.readFileSync(path.join(repoRoot, 'sitemap-pages.xml'), 'utf8');

  validateXmlShape('sitemap.xml', sitemapIndexXml, 'sitemapindex', errors, checks);
  validateXmlShape('sitemap-games.xml', gamesSitemapXml, 'urlset', errors, checks);
  validateXmlShape('sitemap-pages.xml', pagesSitemapXml, 'urlset', errors, checks);

  const sitemapIndexEntries = parseLocs(sitemapIndexXml, 'sitemap');
  const gameEntries = parseLocs(gamesSitemapXml, 'url');
  const pageEntries = parseLocs(pagesSitemapXml, 'url');

  validateAbsoluteHttpsUrls(sitemapIndexEntries, 'sitemap.xml', siteUrl, errors, warnings, checks);
  validateAbsoluteHttpsUrls(gameEntries, 'sitemap-games.xml', siteUrl, errors, warnings, checks);
  validateAbsoluteHttpsUrls(pageEntries, 'sitemap-pages.xml', siteUrl, errors, warnings, checks);

  const expectedChildSitemaps = new Set([
    `${siteUrl}/sitemap-games.xml`,
    `${siteUrl}/sitemap-pages.xml`,
  ]);
  for (const entry of sitemapIndexEntries) {
    expectedChildSitemaps.delete(entry.loc);
  }
  if (expectedChildSitemaps.size > 0) {
    errors.push(`sitemap.xml is missing child sitemap references: ${[...expectedChildSitemaps].join(', ')}`);
  }

  const pageLocs = new Set(pageEntries.map((entry) => entry.loc));
  const gameLocs = new Set(gameEntries.map((entry) => entry.loc));

  const homepageMeta = readHtmlMeta(path.join(repoRoot, 'index.html'));
  const gamesIndexMeta = readHtmlMeta(path.join(repoRoot, 'games', 'index.html'));
  validateHtmlPage('index.html', homepageMeta.canonical || `${siteUrl}/`, { requireOgUrl: true }, errors, warnings, checks);
  validateHtmlPage('games/index.html', gamesIndexMeta.canonical || `${siteUrl}/games/`, { requireOgUrl: true }, errors, warnings, checks);

  const gamesJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'games', 'games.json'), 'utf8'));
  const gamesIndexJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'games', 'games-index.json'), 'utf8'));
  const gamesSearchJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'games', 'games-search.json'), 'utf8'));

  if (!Array.isArray(gamesJson) || gamesJson.length === 0) {
    errors.push('games/games.json is empty or invalid.');
  }
  if (!Array.isArray(gamesIndexJson) || gamesIndexJson.length === 0) {
    errors.push('games/games-index.json is empty or invalid.');
  }
  if (!Array.isArray(gamesSearchJson) || gamesSearchJson.length === 0) {
    errors.push('games/games-search.json is empty or invalid.');
  }
  checks.push(`Validated game data assets: games.json=${gamesJson.length}, games-index.json=${gamesIndexJson.length}, games-search.json=${gamesSearchJson.length}.`);

  const firstGame = gamesJson.find((game) => game && typeof game.slug === 'string' && game.slug.trim());
  if (!firstGame) {
    errors.push('Could not find a valid game slug in games/games.json.');
  } else {
    const gameSlug = firstGame.slug.trim();
    const canonical = `${siteUrl}/games/${gameSlug}/`;
    const gameHtmlPath = fs.existsSync(path.join(repoRoot, 'games', gameSlug, 'index.html'))
      ? path.join('games', gameSlug, 'index.html')
      : path.join('games', `${gameSlug}.html`);
    validateHtmlPage(gameHtmlPath, canonical, { requireOgUrl: true }, errors, warnings, checks);
    if (!gameLocs.has(canonical)) {
      errors.push(`Sample game canonical missing from sitemap-games.xml: ${canonical}`);
    }
  }

  const redirectStub = firstGame ? path.join(repoRoot, 'games', `${firstGame.slug}.html`) : null;
  if (redirectStub && fs.existsSync(redirectStub)) {
    const redirectMeta = readHtmlMeta(redirectStub);
    if (!/noindex/i.test(redirectMeta.robots)) {
      errors.push(`Redirect stub games/${firstGame.slug}.html must remain noindex,follow.`);
    }
    checks.push(`Validated redirect stub metadata for \`games/${firstGame.slug}.html\`.`);
  }

  if (!pageLocs.has(gamesIndexMeta.canonical || `${siteUrl}/games/`)) {
    errors.push('sitemap-pages.xml is missing the canonical /games/ browse page URL.');
  }
  if (!pageLocs.has(homepageMeta.canonical || `${siteUrl}/`)) {
    errors.push('sitemap-pages.xml is missing the canonical homepage URL.');
  }

  const gamesIndexHtml = fs.readFileSync(path.join(repoRoot, 'games', 'index.html'), 'utf8');
  if (!gamesIndexHtml.includes('id="gamesTotalCount"')) {
    errors.push('games/index.html no longer contains the games total counter element.');
  }
  if (!fs.readFileSync(path.join(repoRoot, 'js', 'games-library.js'), 'utf8').includes('games-search.json')) {
    warnings.push('games-library.js does not reference games-search.json fallback logic.');
  } else {
    checks.push('Validated browse-page fallback reference to games-search.json.');
  }

  const report = [
    '# SEO Audit Report',
    '',
    `- Site URL: ${siteUrl}`,
    `- Timestamp: ${new Date().toISOString()}`,
    `- Errors: ${errors.length}`,
    `- Warnings: ${warnings.length}`,
    '',
    '## Checks',
    ...checks.map((item) => `- ${item}`),
    '',
    '## Warnings',
    ...(warnings.length ? warnings.map((item) => `- ${item}`) : ['- None.']),
    '',
    '## Errors',
    ...(errors.length ? errors.map((item) => `- ${item}`) : ['- None.']),
    '',
  ].join('\n');

  fs.writeFileSync(REPORT_PATH, report, 'utf8');
  console.log(report);

  if (errors.length > 0) {
    process.exitCode = 1;
  }
}

main();

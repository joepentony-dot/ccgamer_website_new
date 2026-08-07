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
  if (!xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) errors.push(`${name} is missing the XML declaration.`);
  if (!xml.includes(`<${rootTag} xmlns="${SITEMAP_XMLNS}"`)) errors.push(`${name} does not declare the sitemap XML namespace.`);
  if (!xml.trim().endsWith(`</${rootTag}>`)) errors.push(`${name} is missing the closing </${rootTag}> tag.`);
  checks.push(`Validated XML wrapper for \`${name}\`.`);
}

function readHtmlMeta(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const read = (pattern) => html.match(pattern)?.[1]?.trim() || '';
  return {
    html,
    canonical: read(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i),
    ogUrl: read(/<meta[^>]+property=["']og:url["'][^>]*content=["']([^"']+)["']/i),
    twitterUrl: read(/<meta[^>]+name=["']twitter:url["'][^>]*content=["']([^"']+)["']/i),
    robots: read(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']+)["']/i),
    title: read(/<title(?:\s[^>]*)?>([^<]+)<\/title>/i),
    description: read(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i),
    refreshTarget: read(/<meta[^>]+http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"']+)["']/i),
  };
}

function isNoindex(robotsValue) {
  return String(robotsValue || '')
    .toLowerCase()
    .split(',')
    .map((token) => token.trim())
    .includes('noindex');
}

function main() {
  const siteUrl = readSiteUrl().replace(/\/+$/, '');
  const errors = [];
  const warnings = [];
  const checks = [];

  for (const relPath of REQUIRED_FILES) ensureFile(relPath, errors, checks);

  const robots = fs.readFileSync(path.join(repoRoot, 'robots.txt'), 'utf8');
  const sitemapLine = robots.split(/\r?\n/).find((line) => /^Sitemap:/i.test(line));
  if (!sitemapLine) errors.push('robots.txt is missing a Sitemap directive.');
  else if (sitemapLine.replace(/^Sitemap:\s*/i, '').trim() !== `${siteUrl}/sitemap.xml`) errors.push('robots.txt Sitemap directive mismatch.');

  const sitemapIndexXml = fs.readFileSync(path.join(repoRoot, 'sitemap.xml'), 'utf8');
  const gamesSitemapXml = fs.readFileSync(path.join(repoRoot, 'sitemap-games.xml'), 'utf8');
  const pagesSitemapXml = fs.readFileSync(path.join(repoRoot, 'sitemap-pages.xml'), 'utf8');
  validateXmlShape('sitemap.xml', sitemapIndexXml, 'sitemapindex', errors, checks);
  validateXmlShape('sitemap-games.xml', gamesSitemapXml, 'urlset', errors, checks);
  validateXmlShape('sitemap-pages.xml', pagesSitemapXml, 'urlset', errors, checks);

  const sitemapIndexEntries = parseLocs(sitemapIndexXml, 'sitemap');
  const gameEntries = parseLocs(gamesSitemapXml, 'url');
  const pageEntries = parseLocs(pagesSitemapXml, 'url');
  const gameLocs = new Set();
  for (const entry of gameEntries) {
    if (!entry.loc.startsWith(`${siteUrl}/games/`)) errors.push(`sitemap-games.xml contains non-game URL: ${entry.loc}`);
    if (/\.html$/i.test(entry.loc)) errors.push(`sitemap-games.xml includes redirect stub URL: ${entry.loc}`);
    if (gameLocs.has(entry.loc)) errors.push(`sitemap-games.xml contains duplicate URL: ${entry.loc}`);
    gameLocs.add(entry.loc);
  }
  const pageLocs = new Set();
  for (const entry of pageEntries) {
    if (pageLocs.has(entry.loc)) errors.push(`sitemap-pages.xml contains duplicate URL: ${entry.loc}`);
    pageLocs.add(entry.loc);
  }
  const expectedChildren = new Set([`${siteUrl}/sitemap-games.xml`, `${siteUrl}/sitemap-pages.xml`]);
  sitemapIndexEntries.forEach((entry) => expectedChildren.delete(entry.loc));
  if (expectedChildren.size) errors.push(`sitemap.xml is missing child sitemap references: ${[...expectedChildren].join(', ')}`);

  const gamesJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'games', 'games.json'), 'utf8'));
  const gamesIndexJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'games', 'games-index.json'), 'utf8'));
  const gamesSearchJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'games', 'games-search.json'), 'utf8'));
  const bySlug = new Map();
  for (const game of gamesJson) {
    const slug = String(game?.slug || '').trim();
    if (!slug) {
      errors.push('games/games.json contains an entry with a missing slug.');
      continue;
    }
    if (bySlug.has(slug)) errors.push(`games/games.json contains duplicate slug: ${slug}`);
    bySlug.set(slug, game);
  }
  if (gamesIndexJson.length !== bySlug.size) errors.push(`games/games-index.json count mismatch. Expected ${bySlug.size}, found ${gamesIndexJson.length}`);
  if (gamesSearchJson.length !== bySlug.size) errors.push(`games/games-search.json count mismatch. Expected ${bySlug.size}, found ${gamesSearchJson.length}`);
  if (!fs.readFileSync(path.join(repoRoot, 'games', 'index.html'), 'utf8').includes('id="gamesTotalCount"')) errors.push('games/index.html no longer contains the games total counter element.');

  const seenIndex = new Set();
  gamesIndexJson.forEach((entry) => {
    const slug = String(entry?.slug || '').trim();
    if (!slug || !bySlug.has(slug)) errors.push(`games-index.json contains unknown slug: ${slug || '(missing)'}`);
    if (seenIndex.has(slug)) errors.push(`games-index.json contains duplicate slug: ${slug}`);
    seenIndex.add(slug);
  });
  const seenSearch = new Set();
  gamesSearchJson.forEach((entry) => {
    const slug = String(entry?.slug || '').trim();
    if (!slug || !bySlug.has(slug)) errors.push(`games-search.json contains unknown slug: ${slug || '(missing)'}`);
    if (seenSearch.has(slug)) errors.push(`games-search.json contains duplicate slug: ${slug}`);
    seenSearch.add(slug);
  });

  for (const slug of bySlug.keys()) {
    const canonicalUrl = `${siteUrl}/games/${slug}/`;
    const canonicalRel = path.join('games', slug, 'index.html');
    const canonicalPath = path.join(repoRoot, canonicalRel);
    const stubRel = path.join('games', `${slug}.html`);
    const stubPath = path.join(repoRoot, stubRel);

    if (!fs.existsSync(canonicalPath)) {
      errors.push(`Missing canonical page: ${canonicalRel}`);
      continue;
    }
    if (!fs.existsSync(stubPath)) {
      errors.push(`Missing redirect stub: ${stubRel}`);
      continue;
    }

    const meta = readHtmlMeta(canonicalPath);
    const canonicalNoindex = isNoindex(meta.robots);
    if (!canonicalNoindex) {
      if (meta.canonical !== canonicalUrl) errors.push(`${canonicalRel} canonical mismatch. Expected ${canonicalUrl} but found ${meta.canonical || '(missing)'}`);
      if (meta.ogUrl !== canonicalUrl) errors.push(`${canonicalRel} og:url mismatch. Expected ${canonicalUrl} but found ${meta.ogUrl || '(missing)'}`);
      if (meta.twitterUrl !== canonicalUrl) errors.push(`${canonicalRel} twitter:url mismatch. Expected ${canonicalUrl} but found ${meta.twitterUrl || '(missing)'}`);
      if (!gameLocs.has(canonicalUrl)) errors.push(`sitemap-games.xml is missing canonical URL: ${canonicalUrl}`);
    }
    if (!meta.title) errors.push(`${canonicalRel} is missing a <title>.`);
    if (!meta.description) errors.push(`${canonicalRel} is missing a meta description.`);

    const stubMeta = readHtmlMeta(stubPath);
    if (!isNoindex(stubMeta.robots) && stubMeta.canonical !== canonicalUrl) {
      errors.push(`${stubRel} canonical mismatch. Expected ${canonicalUrl} but found ${stubMeta.canonical || '(missing)'}`);
    }
    if (stubMeta.robots.toLowerCase() !== 'noindex,follow') errors.push(`${stubRel} robots mismatch. Expected noindex,follow but found ${stubMeta.robots || '(missing)'}`);
    if (stubMeta.refreshTarget !== `/games/${slug}/`) errors.push(`${stubRel} redirect target mismatch. Expected /games/${slug}/ but found ${stubMeta.refreshTarget || '(missing)'}`);
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
  if (errors.length > 0) process.exitCode = 1;
}

main();

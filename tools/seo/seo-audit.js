#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const gamesJsonPath = path.join(repoRoot, 'games', 'games.json');
const DEFAULT_SITE_URL = 'https://www.cheekycommodoregamer.co.uk';
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const IGNORE_DIRS = new Set([
  '.git',
  '.github',
  'node_modules',
  '.cache',
  '.netlify',
  'data/lemon-cache',
]);

const NON_GAME_PAGES = new Set(['index', 'game']);
const NON_GAME_PATH_PREFIXES = ['games/genres/', 'games/collections/'];
const SCAN_EXTENSIONS = new Set(['.html', '.js']);

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

function shouldIgnoreDir(relDir) {
  if (!relDir) return false;
  if (IGNORE_DIRS.has(relDir)) return true;
  const parts = relDir.split('/');
  return parts.some((part, index) => IGNORE_DIRS.has(parts.slice(0, index + 1).join('/')));
}

function walkFiles(startDir) {
  const results = [];
  const stack = [startDir];

  while (stack.length > 0) {
    const current = stack.pop();
    const relCurrent = toRepoRelative(current);
    if (shouldIgnoreDir(relCurrent)) continue;

    const dirents = fs.readdirSync(current, { withFileTypes: true });

    for (const dirent of dirents) {
      const fullPath = path.join(current, dirent.name);
      const relPath = toRepoRelative(fullPath);

      if (dirent.isDirectory()) {
        if (!shouldIgnoreDir(relPath)) {
          stack.push(fullPath);
        }
        continue;
      }

      const ext = path.extname(dirent.name).toLowerCase();
      if (SCAN_EXTENSIONS.has(ext)) {
        results.push(fullPath);
      }
    }
  }

  results.sort((a, b) => toRepoRelative(a).localeCompare(toRepoRelative(b)));
  return results;
}

function extractCanonicalHref(html) {
  const canonicalTagMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i);
  if (!canonicalTagMatch) return null;

  const hrefMatch = canonicalTagMatch[0].match(/href=["']([^"']+)["']/i);
  return hrefMatch ? hrefMatch[1].trim() : null;
}

function normalizeGamesPath(rawHref, siteUrl) {
  const href = rawHref.trim();
  if (!/\/?games\//i.test(href)) return null;

  let normalized = href;

  if (/^https?:\/\//i.test(normalized)) {
    if (!normalized.startsWith(siteUrl)) return null;
    normalized = normalized.slice(siteUrl.length);
  }

  normalized = normalized.replace(/^(\.\/|\.\.\/)*games\//i, '/games/');
  normalized = normalized.replace(/^[^/]*\/games\//i, '/games/');
  const [pathWithoutQuery] = normalized.split(/[?#]/);
  return pathWithoutQuery;
}

function findMatchesWithLines(content, regex) {
  const matches = [];
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (regex.test(line)) {
      matches.push({ line: i + 1, text: line.trim() });
    }
  }

  return matches;
}

function formatList(items) {
  if (items.length === 0) return '  (none)';
  return items.map((item) => `  - ${item}`).join('\n');
}

function main() {
  const siteUrl = readSiteUrl().replace(/\/+$/, '');
  const games = readJson(gamesJsonPath);

  const slugCounts = new Map();
  const missingSlugEntries = [];
  const invalidSlugEntries = [];

  for (const game of games) {
    const slug = typeof game.slug === 'string' ? game.slug.trim() : '';

    if (!slug) {
      missingSlugEntries.push(game);
      continue;
    }

    if (!SLUG_PATTERN.test(slug)) {
      invalidSlugEntries.push(game);
      continue;
    }

    slugCounts.set(slug, (slugCounts.get(slug) || 0) + 1);
  }

  const duplicateSlugs = [...slugCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([slug, count]) => `${slug} (x${count})`)
    .sort((a, b) => a.localeCompare(b));

  const slugSet = new Set(slugCounts.keys());

  const gamesDir = path.join(repoRoot, 'games');
  const gameHtmlFiles = fs.readdirSync(gamesDir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith('.html'))
    .map((d) => path.join(gamesDir, d.name));

  const gameHtmlSlugs = gameHtmlFiles.map((file) => path.basename(file, '.html'));

  const orphanGamePages = gameHtmlSlugs
    .filter((slug) => !slugSet.has(slug) && !NON_GAME_PAGES.has(slug))
    .sort();

  const missingGamePages = [...slugSet]
    .filter((slug) => !fs.existsSync(path.join(gamesDir, `${slug}.html`)))
    .sort();

  const reportLines = [];

  reportLines.push('=== SEO Audit Report ===');
  reportLines.push(`Site URL: ${siteUrl}`);
  reportLines.push(`Games in JSON: ${games.length}`);
  reportLines.push(`Unique slugs: ${slugSet.size}`);
  reportLines.push('');

  reportLines.push('Critical errors (fail CI):');
  reportLines.push(formatList(duplicateSlugs));
  reportLines.push('');

  reportLines.push('Warnings (non-blocking):');
  reportLines.push(`  Missing slugs: ${missingSlugEntries.length}`);
  reportLines.push(`  Invalid slugs: ${invalidSlugEntries.length}`);
  reportLines.push('');

  reportLines.push('Missing game pages:');
  reportLines.push(formatList(missingGamePages.map((s) => `games/${s}.html`)));
  reportLines.push('');

  reportLines.push('Orphan game pages:');
  reportLines.push(formatList(orphanGamePages.map((s) => `games/${s}.html`)));
  reportLines.push('');

  const report = reportLines.join('\n');
  console.log(report);

  // ✅ ONLY FAIL ON DUPLICATE SLUGS
  if (duplicateSlugs.length > 0) {
    console.error('[SEO] Duplicate slugs detected — failing build.');
    process.exitCode = 1;
  }
}

main();
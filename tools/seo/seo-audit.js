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
    if (shouldIgnoreDir(relCurrent)) {
      continue;
    }

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
    if (!normalized.startsWith(siteUrl)) {
      return null;
    }
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
  for (let i = 0; i < lines.length; i += 1) {
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
  const gameHtmlFiles = fs
    .readdirSync(gamesDir, { withFileTypes: true })
    .filter((dirent) => dirent.isFile() && dirent.name.endsWith('.html'))
    .map((dirent) => path.join(gamesDir, dirent.name));

  const gameHtmlSlugs = gameHtmlFiles.map((filePath) => path.basename(filePath, '.html'));

  const orphanGamePages = gameHtmlSlugs
    .filter((slug) => !slugSet.has(slug) && !NON_GAME_PAGES.has(slug))
    .sort((a, b) => a.localeCompare(b));

  const missingGamePages = [...slugSet]
    .filter((slug) => !fs.existsSync(path.join(gamesDir, `${slug}.html`)))
    .sort((a, b) => a.localeCompare(b));

  const filesToScan = walkFiles(repoRoot);

  const legacyIdRoutes = [];
  const nonCanonicalLinks = [];
  const brokenGameLinks = [];
  const canonicalIssues = [];

  for (const filePath of filesToScan) {
    const relPath = toRepoRelative(filePath);
    const content = fs.readFileSync(filePath, 'utf8');

    const idMatches = findMatchesWithLines(content, /\?id=/i);
    if (idMatches.length > 0) {
      for (const match of idMatches) {
        legacyIdRoutes.push(`${relPath}:L${match.line} ${match.text}`);
      }
    }

    const linkRegex = /(href|src)=["']([^"']*(?:\/games\/|games\/)[^"']*)["']/gi;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(content)) !== null) {
      const rawHref = linkMatch[2];
      const normalizedPath = normalizeGamesPath(rawHref, siteUrl);
      if (!normalizedPath) continue;

      if (/\.php$/i.test(normalizedPath)) {
        nonCanonicalLinks.push(`${relPath} -> ${rawHref} (legacy PHP route)`);
        continue;
      }

      const hasHtmlExtension = normalizedPath.endsWith('.html');
      const gamesPath = normalizedPath.replace(/^\//, '');
      const targetPath = path.join(repoRoot, gamesPath);
      const targetSlug = hasHtmlExtension ? path.basename(normalizedPath, '.html') : path.basename(normalizedPath);
      const isNonGamePath = NON_GAME_PATH_PREFIXES.some((prefix) => gamesPath.startsWith(prefix));

      if (!hasHtmlExtension && normalizedPath !== '/games/' && normalizedPath !== '/games') {
        nonCanonicalLinks.push(`${relPath} -> ${rawHref} (missing .html)`);
      }

      const targetExists =
        normalizedPath === '/games/' ||
        normalizedPath === '/games' ||
        fs.existsSync(targetPath) ||
        (!hasHtmlExtension && fs.existsSync(`${targetPath}.html`));

      if (!targetExists) {
        brokenGameLinks.push(`${relPath} -> ${rawHref}`);
      } else if (hasHtmlExtension && !isNonGamePath && !slugSet.has(targetSlug) && !NON_GAME_PAGES.has(targetSlug)) {
        nonCanonicalLinks.push(`${relPath} -> ${rawHref} (slug not in games.json)`);
      }
    }
  }

  for (const slug of [...slugSet].sort((a, b) => a.localeCompare(b))) {
    const filePath = path.join(gamesDir, `${slug}.html`);
    if (!fs.existsSync(filePath)) continue;

    const html = fs.readFileSync(filePath, 'utf8');
    const canonicalHref = extractCanonicalHref(html);
    if (!canonicalHref) {
      canonicalIssues.push(`games/${slug}.html missing rel=\"canonical\" tag.`);
      continue;
    }

    const expectedAbsolute = `${siteUrl}/games/${slug}.html`;
    const expectedRelative = `/games/${slug}.html`;
    if (canonicalHref !== expectedAbsolute && canonicalHref !== expectedRelative) {
      canonicalIssues.push(`games/${slug}.html canonical is ${canonicalHref} (expected ${expectedAbsolute}).`);
    }
  }

  const errors = [];
  if (missingSlugEntries.length > 0) {
    errors.push(`games.json entries missing slug: ${missingSlugEntries.length}`);
  }
  if (invalidSlugEntries.length > 0) {
    errors.push(`games.json entries with invalid slug format: ${invalidSlugEntries.length}`);
  }
  if (duplicateSlugs.length > 0) {
    errors.push(`Duplicate slugs found: ${duplicateSlugs.length}`);
  }

  const reportLines = [];
  reportLines.push('=== SEO Audit Report ===');
  reportLines.push(`Site URL: ${siteUrl}`);
  reportLines.push(`Games in JSON: ${games.length}`);
  reportLines.push(`Unique slugs: ${slugSet.size}`);
  reportLines.push('');

  reportLines.push('Critical errors (fail CI):');
  reportLines.push(formatList(errors));
  reportLines.push('');

  reportLines.push('Missing game pages for valid slugs:');
  reportLines.push(formatList(missingGamePages.map((slug) => `games/${slug}.html`)));
  reportLines.push('');

  reportLines.push('Orphan game pages (HTML without slug in games.json):');
  reportLines.push(formatList(orphanGamePages.map((slug) => `games/${slug}.html`)));
  reportLines.push('');

  reportLines.push('Canonical tag issues:');
  reportLines.push(formatList(canonicalIssues));
  reportLines.push('');

  reportLines.push('Non-canonical /games/ links found:');
  reportLines.push(formatList(nonCanonicalLinks));
  reportLines.push('');

  reportLines.push('Legacy ?id= routes found:');
  reportLines.push(formatList(legacyIdRoutes));
  reportLines.push('');

  reportLines.push('Broken /games/ links found:');
  reportLines.push(formatList(brokenGameLinks));
  reportLines.push('');

  const report = reportLines.join('\n');
  console.log(report);

  if (errors.length > 0) {
    process.exitCode = 1;
  }
}

main();

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const GAMES_PATH = 'games/games.json';
const PENDING_PATH = 'data/lemon-source-pending.json';
const REVIEW_ROOT = 'data/magazine-review-records';
const UTA_MAP_PATH = 'data/uta-game-matches.json';
const UTA_REVIEW_PATH = 'data/uta-manual-review.json';
const LEMON_CACHE_DIR = 'data/lemon-cache';

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonAtRef(ref, filePath) {
  try {
    const text = execFileSync('git', ['show', `${ref}:${filePath}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return JSON.parse(text);
  } catch {
    return [];
  }
}

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  return value === undefined || value === null || value === '' ? [] : [value];
}

export function pendingSlugs(payload) {
  const values = new Set();
  const add = (value) => {
    const slug = slugify(value);
    if (slug) values.add(slug);
  };

  const visit = (node, key = '') => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach((item) => visit(item));
      return;
    }
    if (typeof node === 'string') {
      if (key) add(key);
      add(node);
      return;
    }
    if (typeof node !== 'object') return;

    add(node.slug);
    add(node.gameSlug);
    add(node.game_slug);
    if (node.id && String(node.id).includes('-')) add(node.id);
    Object.entries(node).forEach(([childKey, child]) => {
      if (child && typeof child === 'object') visit(child, childKey);
      else if (/slug/i.test(childKey)) add(child);
    });
  };

  visit(payload);
  return values;
}

function normaliseList(value) {
  return toArray(value)
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
}

export function enrichmentIdentity(game) {
  return JSON.stringify({
    system: String(game?.system || '').toUpperCase(),
    slug: slugify(game?.slug || game?.title),
    title: String(game?.title || '').trim(),
    year: Number(game?.year) || null,
    publisher: normaliseList(game?.credits?.publisher || game?.publisher),
    reReleaser: normaliseList(game?.credits?.re_releaser),
    lemon: normaliseList(game?.lemon)
  });
}

export function changedGamesForEnrichment(previousGames, currentGames) {
  const previousByKey = new Map(
    toArray(previousGames).map((game) => [
      `${String(game?.system || '').toUpperCase()}|${slugify(game?.slug || game?.title)}`,
      enrichmentIdentity(game)
    ])
  );

  return toArray(currentGames).filter((game) => {
    const key = `${String(game?.system || '').toUpperCase()}|${slugify(game?.slug || game?.title)}`;
    return previousByKey.get(key) !== enrichmentIdentity(game);
  });
}

export function loadReviewKeys(root = REVIEW_ROOT) {
  const keys = new Set();
  if (!fs.existsSync(root)) return keys;

  const visit = (directory) => {
    fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath);
        return;
      }
      if (!entry.isFile() || !entry.name.endsWith('.json')) return;
      const parsed = readJson(fullPath, {});
      Object.keys(parsed?.games || {}).forEach((key) => keys.add(String(key).toLowerCase()));
    });
  };

  visit(root);
  return keys;
}

function normaliseUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    url.hash = '';
    return `${url.protocol}//${url.host}${url.pathname.replace(/\/+$/, '')}${url.search}`;
  } catch {
    return '';
  }
}

export function cachedLemonUrls(cacheDir = LEMON_CACHE_DIR) {
  const urls = new Set();
  if (!fs.existsSync(cacheDir)) return urls;

  fs.readdirSync(cacheDir)
    .filter((name) => name.endsWith('.html'))
    .forEach((name) => {
      const html = fs.readFileSync(path.join(cacheDir, name), 'utf8');
      const match = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)
        || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
      const url = normaliseUrl(match?.[1] || '');
      if (url) urls.add(url);
    });

  return urls;
}

function isC64(game) {
  const system = String(game?.system || '').trim().toUpperCase();
  return system === 'C64' || system === 'COMMODORE 64';
}

export function assessGameEnrichment(game, state) {
  const issues = [];
  const warnings = [];
  const slug = slugify(game?.slug || game?.title);
  const platform = isC64(game) ? 'c64' : 'amiga';
  const reviewKey = `${platform}:${slug}`;
  const hasReviewRows = state.reviewKeys.has(reviewKey);
  const pending = state.pending.has(slug);
  const explicitLemon = normaliseList(game?.lemon).map(normaliseUrl).filter(Boolean);
  const cachedExplicitLemon = explicitLemon.some((url) => state.cachedLemon.has(url));

  if (!hasReviewRows && pending) {
    issues.push('magazine review source discovery is unresolved');
  } else if (!hasReviewRows && explicitLemon.length && !cachedExplicitLemon) {
    issues.push('explicit Lemon magazine source has not been cached or verified');
  }

  if (isC64(game)) {
    const mapped = Boolean(state.utaMap?.games?.[slug]?.releases?.length);
    const manual = toArray(state.utaManual?.entries).find((entry) => slugify(entry?.gameSlug) === slug) || null;
    const excluded = toArray(manual?.excludedCandidates);
    const knownPublisherYearConflict = excluded.some((candidate) =>
      candidate?.publisherMatched === true && candidate?.yearCompatible === false
    );

    if (knownPublisherYearConflict) {
      issues.push('UTA contains a title/publisher match rejected only by release-year data');
    } else if (!mapped && manual) {
      issues.push('UTA contains title matches that still require publisher/re-release verification');
    } else if (mapped && manual) {
      warnings.push('UTA has additional title matches outside the verified publisher/re-release credits');
    }
  }

  return { slug, reviewKey, issues, warnings };
}

export function auditAllC64(games, state) {
  const rows = toArray(games)
    .filter(isC64)
    .map((game) => ({ game, result: assessGameEnrichment(game, state) }))
    .filter(({ result }) => result.issues.some((issue) => issue.startsWith('UTA ')));

  return rows.map(({ game, result }) => ({
    slug: result.slug,
    title: String(game?.title || result.slug),
    year: Number(game?.year) || null,
    issues: result.issues.filter((issue) => issue.startsWith('UTA '))
  }));
}

function buildState() {
  return {
    pending: pendingSlugs(readJson(PENDING_PATH, [])),
    reviewKeys: loadReviewKeys(),
    cachedLemon: cachedLemonUrls(),
    utaMap: readJson(UTA_MAP_PATH, { games: {} }) || { games: {} },
    utaManual: readJson(UTA_REVIEW_PATH, { entries: [] }) || { entries: [] }
  };
}

function main(argv = process.argv.slice(2)) {
  const baseIndex = argv.indexOf('--base');
  const baseRef = baseIndex >= 0 && argv[baseIndex + 1] ? argv[baseIndex + 1] : 'HEAD^';
  const current = readJson(GAMES_PATH, []);
  const state = buildState();

  if (argv.includes('--audit-all-c64')) {
    const audit = auditAllC64(current, state);
    console.log(`[publisher-enrichment] Full C64 UTA audit: ${current.filter(isC64).length} C64 games checked; ${audit.length} unresolved UTA candidate set(s) remain for source verification.`);
    audit.forEach((row) => console.log(` - ${row.slug}: ${row.title} (${row.year || 'unknown'}) — ${row.issues.join('; ')}`));
    return 0;
  }

  const previous = readJsonAtRef(baseRef, GAMES_PATH);
  const targets = changedGamesForEnrichment(previous, current);

  if (!targets.length) {
    console.log('[publisher-enrichment] No new or enrichment-relevant game records changed in this revision.');
    return 0;
  }

  const failures = [];
  targets.forEach((game) => {
    const result = assessGameEnrichment(game, state);
    result.warnings.forEach((warning) => {
      console.log(`[publisher-enrichment] WARN ${result.slug}: ${warning}.`);
    });
    if (result.issues.length) {
      failures.push({ game, result });
    } else {
      console.log(`[publisher-enrichment] PASS ${result.slug}: magazine and C64 tape-archive enrichment are complete or no verified source match exists.`);
    }
  });

  if (failures.length) {
    console.error('[publisher-enrichment] Publication is incomplete for the following new/changed game records:');
    failures.forEach(({ game, result }) => {
      console.error(` - ${game?.title || result.slug} (${result.slug}): ${result.issues.join('; ')}`);
    });
    console.error('[publisher-enrichment] Resolve the source data/retry queue before Reliable Games Publishing may mark the publication complete.');
    return 1;
  }

  console.log(`[publisher-enrichment] ${targets.length} new/changed game record(s) passed magazine and UTA completion validation.`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main();
}

export { main };

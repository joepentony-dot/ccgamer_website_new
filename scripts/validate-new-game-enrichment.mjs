#!/usr/bin/env node
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const baseIndex = args.indexOf('--base');
const baseRef = baseIndex >= 0 ? args[baseIndex + 1] : 'HEAD^';
const gamesPath = 'games/games.json';
const pendingPath = 'data/lemon-source-pending.json';

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function readJsonAtRef(ref, path) {
  try {
    const text = execFileSync('git', ['show', `${ref}:${path}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return JSON.parse(text);
  } catch {
    return [];
  }
}

function slugify(value) {
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

function pendingSlugs(payload) {
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

const current = readJson(gamesPath);
const previous = readJsonAtRef(baseRef, gamesPath);
const previousKeys = new Set(previous.map((game) => `${String(game?.system || '').toUpperCase()}|${slugify(game?.slug || game?.title)}`));
const added = current.filter((game) => !previousKeys.has(`${String(game?.system || '').toUpperCase()}|${slugify(game?.slug || game?.title)}`));

if (!added.length) {
  console.log('[publisher-enrichment] No newly added game records in this revision.');
  process.exit(0);
}

if (!fs.existsSync(pendingPath)) {
  console.log('[publisher-enrichment] No Lemon pending queue exists after discovery.');
  process.exit(0);
}

const pending = pendingSlugs(readJson(pendingPath));
const unresolved = added.filter((game) => pending.has(slugify(game?.slug || game?.title)));

if (unresolved.length) {
  console.error('[publisher-enrichment] New game publication is incomplete because automatic Lemon source discovery is unresolved:');
  unresolved.forEach((game) => console.error(` - ${game.title || game.slug} (${game.slug})`));
  console.error('[publisher-enrichment] Keep the source record, resolve/retry the Lemon source, then rerun Reliable Games Publishing.');
  process.exit(1);
}

console.log(`[publisher-enrichment] ${added.length} new game record(s) passed the Lemon pending-queue completion guard.`);

import { APP_PATHS } from './config.js';

const LOCAL_BACKUPS_KEY = 'ccg-admin-games-backups';
const MAX_BACKUPS = 20;
const GLOBAL_LIBRARY_KEY = 'CCG_GAMES_LIBRARY';

function ensureLibraryCache() {
  if (!window[GLOBAL_LIBRARY_KEY]) {
    window[GLOBAL_LIBRARY_KEY] = {
      games: null,
      loadedAt: null,
      source: 'unset'
    };
  }
  return window[GLOBAL_LIBRARY_KEY];
}

function downloadJson(filename, payload) {
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function fetchJson(path, label) {
  // Path correction: canonical static path works on localhost and GitHub Pages.
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`${label} failed to load (${response.status}).`);
  }

  try {
    return await response.json();
  } catch {
    throw new Error(`${label} returned invalid JSON.`);
  }
}

function readBackups() {
  try {
    const raw = localStorage.getItem(LOCAL_BACKUPS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeBackups(backups) {
  try {
    localStorage.setItem(LOCAL_BACKUPS_KEY, JSON.stringify(backups.slice(0, MAX_BACKUPS)));
  } catch {
    // Keep the editor usable even when localStorage is unavailable.
  }
}

function buildFileIndex(games) {
  const fileRefs = new Set();

  for (const game of games) {
    const candidates = [
      game.thumbnail,
      game.pdf,
      game.box_3d,
      ...(Array.isArray(game.disk) ? game.disk : []),
      ...(Array.isArray(game.lemon) ? game.lemon : [])
    ];

    for (const value of candidates) {
      if (!value || typeof value !== 'string') continue;
      const trimmed = value.trim();
      if (!trimmed || /^https?:\/\//i.test(trimmed)) continue;
      fileRefs.add(trimmed.replace(/^\/+/, ''));
    }
  }

  return [...fileRefs].sort();
}

export async function fetchGamesJson() {
  const games = await fetchJson(APP_PATHS.gamesJson, 'games.json');
  if (!Array.isArray(games)) {
    throw new Error('games.json is expected to be a top-level array.');
  }
  return { games };
}

export async function loadGamesLibrary({ force = false } = {}) {
  const cache = ensureLibraryCache();
  if (!force && Array.isArray(cache.games) && cache.games.length) {
    return cache;
  }

  const { games } = await fetchGamesJson();
  cache.games = games;
  cache.loadedAt = new Date().toISOString();
  cache.source = 'remote';
  return cache;
}

export function updateGamesLibrary(games, source = 'local') {
  const cache = ensureLibraryCache();
  cache.games = games;
  cache.loadedAt = new Date().toISOString();
  cache.source = source;
  return cache;
}

export function getGamesLibrarySync() {
  return ensureLibraryCache();
}

export function buildStubStructure({ slug, meta = {} } = {}) {
  const cleanSlug = String(slug || '').trim();
  if (!cleanSlug) {
    throw new Error('Slug is required to build a stub structure.');
  }

  return {
    root: `stubs/${cleanSlug}/`,
    folders: ['screenshots', 'box', 'docs'],
    metaJson: `${JSON.stringify(meta, null, 2)}\n`
  };
}

export async function fetchFileIndex() {
  const { games } = await fetchGamesJson();
  return { files: buildFileIndex(games) };
}

export async function fetchBackups() {
  return { backups: readBackups() };
}

export async function restoreBackup(backupId) {
  const backups = readBackups();
  const backup = backups.find((entry) => entry.id === backupId);
  if (!backup) {
    throw new Error('Backup not found in local browser storage.');
  }

  downloadJson('games.json', backup.games);
  return { restored: true, backupId };
}

export async function saveGamesJson({ games, message, role }) {
  if (!Array.isArray(games)) {
    throw new Error('Cannot save: games payload must be an array.');
  }

  const backupEntry = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    commit_message: message || `Local export by ${role || 'admin'}`,
    role: role || 'unknown',
    games
  };

  const existing = readBackups();
  writeBackups([backupEntry, ...existing]);

  updateGamesLibrary(games, 'client-download');

  // Path correction: export to client download instead of server write for static hosting.
  downloadJson('games.json', games);

  return {
    saved: true,
    mode: 'client-download',
    backup: backupEntry
  };
}

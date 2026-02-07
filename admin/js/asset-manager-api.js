import { APP_PATHS } from './config.js?v=admin-stable-20260207';

const ASSET_SNAPSHOT_KEY = 'ccg-admin-asset-snapshots';
const MAX_SNAPSHOTS = 20;

function decodeBase64(contentBase64) {
  const binary = atob(contentBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function triggerDownload(filename, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function loadGames() {
  // Path correction: canonical static path works on localhost and GitHub Pages.
  const response = await fetch(APP_PATHS.gamesJson, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Unable to read games index (${response.status}).`);
  }

  const payload = await response.json().catch(() => null);
  if (!Array.isArray(payload)) {
    throw new Error('Invalid games index payload.');
  }
  return payload;
}

function collectReferencedAssets(games) {
  const refs = new Set();

  for (const game of games) {
    const paths = [game.thumbnail, game.box_3d, ...(game.disk || [])];
    for (const value of paths) {
      if (!value || typeof value !== 'string') continue;
      if (/^https?:\/\//i.test(value)) continue;
      refs.add(value.replace(/^\/+/, ''));
    }
  }

  return [...refs].sort().map((path) => ({ path, size: 0 }));
}

function writeSnapshots(snapshots) {
  try {
    localStorage.setItem(ASSET_SNAPSHOT_KEY, JSON.stringify(snapshots.slice(0, MAX_SNAPSHOTS)));
  } catch {
    // Best-effort only.
  }
}

function readSnapshots() {
  try {
    const raw = localStorage.getItem(ASSET_SNAPSHOT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function scanAssets() {
  const games = await loadGames();
  const assets = collectReferencedAssets(games);
  return {
    assets,
    mode: 'static-index',
    source: APP_PATHS.gamesJson
  };
}

export async function getHealthReport() {
  const { assets } = await scanAssets();
  const byPath = new Map();

  for (const asset of assets) {
    const count = byPath.get(asset.path) || 0;
    byPath.set(asset.path, count + 1);
  }

  const duplicateRefs = [...byPath.entries()]
    .filter(([, count]) => count > 1)
    .map(([path, count]) => ({ path, count }));

  return {
    scannedAssets: assets.length,
    duplicateRefs,
    warnings: ['Static hosting mode: filesystem-level checks are unavailable in-browser.']
  };
}

export async function createSnapshot() {
  const snapshot = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    data: await scanAssets()
  };

  writeSnapshots([snapshot, ...readSnapshots()]);
  return {
    ok: true,
    snapshot,
    storedSnapshots: readSnapshots().length
  };
}

export async function uploadAssets(payload) {
  const destination = String(payload?.destination || '').replace(/^\/+|\/+$/g, '');
  const files = Array.isArray(payload?.files) ? payload.files : [];

  if (!destination) {
    throw new Error('Upload destination is required.');
  }

  for (const file of files) {
    if (!file?.name || !file?.contentBase64) {
      throw new Error('Each file requires name and contentBase64.');
    }

    // Path correction: static-host-safe export to client download rather than server write.
    const bytes = decodeBase64(file.contentBase64);
    const blob = new Blob([bytes], { type: file.mime || 'application/octet-stream' });
    triggerDownload(`${destination}/${file.name}`, blob);
  }

  return {
    ok: true,
    mode: 'client-download',
    exportedFiles: files.length
  };
}

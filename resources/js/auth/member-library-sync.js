import { getSupabaseClient } from './supabase-client.js';

const STORAGE_KEY = 'ccgPersonalGameLibraryV1';
const PREFERRED_SYSTEM_KEY = 'ccgMemberPreferredSystemV1';
const TABLE = 'profile_game_library';
const CSS_PATH = '/resources/css/member-library-sync.css';
const VALID_LISTS = new Set(['played', 'want', 'owned', 'still']);
const MISSING_SCHEMA_CODES = new Set(['42P01', '42703', 'PGRST204', 'PGRST205']);

const state = {
  client: null,
  user: null,
  cloudAvailable: false,
  initialised: false,
  suppressLocalEvent: false,
  remoteSlugs: new Set(),
  pushTimer: null
};

function text(value) {
  return String(value ?? '').trim();
}

function slug(value) {
  return text(value)
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/_/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function uniqueStrings(value) {
  const source = Array.isArray(value) ? value : [];
  return Array.from(new Set(source.map(text).filter(Boolean)));
}

function validLists(value) {
  return uniqueStrings(value).filter((item) => VALID_LISTS.has(item));
}

function validRating(value) {
  if (value === null || value === undefined || value === '') return '';
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return String(Math.min(10, Math.max(1, Math.round(number))));
}

function validDate(value) {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function ensureStylesheet() {
  if (document.querySelector(`link[href="${CSS_PATH}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CSS_PATH;
  document.head.appendChild(link);
}

function createButton(id, label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'auth-btn';
  button.id = id;
  button.textContent = label;
  return button;
}

function ensureInterface() {
  const section = document.getElementById('personalGameLibrary');
  const actions = section?.querySelector('.profile-library__actions');
  if (!section || !actions) return;

  actions.classList.add('member-library-sync-controls');
  const jsonExport = document.getElementById('exportPersonalLibrary');
  if (jsonExport) jsonExport.textContent = 'Export JSON';

  if (!document.getElementById('exportPersonalLibraryCsv')) {
    actions.insertBefore(createButton('exportPersonalLibraryCsv', 'Export CSV'), document.getElementById('clearPersonalLibrary') || null);
  }
  if (!document.getElementById('importPersonalLibraryButton')) {
    actions.insertBefore(createButton('importPersonalLibraryButton', 'Import JSON'), document.getElementById('clearPersonalLibrary') || null);
  }
  if (!document.getElementById('memberSyncLibraryNow')) {
    actions.insertBefore(createButton('memberSyncLibraryNow', 'Sync now'), document.getElementById('clearPersonalLibrary') || null);
  }
  if (!document.getElementById('importPersonalLibraryFile')) {
    const input = document.createElement('input');
    input.type = 'file';
    input.id = 'importPersonalLibraryFile';
    input.accept = '.json,application/json';
    input.hidden = true;
    actions.appendChild(input);
  }

  if (!document.getElementById('memberLibrarySyncStatus')) {
    const status = document.createElement('p');
    status.id = 'memberLibrarySyncStatus';
    status.className = 'member-sync-status';
    status.dataset.state = 'working';
    status.setAttribute('aria-live', 'polite');
    status.textContent = 'Checking account synchronisation…';
    actions.insertAdjacentElement('afterend', status);
  }

  const note = section.querySelector('.profile-library__note');
  if (note) {
    note.textContent = 'Record what you played, what you want to try and the games you owned. Your browser copy remains available while account synchronisation keeps the same library available on signed-in devices.';
  }

  const preferredNote = Array.from(document.querySelectorAll('.member-local-note')).find((node) => (
    /preferred system/i.test(node.textContent || '')
  ));
  if (preferredNote) {
    preferredNote.textContent = 'Preferred system is stored on your account when cloud synchronisation is available, with a browser fallback retained.';
  }

  const laterHeading = Array.from(document.querySelectorAll('.member-benefit-card h3')).find((node) => (
    /coming in later phases/i.test(node.textContent || '')
  ));
  const laterList = laterHeading?.parentElement?.querySelector('.member-benefit-list');
  if (laterHeading && laterList) {
    laterHeading.textContent = 'Coming in the Community Phase';
    laterList.innerHTML = '<li>Optional public member profiles</li><li>Shareable public collections</li><li>Member suggestions and correction tracking</li><li>Public badges controlled by privacy settings</li>';
  }
}

function readLocalLibrary() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
}

function normalizeLocalEntry(gameSlug, entry = {}) {
  const normalizedSlug = slug(gameSlug);
  return {
    slug: normalizedSlug,
    title: text(entry.title || normalizedSlug),
    system: text(entry.system),
    year: text(entry.year || entry.release_year),
    lists: validLists(entry.lists),
    customLists: uniqueStrings(entry.customLists || entry.custom_lists).slice(0, 20),
    rating: validRating(entry.rating),
    note: text(entry.note).slice(0, 2000),
    updatedAt: text(entry.updatedAt || entry.updated_at || new Date(0).toISOString())
  };
}

function normalizeLocalLibrary(source) {
  const result = {};
  Object.entries(source || {}).forEach(([gameSlug, entry]) => {
    const normalized = normalizeLocalEntry(gameSlug, entry);
    if (!normalized.slug) return;
    const hasContent = normalized.lists.length
      || normalized.customLists.length
      || normalized.rating
      || normalized.note;
    if (hasContent) result[normalized.slug] = normalized;
  });
  return result;
}

function remoteToLocal(row = {}) {
  return normalizeLocalEntry(row.game_slug, {
    title: row.title,
    system: row.system,
    year: row.release_year,
    lists: row.lists,
    customLists: row.custom_lists,
    rating: row.rating,
    note: row.note,
    updatedAt: row.updated_at
  });
}

function mergeEntries(localEntry, remoteEntry) {
  if (!localEntry) return remoteEntry;
  if (!remoteEntry) return localEntry;

  const localNewer = validDate(localEntry.updatedAt) >= validDate(remoteEntry.updatedAt);
  const newest = localNewer ? localEntry : remoteEntry;
  const older = localNewer ? remoteEntry : localEntry;

  return normalizeLocalEntry(newest.slug || older.slug, {
    title: newest.title || older.title,
    system: newest.system || older.system,
    year: newest.year || older.year,
    lists: Array.from(new Set([...(localEntry.lists || []), ...(remoteEntry.lists || [])])),
    customLists: Array.from(new Set([...(localEntry.customLists || []), ...(remoteEntry.customLists || [])])),
    rating: newest.rating || older.rating,
    note: newest.note || older.note,
    updatedAt: validDate(newest.updatedAt) ? newest.updatedAt : older.updatedAt
  });
}

function librariesEqual(a, b) {
  return JSON.stringify(normalizeLocalLibrary(a)) === JSON.stringify(normalizeLocalLibrary(b));
}

function writeLocalLibrary(library) {
  const normalized = normalizeLocalLibrary(library);
  if (librariesEqual(readLocalLibrary(), normalized)) return false;
  state.suppressLocalEvent = true;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    document.dispatchEvent(new Event('ccg:personal-library-updated'));
  } finally {
    window.setTimeout(() => { state.suppressLocalEvent = false; }, 0);
  }
  return true;
}

function setStatus(message, mode = 'working') {
  const node = document.getElementById('memberLibrarySyncStatus');
  if (!node) return;
  node.textContent = message;
  node.dataset.state = mode;
}

function isMissingSchema(error) {
  return MISSING_SCHEMA_CODES.has(String(error?.code || ''));
}

function payloadFromEntry(entry) {
  return {
    profile_id: state.user.id,
    game_slug: entry.slug,
    title: entry.title || null,
    system: entry.system || null,
    release_year: entry.year || null,
    lists: validLists(entry.lists),
    custom_lists: uniqueStrings(entry.customLists).slice(0, 20),
    rating: entry.rating ? Number(entry.rating) : null,
    note: entry.note || '',
    updated_at: validDate(entry.updatedAt) ? entry.updatedAt : new Date().toISOString()
  };
}

async function fetchRemoteLibrary() {
  const { data, error } = await state.client
    .from(TABLE)
    .select('game_slug,title,system,release_year,lists,custom_lists,rating,note,created_at,updated_at')
    .eq('profile_id', state.user.id)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

async function upsertEntries(entries) {
  if (!entries.length) return;
  const { error } = await state.client
    .from(TABLE)
    .upsert(entries.map(payloadFromEntry), { onConflict: 'profile_id,game_slug' });
  if (error) throw error;
}

async function deleteRemoteSlugs(slugs) {
  if (!slugs.length) return;
  const { error } = await state.client
    .from(TABLE)
    .delete()
    .eq('profile_id', state.user.id)
    .in('game_slug', slugs);
  if (error) throw error;
}

async function loadPreferredSystem() {
  try {
    const { data, error } = await state.client
      .from('profiles')
      .select('preferred_system')
      .eq('id', state.user.id)
      .maybeSingle();
    if (error) throw error;
    const preferred = ['c64', 'amiga', 'both'].includes(data?.preferred_system) ? data.preferred_system : 'both';
    localStorage.setItem(PREFERRED_SYSTEM_KEY, preferred);
    const select = document.getElementById('preferredSystem');
    if (select) {
      select.value = preferred;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  } catch (error) {
    if (!isMissingSchema(error)) console.warn('[member-library-sync] Preferred system read failed', error);
  }
}

async function savePreferredSystem(value) {
  if (!state.user) return;
  const preferred = ['c64', 'amiga', 'both'].includes(value) ? value : 'both';
  try {
    const { error } = await state.client.from('profiles').update({ preferred_system: preferred }).eq('id', state.user.id);
    if (error) throw error;
  } catch (error) {
    if (!isMissingSchema(error)) console.warn('[member-library-sync] Preferred system save failed', error);
  }
}

async function reconcileLibraries() {
  setStatus('Checking your account library…', 'working');
  const local = normalizeLocalLibrary(readLocalLibrary());
  let remoteRows;
  try {
    remoteRows = await fetchRemoteLibrary();
  } catch (error) {
    if (isMissingSchema(error)) {
      state.cloudAvailable = false;
      setStatus('Device-only mode: account synchronisation is awaiting the database migration.', 'local');
      return;
    }
    throw error;
  }

  state.cloudAvailable = true;
  state.remoteSlugs = new Set(remoteRows.map((row) => slug(row.game_slug)).filter(Boolean));
  const remote = {};
  remoteRows.forEach((row) => {
    const entry = remoteToLocal(row);
    if (entry.slug) remote[entry.slug] = entry;
  });

  const merged = {};
  new Set([...Object.keys(local), ...Object.keys(remote)]).forEach((gameSlug) => {
    const entry = mergeEntries(local[gameSlug], remote[gameSlug]);
    if (entry) merged[gameSlug] = entry;
  });

  writeLocalLibrary(merged);
  const entries = Object.values(merged);
  await upsertEntries(entries);
  state.remoteSlugs = new Set(entries.map((entry) => entry.slug));
  setStatus(`Account sync ready · ${entries.length} ${entries.length === 1 ? 'game' : 'games'} available on this account.`, 'synced');
}

async function pushLocalLibrary() {
  if (!state.cloudAvailable || !state.initialised) return;
  const entries = Object.values(normalizeLocalLibrary(readLocalLibrary()));
  setStatus('Synchronising changes…', 'working');
  try {
    await upsertEntries(entries);
    const localSlugs = new Set(entries.map((entry) => entry.slug));
    await deleteRemoteSlugs([...state.remoteSlugs].filter((gameSlug) => !localSlugs.has(gameSlug)));
    state.remoteSlugs = localSlugs;
    setStatus(`Synced · ${entries.length} ${entries.length === 1 ? 'game' : 'games'} stored on your account.`, 'synced');
  } catch (error) {
    if (isMissingSchema(error)) {
      state.cloudAvailable = false;
      setStatus('Saved on this browser. Account sync is awaiting the database migration.', 'local');
      return;
    }
    console.error('[member-library-sync] Push failed', error);
    setStatus('Saved on this browser, but account sync failed. Try Sync now.', 'error');
  }
}

function schedulePush() {
  if (state.suppressLocalEvent || !state.initialised || !state.cloudAvailable) return;
  window.clearTimeout(state.pushTimer);
  state.pushTimer = window.setTimeout(() => { void pushLocalLibrary(); }, 700);
}

function csvCell(value) {
  const output = Array.isArray(value) ? value.join(' | ') : String(value ?? '');
  return `"${output.replace(/"/g, '""')}"`;
}

function downloadFile(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function exportCsv() {
  const rows = Object.values(normalizeLocalLibrary(readLocalLibrary())).sort((a, b) => a.title.localeCompare(b.title));
  const columns = ['title', 'slug', 'system', 'year', 'lists', 'customLists', 'rating', 'note', 'updatedAt'];
  const csv = [columns.map(csvCell).join(','), ...rows.map((entry) => columns.map((column) => csvCell(entry[column])).join(','))].join('\r\n');
  downloadFile('ccg-personal-game-library.csv', csv, 'text/csv;charset=utf-8');
  setStatus('CSV export created.', state.cloudAvailable ? 'synced' : 'local');
}

function normalizeImportedLibrary(payload) {
  const source = payload?.games && typeof payload.games === 'object' ? payload.games : payload;
  if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('This file does not contain a CCG personal game library.');
  return normalizeLocalLibrary(source);
}

async function importJsonFile(file) {
  const imported = normalizeImportedLibrary(JSON.parse(await file.text()));
  const current = normalizeLocalLibrary(readLocalLibrary());
  const merged = { ...current };
  Object.entries(imported).forEach(([gameSlug, entry]) => { merged[gameSlug] = mergeEntries(current[gameSlug], entry); });
  writeLocalLibrary(merged);
  if (state.cloudAvailable) await pushLocalLibrary();
  else setStatus(`Imported ${Object.keys(imported).length} games on this browser.`, 'local');
}

function bindControls() {
  document.addEventListener('ccg:personal-library-updated', schedulePush);
  document.getElementById('memberSyncLibraryNow')?.addEventListener('click', () => {
    if (state.cloudAvailable) void pushLocalLibrary();
    else void reconcileLibraries().catch((error) => {
      console.error('[member-library-sync] Manual sync failed', error);
      setStatus('Account sync could not be started. Your browser data is unchanged.', 'error');
    });
  });
  document.getElementById('exportPersonalLibraryCsv')?.addEventListener('click', exportCsv);

  const input = document.getElementById('importPersonalLibraryFile');
  document.getElementById('importPersonalLibraryButton')?.addEventListener('click', () => input?.click());
  input?.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    setStatus('Importing library…', 'working');
    try {
      await importJsonFile(file);
      setStatus('Library import complete.', state.cloudAvailable ? 'synced' : 'local');
    } catch (error) {
      console.error('[member-library-sync] Import failed', error);
      setStatus(error.message || 'The library file could not be imported.', 'error');
    } finally {
      input.value = '';
    }
  });

  document.getElementById('preferredSystem')?.addEventListener('change', (event) => {
    if (state.initialised) void savePreferredSystem(event.target.value);
  });
}

async function init() {
  if (!document.getElementById('memberHub')) return;
  ensureStylesheet();
  ensureInterface();
  bindControls();

  try {
    state.client = await getSupabaseClient();
    const { data, error } = await state.client.auth.getUser();
    if (error) throw error;
    state.user = data?.user || null;
    if (!state.user) return;
    await loadPreferredSystem();
    await reconcileLibraries();
    state.initialised = true;
  } catch (error) {
    console.error('[member-library-sync] Initialisation failed', error);
    state.initialised = true;
    state.cloudAvailable = false;
    setStatus('Browser data is available, but account sync could not be started.', 'error');
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();

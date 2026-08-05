import { getSupabaseClient } from './supabase-client.js';

const STORAGE_KEY = 'ccgPersonalGameLibraryV1';
const TOMBSTONE_KEY = 'ccgPersonalGameLibraryTombstonesV1';
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

function isoDate(value, fallback = '') {
  const timestamp = validDate(value);
  return timestamp ? new Date(timestamp).toISOString() : fallback;
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

function updateMemberBenefitCopy() {
  const heading = Array.from(document.querySelectorAll('.member-benefit-card h3')).find((node) => (
    /coming in later phases|coming in the community phase/i.test(node.textContent || '')
  ));
  const list = heading?.parentElement?.querySelector('.member-benefit-list');
  if (!heading || !list) return;

  heading.textContent = 'Member Hub Features';
  list.innerHTML = [
    '<li>Account-synchronised personal lists and private custom collections</li>',
    '<li>Optional public profile with privacy controls</li>',
    '<li>Member suggestions and correction tracking</li>',
    '<li>Monthly loyalty badges that can be shared on Discord</li>'
  ].join('');
}

function ensureInterface() {
  const section = document.getElementById('personalGameLibrary');
  const actions = section?.querySelector('.profile-library__actions');
  if (!section || !actions) return;

  actions.classList.add('member-library-sync-controls');

  [
    'importPersonalLibraryButton',
    'importPersonalLibraryFile',
    'exportPersonalLibraryCsv'
  ].forEach((id) => document.getElementById(id)?.remove());

  if (!document.getElementById('memberSyncLibraryNow')) {
    actions.insertBefore(createButton('memberSyncLibraryNow', 'Sync now'), document.getElementById('clearPersonalLibrary') || null);
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
    note.textContent = 'Record what you played, what you want to try and the games you owned. Your browser copy remains available while account synchronisation keeps the same private library on signed-in devices.';
  }

  const preferredNote = Array.from(document.querySelectorAll('.member-local-note')).find((node) => (
    /preferred system/i.test(node.textContent || '')
  ));
  if (preferredNote) {
    preferredNote.textContent = 'Preferred system is stored on your account when cloud synchronisation is available, with a browser fallback retained.';
  }

  const achievementsIntro = document.querySelector('#memberAchievements .member-panel__intro');
  if (achievementsIntro) {
    achievementsIntro.textContent = 'Activity milestones remain private. Your monthly loyalty badge is based on the earliest valid account membership date.';
  }

  updateMemberBenefitCopy();
}

function readObject(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
}

function readLocalLibrary() {
  return readObject(STORAGE_KEY);
}

function readLocalTombstones() {
  return readObject(TOMBSTONE_KEY);
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
    updatedAt: isoDate(entry.updatedAt || entry.updated_at, new Date(0).toISOString())
  };
}

function entryHasContent(entry) {
  return Boolean(
    entry?.lists?.length
    || entry?.customLists?.length
    || entry?.rating
    || entry?.note
  );
}

function normalizeLocalLibrary(source) {
  const result = {};
  Object.entries(source || {}).forEach(([gameSlug, entry]) => {
    const normalized = normalizeLocalEntry(gameSlug, entry);
    if (!normalized.slug || !entryHasContent(normalized)) return;
    result[normalized.slug] = normalized;
  });
  return result;
}

function normalizeTombstones(source) {
  const result = {};
  Object.entries(source || {}).forEach(([gameSlug, deletedAt]) => {
    const normalizedSlug = slug(gameSlug);
    const normalizedDate = isoDate(deletedAt);
    if (normalizedSlug && normalizedDate) result[normalizedSlug] = normalizedDate;
  });
  return result;
}

function localStateMap() {
  const library = normalizeLocalLibrary(readLocalLibrary());
  const tombstones = normalizeTombstones(readLocalTombstones());
  const result = new Map();

  Object.entries(library).forEach(([gameSlug, entry]) => {
    result.set(gameSlug, {
      slug: gameSlug,
      deleted: false,
      timestamp: validDate(entry.updatedAt),
      timestampIso: entry.updatedAt,
      entry
    });
  });

  Object.entries(tombstones).forEach(([gameSlug, deletedAt]) => {
    const deletionState = {
      slug: gameSlug,
      deleted: true,
      timestamp: validDate(deletedAt),
      timestampIso: deletedAt,
      entry: null
    };
    const existing = result.get(gameSlug);
    if (!existing || deletionState.timestamp >= existing.timestamp) result.set(gameSlug, deletionState);
  });

  return result;
}

function remoteState(row = {}) {
  const gameSlug = slug(row.game_slug);
  if (!gameSlug) return null;

  const deletedAt = isoDate(row.deleted_at);
  const updatedAt = isoDate(row.updated_at, new Date(0).toISOString());
  const deletedTimestamp = validDate(deletedAt);
  const updatedTimestamp = validDate(updatedAt);

  if (deletedAt && deletedTimestamp >= updatedTimestamp) {
    return {
      slug: gameSlug,
      deleted: true,
      timestamp: deletedTimestamp,
      timestampIso: deletedAt,
      entry: null
    };
  }

  if (deletedAt) {
    return {
      slug: gameSlug,
      deleted: true,
      timestamp: Math.max(deletedTimestamp, updatedTimestamp),
      timestampIso: new Date(Math.max(deletedTimestamp, updatedTimestamp)).toISOString(),
      entry: null
    };
  }

  const entry = normalizeLocalEntry(gameSlug, {
    title: row.title,
    system: row.system,
    year: row.release_year,
    lists: row.lists,
    customLists: row.custom_lists,
    rating: row.rating,
    note: row.note,
    updatedAt
  });

  return {
    slug: gameSlug,
    deleted: false,
    timestamp: validDate(entry.updatedAt),
    timestampIso: entry.updatedAt,
    entry
  };
}

function newerState(localValue, remoteValue) {
  if (!localValue) return remoteValue;
  if (!remoteValue) return localValue;
  if (localValue.timestamp > remoteValue.timestamp) return localValue;
  if (remoteValue.timestamp > localValue.timestamp) return remoteValue;
  if (localValue.deleted !== remoteValue.deleted) return localValue.deleted ? localValue : remoteValue;
  return localValue;
}

function librariesEqual(a, b) {
  return JSON.stringify(normalizeLocalLibrary(a)) === JSON.stringify(normalizeLocalLibrary(b));
}

function tombstonesEqual(a, b) {
  return JSON.stringify(normalizeTombstones(a)) === JSON.stringify(normalizeTombstones(b));
}

function writeLocalState(library, tombstones) {
  const normalizedLibrary = normalizeLocalLibrary(library);
  const normalizedTombstones = normalizeTombstones(tombstones);
  const libraryChanged = !librariesEqual(readLocalLibrary(), normalizedLibrary);
  const tombstonesChanged = !tombstonesEqual(readLocalTombstones(), normalizedTombstones);
  if (!libraryChanged && !tombstonesChanged) return false;

  state.suppressLocalEvent = true;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedLibrary));
    localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(normalizedTombstones));
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

function payloadFromState(value) {
  if (value.deleted) {
    return {
      profile_id: state.user.id,
      game_slug: value.slug,
      title: null,
      system: null,
      release_year: null,
      lists: [],
      custom_lists: [],
      rating: null,
      note: '',
      deleted_at: value.timestampIso,
      updated_at: value.timestampIso
    };
  }

  const entry = value.entry;
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
    deleted_at: null,
    updated_at: validDate(entry.updatedAt) ? entry.updatedAt : new Date().toISOString()
  };
}

async function fetchRemoteLibrary() {
  const { data, error } = await state.client
    .from(TABLE)
    .select('game_slug,title,system,release_year,lists,custom_lists,rating,note,deleted_at,created_at,updated_at')
    .eq('profile_id', state.user.id)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

async function upsertStates(values) {
  if (!values.length) return;
  const { error } = await state.client
    .from(TABLE)
    .upsert(values.map(payloadFromState), { onConflict: 'profile_id,game_slug' });
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

async function reconcileLibraries({ workingMessage = 'Checking your account library…', successPrefix = 'Account sync ready' } = {}) {
  setStatus(workingMessage, 'working');
  const local = localStateMap();
  let remoteRows;

  try {
    remoteRows = await fetchRemoteLibrary();
  } catch (error) {
    if (isMissingSchema(error)) {
      state.cloudAvailable = false;
      setStatus('Device-only mode: account synchronisation is awaiting the Phase 7B deletion-safety migration.', 'local');
      return false;
    }
    throw error;
  }

  state.cloudAvailable = true;
  const remote = new Map();
  remoteRows.forEach((row) => {
    const value = remoteState(row);
    if (value) remote.set(value.slug, value);
  });

  const winners = [];
  const library = {};
  const tombstones = {};

  new Set([...local.keys(), ...remote.keys()]).forEach((gameSlug) => {
    const winner = newerState(local.get(gameSlug), remote.get(gameSlug));
    if (!winner) return;
    winners.push(winner);

    if (winner.deleted) {
      tombstones[gameSlug] = winner.timestampIso;
      return;
    }

    library[gameSlug] = winner.entry;
  });

  writeLocalState(library, tombstones);
  await upsertStates(winners);

  const activeCount = Object.keys(library).length;
  setStatus(`${successPrefix} · ${activeCount} ${activeCount === 1 ? 'game' : 'games'} available on this account.`, 'synced');
  return true;
}

async function pushLocalLibrary() {
  if (!state.cloudAvailable || !state.initialised) return;
  try {
    await reconcileLibraries({
      workingMessage: 'Synchronising changes…',
      successPrefix: 'Synced'
    });
  } catch (error) {
    if (isMissingSchema(error)) {
      state.cloudAvailable = false;
      setStatus('Saved on this browser. Account sync is awaiting the Phase 7B deletion-safety migration.', 'local');
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

function bindControls() {
  document.addEventListener('ccg:personal-library-updated', schedulePush);

  document.getElementById('memberSyncLibraryNow')?.addEventListener('click', () => {
    void reconcileLibraries({
      workingMessage: 'Checking both copies of your library…',
      successPrefix: 'Sync complete'
    }).catch((error) => {
      console.error('[member-library-sync] Manual sync failed', error);
      setStatus('Account sync could not be started. Your browser data is unchanged.', 'error');
    });
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
    state.initialised = true;
    await reconcileLibraries();
  } catch (error) {
    console.error('[member-library-sync] Initialisation failed', error);
    state.initialised = true;
    state.cloudAvailable = false;
    setStatus('Browser data is available, but account sync could not be started.', 'error');
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else void init();

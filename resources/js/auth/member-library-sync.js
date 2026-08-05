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
  return Array.from(new Set((Array.isArray(value) ? value : []).map(text).filter(Boolean)));
}

function validLists(value) {
  return uniqueStrings(value).filter((item) => VALID_LISTS.has(item));
}

function validRating(value) {
  if (value === null || value === undefined || value === '') return '';
  const number = Number(value);
  return Number.isFinite(number) ? String(Math.min(10, Math.max(1, Math.round(number)))) : '';
}

function timestamp(value) {
  const parsed = new Date(value || 0).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
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

function updateMemberCopy() {
  const note = document.querySelector('#personalGameLibrary .profile-library__note');
  if (note) {
    note.textContent = 'Record what you played, what you want to try and the games you owned. Signed-in account synchronisation keeps the same library available across your devices when the Member Hub database migration is active.';
  }

  const preferredNote = Array.from(document.querySelectorAll('.member-local-note')).find((node) => /preferred system/i.test(node.textContent || ''));
  if (preferredNote) {
    preferredNote.textContent = 'Preferred system is stored on your account when cloud synchronisation is available, with a browser fallback retained.';
  }

  const laterHeading = Array.from(document.querySelectorAll('.member-benefit-card h3')).find((node) => /coming in later phases|coming in the community phase/i.test(node.textContent || ''));
  const laterList = laterHeading?.parentElement?.querySelector('.member-benefit-list');
  if (laterHeading && laterList) {
    laterHeading.textContent = 'Member Hub Features';
    laterList.innerHTML = '<li>Account-synchronised personal lists</li><li>Private named custom collections</li><li>Optional public profile controlled by privacy settings</li><li>Member suggestions and correction tracking</li>';
  }
}

function ensureInterface() {
  const section = document.getElementById('personalGameLibrary');
  const actions = section?.querySelector('.profile-library__actions');
  if (!section || !actions) return;

  actions.classList.add('member-library-sync-controls');
  ['importPersonalLibraryButton', 'importPersonalLibraryFile', 'exportPersonalLibraryCsv'].forEach((id) => document.getElementById(id)?.remove());

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

  updateMemberCopy();
}

function readLocalLibrary() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
}

function normalizeEntry(gameSlug, entry = {}) {
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

function normalizeLibrary(source) {
  const result = {};
  Object.entries(source || {}).forEach(([gameSlug, entry]) => {
    const normalized = normalizeEntry(gameSlug, entry);
    if (!normalized.slug) return;
    const hasContent = normalized.lists.length || normalized.customLists.length || normalized.rating || normalized.note;
    if (hasContent) result[normalized.slug] = normalized;
  });
  return result;
}

function remoteToLocal(row = {}) {
  return normalizeEntry(row.game_slug, {
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

/* Newest complete record wins. This preserves deliberate removals instead of restoring stale list memberships. */
function mergeEntries(localEntry, remoteEntry) {
  if (!localEntry) return remoteEntry;
  if (!remoteEntry) return localEntry;
  return timestamp(localEntry.updatedAt) >= timestamp(remoteEntry.updatedAt) ? localEntry : remoteEntry;
}

function writeLocalLibrary(library) {
  const normalized = normalizeLibrary(library);
  if (JSON.stringify(normalizeLibrary(readLocalLibrary())) === JSON.stringify(normalized)) return false;
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

function payload(entry) {
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
    updated_at: timestamp(entry.updatedAt) ? entry.updatedAt : new Date().toISOString()
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
  const { error } = await state.client.from(TABLE).upsert(entries.map(payload), { onConflict: 'profile_id,game_slug' });
  if (error) throw error;
}

async function deleteRemoteSlugs(slugs) {
  if (!slugs.length) return;
  const { error } = await state.client.from(TABLE).delete().eq('profile_id', state.user.id).in('game_slug', slugs);
  if (error) throw error;
}

async function loadPreferredSystem() {
  try {
    const { data, error } = await state.client.from('profiles').select('preferred_system').eq('id', state.user.id).maybeSingle();
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
  const local = normalizeLibrary(readLocalLibrary());
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
  const entries = Object.values(normalizeLibrary(readLocalLibrary()));
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

function bindControls() {
  document.addEventListener('ccg:personal-library-updated', schedulePush);
  document.getElementById('memberSyncLibraryNow')?.addEventListener('click', () => {
    if (state.cloudAvailable) void pushLocalLibrary();
    else void reconcileLibraries().catch((error) => {
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
import { getSupabaseClient } from './supabase-client.js';

const TABLE_NAME = 'profile_game_library';
const STORAGE_PREFIX = 'ccgProfileGameLibrary:';
const MISSING_TABLE_CODES = new Set(['42P01', 'PGRST205', 'PGRST204']);
const FILTERS = new Set(['all', 'played', 'want_to_play', 'owned_as_child', 'still_own']);

const state = {
  supabase: null,
  user: null,
  games: [],
  gameIndex: new Map(),
  rows: [],
  storageMode: 'cloud',
  activeFilter: 'all'
};

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSlug(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeLists(value) {
  const incoming = Array.isArray(value)
    ? value
    : String(value || '').split(',');

  return Array.from(new Set(
    incoming
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, 12)
  ));
}

function normalizeRow(row) {
  return {
    id: row?.id || null,
    profile_id: row?.profile_id || state.user?.id || null,
    game_slug: normalizeSlug(row?.game_slug),
    played: Boolean(row?.played),
    want_to_play: Boolean(row?.want_to_play),
    owned_as_child: Boolean(row?.owned_as_child),
    still_own: Boolean(row?.still_own),
    personal_rating: Number.isFinite(Number(row?.personal_rating))
      ? Math.min(10, Math.max(1, Number(row.personal_rating)))
      : null,
    notes: String(row?.notes || ''),
    custom_lists: normalizeLists(row?.custom_lists),
    created_at: row?.created_at || null,
    updated_at: row?.updated_at || null
  };
}

function isMissingTableError(error) {
  return MISSING_TABLE_CODES.has(String(error?.code || ''));
}

function getStorageKey() {
  return `${STORAGE_PREFIX}${state.user?.id || 'anonymous'}`;
}

function readLocalRows() {
  try {
    const raw = localStorage.getItem(getStorageKey());
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeRow).filter((row) => row.game_slug) : [];
  } catch (error) {
    console.error('[profile-library] Local library read failed', error);
    return [];
  }
}

function writeLocalRows(rows) {
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(rows));
  } catch (error) {
    console.error('[profile-library] Local library write failed', error);
    throw error;
  }
}

function setLibraryMessage(text, type = '') {
  const box = document.getElementById('profileLibraryMessage');
  if (!box) return;
  box.textContent = text;
  box.classList.remove('auth-error', 'auth-success');
  if (type === 'error') box.classList.add('auth-error');
  if (type === 'success') box.classList.add('auth-success');
}

function setStorageStatus() {
  const status = document.getElementById('profileLibraryStorageStatus');
  if (!status) return;
  status.textContent = state.storageMode === 'cloud'
    ? 'Private account library'
    : 'Private device library';
  status.dataset.mode = state.storageMode;
}

function resolveThumbnail(game) {
  const raw = String(game?.thumbnail || game?.thumb || game?.cover || '').trim();
  if (/^https?:\/\//i.test(raw)) return raw;

  let filename = raw.replace(/^\/+/, '')
    .replace(/^resources\/images\/thumbnails\/all\//, '')
    .replace(/^resources\/images\/thumbnails\//, '')
    .replace(/^resources\/images\//, '');

  if (!filename) filename = `${game?.slug || '1942'}.jpg`;
  return `/resources/images/thumbnails/all/${filename}`;
}

async function loadGames() {
  const response = await fetch('/games/games.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Game index returned HTTP ${response.status}`);

  const data = await response.json();
  const seen = new Set();
  state.games = (Array.isArray(data) ? data : [])
    .map((game) => ({
      slug: normalizeSlug(game?.slug),
      title: String(game?.title || game?.sorttitle || game?.slug || '').trim(),
      sorttitle: String(game?.sorttitle || game?.title || '').trim(),
      system: String(game?.system || game?.platform || '').trim(),
      year: String(game?.year || game?.release_year || '').trim(),
      publisher: Array.isArray(game?.publisher)
        ? game.publisher.join(', ')
        : String(game?.publisher || game?.credits?.publisher || '').trim(),
      thumbnail: String(game?.thumbnail || game?.thumb || game?.cover || '').trim()
    }))
    .filter((game) => {
      if (!game.slug || !game.title || seen.has(game.slug)) return false;
      seen.add(game.slug);
      return true;
    });

  state.games.sort((a, b) => a.sorttitle.localeCompare(b.sorttitle));
  state.gameIndex = new Map(state.games.map((game) => [game.slug, game]));
}

async function loadCloudRows() {
  const { data, error } = await state.supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('profile_id', state.user.id)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (Array.isArray(data) ? data : []).map(normalizeRow).filter((row) => row.game_slug);
}

async function loadRows() {
  try {
    state.rows = await loadCloudRows();
    state.storageMode = 'cloud';
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
    state.storageMode = 'local';
    state.rows = readLocalRows();
  }

  setStorageStatus();
}

function sortRows(rows) {
  return [...rows].sort((a, b) => {
    const gameA = state.gameIndex.get(a.game_slug);
    const gameB = state.gameIndex.get(b.game_slug);
    return String(gameA?.title || a.game_slug).localeCompare(String(gameB?.title || b.game_slug));
  });
}

function rowMatchesFilter(row) {
  if (state.activeFilter === 'all') return true;
  return Boolean(row?.[state.activeFilter]);
}

function updateFilterButtons() {
  document.querySelectorAll('[data-profile-library-filter]').forEach((button) => {
    const active = button.dataset.profileLibraryFilter === state.activeFilter;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function updateLibraryCount(visibleCount = null) {
  const count = document.getElementById('profileLibraryCount');
  if (!count) return;
  const total = state.rows.length;
  const visible = visibleCount === null ? total : visibleCount;
  count.textContent = state.activeFilter === 'all'
    ? `${total} ${total === 1 ? 'game' : 'games'}`
    : `${visible} of ${total} games`;
}

function createFlag(labelText, key, checked) {
  const label = document.createElement('label');
  label.className = 'profile-library-card__flag';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = Boolean(checked);
  input.dataset.libraryField = key;

  const text = document.createElement('span');
  text.textContent = labelText;
  label.append(input, text);
  return label;
}

function createRatingSelect(value) {
  const label = document.createElement('label');
  label.className = 'profile-library-card__rating';

  const text = document.createElement('span');
  text.textContent = 'My rating';

  const select = document.createElement('select');
  select.dataset.libraryField = 'personal_rating';

  const none = document.createElement('option');
  none.value = '';
  none.textContent = 'Not rated';
  select.appendChild(none);

  for (let rating = 1; rating <= 10; rating += 1) {
    const option = document.createElement('option');
    option.value = String(rating);
    option.textContent = `${rating}/10`;
    select.appendChild(option);
  }

  select.value = value ? String(value) : '';
  label.append(text, select);
  return label;
}

function readCardRow(card, originalRow) {
  const readChecked = (field) => Boolean(card.querySelector(`[data-library-field="${field}"]`)?.checked);
  const ratingRaw = card.querySelector('[data-library-field="personal_rating"]')?.value || '';
  const notes = card.querySelector('[data-library-field="notes"]')?.value || '';
  const customLists = card.querySelector('[data-library-field="custom_lists"]')?.value || '';

  return normalizeRow({
    ...originalRow,
    played: readChecked('played'),
    want_to_play: readChecked('want_to_play'),
    owned_as_child: readChecked('owned_as_child'),
    still_own: readChecked('still_own'),
    personal_rating: ratingRaw ? Number(ratingRaw) : null,
    notes,
    custom_lists: normalizeLists(customLists),
    updated_at: new Date().toISOString()
  });
}

async function saveRow(row) {
  const normalized = normalizeRow(row);

  if (state.storageMode === 'cloud') {
    const payload = {
      profile_id: state.user.id,
      game_slug: normalized.game_slug,
      played: normalized.played,
      want_to_play: normalized.want_to_play,
      owned_as_child: normalized.owned_as_child,
      still_own: normalized.still_own,
      personal_rating: normalized.personal_rating,
      notes: normalized.notes,
      custom_lists: normalized.custom_lists,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await state.supabase
      .from(TABLE_NAME)
      .upsert(payload, { onConflict: 'profile_id,game_slug' })
      .select('*')
      .single();

    if (error) {
      if (!isMissingTableError(error)) throw error;
      state.storageMode = 'local';
      setStorageStatus();
    } else {
      return normalizeRow(data);
    }
  }

  const localRows = readLocalRows();
  const index = localRows.findIndex((item) => item.game_slug === normalized.game_slug);
  const saved = normalizeRow({
    ...normalized,
    profile_id: state.user.id,
    updated_at: new Date().toISOString(),
    created_at: normalized.created_at || new Date().toISOString()
  });

  if (index >= 0) localRows[index] = saved;
  else localRows.push(saved);
  writeLocalRows(localRows);
  return saved;
}

async function deleteRow(slug) {
  const normalizedSlug = normalizeSlug(slug);

  if (state.storageMode === 'cloud') {
    const { error } = await state.supabase
      .from(TABLE_NAME)
      .delete()
      .eq('profile_id', state.user.id)
      .eq('game_slug', normalizedSlug);

    if (error) {
      if (!isMissingTableError(error)) throw error;
      state.storageMode = 'local';
      setStorageStatus();
    } else {
      return;
    }
  }

  const localRows = readLocalRows().filter((row) => row.game_slug !== normalizedSlug);
  writeLocalRows(localRows);
}

function upsertStateRow(row) {
  const index = state.rows.findIndex((item) => item.game_slug === row.game_slug);
  if (index >= 0) state.rows[index] = row;
  else state.rows.push(row);
}

function renderLibrary() {
  const list = document.getElementById('profileLibraryList');
  if (!list) return;
  list.innerHTML = '';

  const visibleRows = sortRows(state.rows).filter(rowMatchesFilter);
  updateLibraryCount(visibleRows.length);
  updateFilterButtons();

  if (!visibleRows.length) {
    const empty = document.createElement('p');
    empty.className = 'profile-library__empty';
    empty.textContent = state.rows.length
      ? 'No games match this library filter.'
      : 'Your private game library is empty. Search above to add a game.';
    list.appendChild(empty);
    return;
  }

  visibleRows.forEach((row) => {
    const game = state.gameIndex.get(row.game_slug) || {
      slug: row.game_slug,
      title: row.game_slug,
      system: '',
      year: '',
      publisher: '',
      thumbnail: ''
    };

    const card = document.createElement('article');
    card.className = 'profile-library-card';
    card.dataset.gameSlug = row.game_slug;

    const header = document.createElement('div');
    header.className = 'profile-library-card__header';

    const image = document.createElement('img');
    image.className = 'profile-library-card__thumb';
    image.src = resolveThumbnail(game);
    image.alt = `${game.title} thumbnail`;
    image.loading = 'lazy';
    image.addEventListener('error', () => {
      image.hidden = true;
    }, { once: true });

    const headingWrap = document.createElement('div');
    headingWrap.className = 'profile-library-card__heading';

    const title = document.createElement('a');
    title.className = 'profile-library-card__title';
    title.href = `/games/${game.slug}/`;
    title.textContent = game.title;

    const meta = document.createElement('p');
    meta.className = 'profile-library-card__meta';
    meta.textContent = [game.system, game.year, game.publisher].filter(Boolean).join(' • ');

    headingWrap.append(title, meta);
    header.append(image, headingWrap);

    const flags = document.createElement('div');
    flags.className = 'profile-library-card__flags';
    flags.append(
      createFlag('Played', 'played', row.played),
      createFlag('Want to play', 'want_to_play', row.want_to_play),
      createFlag('Owned as a kid', 'owned_as_child', row.owned_as_child),
      createFlag('Still own', 'still_own', row.still_own)
    );

    const details = document.createElement('div');
    details.className = 'profile-library-card__details';

    const rating = createRatingSelect(row.personal_rating);

    const listsLabel = document.createElement('label');
    listsLabel.className = 'profile-library-card__lists';
    const listsText = document.createElement('span');
    listsText.textContent = 'Custom lists';
    const listsInput = document.createElement('input');
    listsInput.type = 'text';
    listsInput.placeholder = 'e.g. Two-player favourites, Budget classics';
    listsInput.value = row.custom_lists.join(', ');
    listsInput.dataset.libraryField = 'custom_lists';
    listsLabel.append(listsText, listsInput);

    const notesLabel = document.createElement('label');
    notesLabel.className = 'profile-library-card__notes';
    const notesText = document.createElement('span');
    notesText.textContent = 'Private notes';
    const notesInput = document.createElement('textarea');
    notesInput.rows = 3;
    notesInput.maxLength = 2000;
    notesInput.placeholder = 'Memories, progress, version owned or anything else you want to remember.';
    notesInput.value = row.notes;
    notesInput.dataset.libraryField = 'notes';
    notesLabel.append(notesText, notesInput);

    details.append(rating, listsLabel, notesLabel);

    const actions = document.createElement('div');
    actions.className = 'profile-library-card__actions';

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'auth-btn';
    saveButton.textContent = 'Save game details';
    saveButton.addEventListener('click', async () => {
      saveButton.disabled = true;
      setLibraryMessage('Saving…');
      try {
        const saved = await saveRow(readCardRow(card, row));
        upsertStateRow(saved);
        setLibraryMessage(`${game.title} saved.`, 'success');
        renderLibrary();
      } catch (error) {
        console.error('[profile-library] Save failed', error, { slug: row.game_slug });
        setLibraryMessage('Could not save this game right now.', 'error');
        saveButton.disabled = false;
      }
    });

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'auth-btn profile-library-card__remove';
    removeButton.textContent = 'Remove from library';
    removeButton.addEventListener('click', async () => {
      removeButton.disabled = true;
      try {
        await deleteRow(row.game_slug);
        state.rows = state.rows.filter((item) => item.game_slug !== row.game_slug);
        setLibraryMessage(`${game.title} removed.`, 'success');
        renderLibrary();
        renderSearchResults();
      } catch (error) {
        console.error('[profile-library] Remove failed', error, { slug: row.game_slug });
        setLibraryMessage('Could not remove this game right now.', 'error');
        removeButton.disabled = false;
      }
    });

    actions.append(saveButton, removeButton);
    card.append(header, flags, details, actions);
    list.appendChild(card);
  });
}

function rankGame(game, query) {
  const title = normalizeText(game.title);
  const compact = title.replace(/\s+/g, '');
  const queryCompact = query.replace(/\s+/g, '');

  if (title === query) return 0;
  if (compact === queryCompact) return 1;
  if (title.startsWith(query)) return 2;
  if (title.split(' ').some((word) => word.startsWith(query))) return 3;
  if (title.includes(query)) return 4;

  const metadata = normalizeText(`${game.publisher} ${game.system} ${game.year}`);
  if (metadata.includes(query)) return 5;
  return 99;
}

function getSearchMatches(rawQuery) {
  const query = normalizeText(rawQuery);
  if (query.length < 2) return [];

  return state.games
    .map((game) => ({ game, rank: rankGame(game, query) }))
    .filter((entry) => entry.rank < 99)
    .sort((a, b) => a.rank - b.rank || a.game.title.localeCompare(b.game.title))
    .slice(0, 8)
    .map((entry) => entry.game);
}

function renderSearchResults() {
  const input = document.getElementById('profileLibrarySearchInput');
  const results = document.getElementById('profileLibrarySearchResults');
  if (!input || !results) return;

  results.innerHTML = '';
  const matches = getSearchMatches(input.value);
  if (!matches.length) {
    results.hidden = true;
    return;
  }

  const savedSlugs = new Set(state.rows.map((row) => row.game_slug));
  matches.forEach((game) => {
    const item = document.createElement('div');
    item.className = 'profile-library-search-result';

    const info = document.createElement('div');
    info.className = 'profile-library-search-result__info';

    const title = document.createElement('strong');
    title.textContent = game.title;

    const meta = document.createElement('span');
    meta.textContent = [game.system, game.year, game.publisher].filter(Boolean).join(' • ');
    info.append(title, meta);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'auth-btn';
    button.textContent = savedSlugs.has(game.slug) ? 'In library' : 'Add';
    button.disabled = savedSlugs.has(game.slug);
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        const saved = await saveRow({
          profile_id: state.user.id,
          game_slug: game.slug,
          played: false,
          want_to_play: false,
          owned_as_child: false,
          still_own: false,
          personal_rating: null,
          notes: '',
          custom_lists: []
        });
        upsertStateRow(saved);
        setLibraryMessage(`${game.title} added to your library.`, 'success');
        renderLibrary();
        renderSearchResults();
      } catch (error) {
        console.error('[profile-library] Add failed', error, { slug: game.slug });
        setLibraryMessage('Could not add this game right now.', 'error');
        button.disabled = false;
      }
    });

    item.append(info, button);
    results.appendChild(item);
  });

  results.hidden = false;
}

function buildExportRows() {
  return sortRows(state.rows).map((row) => {
    const game = state.gameIndex.get(row.game_slug) || {};
    return {
      title: game.title || row.game_slug,
      slug: row.game_slug,
      system: game.system || '',
      year: game.year || '',
      publisher: game.publisher || '',
      played: row.played,
      want_to_play: row.want_to_play,
      owned_as_child: row.owned_as_child,
      still_own: row.still_own,
      personal_rating: row.personal_rating,
      custom_lists: row.custom_lists,
      notes: row.notes
    };
  });
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join(' | ') : String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function exportJson() {
  const exportData = {
    exported_at: new Date().toISOString(),
    storage_mode: state.storageMode,
    games: buildExportRows()
  };
  downloadFile('ccg-private-game-library.json', JSON.stringify(exportData, null, 2), 'application/json');
  setLibraryMessage('JSON export created.', 'success');
}

function exportCsv() {
  const rows = buildExportRows();
  const columns = [
    'title', 'slug', 'system', 'year', 'publisher', 'played', 'want_to_play',
    'owned_as_child', 'still_own', 'personal_rating', 'custom_lists', 'notes'
  ];
  const csv = [
    columns.map(csvCell).join(','),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(','))
  ].join('\r\n');
  downloadFile('ccg-private-game-library.csv', csv, 'text/csv;charset=utf-8');
  setLibraryMessage('CSV export created.', 'success');
}

function bindControls() {
  const searchInput = document.getElementById('profileLibrarySearchInput');
  searchInput?.addEventListener('input', renderSearchResults);

  document.querySelectorAll('[data-profile-library-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      const next = button.dataset.profileLibraryFilter || 'all';
      if (!FILTERS.has(next)) return;
      state.activeFilter = next;
      renderLibrary();
    });
  });

  document.getElementById('profileLibraryExportJson')?.addEventListener('click', exportJson);
  document.getElementById('profileLibraryExportCsv')?.addEventListener('click', exportCsv);
}

async function initProfileLibrary() {
  const section = document.getElementById('privateGameLibrarySection');
  if (!section) return;

  try {
    state.supabase = await getSupabaseClient();
    const { data, error } = await state.supabase.auth.getUser();
    if (error) throw error;
    state.user = data?.user || null;
    if (!state.user) return;

    bindControls();
    await Promise.all([loadGames(), loadRows()]);
    renderLibrary();
    setLibraryMessage('');
  } catch (error) {
    console.error('[profile-library] Initialisation failed', error);
    setLibraryMessage('Could not load your private game library right now.', 'error');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProfileLibrary, { once: true });
} else {
  initProfileLibrary();
}

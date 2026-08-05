import { getSupabaseClient } from './supabase-client.js';

const TABLE = 'profile_game_library';
const STORAGE_PREFIX = 'ccgProfileGameLibrary:';
const MISSING_TABLE_CODES = new Set(['42P01', 'PGRST204', 'PGRST205']);
const FILTERS = new Set(['all', 'played', 'want_to_play', 'owned_as_child', 'still_own']);

const state = {
  client: null,
  user: null,
  games: [],
  gameIndex: new Map(),
  rows: [],
  mode: 'cloud',
  filter: 'all'
};

function text(value) {
  return String(value ?? '').trim();
}

function slug(value) {
  return text(value).toLowerCase();
}

function searchText(value) {
  return text(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function listValues(value) {
  const source = Array.isArray(value) ? value : text(value).split(',');
  return Array.from(new Set(source.map(text).filter(Boolean))).slice(0, 12);
}

function ratingValue(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(10, Math.max(1, Math.round(parsed)));
}

function normaliseRow(row = {}) {
  return {
    id: row.id || null,
    profile_id: row.profile_id || state.user?.id || null,
    game_slug: slug(row.game_slug),
    played: Boolean(row.played),
    want_to_play: Boolean(row.want_to_play),
    owned_as_child: Boolean(row.owned_as_child),
    still_own: Boolean(row.still_own),
    personal_rating: ratingValue(row.personal_rating),
    notes: text(row.notes).slice(0, 2000),
    custom_lists: listValues(row.custom_lists),
    created_at: row.created_at || null,
    updated_at: row.updated_at || null
  };
}

function isMissingTable(error) {
  return MISSING_TABLE_CODES.has(String(error?.code || ''));
}

function storageKey() {
  return `${STORAGE_PREFIX}${state.user?.id || 'anonymous'}`;
}

function readLocal() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey()) || '[]');
    return Array.isArray(parsed)
      ? parsed.map(normaliseRow).filter((row) => row.game_slug)
      : [];
  } catch (error) {
    console.error('[profile-library] Local read failed', error);
    return [];
  }
}

function writeLocal(rows) {
  localStorage.setItem(storageKey(), JSON.stringify(rows));
}

function setMessage(message, type = '') {
  const box = document.getElementById('profileLibraryMessage');
  if (!box) return;
  box.textContent = message;
  box.classList.remove('auth-error', 'auth-success');
  if (type === 'error') box.classList.add('auth-error');
  if (type === 'success') box.classList.add('auth-success');
}

function updateStorageLabel() {
  const label = document.getElementById('profileLibraryStorageStatus');
  if (!label) return;
  label.textContent = state.mode === 'cloud'
    ? 'Private account library'
    : 'Private device library';
  label.dataset.mode = state.mode;
}

function thumbnailUrl(game) {
  const raw = text(game?.thumbnail || game?.thumb || game?.cover);
  if (/^https?:\/\//i.test(raw)) return raw;
  const filename = raw
    .replace(/^\/+/, '')
    .replace(/^resources\/images\/thumbnails\/all\//, '')
    .replace(/^resources\/images\/thumbnails\//, '')
    .replace(/^resources\/images\//, '')
    || `${game?.slug || '1942'}.jpg`;
  return `/resources/images/thumbnails/all/${filename}`;
}

async function loadGames() {
  const response = await fetch('/games/games.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Game index returned HTTP ${response.status}`);
  const data = await response.json();
  const seen = new Set();

  state.games = (Array.isArray(data) ? data : []).map((game) => {
    const gameSlug = slug(game?.slug);
    const publishers = Array.isArray(game?.publisher)
      ? game.publisher
      : Array.isArray(game?.credits?.publisher)
        ? game.credits.publisher
        : [game?.publisher || game?.credits?.publisher];

    return {
      slug: gameSlug,
      title: text(game?.title || game?.sorttitle || gameSlug),
      sorttitle: text(game?.sorttitle || game?.title || gameSlug),
      system: text(game?.system || game?.platform),
      year: text(game?.year || game?.release_year),
      publisher: publishers.map(text).filter(Boolean).join(', '),
      thumbnail: text(game?.thumbnail || game?.thumb || game?.cover)
    };
  }).filter((game) => {
    if (!game.slug || !game.title || seen.has(game.slug)) return false;
    seen.add(game.slug);
    return true;
  }).sort((a, b) => a.sorttitle.localeCompare(b.sorttitle));

  state.gameIndex = new Map(state.games.map((game) => [game.slug, game]));
}

async function loadRows() {
  try {
    const { data, error } = await state.client
      .from(TABLE)
      .select('*')
      .eq('profile_id', state.user.id)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    state.rows = (Array.isArray(data) ? data : []).map(normaliseRow).filter((row) => row.game_slug);
    state.mode = 'cloud';
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    state.rows = readLocal();
    state.mode = 'local';
  }
  updateStorageLabel();
}

async function saveRow(input) {
  const row = normaliseRow(input);
  if (!row.game_slug) throw new Error('Missing game slug');

  if (state.mode === 'cloud') {
    const payload = {
      profile_id: state.user.id,
      game_slug: row.game_slug,
      played: row.played,
      want_to_play: row.want_to_play,
      owned_as_child: row.owned_as_child,
      still_own: row.still_own,
      personal_rating: row.personal_rating,
      notes: row.notes,
      custom_lists: row.custom_lists,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await state.client
      .from(TABLE)
      .upsert(payload, { onConflict: 'profile_id,game_slug' })
      .select('*')
      .single();

    if (!error) return normaliseRow(data);
    if (!isMissingTable(error)) throw error;
    state.mode = 'local';
    updateStorageLabel();
  }

  const rows = readLocal();
  const saved = normaliseRow({
    ...row,
    profile_id: state.user.id,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  const index = rows.findIndex((item) => item.game_slug === saved.game_slug);
  if (index >= 0) rows[index] = saved;
  else rows.push(saved);
  writeLocal(rows);
  return saved;
}

async function removeRow(gameSlug) {
  const target = slug(gameSlug);
  if (state.mode === 'cloud') {
    const { error } = await state.client
      .from(TABLE)
      .delete()
      .eq('profile_id', state.user.id)
      .eq('game_slug', target);
    if (!error) return;
    if (!isMissingTable(error)) throw error;
    state.mode = 'local';
    updateStorageLabel();
  }
  writeLocal(readLocal().filter((row) => row.game_slug !== target));
}

function upsertState(row) {
  const index = state.rows.findIndex((item) => item.game_slug === row.game_slug);
  if (index >= 0) state.rows[index] = row;
  else state.rows.push(row);
}

function sortedRows() {
  return [...state.rows].sort((a, b) => {
    const titleA = state.gameIndex.get(a.game_slug)?.title || a.game_slug;
    const titleB = state.gameIndex.get(b.game_slug)?.title || b.game_slug;
    return titleA.localeCompare(titleB);
  });
}

function matchesFilter(row) {
  return state.filter === 'all' || Boolean(row[state.filter]);
}

function updateFilterButtons() {
  document.querySelectorAll('[data-profile-library-filter]').forEach((button) => {
    const active = button.dataset.profileLibraryFilter === state.filter;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function updateCount(visible) {
  const count = document.getElementById('profileLibraryCount');
  if (!count) return;
  const total = state.rows.length;
  count.textContent = state.filter === 'all'
    ? `${total} ${total === 1 ? 'game' : 'games'}`
    : `${visible} of ${total} games`;
}

function checkbox(labelText, field, checked) {
  const label = document.createElement('label');
  label.className = 'profile-library-card__flag';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.dataset.libraryField = field;
  const span = document.createElement('span');
  span.textContent = labelText;
  label.append(input, span);
  return label;
}

function ratingSelect(value) {
  const label = document.createElement('label');
  label.className = 'profile-library-card__rating';
  const span = document.createElement('span');
  span.textContent = 'My rating';
  const select = document.createElement('select');
  select.dataset.libraryField = 'personal_rating';

  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = 'Not rated';
  select.appendChild(empty);

  for (let number = 1; number <= 10; number += 1) {
    const option = document.createElement('option');
    option.value = String(number);
    option.textContent = `${number}/10`;
    select.appendChild(option);
  }
  select.value = value === null ? '' : String(value);
  label.append(span, select);
  return label;
}

function inputLabel(labelText, field, value, multiline = false) {
  const label = document.createElement('label');
  label.className = multiline ? 'profile-library-card__notes' : 'profile-library-card__lists';
  const span = document.createElement('span');
  span.textContent = labelText;
  const input = multiline ? document.createElement('textarea') : document.createElement('input');
  input.dataset.libraryField = field;
  if (multiline) {
    input.rows = 3;
    input.maxLength = 2000;
    input.placeholder = 'Memories, progress, version owned or anything else you want to remember.';
  } else {
    input.type = 'text';
    input.placeholder = 'e.g. Two-player favourites, Budget classics';
  }
  input.value = value;
  label.append(span, input);
  return label;
}

function readCard(card, original) {
  const checked = (field) => Boolean(card.querySelector(`[data-library-field="${field}"]`)?.checked);
  const value = (field) => card.querySelector(`[data-library-field="${field}"]`)?.value ?? '';
  return normaliseRow({
    ...original,
    played: checked('played'),
    want_to_play: checked('want_to_play'),
    owned_as_child: checked('owned_as_child'),
    still_own: checked('still_own'),
    personal_rating: ratingValue(value('personal_rating')),
    custom_lists: listValues(value('custom_lists')),
    notes: value('notes')
  });
}

function renderLibrary() {
  const host = document.getElementById('profileLibraryList');
  if (!host) return;
  host.replaceChildren();
  const rows = sortedRows().filter(matchesFilter);
  updateCount(rows.length);
  updateFilterButtons();

  if (!rows.length) {
    const empty = document.createElement('p');
    empty.className = 'profile-library__empty';
    empty.textContent = state.rows.length
      ? 'No games match this library filter.'
      : 'Your private game library is empty. Search above to add a game.';
    host.appendChild(empty);
    return;
  }

  rows.forEach((row) => {
    const game = state.gameIndex.get(row.game_slug) || {
      slug: row.game_slug,
      title: row.game_slug,
      system: '', year: '', publisher: '', thumbnail: ''
    };

    const card = document.createElement('article');
    card.className = 'profile-library-card';
    card.dataset.gameSlug = row.game_slug;

    const header = document.createElement('div');
    header.className = 'profile-library-card__header';
    const image = document.createElement('img');
    image.className = 'profile-library-card__thumb';
    image.src = thumbnailUrl(game);
    image.alt = `${game.title} thumbnail`;
    image.loading = 'lazy';
    image.addEventListener('error', () => { image.hidden = true; }, { once: true });

    const heading = document.createElement('div');
    heading.className = 'profile-library-card__heading';
    const title = document.createElement('a');
    title.className = 'profile-library-card__title';
    title.href = `/games/${game.slug}/`;
    title.textContent = game.title;
    const meta = document.createElement('p');
    meta.className = 'profile-library-card__meta';
    meta.textContent = [game.system, game.year, game.publisher].filter(Boolean).join(' • ');
    heading.append(title, meta);
    header.append(image, heading);

    const flags = document.createElement('div');
    flags.className = 'profile-library-card__flags';
    flags.append(
      checkbox('Played', 'played', row.played),
      checkbox('Want to play', 'want_to_play', row.want_to_play),
      checkbox('Owned as a kid', 'owned_as_child', row.owned_as_child),
      checkbox('Still own', 'still_own', row.still_own)
    );

    const details = document.createElement('div');
    details.className = 'profile-library-card__details';
    details.append(
      ratingSelect(row.personal_rating),
      inputLabel('Custom lists', 'custom_lists', row.custom_lists.join(', ')),
      inputLabel('Private notes', 'notes', row.notes, true)
    );

    const actions = document.createElement('div');
    actions.className = 'profile-library-card__actions';
    const save = document.createElement('button');
    save.type = 'button';
    save.className = 'auth-btn';
    save.textContent = 'Save game details';
    save.addEventListener('click', async () => {
      save.disabled = true;
      setMessage('Saving…');
      try {
        const saved = await saveRow(readCard(card, row));
        upsertState(saved);
        setMessage(`${game.title} saved.`, 'success');
        renderLibrary();
      } catch (error) {
        console.error('[profile-library] Save failed', error);
        setMessage('Could not save this game right now.', 'error');
        save.disabled = false;
      }
    });

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'auth-btn profile-library-card__remove';
    remove.textContent = 'Remove from library';
    remove.addEventListener('click', async () => {
      remove.disabled = true;
      try {
        await removeRow(row.game_slug);
        state.rows = state.rows.filter((item) => item.game_slug !== row.game_slug);
        setMessage(`${game.title} removed.`, 'success');
        renderLibrary();
        renderSearch();
      } catch (error) {
        console.error('[profile-library] Remove failed', error);
        setMessage('Could not remove this game right now.', 'error');
        remove.disabled = false;
      }
    });

    actions.append(save, remove);
    card.append(header, flags, details, actions);
    host.appendChild(card);
  });
}

function rank(game, query) {
  const title = searchText(game.title);
  const compactTitle = title.replace(/\s+/g, '');
  const compactQuery = query.replace(/\s+/g, '');
  if (title === query) return 0;
  if (compactTitle === compactQuery) return 1;
  if (title.startsWith(query)) return 2;
  if (title.split(' ').some((word) => word.startsWith(query))) return 3;
  if (title.includes(query)) return 4;
  if (searchText(`${game.publisher} ${game.system} ${game.year}`).includes(query)) return 5;
  return 99;
}

function searchMatches(raw) {
  const query = searchText(raw);
  if (query.length < 2) return [];
  return state.games
    .map((game) => ({ game, score: rank(game, query) }))
    .filter((entry) => entry.score < 99)
    .sort((a, b) => a.score - b.score || a.game.title.localeCompare(b.game.title))
    .slice(0, 8)
    .map((entry) => entry.game);
}

function renderSearch() {
  const input = document.getElementById('profileLibrarySearchInput');
  const host = document.getElementById('profileLibrarySearchResults');
  if (!input || !host) return;
  host.replaceChildren();
  const matches = searchMatches(input.value);
  if (!matches.length) {
    host.hidden = true;
    return;
  }

  const saved = new Set(state.rows.map((row) => row.game_slug));
  matches.forEach((game) => {
    const result = document.createElement('div');
    result.className = 'profile-library-search-result';
    const info = document.createElement('div');
    info.className = 'profile-library-search-result__info';
    const title = document.createElement('strong');
    title.textContent = game.title;
    const meta = document.createElement('span');
    meta.textContent = [game.system, game.year, game.publisher].filter(Boolean).join(' • ');
    info.append(title, meta);

    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'auth-btn';
    add.textContent = saved.has(game.slug) ? 'In library' : 'Add';
    add.disabled = saved.has(game.slug);
    add.addEventListener('click', async () => {
      add.disabled = true;
      try {
        const row = await saveRow({ game_slug: game.slug });
        upsertState(row);
        setMessage(`${game.title} added to your library.`, 'success');
        renderLibrary();
        renderSearch();
      } catch (error) {
        console.error('[profile-library] Add failed', error);
        setMessage('Could not add this game right now.', 'error');
        add.disabled = false;
      }
    });

    result.append(info, add);
    host.appendChild(result);
  });
  host.hidden = false;
}

function exportRows() {
  return sortedRows().map((row) => {
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

function download(filename, content, mime) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function csvCell(value) {
  const output = Array.isArray(value) ? value.join(' | ') : String(value ?? '');
  return `"${output.replace(/"/g, '""')}"`;
}

function exportJson() {
  download(
    'ccg-private-game-library.json',
    JSON.stringify({ exported_at: new Date().toISOString(), storage_mode: state.mode, games: exportRows() }, null, 2),
    'application/json'
  );
  setMessage('JSON export created.', 'success');
}

function exportCsv() {
  const columns = ['title', 'slug', 'system', 'year', 'publisher', 'played', 'want_to_play', 'owned_as_child', 'still_own', 'personal_rating', 'custom_lists', 'notes'];
  const output = [
    columns.map(csvCell).join(','),
    ...exportRows().map((row) => columns.map((column) => csvCell(row[column])).join(','))
  ].join('\r\n');
  download('ccg-private-game-library.csv', output, 'text/csv;charset=utf-8');
  setMessage('CSV export created.', 'success');
}

function bindControls() {
  document.getElementById('profileLibrarySearchInput')?.addEventListener('input', renderSearch);
  document.querySelectorAll('[data-profile-library-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      const next = button.dataset.profileLibraryFilter || 'all';
      if (!FILTERS.has(next)) return;
      state.filter = next;
      renderLibrary();
    });
  });
  document.getElementById('profileLibraryExportJson')?.addEventListener('click', exportJson);
  document.getElementById('profileLibraryExportCsv')?.addEventListener('click', exportCsv);
}

async function init() {
  if (!document.getElementById('privateGameLibrarySection')) return;
  try {
    state.client = await getSupabaseClient();
    const { data, error } = await state.client.auth.getUser();
    if (error) throw error;
    state.user = data?.user || null;
    if (!state.user) return;
    bindControls();
    await Promise.all([loadGames(), loadRows()]);
    renderLibrary();
    setMessage('');
  } catch (error) {
    console.error('[profile-library] Initialisation failed', error);
    setMessage('Could not load your private game library right now.', 'error');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

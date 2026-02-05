import { ensureRole, startAccessMonitor } from './guard.js';
import { logout } from './auth.js';
import {
  fetchBackups,
  fetchFileIndex,
  fetchGamesJson,
  restoreBackup,
  saveGamesJson
} from './games-api.js';
import { validateGameRecord, validateGamesSchema } from './validator.js';

const KEY_ORDER = [
  'system', 'id', 'slug', 'title', 'sorttitle', 'year', 'genres', 'collections', 'videoid',
  'thumbnail', 'pdf', 'disk', 'lemon', 'description', 'ccg_rating', 'ccg_rating_reason',
  'credits', 'developer', '_ccg_enforced', '_ccg_migrated'
];

const state = {
  role: null,
  games: [],
  filtered: [],
  page: 1,
  pageSize: 25,
  view: 'table',
  selectedIndex: null,
  fileIndex: new Set(),
  backups: [],
  rawBeforeEdit: '[]'
};

const el = {
  status: document.querySelector('[data-editor-status]'),
  role: document.querySelector('[data-editor-role]'),
  email: document.querySelector('[data-editor-email]'),
  search: document.getElementById('gamesSearch'),
  filterYear: document.getElementById('filterYear'),
  filterGenre: document.getElementById('filterGenre'),
  filterDeveloper: document.getElementById('filterDeveloper'),
  filterRating: document.getElementById('filterRating'),
  tableWrap: document.getElementById('tableView'),
  cardWrap: document.getElementById('cardView'),
  tableBody: document.getElementById('gamesTableBody'),
  cardBody: document.getElementById('gamesCardBody'),
  pagination: document.getElementById('pagination'),
  backupList: document.getElementById('backupList'),
  diffBefore: document.getElementById('diffBefore'),
  diffAfter: document.getElementById('diffAfter'),
  diffOutput: document.getElementById('diffOutput'),
  modal: document.getElementById('editorModal'),
  form: document.getElementById('recordForm'),
  preview: document.getElementById('recordPreview')
};

function setStatus(message, kind = 'info') {
  el.status.textContent = message;
  el.status.dataset.state = kind;
}

function normRecord(record) {
  return {
    ...record,
    thumbnails: record.thumbnail || '',
    publisher: record.credits?.publisher?.[0] || '',
    box_3d: record.box_3d || '',
    lemon64: Array.isArray(record.lemon) ? record.lemon[0] || '' : '',
    lemonamiga: Array.isArray(record.lemon) ? record.lemon[1] || '' : ''
  };
}

function toSavedRecord(edited, original) {
  const copy = { ...original };
  copy.title = edited.title;
  copy.slug = edited.slug;
  copy.sorttitle = edited.title.toLowerCase();
  copy.year = Number(edited.year);
  copy.genres = edited.genres.split(',').map((v) => v.trim()).filter(Boolean);
  copy.developer = edited.developer;
  copy.videoid = edited.videoid;
  copy.thumbnail = edited.thumbnails;
  copy.pdf = edited.pdf;
  copy.disk = edited.disk.split(',').map((v) => v.trim()).filter(Boolean);
  copy.lemon = [edited.lemon64, edited.lemonamiga].filter(Boolean);
  copy.ccg_rating = Number(edited.ccg_rating);
  copy.ccg_rating_reason = edited.ccg_rating_reason;
  copy.credits = {
    ...(copy.credits || {}),
    publisher: edited.publisher ? [edited.publisher] : [],
    developer: edited.developer ? [edited.developer] : []
  };

  const output = {};
  KEY_ORDER.forEach((key) => {
    output[key] = copy[key];
  });
  return output;
}

function renderFilters() {
  const years = [...new Set(state.games.map((g) => g.year))].sort((a, b) => b - a);
  const genres = [...new Set(state.games.flatMap((g) => g.genres || []))].sort();
  const developers = [...new Set(state.games.map((g) => g.developer).filter(Boolean))].sort();

  const fill = (select, values) => {
    select.innerHTML = '<option value="">All</option>' + values.map((v) => `<option>${v}</option>`).join('');
  };

  fill(el.filterYear, years);
  fill(el.filterGenre, genres);
  fill(el.filterDeveloper, developers);
}

function applyFilters() {
  const search = el.search.value.trim().toLowerCase();
  const year = el.filterYear.value;
  const genre = el.filterGenre.value;
  const developer = el.filterDeveloper.value;
  const rating = el.filterRating.value;

  state.filtered = state.games.filter((game) => {
    const inSearch = !search || [game.title, game.slug, game.developer].join(' ').toLowerCase().includes(search);
    const inYear = !year || String(game.year) === year;
    const inGenre = !genre || (game.genres || []).includes(genre);
    const inDeveloper = !developer || game.developer === developer;
    const inRating = !rating || String(game.ccg_rating) === rating;
    return inSearch && inYear && inGenre && inDeveloper && inRating;
  });

  renderPage();
}

function renderPage() {
  const start = (state.page - 1) * state.pageSize;
  const pageItems = state.filtered.slice(start, start + state.pageSize);
  el.tableBody.innerHTML = pageItems.map((game, i) => `
    <tr>
      <td>${start + i + 1}</td><td>${game.title}</td><td>${game.slug}</td><td>${game.year}</td>
      <td>${(game.genres || []).join(', ')}</td><td>${game.developer || ''}</td><td>${game.ccg_rating}</td>
      <td><button class="ccg-btn ccg-btn--ghost" data-edit-index="${start + i}">Edit</button></td>
    </tr>`).join('');

  el.cardBody.innerHTML = pageItems.map((game, i) => `
    <article class="game-card">
      <h3>${game.title}</h3>
      <p><strong>Slug:</strong> ${game.slug}</p>
      <p><strong>Year:</strong> ${game.year} · <strong>Rating:</strong> ${game.ccg_rating}</p>
      <p><strong>Genres:</strong> ${(game.genres || []).join(', ')}</p>
      <button class="ccg-btn ccg-btn--ghost" data-edit-index="${start + i}">Edit</button>
    </article>`).join('');

  const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
  el.pagination.innerHTML = `Page ${state.page} / ${totalPages}
    <button class="ccg-btn ccg-btn--ghost" ${state.page <= 1 ? 'disabled' : ''} data-page="prev">Prev</button>
    <button class="ccg-btn ccg-btn--ghost" ${state.page >= totalPages ? 'disabled' : ''} data-page="next">Next</button>`;
}

function openEditor(index) {
  state.selectedIndex = index;
  const game = normRecord(state.filtered[index]);
  Object.entries(game).forEach(([key, value]) => {
    const input = el.form.elements.namedItem(key);
    if (!input) return;
    input.value = Array.isArray(value) ? value.join(', ') : value ?? '';
  });
  updatePreview();
  el.modal.showModal();
}

function updatePreview() {
  const data = Object.fromEntries(new FormData(el.form).entries());
  el.preview.textContent = JSON.stringify(data, null, 2);
}

function makeDiff(before, after) {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  const max = Math.max(beforeLines.length, afterLines.length);
  const rows = [];
  for (let i = 0; i < max; i += 1) {
    const b = beforeLines[i] || '';
    const a = afterLines[i] || '';
    const cls = b === a ? 'same' : 'changed';
    rows.push(`<div class="diff-row ${cls}"><span>${b}</span><span>${a}</span></div>`);
  }
  el.diffOutput.innerHTML = rows.join('');
}

async function refreshBackups() {
  try {
    const result = await fetchBackups();
    state.backups = result.backups || [];
    el.backupList.innerHTML = state.backups.map((b) => `
      <li>${b.created_at} · ${b.commit_message || 'no message'}
      <button class="ccg-btn ccg-btn--ghost" data-restore="${b.id}">Restore</button></li>`).join('') || '<li>No backups yet</li>';
  } catch (error) {
    el.backupList.innerHTML = `<li>Unable to fetch backups: ${error.message}</li>`;
  }
}

async function bootstrap() {
  startAccessMonitor();
  const access = await ensureRole(['editor', 'admin', 'superadmin']);
  if (!access) return;
  state.role = access.role;
  el.role.textContent = access.role;
  el.email.textContent = access.session.user?.email || 'Unknown';

  setStatus('Loading data…');
  const [gamesPayload, fileIndexPayload] = await Promise.all([fetchGamesJson(), fetchFileIndex()]);
  state.games = gamesPayload.games;
  state.filtered = [...state.games];
  state.rawBeforeEdit = JSON.stringify(state.games, null, 2);
  state.fileIndex = new Set(fileIndexPayload.files || []);

  renderFilters();
  renderPage();
  await refreshBackups();
  setStatus(`Loaded ${state.games.length} records.`, 'success');
}

document.getElementById('logoutButton').addEventListener('click', async () => {
  await logout();
  window.location.replace('/admin/login.html');
});

document.querySelectorAll('[data-view]').forEach((button) => {
  button.addEventListener('click', () => {
    state.view = button.dataset.view;
    el.tableWrap.hidden = state.view !== 'table';
    el.cardWrap.hidden = state.view !== 'card';
  });
});

['input', 'change'].forEach((evt) => {
  [el.search, el.filterYear, el.filterGenre, el.filterDeveloper, el.filterRating].forEach((node) => {
    node.addEventListener(evt, () => {
      state.page = 1;
      applyFilters();
    });
  });
});

document.addEventListener('click', async (event) => {
  const edit = event.target.closest('[data-edit-index]');
  if (edit) openEditor(Number(edit.dataset.editIndex));

  const page = event.target.closest('[data-page]');
  if (page) {
    state.page += page.dataset.page === 'next' ? 1 : -1;
    renderPage();
  }

  const restore = event.target.closest('[data-restore]');
  if (restore && state.role === 'superadmin') {
    await restoreBackup(restore.dataset.restore);
    setStatus('Backup restored. Reloading…', 'success');
    location.reload();
  }
});

el.form.addEventListener('input', updatePreview);

document.getElementById('cancelEdit').addEventListener('click', () => el.modal.close());

document.getElementById('saveRecord').addEventListener('click', () => {
  const original = state.filtered[state.selectedIndex];
  const formData = Object.fromEntries(new FormData(el.form).entries());
  const candidate = toSavedRecord(formData, original);
  const slugSet = new Set(state.games.map((g) => g.slug));
  const result = validateGameRecord(candidate, {
    slugSet,
    originalSlug: original.slug,
    fileIndex: state.fileIndex
  });

  if (!result.valid) {
    setStatus(result.errors.join(' | '), 'error');
    return;
  }

  if (result.warnings.length) {
    setStatus(`Saved with warnings: ${result.warnings.join(' | ')}`, 'info');
  }

  const gameGlobalIndex = state.games.findIndex((g) => g.id === original.id);
  state.games[gameGlobalIndex] = candidate;
  applyFilters();
  el.modal.close();
});

document.getElementById('showDiff').addEventListener('click', () => {
  const after = JSON.stringify(state.games, null, 2);
  el.diffBefore.value = state.rawBeforeEdit;
  el.diffAfter.value = after;
  makeDiff(state.rawBeforeEdit, after);
});

document.getElementById('saveAll').addEventListener('click', async () => {
  if (state.role === 'editor') {
    setStatus('Editors can modify locally but cannot save.', 'error');
    return;
  }

  const schema = validateGamesSchema(state.games);
  if (!schema.valid) {
    setStatus(schema.errors.join(' | '), 'error');
    return;
  }

  const now = new Date().toISOString().replace(/[:.]/g, '-');
  const message = `admin(games-editor): update games.json ${now}`;
  setStatus('Saving: validate → backup → commit → deploy check…');

  try {
    await saveGamesJson({ games: state.games, message, role: state.role });
    setStatus('Save pipeline completed successfully.', 'success');
    state.rawBeforeEdit = JSON.stringify(state.games, null, 2);
    await refreshBackups();
  } catch (error) {
    setStatus(`Save failed, rollback triggered: ${error.message}`, 'error');
  }
});

bootstrap().catch((error) => setStatus(error.message, 'error'));

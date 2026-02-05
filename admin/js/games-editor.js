import { ensureRole, startAccessMonitor } from './guard.js';
import { logout } from './auth.js';
import { fetchBackups, fetchFileIndex, fetchGamesJson, restoreBackup, saveGamesJson } from './games-api.js';
import { AUTH_CONFIG } from './config.js';
import { validateGameRecord, validateGamesSchema } from './validator.js';
import { initAdminNav } from './admin-nav.js';

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
  selectedIndex: null,
  selectedGlobalIndex: null,
  fileIndex: new Set(),
  backups: [],
  rawBeforeEdit: '[]',
  isCreatingNew: false
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
  tableBody: document.getElementById('gamesTableBody'),
  cardBody: document.getElementById('gamesCardBody'),
  pagination: document.getElementById('pagination'),
  backupList: document.getElementById('backupList'),
  diffBefore: document.getElementById('diffBefore'),
  diffAfter: document.getElementById('diffAfter'),
  diffOutput: document.getElementById('diffOutput'),
  modal: document.getElementById('editorModal'),
  form: document.getElementById('recordForm'),
  preview: document.getElementById('recordPreview'),
  exportNote: document.querySelector('[data-export-note]')
};

function setStatus(message, kind = 'info') {
  el.status.textContent = message;
  el.status.dataset.state = kind;
}

function slugify(text) {
  return String(text || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function nextGameId() {
  let max = 0;
  state.games.forEach((game) => {
    const n = Number(String(game.id || '').replace(/[^0-9]/g, ''));
    if (Number.isFinite(n) && n > max) max = n;
  });
  return `ccg_${max + 1}`;
}

function normRecord(record) {
  return {
    ...record,
    system: record.system || '',
    thumbnails: record.thumbnail || '',
    publisher: record.credits?.publisher?.[0] || '',
    box_3d: record.box_3d || '',
    lemon64: Array.isArray(record.lemon) ? record.lemon[0] || '' : '',
    lemonamiga: Array.isArray(record.lemon) ? record.lemon[1] || '' : '',
    genres: Array.isArray(record.genres) ? record.genres.join(', ') : ''
  };
}

function toSavedRecord(edited, original = {}) {
  const copy = { ...original };
  copy.system = edited.system || original.system || 'Commodore 64';
  copy.id = copy.id || nextGameId();
  copy.title = edited.title;
  copy.slug = edited.slug;
  copy.sorttitle = edited.title.toLowerCase();
  copy.year = Number(edited.year);
  copy.genres = edited.genres.split(',').map((v) => v.trim()).filter(Boolean);
  copy.collections = Array.isArray(copy.collections) ? copy.collections : [];
  copy.developer = edited.developer;
  copy.videoid = edited.videoid;
  copy.thumbnail = edited.thumbnails;
  copy.pdf = edited.pdf || '';
  copy.disk = (edited.disk || '').split(',').map((v) => v.trim()).filter(Boolean);
  copy.lemon = [edited.lemon64, edited.lemonamiga].map((v) => (v || '').trim()).filter(Boolean);
  copy.ccg_rating = Number(edited.ccg_rating);
  copy.ccg_rating_reason = edited.ccg_rating_reason || '';
  copy.description = copy.description || '';
  copy._ccg_enforced = copy._ccg_enforced ?? true;
  copy._ccg_migrated = copy._ccg_migrated ?? true;
  copy.credits = {
    ...(copy.credits || {}),
    publisher: edited.publisher ? [edited.publisher] : [],
    developer: edited.developer ? [edited.developer] : []
  };

  const output = {};
  KEY_ORDER.forEach((key) => {
    output[key] = copy[key] ?? (Array.isArray(copy[key]) ? [] : '');
  });
  return output;
}

function renderFilters() {
  const years = [...new Set(state.games.map((g) => g.year))].sort((a, b) => b - a);
  const genres = [...new Set(state.games.flatMap((g) => g.genres || []))].sort();
  const developers = [...new Set(state.games.map((g) => g.developer).filter(Boolean))].sort();

  const fill = (select, values, allLabel) => {
    select.innerHTML = `<option value="">${allLabel}</option>` + values.map((v) => `<option>${v}</option>`).join('');
  };

  fill(el.filterYear, years, 'All years');
  fill(el.filterGenre, genres, 'All genres');
  fill(el.filterDeveloper, developers, 'All developers');
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
    const inRating = !rating || String(Math.floor(game.ccg_rating || 0)) === rating;
    return inSearch && inYear && inGenre && inDeveloper && inRating;
  });

  state.page = 1;
  renderPage();
}

function rowTitle(game) {
  return `${game.title}${game._ccg_draft ? ' <span class="draft-badge">Draft/Unsaved</span>' : ''}`;
}

function renderPage() {
  const start = (state.page - 1) * state.pageSize;
  const pageItems = state.filtered.slice(start, start + state.pageSize);

  el.tableBody.innerHTML = pageItems.map((game, i) => `
    <tr>
      <td>${start + i + 1}</td><td>${rowTitle(game)}</td><td>${game.slug}</td><td>${game.year}</td>
      <td>${(game.genres || []).join(', ')}</td><td>${game.developer || ''}</td><td>${game.ccg_rating}</td>
      <td><button class="ccg-btn ccg-btn--ghost" data-edit-index="${start + i}">Edit</button></td>
    </tr>`).join('');

  el.cardBody.innerHTML = pageItems.map((game, i) => `
    <article class="game-card">
      <h3>${game.title}${game._ccg_draft ? ' <span class="draft-badge">Draft</span>' : ''}</h3>
      <p><strong>Slug:</strong> ${game.slug}</p>
      <p><strong>Year:</strong> ${game.year} · <strong>Rating:</strong> ${game.ccg_rating}</p>
      <button class="ccg-btn ccg-btn--ghost" data-edit-index="${start + i}">Edit</button>
    </article>`).join('');

  const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
  el.pagination.innerHTML = `Page ${state.page} / ${totalPages}
    <button class="ccg-btn ccg-btn--ghost" ${state.page <= 1 ? 'disabled' : ''} data-page="prev">Prev</button>
    <button class="ccg-btn ccg-btn--ghost" ${state.page >= totalPages ? 'disabled' : ''} data-page="next">Next</button>`;
}

function openEditor(filteredIndex, creating = false) {
  const game = creating ? {
    id: nextGameId(),
    system: 'Commodore 64',
    title: '',
    slug: '',
    year: new Date().getFullYear(),
    genres: [],
    developer: '',
    videoid: '',
    thumbnail: '',
    pdf: '',
    disk: [],
    lemon: [],
    ccg_rating: 1,
    ccg_rating_reason: '',
    credits: { publisher: [], developer: [] }
  } : state.filtered[filteredIndex];

  if (!game) return;
  state.isCreatingNew = creating;
  state.selectedIndex = filteredIndex;
  state.selectedGlobalIndex = creating ? -1 : state.games.findIndex((g) => g.id === game.id);

  const record = normRecord(game);
  el.form.title.value = record.title || '';
  el.form.slug.value = record.slug || '';
  el.form.system.value = record.system || '';
  el.form.year.value = record.year || '';
  el.form.genres.value = record.genres || '';
  el.form.developer.value = record.developer || '';
  el.form.publisher.value = record.publisher || '';
  el.form.ccg_rating.value = record.ccg_rating || 1;
  el.form.ccg_rating_reason.value = record.ccg_rating_reason || '';
  el.form.videoid.value = record.videoid || '';
  el.form.thumbnails.value = record.thumbnails || '';
  el.form.box_3d.value = record.box_3d || '';
  el.form.pdf.value = record.pdf || '';
  el.form.disk.value = Array.isArray(record.disk) ? record.disk.join(', ') : '';
  el.form.lemon64.value = record.lemon64 || '';
  el.form.lemonamiga.value = record.lemonamiga || '';

  updatePreview();
  el.modal.showModal();
}

function updatePreview() {
  const formData = Object.fromEntries(new FormData(el.form).entries());
  if (!formData.slug) formData.slug = slugify(formData.title);
  const base = state.isCreatingNew ? {} : state.filtered[state.selectedIndex];
  const candidate = toSavedRecord(formData, base);
  el.preview.textContent = JSON.stringify(candidate, null, 2);
}

function makeDiff(before, after) {
  const left = before.split('\n');
  const right = after.split('\n');
  const max = Math.max(left.length, right.length);
  const rows = [];
  for (let i = 0; i < max; i += 1) {
    const l = left[i] || '';
    const r = right[i] || '';
    const changed = l !== r ? ' changed' : '';
    rows.push(`<div class="diff-row${changed}"><code>${l}</code><code>${r}</code></div>`);
  }
  el.diffOutput.innerHTML = rows.join('');
}

async function refreshBackups() {
  const { backups } = await fetchBackups();
  state.backups = backups;
  el.backupList.innerHTML = backups.map((b) => `<li>${b.created_at} — ${b.commit_message} <button class="ccg-btn ccg-btn--ghost" data-restore="${b.id}">Restore</button></li>`).join('');
}

async function bootstrap() {
  const result = await ensureRole(['superadmin', 'admin', 'editor']);
  if (!result) return;

  state.role = result.role;
  el.role.textContent = result.role;
  el.email.textContent = result.session.user?.email || 'unknown';

  const [{ games }, { files }] = await Promise.all([fetchGamesJson(), fetchFileIndex()]);
  state.games = games;
  state.rawBeforeEdit = JSON.stringify(games, null, 2);
  state.fileIndex = new Set(files || []);

  renderFilters();
  applyFilters();
  await refreshBackups();
  setStatus(`Loaded ${state.games.length} games.`, 'success');
}

document.querySelectorAll('[data-view]').forEach((button) => {
  button.addEventListener('click', () => {
    const isCard = button.dataset.view === 'card';
    document.getElementById('tableView').hidden = isCard;
    document.getElementById('cardView').hidden = !isCard;
  });
});

[el.search, el.filterYear, el.filterGenre, el.filterDeveloper, el.filterRating].forEach((input) => {
  input.addEventListener('input', applyFilters);
  input.addEventListener('change', applyFilters);
});

document.getElementById('logoutButton').addEventListener('click', async () => {
  await logout();
  window.location.replace(AUTH_CONFIG.postLogoutRedirect);
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
    setStatus('Backup exported for restore.', 'success');
  }
});

document.getElementById('addGame').addEventListener('click', () => openEditor(-1, true));
el.form.title.addEventListener('input', () => {
  if (!el.form.slug.value.trim()) {
    el.form.slug.value = slugify(el.form.title.value);
  }
});
el.form.addEventListener('input', updatePreview);

document.getElementById('cancelEdit').addEventListener('click', () => el.modal.close());

document.getElementById('saveRecord').addEventListener('click', () => {
  const original = state.isCreatingNew ? {} : state.filtered[state.selectedIndex];
  const formData = Object.fromEntries(new FormData(el.form).entries());
  formData.slug = slugify(formData.slug || formData.title);
  formData.genres = (formData.genres || '').split(',').map((v) => v.trim()).filter(Boolean).join(', ');

  const candidate = toSavedRecord(formData, original);
  const slugSet = new Set(state.games.map((g) => g.slug));
  const duplicateTitleYear = state.games.some((g) =>
    g.title?.trim().toLowerCase() === candidate.title.trim().toLowerCase()
      && Number(g.year) === Number(candidate.year)
      && (!original.id || g.id !== original.id)
  );

  const result = validateGameRecord(candidate, {
    slugSet,
    originalSlug: original.slug,
    fileIndex: state.fileIndex
  });

  if (duplicateTitleYear) {
    result.valid = false;
    result.errors.push('Duplicate title + year detected.');
  }

  if (!result.valid) {
    setStatus(result.errors.join(' | '), 'error');
    return;
  }

  candidate._ccg_draft = true;
  if (state.isCreatingNew) {
    state.games.unshift(candidate);
    setStatus('New draft game added in memory. Export when ready.', 'success');
  } else {
    state.games[state.selectedGlobalIndex] = { ...candidate, _ccg_draft: state.games[state.selectedGlobalIndex]._ccg_draft };
    setStatus(result.warnings.length ? `Saved with warnings: ${result.warnings.join(' | ')}` : 'Record updated.', 'success');
  }

  renderFilters();
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
  const payload = state.games.map((game) => {
    const { _ccg_draft, ...rest } = game;
    return rest;
  });

  const schema = validateGamesSchema(payload);
  if (!schema.valid) {
    setStatus(schema.errors.join(' | '), 'error');
    return;
  }

  const now = new Date().toISOString().replace(/[:.]/g, '-');
  const message = `admin(games-editor): update games.json ${now}`;
  setStatus('Exporting games.json download…');

  try {
    await saveGamesJson({ games: payload, message, role: state.role });
    setStatus('Saved locally. Downloaded games.json for manual commit.', 'success');
    if (el.exportNote) el.exportNote.hidden = false;
    state.games = state.games.map((game) => ({ ...game, _ccg_draft: false }));
    state.rawBeforeEdit = JSON.stringify(payload, null, 2);
    renderPage();
    await refreshBackups();
  } catch (error) {
    setStatus(`Save failed: ${error.message}`, 'error');
  }
});

startAccessMonitor();
initAdminNav({ pageLabel: 'Games Editor', active: 'editor' });
bootstrap().catch((error) => setStatus(error.message, 'error'));

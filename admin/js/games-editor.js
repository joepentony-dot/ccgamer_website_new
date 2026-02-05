import { ensureRole, startAccessMonitor } from './guard.js';
import { fetchBackups, fetchFileIndex, fetchGamesJson, restoreBackup, saveGamesJson } from './games-api.js';
import { validateGameRecord, validateGamesSchema } from './validator.js';
import { initAdminNav } from './admin-nav.js';
import { waitForAuthReady } from './auth.js';

const KEY_ORDER = [
  'system', 'id', 'slug', 'title', 'sorttitle', 'year', 'genres', 'collections', 'videoid',
  'thumbnail', 'pdf', 'disk', 'lemon', 'description', 'ccg_rating', 'ccg_rating_reason',
  'credits', 'developer', '_ccg_enforced', '_ccg_migrated'
];

const ALLOWED_GENRES = new Set([
  'action-adventure', 'adventure', 'arcade', 'casino', 'fighting', 'horror',
  'miscellaneous', 'platform', 'puzzle', 'quiz', 'racing', 'role-playing',
  'shooting', 'sports', 'strategy'
]);

const state = {
  role: null,
  games: [],
  filtered: [],
  page: 1,
  pageSize: 25,
  selectedIndex: null,
  selectedGlobalIndex: null,
  fileIndex: new Set(),
  rawBeforeEdit: '[]',
  isCreatingNew: false,
  editorState: {
    mode: 'viewing',
    dirty: false,
    validated: false,
    slugManual: false
  }
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
  formErrors: document.getElementById('recordFormErrors'),
  draftState: document.getElementById('recordDraftState'),
  saveRecord: document.getElementById('saveRecord'),
  exportNote: document.querySelector('[data-export-note]'),
  exportStatus: document.querySelector('[data-export-status-text]')
};

function setStatus(message, kind = 'info') {
  el.status.textContent = message;
  el.status.dataset.state = kind;
}

function setExportStatus(message) {
  if (el.exportStatus) el.exportStatus.textContent = message;
}

function slugify(text) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function getUniqueSlug(baseSlug, originalSlug = '') {
  const normalizedBase = slugify(baseSlug || 'game');
  const existingSlugs = new Set(state.games.map((g) => g.slug).filter(Boolean));
  if (originalSlug) existingSlugs.delete(originalSlug);

  if (!existingSlugs.has(normalizedBase)) return normalizedBase;

  let suffix = 2;
  let candidate = `${normalizedBase}-${suffix}`;
  while (existingSlugs.has(candidate)) {
    suffix += 1;
    candidate = `${normalizedBase}-${suffix}`;
  }
  return candidate;
}

function showInlineErrors(errors = []) {
  if (!el.formErrors) return;
  if (errors.length === 0) {
    el.formErrors.hidden = true;
    el.formErrors.innerHTML = '';
    return;
  }

  el.formErrors.hidden = false;
  el.formErrors.innerHTML = `<ul>${errors.map((msg) => `<li>${msg}</li>`).join('')}</ul>`;
}

function setEditorState(patch = {}) {
  state.editorState = { ...state.editorState, ...patch };

  const draftVisible = state.editorState.mode === 'draft' || state.editorState.dirty;
  if (el.draftState) {
    el.draftState.hidden = !draftVisible;
    el.draftState.textContent = state.editorState.validated
      ? 'Draft validated'
      : 'Draft has unsaved changes';
  }

  if (el.saveRecord) {
    el.saveRecord.disabled = !state.editorState.dirty;
  }
}

function downloadFile(name, content, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildSeoStubHtml(game) {
  const title = game.title || 'CCG Game';
  const description = game.description || `${title} game entry on Cheeky Commodore Gamer.`;
  const canonical = `https://www.cheekycommodoregamer.co.uk/games/${game.slug}.html`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><meta name="description" content="${description.replace(/"/g, '&quot;')}"><link rel="canonical" href="${canonical}"><meta http-equiv="refresh" content="0;url=${canonical}"></head><body><p>Redirecting to <a href="${canonical}">${title}</a>…</p></body></html>`;
}

function buildSitemap(games) {
  const urls = games
    .filter((g) => g.slug)
    .map((g) => `<url><loc>https://www.cheekycommodoregamer.co.uk/games/${g.slug}.html</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
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
  copy.genres = (edited.genres || '').split(',').map((v) => v.trim()).filter(Boolean);
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
    select.innerHTML = `<option value="">${allLabel}</option>${values.map((v) => `<option>${v}</option>`).join('')}`;
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

  el.tableBody.innerHTML = pageItems.map((game, idx) => {
    const absoluteIndex = start + idx;
    return `<tr>
      <td>${absoluteIndex + 1}</td>
      <td>${rowTitle(game)}</td>
      <td>${game.slug || ''}</td>
      <td>${game.year || ''}</td>
      <td>${(game.genres || []).join(', ')}</td>
      <td>${game.developer || ''}</td>
      <td>${game.ccg_rating || ''}</td>
      <td><button class="ccg-btn ccg-btn--ghost" data-edit-index="${absoluteIndex}" type="button">Edit</button></td>
    </tr>`;
  }).join('');

  el.cardBody.innerHTML = pageItems.map((game, idx) => {
    const absoluteIndex = start + idx;
    return `<article class="game-card">
      <h3>${rowTitle(game)}</h3>
      <p><strong>Slug:</strong> ${game.slug || ''}</p>
      <p><strong>Year:</strong> ${game.year || ''}</p>
      <p><strong>Genre:</strong> ${(game.genres || []).join(', ')}</p>
      <p><strong>Developer:</strong> ${game.developer || ''}</p>
      <button class="ccg-btn ccg-btn--ghost" data-edit-index="${absoluteIndex}" type="button">Edit</button>
    </article>`;
  }).join('');

  const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
  el.pagination.innerHTML = `
    <button class="ccg-btn ccg-btn--ghost" data-page="prev" type="button" ${state.page <= 1 ? 'disabled' : ''}>Prev</button>
    <span>Page ${state.page} / ${totalPages}</span>
    <button class="ccg-btn ccg-btn--ghost" data-page="next" type="button" ${state.page >= totalPages ? 'disabled' : ''}>Next</button>
  `;
}

function updateSlugFromTitle() {
  if (state.editorState.slugManual) return;
  const original = state.isCreatingNew ? {} : state.filtered[state.selectedIndex];
  el.form.slug.value = getUniqueSlug(el.form.title.value, original.slug || '');
}

function openEditor(filteredIndex, creating = false) {
  state.isCreatingNew = creating;
  state.selectedIndex = filteredIndex;

  let record = {};
  if (creating) {
    record = {
      title: '', slug: '', system: 'Commodore 64', year: '', genres: '', developer: '', publisher: '',
      ccg_rating: '', ccg_rating_reason: '', videoid: '', thumbnails: '', box_3d: '',
      pdf: '', disk: '', lemon64: '', lemonamiga: ''
    };
    state.selectedGlobalIndex = null;
  } else {
    record = normRecord(state.filtered[filteredIndex]);
    state.selectedGlobalIndex = state.games.indexOf(state.filtered[filteredIndex]);
  }

  Object.entries(record).forEach(([key, value]) => {
    if (el.form[key]) {
      el.form[key].value = value ?? '';
      el.form[key].readOnly = false;
    }
  });

  state.editorState = {
    mode: creating ? 'draft' : 'editing',
    dirty: false,
    validated: false,
    slugManual: false
  };
  showInlineErrors([]);
  setEditorState();
  updatePreview();
  el.modal.showModal();
}

function updatePreview() {
  const formData = Object.fromEntries(new FormData(el.form).entries());
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
  el.backupList.innerHTML = backups.map((b) => `<li>${b.created_at} — ${b.commit_message} <button class="ccg-btn ccg-btn--ghost" data-restore="${b.id}" type="button">Restore</button></li>`).join('');
}

function validateGenres(genres) {
  const invalid = genres.filter((genre) => !ALLOWED_GENRES.has(String(genre).trim().toLowerCase()));
  return invalid;
}

function validateCandidate(candidate, original) {
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

  const invalidGenres = validateGenres(candidate.genres || []);
  if (invalidGenres.length > 0) {
    result.valid = false;
    result.errors.push(`Invalid genres: ${invalidGenres.join(', ')}`);
  }

  if (duplicateTitleYear) {
    result.valid = false;
    result.errors.push('Duplicate title + year detected.');
  }

  return result;
}

function sanitizeAndSortGames(games) {
  return [...games]
    .map((game) => {
      const { _ccg_draft, ...rest } = game;
      return rest;
    })
    .sort((a, b) => {
      const sortA = String(a.sorttitle || a.title || '').toLowerCase();
      const sortB = String(b.sorttitle || b.title || '').toLowerCase();
      return sortA.localeCompare(sortB) || Number(a.year || 0) - Number(b.year || 0);
    });
}

function validateAllGames() {
  const errors = [];
  const slugSeen = new Set();

  state.games.forEach((game, index) => {
    const duplicateSlug = slugSeen.has(game.slug);
    slugSeen.add(game.slug);

    const result = validateGameRecord(game, {
      slugSet: slugSeen,
      originalSlug: game.slug,
      fileIndex: state.fileIndex
    });

    const invalidGenres = validateGenres(game.genres || []);
    if (invalidGenres.length > 0) {
      result.valid = false;
      result.errors.push(`Invalid genres: ${invalidGenres.join(', ')}`);
    }

    if (duplicateSlug) result.errors.push(`Record ${index + 1}: duplicate slug ${game.slug}`);
    if (!result.valid) errors.push(...result.errors.map((error) => `#${index + 1} ${error}`));
  });

  const schema = validateGamesSchema(sanitizeAndSortGames(state.games));
  if (!schema.valid) errors.push(...schema.errors);

  if (errors.length > 0) {
    setStatus(`Validation failed (${errors.length}): ${errors.slice(0, 4).join(' | ')}`, 'error');
    return false;
  }

  setStatus('Validation complete: schema and duplicate checks passed.', 'success');
  return true;
}

async function downloadSeoStubBundle() {
  if (!window.JSZip) {
    setStatus('JSZip missing. Cannot generate SEO stub bundle.', 'error');
    return;
  }

  const zip = new window.JSZip();
  state.games.filter((g) => g.slug).forEach((game) => {
    zip.file(`${game.slug}.html`, buildSeoStubHtml(game));
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  downloadFile('ccg-seo-stubs.zip', blob, 'application/zip');
  setExportStatus('SEO stubs bundle downloaded.');
}

async function downloadFullPackage() {
  if (!window.JSZip) {
    setStatus('JSZip missing. Cannot generate full package.', 'error');
    return;
  }

  if (!validateAllGames()) {
    setExportStatus('Export blocked until validation passes.');
    return;
  }

  const payload = sanitizeAndSortGames(state.games);

  const zip = new window.JSZip();
  zip.file('games.json', `${JSON.stringify(payload, null, 2)}\n`);
  zip.file('sitemap.xml', buildSitemap(payload));

  const stubFolder = zip.folder('seo-stubs');
  payload.filter((g) => g.slug).forEach((game) => {
    stubFolder.file(`${game.slug}.html`, buildSeoStubHtml(game));
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  downloadFile('ccg-export-package.zip', blob, 'application/zip');
  setExportStatus('Full export package downloaded.');
}

function copyNodeInstructions() {
  const text = `node scripts/generate-slug-pages.js\nnode scripts/generate-sitemaps.js\ngit status`;
  navigator.clipboard.writeText(text).then(() => {
    setExportStatus('Node script instructions copied to clipboard.');
  }).catch(() => {
    setExportStatus('Clipboard blocked. Copy manually from Publish page.');
  });
}

async function exportGamesJson() {
  if (!validateAllGames()) {
    setExportStatus('games.json export blocked until validation passes.');
    return;
  }

  const payload = sanitizeAndSortGames(state.games);
  const now = new Date().toISOString().replace(/[:.]/g, '-');
  const message = `admin(games-editor): update games.json ${now}`;

  try {
    await saveGamesJson({ games: payload, message, role: state.role });
    const exportStamp = new Date().toLocaleString();
    localStorage.setItem('omegaAdminLastExportTime', exportStamp);
    setStatus('Downloaded games.json. Replace /games/games.json in repo and commit/push.', 'success');
    setExportStatus(`games.json exported at ${exportStamp}.`);
    if (el.exportNote) el.exportNote.hidden = false;
    state.games = state.games.map((game) => ({ ...game, _ccg_draft: false }));
    state.rawBeforeEdit = JSON.stringify(payload, null, 2);
    renderPage();
    await refreshBackups();
  } catch (error) {
    setStatus(`Export failed: ${error.message}`, 'error');
  }
}

async function bootstrap() {
  await waitForAuthReady();

  const result = await ensureRole(['superadmin', 'admin', 'editor']);
  if (!result) return;

  state.role = result.role;
  el.role.textContent = result.role;
  el.email.textContent = result.session.user?.email || 'unknown';

  const [{ games }, { files }] = await Promise.all([fetchGamesJson(), fetchFileIndex()]);
  state.games = games;
  state.rawBeforeEdit = JSON.stringify(games, null, 2);
  state.fileIndex = new Set(files || []);
  localStorage.setItem('omegaAdminLastLoadSuccess', new Date().toLocaleString());

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
document.getElementById('validateLibrary').addEventListener('click', validateAllGames);

el.form.title.addEventListener('input', () => {
  updateSlugFromTitle();
  setEditorState({ dirty: true, validated: false, mode: 'draft' });
  updatePreview();
});
el.form.title.addEventListener('paste', () => {
  window.setTimeout(() => {
    updateSlugFromTitle();
    setEditorState({ dirty: true, validated: false, mode: 'draft' });
    updatePreview();
  }, 0);
});

el.form.slug.addEventListener('input', () => {
  const normalized = slugify(el.form.slug.value);
  state.editorState.slugManual = normalized.length > 0;
  el.form.slug.value = normalized;
  setEditorState({ dirty: true, validated: false, mode: 'draft' });
  updatePreview();
});
el.form.slug.addEventListener('paste', () => {
  window.setTimeout(() => {
    const normalized = slugify(el.form.slug.value);
    state.editorState.slugManual = normalized.length > 0;
    el.form.slug.value = normalized;
    setEditorState({ dirty: true, validated: false, mode: 'draft' });
    updatePreview();
  }, 0);
});

el.form.addEventListener('input', () => {
  setEditorState({ dirty: true, validated: false, mode: 'draft' });
  updatePreview();
});

document.getElementById('cancelEdit').addEventListener('click', () => {
  setEditorState({ mode: 'viewing', dirty: false, validated: false, slugManual: false });
  showInlineErrors([]);
  el.modal.close();
});

document.getElementById('saveRecord').addEventListener('click', () => {
  const original = state.isCreatingNew ? {} : state.filtered[state.selectedIndex];
  const formData = Object.fromEntries(new FormData(el.form).entries());

  if (!state.editorState.slugManual || !formData.slug?.trim()) {
    formData.slug = getUniqueSlug(formData.title, original.slug || '');
  }

  formData.slug = slugify(formData.slug || formData.title);
  formData.genres = (formData.genres || '').split(',').map((v) => v.trim()).filter(Boolean).join(', ');

  const candidate = toSavedRecord(formData, original);
  const result = validateCandidate(candidate, original);

  if (!result.valid) {
    showInlineErrors(result.errors);
    setStatus(result.errors.join(' | '), 'error');
    setEditorState({ validated: false });
    return;
  }

  showInlineErrors([]);
  candidate._ccg_draft = true;
  if (state.isCreatingNew) {
    state.games.unshift(candidate);
    setStatus('New draft game added in memory. Export when ready.', 'success');
  } else {
    state.games[state.selectedGlobalIndex] = { ...candidate, _ccg_draft: true };
    setStatus('Draft updated.', 'success');
  }

  setEditorState({ mode: 'editing', dirty: false, validated: true });
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

document.getElementById('saveAll').addEventListener('click', exportGamesJson);
document.getElementById('downloadGamesJson').addEventListener('click', exportGamesJson);
document.getElementById('downloadStubBundle').addEventListener('click', () => { void downloadSeoStubBundle(); });
document.getElementById('downloadFullPackage').addEventListener('click', () => { void downloadFullPackage(); });
document.getElementById('copyNodeSteps').addEventListener('click', copyNodeInstructions);

startAccessMonitor();
initAdminNav({ pageLabel: 'Games Editor', active: 'editor' });

let bootstrapped = false;
function safeBootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;
  void bootstrap().catch((error) => setStatus(error.message, 'error'));
}

window.addEventListener('ccg:auth-ready', safeBootstrap, { once: true });
void waitForAuthReady().then(safeBootstrap).catch((error) => setStatus(error.message, 'error'));

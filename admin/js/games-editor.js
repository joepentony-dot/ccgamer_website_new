import { startAccessMonitor } from './guard.js';
import { fetchBackups, fetchFileIndex, fetchGamesJson, restoreBackup, saveGamesJson } from './games-api.js';
import { validateGameRecord, validateGamesSchema } from './validator.js';
import { initAdminNav } from './admin-nav.js';
import { getAuthContext, waitForAuthReady } from './auth.js';

/**
 * OMEGA Games Editor
 * Deterministic boot: Auth -> Role -> Data -> UI -> Handlers -> Ready.
 * All editor behaviour flows through runtimeState to avoid scattered flags.
 */
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

const DRAFT_STORAGE_KEY = 'omegaGamesEditorDrafts';
const HISTORY_LIMIT = 60;

const runtimeState = {
  user: null,
  role: null,
  currentGame: null,
  mode: 'view', // view | edit | draft | new
  dirty: false,
  valid: false,
  errors: [],
  slugLocked: false,
  games: [],
  filtered: [],
  page: 1,
  pageSize: 25,
  selectedIndex: null,
  selectedGlobalIndex: null,
  fileIndex: new Set(),
  rawBeforeEdit: '[]',
  history: [],
  historyIndex: -1,
  suppressHistory: false,
  drafts: {},
  bootStep: 'BOOT',
  handlersBound: false
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
  cancelEdit: document.getElementById('cancelEdit'),
  exportNote: document.querySelector('[data-export-note]'),
  exportStatus: document.querySelector('[data-export-status-text]'),
  bootOverlay: document.querySelector('[data-boot-overlay]'),
  bootStep: document.querySelector('[data-boot-step]'),
  appShell: document.querySelector('[data-admin-shell]'),
  statusBar: document.querySelector('[data-editor-runtime]'),
  saveIndicator: document.querySelector('[data-save-indicator]'),
  recoveryList: document.getElementById('recoveryList')
};

const BOOT_WATCHDOG_MS = 8000;
const BOOT_FETCH_TIMEOUT_MS = 5000;
const BOOT_FETCH_RETRIES = 1;

const bootState = {
  activeId: 0,
  watchdog: null,
  failed: false,
  booting: false
};

function setStatus(message, detailOrKind = 'info', kindOverride = null) {
  if (!el.status) return;
  let kind = 'info';
  let detail = '';

  if (typeof detailOrKind === 'string' && ['info', 'success', 'error', 'warning'].includes(detailOrKind)) {
    kind = detailOrKind;
  } else {
    detail = detailOrKind ? String(detailOrKind) : '';
    kind = kindOverride || 'error';
  }

  el.status.textContent = detail ? `${message} — ${detail}` : message;
  el.status.dataset.state = kind;
}

function setExportStatus(message) {
  if (el.exportStatus) el.exportStatus.textContent = message;
}

function setBootStep(stepLabel) {
  runtimeState.bootStep = stepLabel;
  if (el.bootStep) el.bootStep.textContent = stepLabel;
  setStatus(`Boot: ${stepLabel}`);
}

function setOverlayVisible(isVisible) {
  if (!el.bootOverlay) return;
  el.bootOverlay.hidden = !isVisible;
  el.appShell?.setAttribute('aria-busy', isVisible ? 'true' : 'false');
}

/* ===============================================
   OMEGA ADMIN BOOT LOCK
   Prevents infinite init freeze by enforcing a
   watchdog timeout, unlocking the overlay on
   failures, and surfacing a retry path.
   =============================================== */
let bootRetryButton = null;

function ensureRetryButton() {
  if (bootRetryButton) return bootRetryButton;
  const host = el.status?.closest('.control-row') || el.status?.parentElement;
  if (!host) return null;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ccg-btn ccg-btn--ghost';
  button.textContent = 'Reload editor';
  button.hidden = true;
  button.addEventListener('click', () => window.location.reload());
  host.appendChild(button);
  bootRetryButton = button;
  return bootRetryButton;
}

function setRetryVisible(isVisible) {
  const button = ensureRetryButton();
  if (button) {
    button.hidden = !isVisible;
    button.disabled = false;
  }
}

function clearBootWatchdog() {
  if (bootState.watchdog) {
    window.clearTimeout(bootState.watchdog);
    bootState.watchdog = null;
  }
}

function startBootWatchdog(bootId) {
  clearBootWatchdog();
  bootState.watchdog = window.setTimeout(() => {
    if (bootState.activeId !== bootId || bootState.failed) return;
    const error = new Error('Boot watchdog timeout.');
    handleBootFailure(error, 'watchdog');
  }, BOOT_WATCHDOG_MS);
}

function handleBootFailure(error, stepLabel) {
  if (bootState.failed) return;
  bootState.failed = true;
  clearBootWatchdog();
  setOverlayVisible(false);
  setStatus('Admin boot failed', error?.message || 'Unknown error');
  setRetryVisible(true);
  const step = stepLabel || runtimeState.bootStep || 'unknown';
  console.error(`[CCG-BOOT] FAILED at: ${step}`, error);
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function withTimeout(promise, timeoutMs, label) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms.`)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) window.clearTimeout(timer);
  });
}

async function guardedFetch(fetcher, label) {
  let lastError = null;
  for (let attempt = 0; attempt <= BOOT_FETCH_RETRIES; attempt += 1) {
    try {
      return await withTimeout(fetcher(), BOOT_FETCH_TIMEOUT_MS, label);
    } catch (error) {
      lastError = error;
      console.warn(`[CCG-BOOT] ${label} attempt ${attempt + 1} failed`, error);
      if (attempt < BOOT_FETCH_RETRIES) {
        await delay(600 * (attempt + 1));
      }
    }
  }
  throw lastError;
}

function ensureBootActive(bootId, stepLabel) {
  if (bootState.activeId !== bootId || bootState.failed) {
    throw new Error(`Boot cancelled during ${stepLabel}.`);
  }
}

function roleRank(role) {
  const map = { user: 0, member: 0, editor: 1, mod: 1, admin: 2, superadmin: 3 };
  return map[String(role || '').toLowerCase()] ?? -1;
}

function setRuntimeState(patch = {}) {
  Object.assign(runtimeState, patch);

  const stateLabel = runtimeState.errors.length
    ? 'Invalid'
    : runtimeState.mode === 'draft'
      ? 'Draft'
      : runtimeState.dirty
        ? 'Editing'
        : 'Ready';

  if (el.statusBar) {
    el.statusBar.textContent = `State: ${stateLabel}`;
    el.statusBar.dataset.state = stateLabel.toLowerCase();
  }
  if (el.saveIndicator) {
    if (runtimeState.dirty) {
      el.saveIndicator.textContent = 'Unsaved changes';
    } else if (runtimeState.mode === 'draft') {
      el.saveIndicator.textContent = 'Draft saved locally';
    } else {
      el.saveIndicator.textContent = 'All changes saved in session';
    }
  }

  if (el.saveRecord) {
    el.saveRecord.disabled = !runtimeState.dirty || runtimeState.errors.length > 0;
  }

  if (el.draftState) {
    const show = runtimeState.mode === 'draft' || runtimeState.mode === 'new' || runtimeState.dirty;
    el.draftState.hidden = !show;
    el.draftState.textContent = runtimeState.valid ? 'Draft validated' : 'Draft has unsaved changes';
  }
}

function slugify(text) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/(^-|-$)/g, '');
}

function getUniqueSlug(baseSlug, originalSlug = '') {
  const normalizedBase = slugify(baseSlug || 'game');
  const existingSlugs = new Set(runtimeState.games.map((g) => g.slug).filter(Boolean));
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

function recordKey(record = {}) {
  return record.id || record.slug || crypto.randomUUID();
}

function readDraftStore() {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeDraftStore() {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(runtimeState.drafts));
  } catch {
    // Keep editor operable if storage quota is unavailable.
  }
}

function refreshRecoveryPanel() {
  if (!el.recoveryList) return;
  const entries = Object.entries(runtimeState.drafts)
    .sort((a, b) => Number(b[1]?.savedAtTs || 0) - Number(a[1]?.savedAtTs || 0));

  if (!entries.length) {
    el.recoveryList.innerHTML = '<li>No draft snapshots recorded.</li>';
    return;
  }

  el.recoveryList.innerHTML = entries.slice(0, 12).map(([key, entry]) => {
    const title = entry?.candidate?.title || '(Untitled draft)';
    const when = entry?.savedAt || 'unknown time';
    return `<li><strong>${title}</strong> · ${when}
      <button class="ccg-btn ccg-btn--ghost" data-recover-draft="${key}" type="button">Recover</button>
      <button class="ccg-btn ccg-btn--ghost" data-clear-draft="${key}" type="button">Clear</button>
    </li>`;
  }).join('');
}

function persistDraftSnapshot(candidate) {
  const key = recordKey(candidate);
  runtimeState.drafts[key] = {
    candidate,
    savedAt: new Date().toLocaleString(),
    savedAtTs: Date.now()
  };
  writeDraftStore();
  refreshRecoveryPanel();
}

function pushHistorySnapshot() {
  if (runtimeState.suppressHistory) return;
  const formData = Object.fromEntries(new FormData(el.form).entries());
  const snapshot = JSON.stringify(formData);

  if (runtimeState.history[runtimeState.historyIndex] === snapshot) return;

  const next = runtimeState.history.slice(0, runtimeState.historyIndex + 1);
  next.push(snapshot);
  if (next.length > HISTORY_LIMIT) next.shift();
  runtimeState.history = next;
  runtimeState.historyIndex = runtimeState.history.length - 1;
}

function restoreHistory(direction) {
  const targetIndex = runtimeState.historyIndex + direction;
  if (targetIndex < 0 || targetIndex >= runtimeState.history.length) return;

  runtimeState.historyIndex = targetIndex;
  const snapshot = runtimeState.history[targetIndex];
  const data = JSON.parse(snapshot);

  runtimeState.suppressHistory = true;
  Object.entries(data).forEach(([key, value]) => {
    if (el.form[key]) el.form[key].value = value;
  });
  runtimeState.suppressHistory = false;

  updatePreviewAndValidation();
  setRuntimeState({ dirty: true, mode: 'edit' });
}

function downloadFile(name, content, type = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
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
  runtimeState.games.forEach((game) => {
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
  const years = [...new Set(runtimeState.games.map((g) => g.year))].sort((a, b) => b - a);
  const genres = [...new Set(runtimeState.games.flatMap((g) => g.genres || []))].sort();
  const developers = [...new Set(runtimeState.games.map((g) => g.developer).filter(Boolean))].sort();

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

  runtimeState.filtered = runtimeState.games.filter((game) => {
    const inSearch = !search || [game.title, game.slug, game.developer].join(' ').toLowerCase().includes(search);
    const inYear = !year || String(game.year) === year;
    const inGenre = !genre || (game.genres || []).includes(genre);
    const inDeveloper = !developer || game.developer === developer;
    const inRating = !rating || String(Math.floor(game.ccg_rating || 0)) === rating;
    return inSearch && inYear && inGenre && inDeveloper && inRating;
  });

  runtimeState.page = 1;
  renderPage();
}

function rowTitle(game) {
  return `${game.title}${game._ccg_draft ? ' <span class="draft-badge">Draft/Unsaved</span>' : ''}`;
}

function renderPage() {
  const start = (runtimeState.page - 1) * runtimeState.pageSize;
  const pageItems = runtimeState.filtered.slice(start, start + runtimeState.pageSize);

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

  const totalPages = Math.max(1, Math.ceil(runtimeState.filtered.length / runtimeState.pageSize));
  el.pagination.innerHTML = `
    <button class="ccg-btn ccg-btn--ghost" data-page="prev" type="button" ${runtimeState.page <= 1 ? 'disabled' : ''}>Prev</button>
    <span>Page ${runtimeState.page} / ${totalPages}</span>
    <button class="ccg-btn ccg-btn--ghost" data-page="next" type="button" ${runtimeState.page >= totalPages ? 'disabled' : ''}>Next</button>
  `;
}

function validateGenres(genres) {
  return genres.filter((genre) => !ALLOWED_GENRES.has(String(genre).trim().toLowerCase()));
}

function validateCandidate(candidate, original) {
  const slugSet = new Set(runtimeState.games.map((g) => g.slug));
  const duplicateTitleYear = runtimeState.games.some((g) =>
    g.title?.trim().toLowerCase() === candidate.title.trim().toLowerCase()
      && Number(g.year) === Number(candidate.year)
      && (!original.id || g.id !== original.id)
  );

  const result = validateGameRecord(candidate, {
    slugSet,
    originalSlug: original.slug,
    fileIndex: runtimeState.fileIndex
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

function updateSlugFromTitle() {
  if (runtimeState.slugLocked) return;
  const original = runtimeState.mode === 'new' ? {} : runtimeState.filtered[runtimeState.selectedIndex];
  el.form.slug.value = getUniqueSlug(el.form.title.value, original?.slug || '');
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

  runtimeState.games.forEach((game, index) => {
    const duplicateSlug = slugSeen.has(game.slug);
    slugSeen.add(game.slug);

    const result = validateGameRecord(game, {
      slugSet: slugSeen,
      originalSlug: game.slug,
      fileIndex: runtimeState.fileIndex
    });

    const invalidGenres = validateGenres(game.genres || []);
    if (invalidGenres.length > 0) {
      result.valid = false;
      result.errors.push(`Invalid genres: ${invalidGenres.join(', ')}`);
    }

    if (duplicateSlug) result.errors.push(`Record ${index + 1}: duplicate slug ${game.slug}`);
    if (!result.valid) errors.push(...result.errors.map((error) => `#${index + 1} ${error}`));
  });

  const schema = validateGamesSchema(sanitizeAndSortGames(runtimeState.games));
  if (!schema.valid) errors.push(...schema.errors);

  if (errors.length > 0) {
    setStatus(`Validation failed (${errors.length}): ${errors.slice(0, 3).join(' | ')}`, 'error');
    setRuntimeState({ valid: false, errors });
    return false;
  }

  setRuntimeState({ valid: true, errors: [] });
  setStatus('Validation complete: schema and duplicate checks passed.', 'success');
  return true;
}

function updatePreviewAndValidation() {
  const original = runtimeState.mode === 'new' ? {} : runtimeState.filtered[runtimeState.selectedIndex] || {};
  const formData = Object.fromEntries(new FormData(el.form).entries());

  if (!runtimeState.slugLocked || !formData.slug) {
    formData.slug = getUniqueSlug(formData.title, original.slug || '');
    if (el.form.slug.value !== formData.slug) el.form.slug.value = formData.slug;
  }

  formData.slug = slugify(formData.slug || formData.title);
  formData.genres = (formData.genres || '').split(',').map((v) => v.trim()).filter(Boolean).join(', ');

  const candidate = toSavedRecord(formData, original);
  const validation = validateCandidate(candidate, original);

  runtimeState.currentGame = candidate;
  showInlineErrors(validation.errors);
  setRuntimeState({ valid: validation.valid, errors: validation.errors });
  el.preview.textContent = JSON.stringify(candidate, null, 2);
}

function openEditor(filteredIndex, creating = false, recoveredDraft = null) {
  runtimeState.selectedIndex = filteredIndex;
  runtimeState.selectedGlobalIndex = null;

  let record = {};
  if (creating) {
    record = {
      title: '', slug: '', system: 'Commodore 64', year: '', genres: '', developer: '', publisher: '',
      ccg_rating: '', ccg_rating_reason: '', videoid: '', thumbnails: '', box_3d: '',
      pdf: '', disk: '', lemon64: '', lemonamiga: ''
    };
    setRuntimeState({ mode: 'new', slugLocked: false });
  } else {
    record = normRecord(runtimeState.filtered[filteredIndex]);
    runtimeState.selectedGlobalIndex = runtimeState.games.indexOf(runtimeState.filtered[filteredIndex]);
    setRuntimeState({ mode: 'edit', slugLocked: Boolean(record.slug) && !runtimeState.filtered[filteredIndex]._ccg_draft });
  }

  if (recoveredDraft) {
    record = {
      ...record,
      title: recoveredDraft.title || record.title,
      slug: recoveredDraft.slug || record.slug,
      system: recoveredDraft.system || record.system,
      year: recoveredDraft.year || record.year,
      genres: Array.isArray(recoveredDraft.genres) ? recoveredDraft.genres.join(', ') : (record.genres || ''),
      developer: recoveredDraft.developer || record.developer,
      publisher: recoveredDraft.credits?.publisher?.[0] || record.publisher,
      ccg_rating: recoveredDraft.ccg_rating || record.ccg_rating,
      ccg_rating_reason: recoveredDraft.ccg_rating_reason || record.ccg_rating_reason,
      videoid: recoveredDraft.videoid || record.videoid,
      thumbnails: recoveredDraft.thumbnail || record.thumbnails,
      pdf: recoveredDraft.pdf || record.pdf,
      disk: Array.isArray(recoveredDraft.disk) ? recoveredDraft.disk.join(', ') : (record.disk || ''),
      lemon64: Array.isArray(recoveredDraft.lemon) ? recoveredDraft.lemon[0] || '' : (record.lemon64 || ''),
      lemonamiga: Array.isArray(recoveredDraft.lemon) ? recoveredDraft.lemon[1] || '' : (record.lemonamiga || '')
    };
    setRuntimeState({ mode: 'draft', slugLocked: Boolean(recoveredDraft.slug) });
  }

  Object.entries(record).forEach(([key, value]) => {
    if (el.form[key]) {
      el.form[key].value = value ?? '';
      el.form[key].readOnly = false;
    }
  });

  runtimeState.history = [];
  runtimeState.historyIndex = -1;
  setRuntimeState({ dirty: false, valid: false, errors: [] });
  pushHistorySnapshot();
  updatePreviewAndValidation();
  el.modal.showModal();
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

async function downloadSeoStubBundle() {
  if (!window.JSZip) {
    setStatus('JSZip missing. Cannot generate SEO stub bundle.', 'error');
    return;
  }
  const zip = new window.JSZip();
  runtimeState.games.filter((g) => g.slug).forEach((game) => zip.file(`${game.slug}.html`, buildSeoStubHtml(game)));
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

  const payload = sanitizeAndSortGames(runtimeState.games);
  const zip = new window.JSZip();
  zip.file('games.json', `${JSON.stringify(payload, null, 2)}\n`);
  zip.file('sitemap.xml', buildSitemap(payload));

  const stubFolder = zip.folder('seo-stubs');
  payload.filter((g) => g.slug).forEach((game) => stubFolder.file(`${game.slug}.html`, buildSeoStubHtml(game)));

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

  const payload = sanitizeAndSortGames(runtimeState.games);
  const after = JSON.stringify(payload, null, 2);
  makeDiff(runtimeState.rawBeforeEdit, after);

  const versionStamp = new Date().toISOString();
  const confirmExport = window.confirm(`Export ${payload.length} records with version ${versionStamp}? A local backup will be created first.`);
  if (!confirmExport) {
    setExportStatus('Export cancelled by user.');
    return;
  }

  const message = `admin(games-editor): update games.json ${versionStamp}`;
  try {
    await saveGamesJson({ games: payload, message, role: runtimeState.role });
    localStorage.setItem('omegaAdminLastExportVersion', versionStamp);
    localStorage.setItem('omegaAdminLastExportTime', new Date().toLocaleString());
    setStatus('Downloaded games.json and versioned backup snapshot.', 'success');
    setExportStatus(`games.json exported. version=${versionStamp}`);
    if (el.exportNote) el.exportNote.hidden = false;
    runtimeState.games = runtimeState.games.map((game) => ({ ...game, _ccg_draft: false }));
    runtimeState.rawBeforeEdit = after;
    renderPage();
    await refreshBackups();
  } catch (error) {
    setStatus(`Export failed: ${error.message}`, 'error');
  }
}

function closeEditor() {
  setRuntimeState({ mode: 'view', dirty: false, valid: false, errors: [] });
  showInlineErrors([]);
  el.modal.close();
}

function saveCurrentDraft() {
  updatePreviewAndValidation();
  const candidate = runtimeState.currentGame;
  if (!candidate) return;

  candidate._ccg_draft = true;
  persistDraftSnapshot(candidate);

  if (runtimeState.mode === 'new') {
    runtimeState.games.unshift(candidate);
    setStatus('New draft game added in memory. Export when ready.', 'success');
  } else if (runtimeState.selectedGlobalIndex != null) {
    runtimeState.games[runtimeState.selectedGlobalIndex] = { ...candidate, _ccg_draft: true };
    setStatus('Draft updated.', 'success');
  }

  setRuntimeState({ mode: 'draft', dirty: false, valid: true, errors: [], slugLocked: true });
  renderFilters();
  applyFilters();
  el.modal.close();
}

function bindHandlers() {
  if (runtimeState.handlersBound) return;
  runtimeState.handlersBound = true;

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
      runtimeState.page += page.dataset.page === 'next' ? 1 : -1;
      renderPage();
    }

    const restore = event.target.closest('[data-restore]');
    if (restore && roleRank(runtimeState.role) >= roleRank('admin')) {
      await restoreBackup(restore.dataset.restore);
      setStatus('Backup exported for restore.', 'success');
    }

    const recover = event.target.closest('[data-recover-draft]');
    if (recover) {
      const draft = runtimeState.drafts[recover.dataset.recoverDraft]?.candidate;
      if (draft) {
        openEditor(-1, true, draft);
        setStatus('Recovered draft loaded in editor.', 'success');
      }
    }

    const clearDraft = event.target.closest('[data-clear-draft]');
    if (clearDraft) {
      delete runtimeState.drafts[clearDraft.dataset.clearDraft];
      writeDraftStore();
      refreshRecoveryPanel();
    }
  });

  document.getElementById('addGame').addEventListener('click', () => openEditor(-1, true));
  document.getElementById('validateLibrary').addEventListener('click', validateAllGames);

  el.form.addEventListener('input', (event) => {
    if (event.target.name === 'title') updateSlugFromTitle();
    if (event.target.name === 'slug') {
      el.form.slug.value = slugify(el.form.slug.value);
      runtimeState.slugLocked = el.form.slug.value.length > 0;
    }
    setRuntimeState({ dirty: true, mode: runtimeState.mode === 'new' ? 'new' : 'edit' });
    pushHistorySnapshot();
    updatePreviewAndValidation();
  });

  el.cancelEdit.addEventListener('click', closeEditor);
  el.saveRecord.addEventListener('click', saveCurrentDraft);

  document.getElementById('showDiff').addEventListener('click', () => {
    const after = JSON.stringify(runtimeState.games, null, 2);
    el.diffBefore.value = runtimeState.rawBeforeEdit;
    el.diffAfter.value = after;
    makeDiff(runtimeState.rawBeforeEdit, after);
  });

  document.getElementById('saveAll').addEventListener('click', exportGamesJson);
  document.getElementById('downloadGamesJson').addEventListener('click', exportGamesJson);
  document.getElementById('downloadStubBundle').addEventListener('click', () => { void downloadSeoStubBundle(); });
  document.getElementById('downloadFullPackage').addEventListener('click', () => { void downloadFullPackage(); });
  document.getElementById('copyNodeSteps').addEventListener('click', copyNodeInstructions);

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      if (el.modal.open) {
        saveCurrentDraft();
      } else {
        void exportGamesJson();
      }
    }

    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z' && el.modal.open) {
      event.preventDefault();
      restoreHistory(-1);
    }

    if (((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'z') && el.modal.open) {
      event.preventDefault();
      restoreHistory(1);
    }
  });
}

async function bootstrapDeterministic(bootId) {
  bootState.failed = false;
  setRetryVisible(false);
  setOverlayVisible(true);
  setBootStep('Auth Ready');

  await waitForAuthReady();
  ensureBootActive(bootId, 'Auth Ready');

  setBootStep('Role Verified');

  /* ===================================================
     OMEGA AUTH LOCK — DO NOT REMOVE
     Prevents admin lockout via role desync
     =================================================== */
  let context = await getAuthContext();
  let role = String(context?.role || '').toLowerCase();
  ensureBootActive(bootId, 'Role Verified');

  if (!context?.isAuthenticated || roleRank(role) < roleRank('admin')) {
    console.warn('[CCG-AUTH] forbidden bootstrap; retrying auth context rebuild');
    context = await getAuthContext({ forceRoleRefresh: true });
    role = String(context?.role || '').toLowerCase();
  }

  if (!context?.isAuthenticated || roleRank(role) < roleRank('admin')) {
    console.warn(`[CCG-AUTH] redirect=forbidden authenticated=${Boolean(context?.isAuthenticated)} role=${role || 'none'}`);
    window.location.replace('/admin/login.html?reason=forbidden');
    return;
  }

  setRuntimeState({ user: context.user || null, role });
  el.role.textContent = role;
  el.email.textContent = context.user?.email || 'unknown';
  ensureBootActive(bootId, 'Role Verified');

  setBootStep('Data Loaded');
  const gamesResult = await guardedFetch(fetchGamesJson, 'fetchGamesJson');
  ensureBootActive(bootId, 'fetchGamesJson');
  const fileResult = await guardedFetch(fetchFileIndex, 'fetchFileIndex');
  ensureBootActive(bootId, 'fetchFileIndex');
  runtimeState.games = gamesResult.games;
  runtimeState.rawBeforeEdit = JSON.stringify(gamesResult.games, null, 2);
  runtimeState.fileIndex = new Set(fileResult.files || []);
  runtimeState.drafts = readDraftStore();

  setBootStep('UI Enabled');
  renderFilters();
  applyFilters();
  refreshRecoveryPanel();
  await refreshBackups();

  setBootStep('Handlers Bound');
  bindHandlers();

  setBootStep('Ready');
  setRuntimeState({ mode: 'view', dirty: false, valid: true, errors: [] });
  setStatus(`Loaded ${runtimeState.games.length} games.`, 'success');
  console.info(`[CCG-BOOT] auth=ok role=${role || 'unknown'} data=ok ui=ok`);
  setOverlayVisible(false);
  clearBootWatchdog();
  if (bootState.activeId === bootId) {
    bootState.booting = false;
  }
}

function start() {
  startAccessMonitor();
  initAdminNav({ pageLabel: 'Games Editor', active: 'editor' });

  let started = false;
  const run = () => {
    if (bootState.booting) return;
    bootState.booting = true;
    started = true;
    const bootId = ++bootState.activeId;
    startBootWatchdog(bootId);

    void bootstrapDeterministic(bootId).catch((error) => {
      handleBootFailure(error, runtimeState.bootStep);
    }).finally(() => {
      if (bootState.activeId === bootId) {
        bootState.booting = false;
      }
    });
  };

  window.addEventListener('ccg:auth-ready', run, { once: true });
  void waitForAuthReady().then(run).catch((error) => setStatus(error.message, 'error'));
}

start();

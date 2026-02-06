import { initAdminNav } from './admin-nav.js';
import { getAuthContext, waitForAuthReady } from './auth.js';

const SITE_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';
const GAMES_PATH = '/games/games.json';
const STORAGE_KEY = 'omegaGameBuilderDraftV1';
const MAX_STEP = 6;
const MAX_LIBRARY_ATTEMPTS = 2;
const LIBRARY_RETRY_DELAY_MS = 800;
const ALLOWED_WRITE_ROLES = ['editor', 'admin', 'superadmin'];

const THUMBNAIL_BASE_PATH = 'resources/images/thumbnails/all/';
const BOX3D_BASE_PATH = 'resources/images/games/boxes-3d/';

const state = {
  step: 1,
  library: [],
  slugSet: new Set(),
  idSet: new Set(),
  slugLocked: false,
  idLocked: false,
  draft: null,
  schema: {
    requiredFields: [],
    optionalFields: [],
    creditKeys: [],
    systems: [],
    genres: []
  },
  validation: { errors: [], warnings: [], missing: [], fieldErrors: {} },
  outputs: null,
  lastSavedAt: null,
  auth: {
    ready: false,
    context: null,
    canWrite: false
  }
};

const el = {
  email: document.querySelector('[data-editor-email]'),
  role: document.querySelector('[data-editor-role]'),
  runtime: document.querySelector('[data-runtime-state]'),
  draftIndicator: document.querySelector('[data-draft-indicator]'),
  libraryIndicator: document.querySelector('[data-library-indicator]'),
  exportNote: document.querySelector('[data-export-note]'),
  steps: Array.from(document.querySelectorAll('[data-step]')),
  progress: Array.from(document.querySelectorAll('[data-progress-step]')),
  fields: Array.from(document.querySelectorAll('[data-field]')),
  genreList: document.querySelector('[data-genre-list]'),
  systemSelect: document.querySelector('[data-system-select]'),
  overrideFields: {
    thumbnail: document.querySelector('[data-override-field="thumbnail"]'),
    box3d: document.querySelector('[data-override-field="box3d"]')
  },
  pathPreviews: {
    thumbnail: document.querySelector('[data-preview-path="thumbnail"]'),
    box3d: document.querySelector('[data-preview-path="box3d"]')
  },
  previews: {
    canonical: document.querySelector('[data-preview="canonical"]'),
    sitemap: document.querySelector('[data-preview="sitemap"]'),
    metaDescription: document.querySelector('[data-preview="meta-description"]'),
    gameJson: document.querySelector('[data-preview="game-json"]'),
    stubHtml: document.querySelector('[data-preview="stub-html"]'),
    sitemapFragment: document.querySelector('[data-preview="sitemap-fragment"]'),
    metadataJson: document.querySelector('[data-preview="metadata-json"]'),
    manifestJson: document.querySelector('[data-preview="manifest-json"]'),
    readme: document.querySelector('[data-preview="readme"]')
  },
  validation: {
    errors: document.querySelector('[data-validation-errors]'),
    summary: document.querySelector('[data-validation-summary]'),
    status: document.querySelector('[data-validation-status]'),
    warnings: document.querySelector('[data-validation-warnings]')
  },
  actions: {
    saveDraft: document.querySelector('[data-action="save-draft"]'),
    resetWizard: document.querySelector('[data-action="reset-wizard"]'),
    buildPackage: document.querySelector('[data-action="build-package"]'),
    runValidation: document.querySelector('[data-action="run-validation"]'),
    generateOutput: document.querySelector('[data-action="generate-output"]'),
    downloadBundle: document.querySelector('[data-action="download-bundle"]'),
    prevStep: document.querySelector('[data-action="prev-step"]'),
    nextStep: document.querySelector('[data-action="next-step"]'),
    toggleThumbnailOverride: document.querySelector('[data-action="toggle-thumbnail-override"]'),
    toggleBox3dOverride: document.querySelector('[data-action="toggle-box3d-override"]')
  }
};

function setRuntimeState(message, kind = 'ready') {
  if (!el.runtime) return;
  el.runtime.textContent = `State: ${message}`;
  el.runtime.dataset.state = kind;
}

function setReadOnly(isReadOnly) {
  const disableActions = [
    'saveDraft',
    'resetWizard',
    'buildPackage',
    'generateOutput',
    'downloadBundle',
    'toggleThumbnailOverride',
    'toggleBox3dOverride'
  ];

  disableActions.forEach((key) => {
    if (el.actions[key]) {
      el.actions[key].disabled = Boolean(isReadOnly);
    }
  });

  el.fields.forEach((field) => {
    field.disabled = Boolean(isReadOnly);
  });

  if (el.genreList) {
    el.genreList.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      input.disabled = Boolean(isReadOnly);
    });
  }
}

function applyAuthContext(context, error) {
  const isAuthenticated = Boolean(context?.isAuthenticated);
  const role = context?.role || 'none';
  const canWrite = isAuthenticated && ALLOWED_WRITE_ROLES.includes(role);

  state.auth.ready = true;
  state.auth.context = context || null;
  state.auth.canWrite = canWrite;

  if (el.email) el.email.textContent = context?.user?.email || 'guest';
  if (el.role) el.role.textContent = role;

  if (error) {
    console.error('[OMEGA-GAME-BUILDER] auth error', error);
    setRuntimeState('Auth error · read-only', 'error');
    setReadOnly(true);
    return;
  }

  if (!isAuthenticated) {
    setRuntimeState('Guest · read-only', 'info');
    setReadOnly(true);
    return;
  }

  if (!canWrite) {
    setRuntimeState('Read-only · role limited', 'warning');
    setReadOnly(true);
    return;
  }

  setRuntimeState('Ready');
  setReadOnly(false);
}

function defaultDraft() {
  return {
    title: '',
    slug: '',
    id: '',
    system: '',
    year: '',
    developer: '',
    thumbnailFile: '',
    thumbnailOverride: '',
    box3dFile: '',
    box3dOverride: '',
    thumbnail: '',
    box3d: '',
    videoId: '',
    pdf: '',
    diskRefs: '',
    externalRefs: '',
    collections: '',
    genres: [],
    ccgRating: '',
    ccgRatingReason: '',
    description: '',
    creditPublisher: '',
    creditProducer: '',
    creditCoder: '',
    creditGraphics: '',
    creditMusician: '',
    creditRereleaser: '',
    creditDeveloper: '',
    seoTitle: ''
  };
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');
}

function generateUniqueSlug(base, existing) {
  if (!base) return '';
  let slug = base;
  let counter = 2;
  while (existing.has(slug)) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
}

function generateUniqueId(base, existing) {
  if (!base) return '';
  let id = base;
  let counter = 2;
  while (existing.has(id)) {
    id = `${base}_${counter}`;
    counter += 1;
  }
  return id;
}

function listFromText(value) {
  return String(value || '')
    .split(/\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildCredits(draft) {
  return {
    publisher: listFromText(draft.creditPublisher),
    producer: draft.creditProducer || '',
    coder: listFromText(draft.creditCoder),
    graphics: listFromText(draft.creditGraphics),
    musician: listFromText(draft.creditMusician),
    re_releaser: listFromText(draft.creditRereleaser),
    developer: draft.creditDeveloper || ''
  };
}

function buildSortTitle(title) {
  const trimmed = String(title || '').trim();
  const cleaned = trimmed.replace(/^(the|a|an)\s+/i, '').trim();
  return cleaned || trimmed;
}

function toNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

/* ============================================================
   SCHEMA MAP: Derived directly from games.json (no guessing).
   We use this for required/optional fields, credit keys, and
   system/genre options to keep the wizard aligned with data.
============================================================ */

function buildSchemaMap(library) {
  const fieldCounts = new Map();
  const creditKeys = new Set();
  const systems = new Set();
  const genres = new Set();

  library.forEach((game) => {
    Object.keys(game).forEach((key) => {
      fieldCounts.set(key, (fieldCounts.get(key) || 0) + 1);
    });

    if (game.credits && typeof game.credits === 'object') {
      Object.keys(game.credits).forEach((key) => creditKeys.add(key));
    }

    if (game.system) systems.add(game.system);
    if (Array.isArray(game.genres)) {
      game.genres.forEach((genre) => genres.add(genre));
    }
  });

  const requiredFields = Array.from(fieldCounts.entries())
    .filter(([, count]) => count === library.length)
    .map(([key]) => key)
    .sort();
  const optionalFields = Array.from(fieldCounts.keys())
    .filter((key) => !requiredFields.includes(key))
    .sort();

  return {
    requiredFields,
    optionalFields,
    creditKeys: Array.from(creditKeys).sort(),
    systems: Array.from(systems).sort(),
    genres: Array.from(genres).sort()
  };
}

/* ============================================================
   FILENAME-ONLY INPUTS: Expand filenames into full asset paths.
   Users enter just the filename; we prefix the known folder.
============================================================ */

function buildAssetPath({ filename, override, base }) {
  if (override) return override;
  if (!filename) return '';
  return `${base}${filename}`;
}

function normalizeDraft() {
  const draft = state.draft;
  if (!draft) return;

  draft.title = String(draft.title || '').trim();
  if (!state.slugLocked) {
    const baseSlug = slugify(draft.title);
    draft.slug = generateUniqueSlug(baseSlug, state.slugSet);
  }

  draft.slug = String(draft.slug || '').trim();
  const baseId = draft.slug ? draft.slug.replace(/-/g, '_') : '';
  if (!state.idLocked) {
    draft.id = generateUniqueId(baseId, state.idSet);
  }

  draft.id = String(draft.id || '').trim();
  draft.system = String(draft.system || '').trim();
  draft.year = String(draft.year || '').trim();
  draft.developer = String(draft.developer || '').trim();
  draft.thumbnailFile = String(draft.thumbnailFile || '').trim();
  draft.thumbnailOverride = String(draft.thumbnailOverride || '').trim();
  draft.box3dFile = String(draft.box3dFile || '').trim();
  draft.box3dOverride = String(draft.box3dOverride || '').trim();
  draft.thumbnail = buildAssetPath({
    filename: draft.thumbnailFile,
    override: draft.thumbnailOverride,
    base: THUMBNAIL_BASE_PATH
  });
  draft.box3d = buildAssetPath({
    filename: draft.box3dFile,
    override: draft.box3dOverride,
    base: BOX3D_BASE_PATH
  });
  draft.videoId = String(draft.videoId || '').trim();
  draft.pdf = String(draft.pdf || '').trim();
  draft.diskRefs = String(draft.diskRefs || '').trim();
  draft.externalRefs = String(draft.externalRefs || '').trim();
  draft.collections = String(draft.collections || '').trim();
  draft.ccgRating = String(draft.ccgRating || '').trim();
  draft.ccgRatingReason = String(draft.ccgRatingReason || '').trim();
  draft.description = String(draft.description || '').trim();
  draft.creditPublisher = String(draft.creditPublisher || '').trim();
  draft.creditProducer = String(draft.creditProducer || '').trim();
  draft.creditCoder = String(draft.creditCoder || '').trim();
  draft.creditGraphics = String(draft.creditGraphics || '').trim();
  draft.creditMusician = String(draft.creditMusician || '').trim();
  draft.creditRereleaser = String(draft.creditRereleaser || '').trim();
  draft.creditDeveloper = String(draft.creditDeveloper || '').trim();
  draft.seoTitle = String(draft.seoTitle || '').trim();
}

function updateFormFromDraft() {
  el.fields.forEach((field) => {
    const name = field.dataset.field;
    if (!name || !(name in state.draft)) return;
    if (field.type === 'checkbox') return;
    field.value = state.draft[name] ?? '';
  });

  if (el.genreList) {
    const selected = new Set(state.draft.genres || []);
    el.genreList.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      input.checked = selected.has(input.value);
    });
  }
}

function buildMetaDescription(draft, entry) {
  return draft.description || entry?.description || '';
}

function updatePreviewFields() {
  const slug = state.draft.slug || '';
  const canonical = slug ? `${SITE_ORIGIN}/games/${slug}/` : '';
  const sitemap = slug ? buildSitemapFragment(state.draft, { fragmentOnly: true }) : '';
  const metaDescription = buildMetaDescription(state.draft);
  if (el.previews.canonical) el.previews.canonical.value = canonical;
  if (el.previews.sitemap) el.previews.sitemap.value = sitemap;
  if (el.previews.metaDescription) el.previews.metaDescription.value = metaDescription;

  if (el.pathPreviews.thumbnail) {
    el.pathPreviews.thumbnail.textContent = state.draft.thumbnail
      ? `Full path: ${state.draft.thumbnail}`
      : '';
  }
  if (el.pathPreviews.box3d) {
    el.pathPreviews.box3d.textContent = state.draft.box3d
      ? `Full path: ${state.draft.box3d}`
      : '';
  }
}

function updateProgress() {
  el.steps.forEach((section) => {
    const step = Number(section.dataset.step || 0);
    section.hidden = step !== state.step;
  });

  el.progress.forEach((node) => {
    const step = Number(node.dataset.progressStep || 0);
    node.classList.toggle('is-active', step === state.step);
    node.classList.toggle('is-complete', step < state.step);
  });

  if (el.actions.prevStep) el.actions.prevStep.disabled = state.step === 1;
  if (el.actions.nextStep) el.actions.nextStep.disabled = state.step === MAX_STEP;
}

function setDraftIndicator(message) {
  if (!el.draftIndicator) return;
  el.draftIndicator.textContent = message;
}

function saveDraft() {
  const payload = {
    step: state.step,
    slugLocked: state.slugLocked,
    idLocked: state.idLocked,
    draft: state.draft,
    savedAt: Date.now()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  state.lastSavedAt = payload.savedAt;
  setDraftIndicator(`Draft: saved ${new Date(payload.savedAt).toLocaleTimeString()}`);
}

function loadDraft() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    state.draft = defaultDraft();
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    state.step = Math.min(Math.max(parsed.step || 1, 1), MAX_STEP);
    state.slugLocked = Boolean(parsed.slugLocked);
    state.idLocked = Boolean(parsed.idLocked);
    state.draft = { ...defaultDraft(), ...(parsed.draft || {}) };
    state.lastSavedAt = parsed.savedAt || null;
    if (state.lastSavedAt) {
      setDraftIndicator(`Draft: restored ${new Date(state.lastSavedAt).toLocaleTimeString()}`);
    }
  } catch {
    state.draft = defaultDraft();
  }
}

function resetWizard() {
  localStorage.removeItem(STORAGE_KEY);
  state.step = 1;
  state.slugLocked = false;
  state.idLocked = false;
  state.draft = defaultDraft();
  state.outputs = null;
  state.validation = { errors: [], warnings: [], missing: [], fieldErrors: {} };
  updateFormFromDraft();
  updatePreviewFields();
  renderValidation();
  renderOutputs();
  updateProgress();
  setDraftIndicator('Draft: cleared');
  if (el.actions.downloadBundle) el.actions.downloadBundle.disabled = true;
  if (el.exportNote) el.exportNote.hidden = true;
}

function setLibraryIndicator(message) {
  if (!el.libraryIndicator) return;
  el.libraryIndicator.textContent = message;
}

function wait(delayMs) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

function renderSystemOptions() {
  if (!el.systemSelect) return;
  const options = state.schema.systems.length ? state.schema.systems : ['C64'];
  el.systemSelect.querySelectorAll('option:not([value=""])').forEach((option) => option.remove());
  options.forEach((system) => {
    const option = document.createElement('option');
    option.value = system;
    option.textContent = system;
    el.systemSelect.appendChild(option);
  });
}

function renderGenres() {
  if (!el.genreList) return;
  const genres = state.schema.genres.length ? state.schema.genres : [];
  el.genreList.innerHTML = '';
  genres.forEach((genre) => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = genre;
    label.appendChild(input);
    label.append(` ${genre.replace(/(^|-)\w/g, (match) => match.toUpperCase())}`);
    el.genreList.appendChild(label);
  });
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function isValidPath(value) {
  if (!value) return false;
  if (value.startsWith('resources/')) return true;
  return isValidUrl(value);
}

function isValidFilename(value) {
  if (!value) return false;
  if (/^https?:/i.test(value)) return false;
  if (/[\\/]/.test(value)) return false;
  return /\.[a-z0-9]{2,}$/i.test(value);
}

function validateDraft() {
  const errors = [];
  const warnings = [];
  const missing = [];
  const fieldErrors = {};

  const slug = state.draft.slug;
  const id = state.draft.id;
  const allowedSystems = new Set(state.schema.systems);

  if (!state.draft.title) {
    missing.push('Title');
    fieldErrors.title = 'Title is required.';
  }

  if (!slug) {
    missing.push('Slug');
    fieldErrors.slug = 'Slug is required.';
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    errors.push('Slug must use lowercase letters, numbers, and hyphens only.');
    fieldErrors.slug = 'Use lowercase letters, numbers, and hyphens only.';
  }

  if (!id) {
    missing.push('Game ID');
    fieldErrors.id = 'Game ID is required.';
  }

  if (!state.draft.system) {
    missing.push('System');
    fieldErrors.system = 'System is required.';
  } else if (allowedSystems.size && !allowedSystems.has(state.draft.system)) {
    errors.push('System must match an existing system in games.json.');
    fieldErrors.system = 'Choose a system from the existing list.';
  }

  if (!state.draft.year) {
    missing.push('Year');
    fieldErrors.year = 'Year is required.';
  } else if (!/^\d{4}$/.test(state.draft.year)) {
    errors.push('Year must be 4 digits.');
    fieldErrors.year = 'Enter a 4-digit year.';
  } else {
    const yearValue = toNumber(state.draft.year);
    if (yearValue && (yearValue < 1977 || yearValue > 2099)) {
      warnings.push('Year looks unusual. Confirm the release year.');
    }
  }

  if ((state.draft.genres || []).length === 0) {
    missing.push('Genres');
    fieldErrors.genres = 'Select at least one genre.';
  }

  const ratingValue = toNumber(state.draft.ccgRating);
  if (!ratingValue) {
    missing.push('CCG Rating');
    fieldErrors.ccgRating = 'CCG rating is required.';
  } else if (ratingValue < 1 || ratingValue > 10) {
    errors.push('CCG rating must be between 1 and 10.');
    fieldErrors.ccgRating = 'Rating must be between 1 and 10.';
  }

  if (!state.draft.thumbnailFile && !state.draft.thumbnailOverride) {
    missing.push('Thumbnail');
    fieldErrors.thumbnailFile = 'Thumbnail filename is required.';
  }

  if (state.draft.thumbnailFile && !isValidFilename(state.draft.thumbnailFile)) {
    errors.push('Thumbnail filename must include a file extension and no slashes.');
    fieldErrors.thumbnailFile = 'Use a filename with extension (no slashes).';
  }

  if (state.draft.thumbnailOverride && !isValidPath(state.draft.thumbnailOverride)) {
    errors.push('Thumbnail override must be a resources/ path or full URL.');
    fieldErrors.thumbnailOverride = 'Use a resources/ path or full URL.';
  }

  if (state.draft.box3dFile && !isValidFilename(state.draft.box3dFile)) {
    errors.push('3D box filename must include a file extension and no slashes.');
    fieldErrors.box3dFile = 'Use a filename with extension (no slashes).';
  }

  if (state.draft.box3dOverride && !isValidPath(state.draft.box3dOverride)) {
    errors.push('3D box override must be a resources/ path or full URL.');
    fieldErrors.box3dOverride = 'Use a resources/ path or full URL.';
  }

  if (slug && state.slugSet.has(slug)) {
    errors.push(`Duplicate slug detected: ${slug}`);
    fieldErrors.slug = 'Slug already exists. Edit to make it unique.';
  }

  if (id && state.idSet.has(id)) {
    errors.push(`Duplicate ID detected: ${id}`);
    fieldErrors.id = 'ID already exists. Edit to make it unique.';
  }

  if (state.draft.pdf && !isValidUrl(state.draft.pdf)) {
    warnings.push('Manual/PDF URL looks invalid.');
    fieldErrors.pdf = 'Check the URL format.';
  }

  const diskRefs = listFromText(state.draft.diskRefs);
  const invalidDisks = diskRefs.filter((ref) => !isValidUrl(ref));
  if (invalidDisks.length) {
    warnings.push(`Disk URLs contain invalid entries: ${invalidDisks.join(', ')}`);
    fieldErrors.diskRefs = 'One or more disk URLs look invalid.';
  }

  const externalRefs = listFromText(state.draft.externalRefs);
  const invalidRefs = externalRefs.filter((ref) => !isValidUrl(ref));
  if (invalidRefs.length) {
    warnings.push(`Reference links contain invalid URLs: ${invalidRefs.join(', ')}`);
    fieldErrors.externalRefs = 'One or more reference URLs look invalid.';
  }

  if (state.draft.videoId && !/^[a-zA-Z0-9_-]{6,}$/.test(state.draft.videoId)) {
    warnings.push('Video ID looks unusual.');
    fieldErrors.videoId = 'Check the YouTube ID.';
  }

  if (missing.length) {
    errors.push(`Missing required fields: ${missing.join(', ')}`);
  }

  return { errors, warnings, missing, fieldErrors };
}

function renderFieldErrors(fieldErrors) {
  document.querySelectorAll('[data-error-for]').forEach((node) => {
    const key = node.dataset.errorFor;
    node.textContent = fieldErrors[key] || '';
  });
}

function renderValidation() {
  const { errors, warnings, fieldErrors } = state.validation;
  if (el.validation.status) {
    el.validation.status.textContent = errors.length
      ? `Validation failed with ${errors.length} error(s).`
      : 'Validation passed. Ready to build.';
  }

  if (el.validation.errors) {
    if (errors.length) {
      el.validation.errors.hidden = false;
      el.validation.errors.innerHTML = `<ul>${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('')}</ul>`;
    } else {
      el.validation.errors.hidden = true;
      el.validation.errors.innerHTML = '';
    }
  }

  if (el.validation.warnings) {
    el.validation.warnings.innerHTML = warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('');
  }

  renderFieldErrors(fieldErrors || {});

  if (el.actions.generateOutput) {
    el.actions.generateOutput.disabled = errors.length > 0 || !state.auth.canWrite;
  }
  if (el.actions.buildPackage) {
    el.actions.buildPackage.disabled = errors.length > 0 || !state.auth.canWrite;
  }
}

function renderOutputs() {
  if (!state.outputs) {
    if (el.previews.gameJson) el.previews.gameJson.textContent = '';
    if (el.previews.stubHtml) el.previews.stubHtml.textContent = '';
    if (el.previews.sitemapFragment) el.previews.sitemapFragment.textContent = '';
    if (el.previews.metadataJson) el.previews.metadataJson.textContent = '';
    if (el.previews.manifestJson) el.previews.manifestJson.textContent = '';
    if (el.previews.readme) el.previews.readme.textContent = '';
    return;
  }

  const { entry, stubHtml, sitemapFragment, metadataJson, manifestJson, readme } = state.outputs;
  if (el.previews.gameJson) el.previews.gameJson.textContent = JSON.stringify(entry, null, 2);
  if (el.previews.stubHtml) el.previews.stubHtml.textContent = stubHtml;
  if (el.previews.sitemapFragment) el.previews.sitemapFragment.textContent = sitemapFragment;
  if (el.previews.metadataJson) el.previews.metadataJson.textContent = metadataJson;
  if (el.previews.manifestJson) el.previews.manifestJson.textContent = manifestJson;
  if (el.previews.readme) el.previews.readme.textContent = readme;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[char] || char));
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/'/g, '&#39;');
}

function buildGameRecord() {
  const ratingValue = toNumber(state.draft.ccgRating) || 0;
  const yearValue = toNumber(state.draft.year) || 0;
  const externalRefs = listFromText(state.draft.externalRefs);
  const diskRefs = listFromText(state.draft.diskRefs);
  const collections = listFromText(state.draft.collections);

  return {
    system: state.draft.system,
    id: state.draft.id,
    slug: state.draft.slug,
    title: state.draft.title,
    sorttitle: buildSortTitle(state.draft.title),
    year: yearValue,
    genres: state.draft.genres,
    collections,
    videoid: state.draft.videoId,
    thumbnail: state.draft.thumbnail,
    pdf: state.draft.pdf,
    disk: diskRefs,
    lemon: externalRefs,
    description: state.draft.description,
    ccg_rating: ratingValue,
    ccg_rating_reason: state.draft.ccgRatingReason || '',
    credits: buildCredits(state.draft),
    developer: state.draft.developer,
    _ccg_enforced: false,
    _ccg_migrated: false
  };
}

function buildMetadataJson(entry) {
  const metadata = {
    id: entry.id,
    slug: entry.slug,
    title: entry.title,
    seo: {
      title: state.draft.seoTitle || `${entry.title} | Cheeky Commodore Gamer`,
      description: buildMetaDescription(state.draft, entry),
      canonical: `${SITE_ORIGIN}/games/${entry.slug}/`
    },
    media: {
      thumbnail: entry.thumbnail,
      box3d: state.draft.box3d,
      videoId: entry.videoid,
      pdf: entry.pdf
    },
    externalRefs: entry.lemon,
    credits: entry.credits,
    generatedAt: new Date().toISOString()
  };

  return JSON.stringify(metadata, null, 2);
}

function buildManifestJson(entry) {
  const manifest = {
    slug: entry.slug,
    expectedFiles: [
      entry.thumbnail,
      state.draft.box3d,
      entry.pdf
    ].filter(Boolean),
    requiredRoutes: [
      `/games/${entry.slug}/index.html`,
      `/games/game.html?id=${entry.id}`
    ],
    generatedAt: new Date().toISOString()
  };

  return JSON.stringify(manifest, null, 2);
}

function buildReadme(entry) {
  return [
    'OMEGA GAME BUILDER PACKAGE',
    '---------------------------',
    `Slug: ${entry.slug}`,
    `ID: ${entry.id}`,
    '',
    '1) Replace /games/games.json with the bundled games.json.',
    `2) Add /games/${entry.slug}/index.html to the repo.`,
    '3) Add sitemap-fragment.xml contents to sitemap-games.xml.',
    '4) Upload any assets listed in manifest.json.',
    '5) If you use metadata.json, store it alongside your game data.',
    '',
    'Do not publish if validation fails in the wizard.'
  ].join('\n');
}

function buildSeoStub(entry) {
  const canonical = `${SITE_ORIGIN}/games/${entry.slug}/`;
  const seoTitle = state.draft.seoTitle || `${entry.title} | Cheeky Commodore Gamer`;
  const description = buildMetaDescription(state.draft, entry) || '';
  const image = entry.thumbnail ? `${SITE_ORIGIN}/${entry.thumbnail}`.replace(/(?<!:)\/\//g, '/') : '';

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: entry.title,
    description,
    datePublished: String(entry.year || ''),
    gamePlatform: entry.system,
    publisher: entry.credits?.publisher?.[0] || '',
    image,
    url: canonical
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="0; url=/games/game.html?id=${escapeAttribute(entry.id)}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>${escapeHtml(seoTitle)}</title>
  <meta name="description" content="${escapeAttribute(description)}" />
  <link rel="canonical" href="${escapeAttribute(canonical)}" />

  <meta property="og:title" content="${escapeAttribute(seoTitle)}" />
  <meta property="og:description" content="${escapeAttribute(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapeAttribute(canonical)}" />
  <meta property="og:image" content="${escapeAttribute(image)}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeAttribute(seoTitle)}" />
  <meta name="twitter:description" content="${escapeAttribute(description)}" />
  <meta name="twitter:image" content="${escapeAttribute(image)}" />

  <script type="application/ld+json">
${JSON.stringify(schema, null, 2)}
  </script>
</head>
<body>
  <script>
    window.location.replace("/games/game.html?id=${escapeAttribute(entry.id)}");
  </script>
</body>
</html>`;
}

function buildSitemapFragment(draft, { fragmentOnly = false } = {}) {
  const slug = draft.slug;
  if (!slug) return '';
  const canonical = `${SITE_ORIGIN}/games/${slug}/`;
  const lastmod = new Date().toISOString().slice(0, 10);
  const fragment = `  <url>\n    <loc>${canonical}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`;
  if (fragmentOnly) return fragment;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${fragment}\n</urlset>`;
}

function buildOutputs() {
  const entry = buildGameRecord();
  const updatedLibrary = [...state.library, entry];
  const gamesJson = JSON.stringify(updatedLibrary, null, 2);
  const stubHtml = buildSeoStub(entry);
  const sitemapFragment = buildSitemapFragment(state.draft);
  const metadataJson = buildMetadataJson(entry);
  const manifestJson = buildManifestJson(entry);
  const readme = buildReadme(entry);

  return {
    entry,
    gamesJson,
    stubHtml,
    sitemapFragment,
    metadataJson,
    manifestJson,
    readme
  };
}

async function downloadBundle() {
  if (!state.outputs) return;
  const zip = new window.JSZip();
  zip.file('games.json', state.outputs.gamesJson);
  zip.folder(`games/${state.outputs.entry.slug}`).file('index.html', state.outputs.stubHtml);
  zip.file('sitemap-fragment.xml', state.outputs.sitemapFragment);
  zip.file('manifest.json', state.outputs.manifestJson);
  zip.file('metadata.json', state.outputs.metadataJson);
  zip.file('readme.txt', state.outputs.readme);

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `omega-game-${state.outputs.entry.slug}.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);

  if (el.exportNote) el.exportNote.hidden = false;
}

function handleFieldInput(event) {
  if (!state.auth.canWrite) return;
  const target = event.target;
  const name = target.dataset.field;
  if (!name) return;

  if (name === 'slug') {
    state.slugLocked = Boolean(target.value.trim());
  }

  if (name === 'id') {
    state.idLocked = Boolean(target.value.trim());
  }

  state.draft[name] = target.value;
  if (name === 'title' && !state.slugLocked) {
    const baseSlug = slugify(state.draft.title);
    state.draft.slug = generateUniqueSlug(baseSlug, state.slugSet);
  }

  normalizeDraft();
  updateFormFromDraft();
  updatePreviewFields();
  setDraftIndicator('Draft: unsaved changes');
}

function handleGenreChange(event) {
  if (!state.auth.canWrite) return;
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  const selected = new Set(state.draft.genres || []);
  if (input.checked) {
    selected.add(input.value);
  } else {
    selected.delete(input.value);
  }
  state.draft.genres = Array.from(selected);
  setDraftIndicator('Draft: unsaved changes');
}

function toggleOverrideField(targetKey) {
  if (!state.auth.canWrite) return;
  const field = el.overrideFields[targetKey];
  if (!field) return;
  field.hidden = !field.hidden;
}

function goToStep(nextStep) {
  state.step = Math.min(Math.max(nextStep, 1), MAX_STEP);
  updateProgress();
}

function bindEvents() {
  el.fields.forEach((field) => {
    field.addEventListener('input', handleFieldInput);
    field.addEventListener('change', handleFieldInput);
  });

  if (el.genreList) {
    el.genreList.addEventListener('change', handleGenreChange);
  }

  el.actions.saveDraft?.addEventListener('click', () => {
    if (!state.auth.canWrite) return;
    saveDraft();
  });

  el.actions.resetWizard?.addEventListener('click', () => {
    if (!state.auth.canWrite) return;
    resetWizard();
  });

  el.actions.prevStep?.addEventListener('click', () => {
    goToStep(state.step - 1);
  });

  el.actions.nextStep?.addEventListener('click', () => {
    goToStep(state.step + 1);
  });

  el.actions.toggleThumbnailOverride?.addEventListener('click', () => {
    toggleOverrideField('thumbnail');
  });

  el.actions.toggleBox3dOverride?.addEventListener('click', () => {
    toggleOverrideField('box3d');
  });

  el.actions.runValidation?.addEventListener('click', () => {
    state.validation = validateDraft();
    renderValidation();
  });

  el.actions.generateOutput?.addEventListener('click', () => {
    if (!state.auth.canWrite) return;
    state.validation = validateDraft();
    renderValidation();
    if (state.validation.errors.length) return;
    state.outputs = buildOutputs();
    renderOutputs();
    if (el.actions.downloadBundle) el.actions.downloadBundle.disabled = false;
  });

  el.actions.downloadBundle?.addEventListener('click', () => {
    if (!state.auth.canWrite) return;
    void downloadBundle();
  });

  el.actions.buildPackage?.addEventListener('click', () => {
    if (!state.auth.canWrite) return;
    state.validation = validateDraft();
    renderValidation();
    if (state.validation.errors.length) {
      goToStep(5);
      return;
    }
    state.outputs = buildOutputs();
    renderOutputs();
    if (el.actions.downloadBundle) el.actions.downloadBundle.disabled = false;
    goToStep(6);
    void downloadBundle();
  });
}

async function fetchLibraryPayload() {
  const response = await fetch(GAMES_PATH, {
    cache: 'no-store',
    credentials: 'same-origin'
  });
  if (!response.ok) {
    throw new Error(`Unable to load games.json (HTTP ${response.status})`);
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error(`games.json parse failed (${error?.message || 'invalid JSON'})`);
  }

  if (!Array.isArray(data)) {
    throw new Error('games.json is not an array.');
  }

  return data;
}

async function loadLibrary() {
  setLibraryIndicator('Library: loading games.json…');
  let lastError;
  for (let attempt = 1; attempt <= MAX_LIBRARY_ATTEMPTS; attempt += 1) {
    try {
      const data = await fetchLibraryPayload();
      state.library = data;
      state.slugSet = new Set(data.map((game) => game.slug));
      state.idSet = new Set(data.map((game) => game.id));
      state.schema = buildSchemaMap(data);
      setLibraryIndicator(`Library: ${data.length} games loaded`);
      return;
    } catch (error) {
      lastError = error;
      console.error(
        `[OMEGA-GAME-BUILDER] games.json load failed (attempt ${attempt}/${MAX_LIBRARY_ATTEMPTS})`,
        error
      );
      if (attempt < MAX_LIBRARY_ATTEMPTS) {
        setLibraryIndicator(`Library: retrying (${attempt + 1}/${MAX_LIBRARY_ATTEMPTS})…`);
        await wait(LIBRARY_RETRY_DELAY_MS);
      }
    }
  }

  throw lastError;
}

async function initAuth() {
  try {
    await waitForAuthReady();
    const context = await getAuthContext();
    applyAuthContext(context, context?.error || null);
    return context;
  } catch (error) {
    applyAuthContext(null, error);
    return null;
  }
}

function disableWizard(message) {
  setRuntimeState('Boot failed', 'error');
  setLibraryIndicator(message);

  Object.values(el.actions).forEach((action) => {
    if (action) action.disabled = true;
  });

  el.fields.forEach((field) => {
    field.disabled = true;
  });

  if (el.genreList) {
    el.genreList.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      input.disabled = true;
    });
  }
}

async function boot() {
  setRuntimeState('Booting', 'info');
  await initAdminNav({ pageLabel: 'Omega Game Builder', active: 'editor' });

  setReadOnly(true);
  const authPromise = initAuth();
  await loadLibrary();

  renderSystemOptions();
  renderGenres();
  loadDraft();
  normalizeDraft();
  updateFormFromDraft();
  updatePreviewFields();
  updateProgress();
  bindEvents();

  setRuntimeState(state.auth.canWrite ? 'Ready' : 'Library ready · auth pending', 'info');
  await authPromise;
}

boot().catch((error) => {
  console.error('[OMEGA-GAME-BUILDER] boot failure', error);
  const message = error instanceof Error ? error.message : 'Unknown error';
  disableWizard(`Library: failed to load (${message})`);
});

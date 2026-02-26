import { initAdminNav } from './admin-nav.js?v=admin-stable-20260207';
import { getAuthContext, waitForAuthReady } from './auth.js?v=admin-stable-20260207';
import { buildGamePageHtml, buildStubStructure, loadGamesLibrary, updateGamesLibrary } from './games-api.js?v=admin-stable-20260207';
import { fetchUserRole } from './roles.js?v=admin-stable-20260207';
import { validateExportOutputs, validateLibraryIdentifiers, validateWizardDraft } from './validator.js?v=admin-stable-20260207';

const SITE_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';
const STORAGE_KEY = 'omegaGameBuilderDraftV1';
const MAX_STEP = 6;
const MAX_LIBRARY_ATTEMPTS = 2;
const LIBRARY_RETRY_DELAY_MS = 800;
const ALLOWED_WRITE_ROLES = ['editor', 'admin', 'superadmin'];
const AUTO_SAVE_DELAY_MS = 1400;

const THUMBNAIL_BASE_PATH = 'resources/images/thumbnails/all/';
const BOX3D_BASE_PATH = 'resources/images/games/boxes-3d/';

const STEP_FIELDS = {
  1: ['title', 'slug', 'id', 'system', 'year'],
  2: ['thumbnailFile'],
  3: ['genres', 'ccgRating'],
  4: [],
  5: [],
  6: []
};

window.CCG_EXPORT_VERSION = '1.0.0-stable';
window.CCG_CONTEXT = 'admin';

const state = {
  step: 1,
  library: [],
  slugSet: new Set(),
  idSet: new Set(),
  slugLocked: false,
  idLocked: false,
  draft: null,
  libraryValidation: { errors: [], warnings: [], ran: false, valid: true },
  schema: {
    requiredFields: [],
    optionalFields: [],
    creditKeys: [],
    systems: [],
    genres: []
  },
  validation: { errors: [], warnings: [], missing: [], fieldErrors: {}, ran: false, valid: false },
  outputs: null,
  lastSavedAt: null,
  mode: 'new',
  editing: null,
  dirty: false,
  draftRestored: false,
  autoSaveTimer: null,
  stepStatus: {},
  export: {
    disabled: false,
    reason: '',
    missingAssets: [],
    warnings: []
  },
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
  exportVersion: document.querySelector('[data-export-version]'),
  exportVersionBadge: document.querySelector('[data-export-version-badge]'),
  modeIndicator: document.querySelector('[data-mode-indicator]'),
  validationIndicator: document.querySelector('[data-validation-indicator]'),
  exportIndicator: document.querySelector('[data-export-indicator]'),
  errorIndicator: document.querySelector('[data-error-indicator]'),
  exportPanel: document.querySelector('[data-export-panel]'),
  exportState: document.querySelector('[data-export-state]'),
  exportSteps: Array.from(document.querySelectorAll('[data-export-step]')).reduce((acc, item) => {
    acc[item.dataset.exportStep] = item;
    return acc;
  }, {}),
  exportWarnings: document.querySelector('[data-export-warnings]'),
  exportWarningList: document.querySelector('[data-export-warning-list]'),
  exportMissing: document.querySelector('[data-export-missing]'),
  exportMissingList: document.querySelector('[data-export-missing-list]'),
  exportMissingHint: document.querySelector('[data-export-missing-hint]'),
  exportError: document.querySelector('[data-export-error]'),
  exportModal: document.querySelector('[data-export-modal]'),
  exportModalMessage: document.querySelector('[data-export-modal-message]'),
  exportModalStack: document.querySelector('[data-export-modal-stack]'),
  exportModalClose: Array.from(document.querySelectorAll('[data-export-modal-close]')),
  readonlyBadge: document.querySelector('[data-readonly-badge]'),
  exportNote: document.querySelector('[data-export-note]'),
  draftBanner: document.querySelector('[data-draft-banner]'),
  stepCounter: document.querySelector('[data-step-counter]'),
  steps: Array.from(document.querySelectorAll('[data-step]')),
  stepperButtons: Array.from(document.querySelectorAll('[data-step-jump]')),
  fields: Array.from(document.querySelectorAll('[data-field]')),
  genreList: document.querySelector('[data-genre-list]'),
  genreSearch: document.querySelector('[data-genre-search]'),
  systemSelect: document.querySelector('[data-system-select]'),
  ratingRange: document.querySelector('[data-rating-range]'),
  ratingOutput: document.querySelector('[data-rating-output]'),
  seoSuggestion: document.querySelector('[data-seo-suggestion]'),
  count: {
    seoTitle: document.querySelector('[data-count="seoTitle"]'),
    metaDescription: document.querySelector('[data-count="metaDescription"]')
  },
  overrideFields: {
    thumbnail: document.querySelector('[data-override-field="thumbnail"]'),
    box3d: document.querySelector('[data-override-field="box3d"]')
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
    readme: document.querySelector('[data-preview="readme"]'),
    ogTitle: document.querySelector('[data-preview="og-title"]'),
    ogDescription: document.querySelector('[data-preview="og-description"]'),
    ogUrl: document.querySelector('[data-preview="og-url"]')
  },
  previewImages: {
    thumbnail: document.querySelector('[data-preview-image="thumbnail"]'),
    box3d: document.querySelector('[data-preview-image="box3d"]'),
    og: document.querySelector('[data-preview-image="og"]')
  },
  previewCards: {
    thumbnail: document.querySelector('[data-preview-card="thumbnail"]'),
    box3d: document.querySelector('[data-preview-card="box3d"]')
  },
  previewStatus: {
    thumbnail: document.querySelector('[data-preview-status="thumbnail"]'),
    box3d: document.querySelector('[data-preview-status="box3d"]')
  },
  previewPaths: {
    thumbnail: document.querySelector('[data-preview-path="thumbnail"]'),
    box3d: document.querySelector('[data-preview-path="box3d"]')
  },
  validation: {
    errors: document.querySelector('[data-validation-errors]'),
    summary: document.querySelector('[data-validation-summary]'),
    status: document.querySelector('[data-validation-status]'),
    warnings: document.querySelector('[data-validation-warnings]')
  },
  libraryValidation: {
    errors: document.querySelector('[data-library-validation-errors]'),
    status: document.querySelector('[data-library-validation-status]')
  },
  load: {
    form: document.querySelector('[data-load-form]'),
    input: document.querySelector('[data-load-input]'),
    button: document.querySelector('[data-action="load-game"]'),
    status: document.querySelector('[data-load-status]'),
    list: document.querySelector('#game-lookup-list')
  },
  locks: {
    slug: document.querySelector('[data-lock-toggle="slug"]'),
    id: document.querySelector('[data-lock-toggle="id"]')
  },
  actions: {
    saveDraft: document.querySelector('[data-action="save-draft"]'),
    clearDraft: document.querySelectorAll('[data-action="clear-draft"]'),
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

const isEditableTarget = (target) => (window.ccgIsEditableTarget ? window.ccgIsEditableTarget(target) : false);

// === ADMIN INPUT OVERRIDE (SPACEBAR SAFE) ===
(function enableAdminInputOverride() {
  document.addEventListener(
    'keydown',
    (e) => {
      if (window.ccgIsEditableTarget?.(e.target)) {
        e.stopImmediatePropagation();
      }
    },
    true
  );
})();

function setRuntimeState(message, kind = 'ready') {
  if (!el.runtime) return;
  el.runtime.textContent = `State: ${message}`;
  el.runtime.dataset.state = kind;
}

function setErrorIndicator(message) {
  if (!el.errorIndicator) return;
  if (!message) {
    el.errorIndicator.hidden = true;
    el.errorIndicator.textContent = '';
    return;
  }
  el.errorIndicator.hidden = false;
  el.errorIndicator.textContent = message;
}

function setExportVersionLabels() {
  const version = window.CCG_EXPORT_VERSION || 'unknown';
  if (el.exportVersion) el.exportVersion.textContent = `Export: v${version}`;
  if (el.exportVersionBadge) el.exportVersionBadge.textContent = `v${version}`;
}

function setExportStateLabel(message, kind = 'ready') {
  if (!el.exportState) return;
  el.exportState.textContent = message;
  el.exportState.dataset.state = kind;
}

function setExportPanelError(message) {
  if (!el.exportError) return;
  if (!message) {
    el.exportError.hidden = true;
    el.exportError.textContent = '';
    return;
  }
  el.exportError.hidden = false;
  el.exportError.textContent = message;
}

function resetExportSteps() {
  const defaults = {
    build: 'Building ZIP…',
    metadata: 'Metadata',
    images: 'Images',
    seo: 'SEO',
    complete: 'Complete'
  };
  Object.entries(defaults).forEach(([key, label]) => {
    const item = el.exportSteps[key];
    if (!item) return;
    item.textContent = label;
    item.classList.remove('is-active', 'is-success', 'is-warning', 'is-error');
  });
}

function setExportStepStatus(step, status, label) {
  const item = el.exportSteps[step];
  if (!item) return;
  if (label) item.textContent = label;
  item.classList.remove('is-active', 'is-success', 'is-warning', 'is-error');
  if (status) {
    item.classList.add(`is-${status}`);
  }
}

function renderExportWarnings(warnings = []) {
  if (!el.exportWarnings || !el.exportWarningList) return;
  if (!warnings.length) {
    el.exportWarnings.hidden = true;
    el.exportWarningList.innerHTML = '';
    return;
  }
  el.exportWarnings.hidden = false;
  el.exportWarningList.innerHTML = warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('');
}

function renderMissingAssets(missingAssets = []) {
  if (!el.exportMissing || !el.exportMissingList) return;
  if (!missingAssets.length) {
    el.exportMissing.hidden = true;
    el.exportMissingList.innerHTML = '';
    if (el.exportMissingHint) el.exportMissingHint.textContent = '';
    return;
  }
  el.exportMissing.hidden = false;
  el.exportMissingList.innerHTML = missingAssets
    .map((asset) => `<li>${escapeHtml(asset.display || asset.path)}</li>`)
    .join('');
  if (el.exportMissingHint) {
    el.exportMissingHint.textContent =
      'Check /resources/images/thumbnails/all/ or /resources/images/games/boxes-3d/ for the missing assets.';
  }
}

function setExportDisabled(disabled, reason = '') {
  state.export.disabled = disabled;
  state.export.reason = reason;
  if (disabled) {
    setExportPanelError(reason);
    setExportStateLabel('Export disabled', 'error');
  } else {
    setExportPanelError('');
    setExportStateLabel('Ready', 'ready');
  }

  ['generateOutput', 'downloadBundle', 'buildPackage'].forEach((key) => {
    const node = el.actions[key];
    if (node) node.disabled = disabled || !state.auth.canWrite;
  });
  updateStatusIndicators();
}

function setDownloadButtonState(isBuilding) {
  if (!el.actions.downloadBundle) return;
  const button = el.actions.downloadBundle;
  if (!button.dataset.label) button.dataset.label = button.textContent;
  if (isBuilding) {
    button.dataset.prevDisabled = String(button.disabled);
    button.disabled = true;
  } else if (button.dataset.prevDisabled) {
    button.disabled = button.dataset.prevDisabled === 'true';
    delete button.dataset.prevDisabled;
  }
  button.setAttribute('aria-busy', String(isBuilding));
  button.textContent = isBuilding ? 'Building ZIP…' : button.dataset.label;
}

function openExportModal(message, stack) {
  if (!el.exportModal) return;
  if (el.exportModalMessage) el.exportModalMessage.textContent = message;
  if (el.exportModalStack) el.exportModalStack.textContent = stack || '';
  el.exportModal.hidden = false;
  document.body.classList.add('ccg-secret-modal-open');
}

function closeExportModal() {
  if (!el.exportModal) return;
  el.exportModal.hidden = true;
  document.body.classList.remove('ccg-secret-modal-open');
}

function setReadOnly(isReadOnly) {
  const disableActions = ['saveDraft'];
  const exportActions = ['buildPackage', 'downloadBundle', 'generateOutput'];

  disableActions.forEach((key) => {
    const node = el.actions[key];
    if (node) node.disabled = Boolean(isReadOnly);
  });

  exportActions.forEach((key) => {
    const node = el.actions[key];
    if (node) node.disabled = Boolean(isReadOnly) || state.export.disabled;
  });

  if (el.readonlyBadge) {
    el.readonlyBadge.hidden = !isReadOnly;
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
    console.error('[CCG-GAME-BUILDER] auth error', error);
    setRuntimeState('Auth error · read-only', 'error');
    setReadOnly(true);
    updateStatusIndicators();
    return;
  }

  if (!isAuthenticated) {
    setRuntimeState('Guest · read-only', 'info');
    setReadOnly(true);
    updateStatusIndicators();
    return;
  }

  if (!canWrite) {
    setRuntimeState('Read-only · role limited', 'warning');
    setReadOnly(true);
    updateStatusIndicators();
    return;
  }

  setRuntimeState('Ready');
  setReadOnly(false);
  updateStatusIndicators();
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

function buildAssetPath({ filename, override, base }) {
  if (override) return override;
  if (!filename) return '';
  return `${base}${filename}`;
}

function normalizeAssetName(slug, ext = 'jpg') {
  return `${slug}.${ext}`;
}

function normalizeAssetPath(assetPath, slug) {
  if (!assetPath) return { path: '', filename: '', warnings: [] };
  if (/^https?:/i.test(assetPath)) {
    return { path: assetPath, filename: '', warnings: [], isRemote: true };
  }

  const normalized = assetPath.replace(/^\/+/, '');
  const segments = normalized.split('/');
  const originalFilename = segments.pop() || '';
  if (!originalFilename) return { path: normalized, filename: '', warnings: [] };

  const extMatch = originalFilename.match(/\.([^.]+)$/);
  const ext = extMatch ? extMatch[1] : '';
  const base = extMatch ? originalFilename.slice(0, -(ext.length + 1)) : originalFilename;
  const warnings = [];
  let nextBase = base;

  if (base.includes('_')) {
    nextBase = base.replace(/_/g, '-');
    warnings.push(`Rewrote ${originalFilename} → ${nextBase}${ext ? `.${ext}` : ''}`);
  }

  if (slug) {
    const targetName = normalizeAssetName(slug, ext || 'jpg');
    if (`${nextBase}${ext ? `.${ext}` : ''}` !== targetName) {
      warnings.push(`Normalized filename to ${targetName}`);
      nextBase = slug;
    }
  }

  const resolvedExt = ext || (slug ? 'jpg' : '');
  const normalizedFilename = resolvedExt ? `${nextBase}.${resolvedExt}` : nextBase;
  return {
    path: [...segments, normalizedFilename].join('/'),
    filename: normalizedFilename,
    warnings,
    originalFilename
  };
}

async function safeFetch(url, options) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(res.status);
    return await res.blob();
  } catch {
    return null;
  }
}

function getFolder(zip, name) {
  return zip.folder(name) || zip;
}

function normalizeDraft() {
  const draft = state.draft;
  if (!draft) return;

  draft.title = String(draft.title ?? '');

  if (!state.slugLocked) {
    const baseSlug = slugify(draft.title);
    draft.slug = generateUniqueSlug(baseSlug, state.slugSet);
  }

  if (!state.idLocked) {
    const baseId = slugify(draft.title).replace(/-/g, '_');
    draft.id = generateUniqueId(baseId, state.idSet);
  }

  draft.system = String(draft.system || '');
  draft.year = String(draft.year || '');
  draft.developer = String(draft.developer || '');
  draft.thumbnailFile = String(draft.thumbnailFile || '');
  draft.thumbnailOverride = String(draft.thumbnailOverride || '');
  draft.box3dFile = String(draft.box3dFile || '');
  draft.box3dOverride = String(draft.box3dOverride || '');
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
  draft.videoId = String(draft.videoId || '');
  draft.pdf = String(draft.pdf || '');
  draft.diskRefs = String(draft.diskRefs || '');
  draft.externalRefs = String(draft.externalRefs || '');
  draft.collections = String(draft.collections || '');
  draft.ccgRating = String(draft.ccgRating || '');
  draft.ccgRatingReason = String(draft.ccgRatingReason || '');
  draft.description = String(draft.description || '');
  draft.creditPublisher = String(draft.creditPublisher || '');
  draft.creditProducer = String(draft.creditProducer || '');
  draft.creditCoder = String(draft.creditCoder || '');
  draft.creditGraphics = String(draft.creditGraphics || '');
  draft.creditMusician = String(draft.creditMusician || '');
  draft.creditRereleaser = String(draft.creditRereleaser || '');
  draft.creditDeveloper = String(draft.creditDeveloper || '');
  draft.seoTitle = String(draft.seoTitle || '');
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

  if (el.locks.slug) el.locks.slug.checked = state.slugLocked;
  if (el.locks.id) el.locks.id.checked = state.idLocked;
  if (el.ratingRange) el.ratingRange.value = state.draft.ccgRating || 1;
}

function buildMetaDescription(draft, entry) {
  return draft.description || entry?.description || '';
}

function updateCounters() {
  const seoTitleValue = state.draft.seoTitle || `${state.draft.title || 'Title'} | Cheeky Commodore Gamer`;
  const metaDescriptionValue = buildMetaDescription(state.draft) || '';
  if (el.count.seoTitle) el.count.seoTitle.textContent = String(seoTitleValue.length);
  if (el.count.metaDescription) el.count.metaDescription.textContent = String(metaDescriptionValue.length);
  if (el.seoSuggestion) el.seoSuggestion.textContent = `${state.draft.title || 'Title'} | Cheeky Commodore Gamer`;
}

function updateMediaPreview(key, src) {
  const img = el.previewImages[key];
  const card = el.previewCards[key];
  const status = el.previewStatus[key];
  const path = el.previewPaths[key];

  if (path) path.textContent = src ? `Resolved path: ${src}` : '';
  if (!img || !card) return;

  if (!src) {
    img.removeAttribute('src');
    card.classList.remove('is-error');
    if (status) status.textContent = 'Awaiting filename…';
    return;
  }

  img.onload = () => {
    card.classList.remove('is-error');
    if (status) status.textContent = 'Preview loaded.';
  };
  img.onerror = () => {
    card.classList.add('is-error');
    if (status) status.textContent = 'Preview failed. Check filename or path.';
  };
  img.src = `/${src}`.replace(/(?<!:)\/\//g, '/');
}

function updatePreviewFields() {
  const slug = state.draft.slug || '';
  const canonical = slug ? `${SITE_ORIGIN}/games/${slug}/` : '';
  const sitemap = slug ? buildSitemapFragment(state.draft, { fragmentOnly: true }) : '';
  const metaDescription = buildMetaDescription(state.draft);
  const seoTitle = state.draft.seoTitle || `${state.draft.title || 'Title'} | Cheeky Commodore Gamer`;

  if (el.previews.canonical) el.previews.canonical.value = canonical;
  if (el.previews.sitemap) el.previews.sitemap.value = sitemap;
  if (el.previews.metaDescription) el.previews.metaDescription.value = metaDescription;

  if (el.previews.ogTitle) el.previews.ogTitle.textContent = seoTitle;
  if (el.previews.ogDescription) el.previews.ogDescription.textContent = metaDescription || 'Add a description to preview OG copy.';
  if (el.previews.ogUrl) el.previews.ogUrl.textContent = canonical || 'Canonical URL will appear here.';
  if (el.previewImages.og) {
    const imageSrc = state.draft.thumbnail ? `/${state.draft.thumbnail}`.replace(/(?<!:)\/\//g, '/') : '';
    if (imageSrc) {
      el.previewImages.og.src = imageSrc;
    } else {
      el.previewImages.og.removeAttribute('src');
    }
  }

  updateMediaPreview('thumbnail', state.draft.thumbnail);
  updateMediaPreview('box3d', state.draft.box3d);
  updateCounters();
}

function updateProgress() {
  el.steps.forEach((section) => {
    const step = Number(section.dataset.step || 0);
    section.hidden = step !== state.step;
  });

  el.stepperButtons.forEach((button) => {
    const step = Number(button.dataset.stepJump || 0);
    button.classList.toggle('is-active', step === state.step);
    button.classList.toggle('is-complete', Boolean(state.stepStatus[step]));
  });

  if (el.actions.prevStep) el.actions.prevStep.disabled = state.step === 1;
  if (el.actions.nextStep) el.actions.nextStep.disabled = state.step === MAX_STEP;
  if (el.stepCounter) el.stepCounter.textContent = String(state.step);
}

function setDraftIndicator(message) {
  if (!el.draftIndicator) return;
  el.draftIndicator.textContent = message;
}

function updateStatusIndicators() {
  if (el.modeIndicator) {
    el.modeIndicator.textContent = `Mode: ${state.mode === 'edit' ? 'Edit' : 'New'}`;
  }

  if (el.validationIndicator) {
    const libraryErrors = state.libraryValidation?.errors?.length || 0;
    if (!state.validation.ran && !state.libraryValidation.ran) {
      el.validationIndicator.textContent = 'Validation: Pending';
    } else if (state.validation.errors.length || libraryErrors) {
      el.validationIndicator.textContent = 'Validation: FAIL';
    } else {
      el.validationIndicator.textContent = 'Validation: OK';
    }
  }

  if (el.exportIndicator) {
    const exportReady = state.validation.ran
      && !state.validation.errors.length
      && state.auth.canWrite
      && !state.export.disabled;
    el.exportIndicator.textContent = `Export: ${exportReady ? 'Ready' : 'Blocked'}`;
  }
}

function markDirty(isDirty) {
  state.dirty = isDirty;
  if (isDirty) {
    setDraftIndicator('Draft: unsaved changes');
  } else if (state.lastSavedAt) {
    setDraftIndicator(`Draft: saved ${new Date(state.lastSavedAt).toLocaleTimeString()}`);
  } else {
    setDraftIndicator('Draft: ready');
  }
}

function saveDraft() {
  const payload = {
    step: state.step,
    slugLocked: state.slugLocked,
    idLocked: state.idLocked,
    draft: state.draft,
    mode: state.mode,
    editing: state.editing,
    savedAt: Date.now()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  state.lastSavedAt = payload.savedAt;
  markDirty(false);
}

function scheduleAutoSave() {
  if (state.autoSaveTimer) {
    window.clearTimeout(state.autoSaveTimer);
  }
  state.autoSaveTimer = window.setTimeout(() => {
    saveDraft();
  }, AUTO_SAVE_DELAY_MS);
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
    state.mode = parsed.mode || 'new';
    state.editing = parsed.editing || null;
    state.draftRestored = true;
    if (state.lastSavedAt) {
      markDirty(false);
    }
  } catch {
    state.draft = defaultDraft();
  }
}

function showDraftBanner() {
  if (!el.draftBanner) return;
  el.draftBanner.hidden = !state.draftRestored;
}

function clearDraft() {
  localStorage.removeItem(STORAGE_KEY);
  state.draftRestored = false;
  showDraftBanner();
  setDraftIndicator('Draft: cleared');
}

function resetWizard() {
  localStorage.removeItem(STORAGE_KEY);
  state.step = 1;
  state.slugLocked = false;
  state.idLocked = false;
  state.mode = 'new';
  state.editing = null;
  state.draft = defaultDraft();
  state.outputs = null;
  state.validation = { errors: [], warnings: [], missing: [], fieldErrors: {}, ran: false, valid: false };
  state.draftRestored = false;
  updateFormFromDraft();
  updatePreviewFields();
  renderValidation();
  renderLibraryValidation();
  renderOutputs();
  evaluateStepStatus();
  updateProgress();
  markDirty(false);
  if (el.actions.downloadBundle) el.actions.downloadBundle.disabled = true;
  if (el.exportNote) el.exportNote.hidden = true;
  resetExportSteps();
  renderExportWarnings([]);
  renderMissingAssets([]);
  setExportPanelError('');
  setExportStateLabel('Ready');
  setDownloadButtonState(false);
  updateStatusIndicators();
  setErrorIndicator('');
  showDraftBanner();
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

function filterGenres(term) {
  if (!el.genreList) return;
  const normalized = String(term || '').trim().toLowerCase();
  el.genreList.querySelectorAll('label').forEach((label) => {
    const text = label.textContent?.toLowerCase() || '';
    label.hidden = normalized ? !text.includes(normalized) : false;
  });
}

function updateUniquenessSets() {
  const slugs = new Set(state.library.map((game) => game.slug));
  const ids = new Set(state.library.map((game) => game.id));

  if (state.editing?.slug) {
    slugs.delete(state.editing.slug);
  }
  if (state.editing?.id) {
    ids.delete(state.editing.id);
  }

  state.slugSet = slugs;
  state.idSet = ids;
}

function renderLibraryLookupOptions() {
  if (!el.load.list) return;
  el.load.list.innerHTML = '';
  state.library.forEach((game) => {
    if (game.slug) {
      const option = document.createElement('option');
      option.value = game.slug;
      el.load.list.appendChild(option);
    }
    if (game.id) {
      const option = document.createElement('option');
      option.value = game.id;
      el.load.list.appendChild(option);
    }
  });
}

function extractFilename(path, base) {
  if (!path) return { filename: '', override: '' };
  if (path.startsWith(base)) {
    return { filename: path.slice(base.length), override: '' };
  }
  return { filename: '', override: path };
}

function draftFromGame(game) {
  const thumbnail = extractFilename(game.thumbnail, THUMBNAIL_BASE_PATH);
  const box3dPath = game.box_3d || game.box3d || '';
  const box3d = extractFilename(box3dPath, BOX3D_BASE_PATH);

  return {
    ...defaultDraft(),
    title: game.title || '',
    slug: game.slug || '',
    id: game.id || '',
    system: game.system || '',
    year: game.year ? String(game.year) : '',
    developer: game.developer || '',
    thumbnailFile: thumbnail.filename,
    thumbnailOverride: thumbnail.override,
    box3dFile: box3d.filename,
    box3dOverride: box3d.override,
    thumbnail: game.thumbnail || '',
    box3d: box3dPath,
    videoId: game.videoid || '',
    pdf: game.pdf || '',
    diskRefs: Array.isArray(game.disk) ? game.disk.join('\n') : '',
    externalRefs: Array.isArray(game.lemon) ? game.lemon.join('\n') : '',
    collections: Array.isArray(game.collections) ? game.collections.join(', ') : '',
    genres: Array.isArray(game.genres) ? game.genres : [],
    ccgRating: game.ccg_rating ? String(game.ccg_rating) : '',
    ccgRatingReason: game.ccg_rating_reason || '',
    description: game.description || '',
    creditPublisher: Array.isArray(game.credits?.publisher) ? game.credits.publisher.join(', ') : '',
    creditProducer: game.credits?.producer || '',
    creditCoder: Array.isArray(game.credits?.coder) ? game.credits.coder.join(', ') : '',
    creditGraphics: Array.isArray(game.credits?.graphics) ? game.credits.graphics.join(', ') : '',
    creditMusician: Array.isArray(game.credits?.musician) ? game.credits.musician.join(', ') : '',
    creditRereleaser: Array.isArray(game.credits?.re_releaser) ? game.credits.re_releaser.join(', ') : '',
    creditDeveloper: game.credits?.developer || '',
    seoTitle: ''
  };
}

function setEditMode(game, index) {
  state.mode = 'edit';
  state.editing = { slug: game.slug, id: game.id, index };
  updateUniquenessSets();
  updateStatusIndicators();
}

function setLoadStatus(message, stateClass = '') {
  if (!el.load.status) return;
  el.load.status.textContent = message;
  el.load.status.dataset.state = stateClass;
}

function loadGameById(id) {
  const cleanId = String(id || '').trim();
  if (!cleanId) {
    setLoadStatus('Enter an ID to load.', 'warning');
    return;
  }

  const index = state.library.findIndex((game) => game.id === cleanId);
  if (index === -1) {
    setLoadStatus(`No game found for ID: ${cleanId}`, 'error');
    return;
  }

  const game = state.library[index];
  state.draft = draftFromGame(game);
  setEditMode(game, index);
  normalizeDraft();
  updateFormFromDraft();
  updatePreviewFields();
  evaluateStepStatus();
  markDirty(false);
  setLoadStatus(`Loaded ${game.title}`, 'success');
  setErrorIndicator('');
}

function loadGameBySlug(slug) {
  const cleanSlug = String(slug || '').trim();
  if (!cleanSlug) {
    setLoadStatus('Enter a slug to load.', 'warning');
    return;
  }

  const index = state.library.findIndex((game) => game.slug === cleanSlug);
  if (index === -1) {
    setLoadStatus(`No game found for slug: ${cleanSlug}`, 'error');
    return;
  }

  const game = state.library[index];
  state.draft = draftFromGame(game);
  setEditMode(game, index);
  normalizeDraft();
  updateFormFromDraft();
  updatePreviewFields();
  evaluateStepStatus();
  markDirty(false);
  setLoadStatus(`Loaded ${game.title}`, 'success');
  setErrorIndicator('');
}

function getValidationContext() {
  return {
    slugSet: state.slugSet,
    idSet: state.idSet,
    allowedSystems: new Set(state.schema.systems),
    originalSlug: state.editing?.slug || '',
    originalId: state.editing?.id || ''
  };
}

function validateDraft() {
  const result = validateWizardDraft(state.draft, getValidationContext());
  state.validation = { ...result, ran: true, valid: result.valid };
  updateStatusIndicators();
  return result;
}

function hasBlockingLibraryErrors() {
  return Boolean(state.libraryValidation?.errors?.length);
}

function renderLibraryValidation() {
  const { errors } = state.libraryValidation || { errors: [] };
  if (el.libraryValidation.status) {
    if (!state.libraryValidation.ran) {
      el.libraryValidation.status.textContent = 'Library validation pending.';
    } else if (errors.length) {
      el.libraryValidation.status.textContent = `Library validation failed with ${errors.length} issue(s).`;
    } else {
      el.libraryValidation.status.textContent = 'Library validation passed. No ID/slug issues detected.';
    }
  }

  if (el.libraryValidation.errors) {
    el.libraryValidation.errors.innerHTML = errors.length
      ? errors.map((message) => `<li class="is-error">${escapeHtml(message)}</li>`).join('')
      : '<li>No library issues detected.</li>';
  }
}

function runLibraryValidation() {
  const result = validateLibraryIdentifiers(state.library);
  state.libraryValidation = { ...result, ran: true, valid: result.valid };
  renderLibraryValidation();
  renderValidation();
  updateStatusIndicators();
}

function renderFieldErrors(fieldErrors) {
  document.querySelectorAll('[data-error-for]').forEach((node) => {
    const key = node.dataset.errorFor;
    node.textContent = fieldErrors[key] || '';
  });
}

function focusField(fieldName) {
  if (!fieldName) return;
  const field = document.querySelector(`[data-field="${fieldName}"]`);
  if (field) {
    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
    field.focus();
  }
}

function renderValidation() {
  const { errors, warnings, fieldErrors } = state.validation;
  const libraryErrors = hasBlockingLibraryErrors();
  if (el.validation.status) {
    if (!state.validation.ran) {
      el.validation.status.textContent = 'Validation pending.';
    } else {
      el.validation.status.textContent = errors.length
        ? `Validation failed with ${errors.length} error(s).`
        : 'Validation passed. Ready to build.';
    }
  }

  if (el.validation.errors) {
    const fieldErrorItems = Object.entries(fieldErrors || {}).map(([field, message]) => ({
      field,
      message
    }));
    const fieldMessages = new Set(fieldErrorItems.map((item) => item.message));
    const additionalErrors = errors.filter((error) => !fieldMessages.has(error));
    const items = [
      ...fieldErrorItems.map((item) => ({
        field: item.field,
        message: item.message
      })),
      ...additionalErrors.map((message) => ({ field: '', message }))
    ];
    el.validation.errors.innerHTML = items.length
      ? items
        .map((item) => {
          const dataAttr = item.field ? ` data-field="${item.field}"` : '';
          return `<li class="is-error"><button type="button"${dataAttr}>${escapeHtml(item.message)}</button></li>`;
        })
        .join('')
      : '<li>No errors 🎉</li>';
  }

  if (el.validation.warnings) {
    el.validation.warnings.innerHTML = warnings.length
      ? warnings.map((warning) => `<li class="is-warning"><button type="button">${escapeHtml(warning)}</button></li>`).join('')
      : '<li>No warnings.</li>';
  }

  renderFieldErrors(fieldErrors || {});

  if (el.actions.generateOutput) {
    el.actions.generateOutput.disabled = errors.length > 0 || libraryErrors || !state.auth.canWrite || state.export.disabled;
  }
  if (el.actions.buildPackage) {
    el.actions.buildPackage.disabled = errors.length > 0 || libraryErrors || !state.auth.canWrite || state.export.disabled;
  }

  updateStatusIndicators();
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
  return String(value || '').replace(/[&<>"]+/g, (char) => ({
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
    genres: entry.genres,
    system: entry.system,
    year: entry.year,
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
      `/games/${entry.slug}.html`,
      `/games/${entry.slug}/index.html`,
      `/games/game.html?id=${entry.id}`
    ],
    generatedAt: new Date().toISOString()
  };

  return JSON.stringify(manifest, null, 2);
}

function buildReadme(entry) {
  return [
    'CCG GAME BUILDER PACKAGE',
    '---------------------------',
    `Slug: ${entry.slug}`,
    `ID: ${entry.id}`,
    '',
    '1) Replace /games/games.json with the bundled games.json.',
    `2) Add /games/${entry.slug}.html to the repo (flat SEO page).`,
    `3) Add /games/${entry.slug}/index.html to the repo (redirect stub).`,
    '4) Add sitemap-fragment.xml contents to sitemap-games.xml.',
    '5) Upload any assets listed in manifest.json.',
    '6) If you use metadata.json, store it alongside your game data.',
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

function buildFlatSeoPage(entry) {
  const slug = entry.slug;
  const seoTitle = state.draft.seoTitle || `${entry.title} | Cheeky Commodore Gamer`;
  const description = buildMetaDescription(state.draft, entry)
    || `${entry.title} on Commodore — screenshots, manual, downloads and video.`;
  const canonical = `${SITE_ORIGIN}/games/${slug}.html`;
  const image = entry.thumbnail ? `${SITE_ORIGIN}/${entry.thumbnail}`.replace(/(?<!:)\/\//g, '/') : '';
  const publisher = entry.credits?.publisher?.[0] || entry.developer || '';
  const heroThumb = entry.thumbnail ? `../${entry.thumbnail}`.replace(/(?<!:)\/\//g, '/') : '';

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: entry.title,
    description,
    datePublished: String(entry.year || ''),
    gamePlatform: entry.system,
    publisher,
    image,
    url: canonical
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />

    <!-- Canonical route enforcement: redirect /games/${escapeAttribute(slug)}.html -> /games/${escapeAttribute(slug)}/ -->
    <meta http-equiv="refresh" content="0; url=/games/${escapeAttribute(slug)}/">
    <script>
      (function () {
        var suffix = window.location.search + window.location.hash;
        window.location.replace("/games/${escapeAttribute(slug)}/" + suffix);
      })();
    </script>

    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <title>${escapeHtml(seoTitle)}</title>
    <meta name="description" content="${escapeAttribute(description)}" />

    <link rel="canonical" href="${escapeAttribute(canonical)}" />

    <meta property="og:title" content="${escapeAttribute(seoTitle)}" />
    <meta property="og:description" content="${escapeAttribute(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeAttribute(canonical)}" />
    <meta property="og:image" content="${escapeAttribute(image)}" />

    <link rel="icon" href="../favicon.ico" />

    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />

    <link rel="stylesheet" href="../resources/css/ccg-master.css" />
    <link rel="stylesheet" href="../resources/css/ccg-mode.css" />
    <link rel="stylesheet" href="../resources/css/ccg-effects.css" />
    <link rel="stylesheet" href="../resources/css/ccg-anim.css" />
    <link rel="stylesheet" href="../resources/css/ccg-overlays.css" />
    <link rel="stylesheet" href="../resources/css/ccg-cards.css" />
    <link rel="stylesheet" href="../resources/css/games.css" />
    <link rel="stylesheet" href="../resources/css/ccg-footer.css" />
    <link rel="stylesheet" href="../resources/css/ccg-mobile-lite.css">
    <script src="../js/ccg-mobile-lite.js" defer></script>

    <script type="application/ld+json">
${JSON.stringify(schema, null, 4)}
    </script>
</head>
<body class="ccg-body" data-ccg-mode="c64" data-mode="c64">

<div class="ccg-bg" aria-hidden="true">
    <div class="ccg-bg-starfield" aria-hidden="true"></div>
    <div class="ccg-bg-grid" aria-hidden="true"></div>
    <div class="ccg-bg-crt-overlay" aria-hidden="true"></div>
</div>

<div class="ccg-page">
    <main class="ccg-main">

        <section class="game-hero">
            <div class="game-hero__inner">

                <div class="game-hero__media">
                    <img
                        class="game-hero__thumb"
                        src="${escapeAttribute(heroThumb)}"
                        alt="${escapeAttribute(entry.title)} cover"
                        loading="lazy"
                     width="460" height="215"  srcset="${escapeAttribute(heroThumb)} 460w" sizes="(max-width: 720px) 90vw, 460px" />
                </div>

                <div class="game-hero__content">
                    <h1 class="game-hero__title">${escapeHtml(entry.title)}</h1>

                    <div class="game-hero__meta">
                        <span class="game-meta__item">${escapeHtml(String(entry.year || ''))}</span>
                        <span class="game-meta__sep">•</span>
                        <span class="game-meta__item">${escapeHtml(entry.system || '')}</span>
                        <span class="game-meta__sep">•</span>
                        <span class="game-meta__item">${escapeHtml(publisher || '')}</span>
                    </div>
                </div>

            </div>
        </section>

        <section class="game-section">
            <p class="game-section__kicker">Overview</p>
            <h2 class="game-section__title">Game Summary</h2>

            <div class="game-description">
                ${escapeHtml(description)}
            </div>
        </section>

        <section class="game-section">
            <p class="game-section__kicker">Explore</p>
            <h2 class="game-section__title">More Details</h2>

            <div class="game-downloads">
                <a class="ccg-btn ccg-btn--primary"
                   href="/games/game.html?id=${escapeAttribute(entry.id)}">
                    View the full interactive game page
                </a>

                <a class="ccg-btn ccg-btn--ghost"
                   href="/games/index.html">
                    Browse all games
                </a>
            </div>
        </section>

        <section class="ccg-share" data-ccg-share>
            <button class="ccg-share-btn" type="button" data-ccg-share-btn>Share this game</button>
            <div class="ccg-share-fallback" data-ccg-share-fallback aria-hidden="true">
                <a data-ccg-share-email target="_blank" rel="noopener">Email</a>
                <a data-ccg-share-whatsapp target="_blank" rel="noopener">WhatsApp</a>
                <a data-ccg-share-x target="_blank" rel="noopener">X</a>
                <a data-ccg-share-facebook target="_blank" rel="noopener">Facebook</a>
                <button type="button" data-ccg-share-copy>Copy link</button>
            </div>
        </section>

    </main>

    <footer class="ccg-footer">
        <p class="ccg-footer__text">
            © <span data-ccg-year></span> Cheeky Commodore Gamer.
            Not affiliated with Commodore, Amiga or publishers.
        </p>
    </footer>
</div>

<script src="../js/ccg-base.js" defer></script>

<script src="../resources/js/ccg-share.js" defer></script>

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

function applyEntryToLibrary(entry) {
  const updatedLibrary = [...state.library];
  if (state.mode === 'edit' && state.editing) {
    updatedLibrary[state.editing.index] = entry;
  } else {
    updatedLibrary.push(entry);
  }
  updateGamesLibrary(updatedLibrary, 'wizard');
  state.library = updatedLibrary;
  updateUniquenessSets();
  renderLibraryLookupOptions();
  return updatedLibrary;
}

function buildOutputs() {
  const entry = buildGameRecord();
  const updatedLibrary = applyEntryToLibrary(entry);
  const gamesJson = JSON.stringify(updatedLibrary, null, 2);
  const stubHtml = buildSeoStub(entry);
  const flatHtml = buildFlatSeoPage(entry);
  const sitemapFragment = buildSitemapFragment(state.draft);
  const metadataJson = buildMetadataJson(entry);
  const manifestJson = buildManifestJson(entry);
  const readme = buildReadme(entry);

  return {
    entry,
    gamesJson,
    stubHtml,
    flatHtml,
    sitemapFragment,
    metadataJson,
    manifestJson,
    readme
  };
}

function buildStubMeta(entry, assetStatus) {
  return {
    entry,
    draft: state.draft,
    mode: state.mode,
    assetStatus,
    generatedAt: new Date().toISOString()
  };
}

async function addAssetToZip({ stubRoot, assetPath, targetFolder, missingAssets, warnings, slug, label }) {
  if (!assetPath) return;

  const normalized = normalizeAssetPath(assetPath, slug);
  if (normalized.isRemote) {
    missingAssets.push({ path: assetPath, reason: 'remote-url', display: `${label}: ${assetPath}` });
    return;
  }

  normalized.warnings.forEach((warning) => {
    warnings.push(`${label}: ${warning}`);
  });

  const filename = normalized.filename;
  if (!filename) return;

  const blob = await safeFetch(`/${normalized.path}`, { cache: 'no-store' });
  if (!blob) {
    missingAssets.push({
      path: normalized.path,
      reason: 'missing',
      display: `${label}: ${normalized.path}`
    });
    return;
  }

  const folder = getFolder(stubRoot, targetFolder);
  folder.file(filename, blob);
}

async function buildPackage({ autoDownload = true } = {}) {
  if (!state.outputs) {
    state.outputs = buildOutputs();
    renderOutputs();
  }

  resetExportSteps();

  const exportValidation = validateExportOutputs(state.outputs);
  if (!exportValidation.valid) {
    const message = `Export validation failed: ${exportValidation.errors.join(' ')}`;
    setExportPanelError(message);
    setExportStateLabel('Export validation failed', 'error');
    setExportStepStatus('metadata', 'error', '✖ Metadata');
    setExportStepStatus('seo', 'error', '✖ SEO');
    setExportStepStatus('build', 'error', '✖ ZIP failed');
    throw new Error(message);
  }

  setExportPanelError('');
  setExportStateLabel('Building ZIP…', 'active');
  renderExportWarnings([]);
  renderMissingAssets([]);

  const zip = new JSZip();
  const entry = state.outputs.entry;
  const missingAssets = [];
  const exportWarnings = [];

  setExportStepStatus('build', 'active', 'Building ZIP…');
  setExportStepStatus('metadata', 'active', 'Metadata · in progress');

  zip.file('games.json', state.outputs.gamesJson);
  const flatPages = buildFlatGamePages(state.library);
  const gamesFolder = getFolder(zip, 'games');
  flatPages.pages.forEach((page) => {
    gamesFolder.file(`${page.slug}.html`, page.html);
  });
  if (flatPages.warnings.length) {
    exportWarnings.push(...flatPages.warnings);
  }
  getFolder(zip, `games/${entry.slug}`).file('index.html', state.outputs.stubHtml);
  zip.file(`games/${entry.slug}.html`, state.outputs.flatHtml);
  zip.file('sitemap-fragment.xml', state.outputs.sitemapFragment);
  zip.file('manifest.json', state.outputs.manifestJson);
  zip.file('metadata.json', state.outputs.metadataJson);
  zip.file('readme.txt', state.outputs.readme);
  setExportStepStatus('metadata', 'success', '✓ Metadata');

  const stubMeta = buildStubMeta(entry, { missingAssets });
  const stub = buildStubStructure({ slug: entry.slug, meta: stubMeta });
  const stubRoot = getFolder(zip, stub.root);
  stub.folders.forEach((folder) => getFolder(stubRoot, folder));
  stubRoot.file('meta.json', stub.metaJson);
  stubRoot.file('readme.txt', state.outputs.readme);
  stubRoot.file('manifest.json', state.outputs.manifestJson);

  setExportStepStatus('images', 'active', 'Images · in progress');
  await addAssetToZip({
    stubRoot,
    assetPath: entry.thumbnail,
    targetFolder: 'screenshots',
    missingAssets,
    warnings: exportWarnings,
    slug: entry.slug,
    label: 'Thumbnail'
  });
  await addAssetToZip({
    stubRoot,
    assetPath: state.draft.box3d,
    targetFolder: 'box',
    missingAssets,
    warnings: exportWarnings,
    slug: entry.slug,
    label: '3D box'
  });
  await addAssetToZip({
    stubRoot,
    assetPath: entry.pdf,
    targetFolder: 'docs',
    missingAssets,
    warnings: exportWarnings,
    slug: '',
    label: 'PDF/manual'
  });

  if (missingAssets.length) {
    const report = missingAssets
      .map((asset) => `${asset.path} (${asset.reason})`)
      .join('\n');
    getFolder(stubRoot, 'docs').file('missing-assets.txt', `${report}\n`);
    setExportStepStatus('images', 'warning', `⚠ Images · ${missingAssets.length} missing`);
    setErrorIndicator('Some assets could not be packaged. Check missing-assets.txt.');
  } else {
    setExportStepStatus('images', 'success', '✓ Images');
    setErrorIndicator('');
  }

  setExportStepStatus('seo', 'success', '✓ SEO');
  state.export.missingAssets = missingAssets;
  state.export.warnings = exportWarnings;
  renderExportWarnings(exportWarnings);
  renderMissingAssets(missingAssets);

  const blob = await zip.generateAsync({ type: 'blob' });
  setExportStepStatus('complete', 'success', '✓ Complete');
  setExportStepStatus('build', 'success', '✓ ZIP ready');

  if (autoDownload) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `omega-game-${entry.slug}.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  if (el.exportNote) el.exportNote.hidden = false;
  setExportStateLabel('Complete', 'success');
}

function validateJsZipRuntime() {
  if (!window.JSZip || !window.JSZip.prototype?.folder) {
    throw new Error('Invalid JSZip detected — export disabled');
  }
}

function testZip() {
  try {
    const z = new JSZip();
    z.folder('test');
    z.file('ok.txt', 'ok');
  } catch (error) {
    throw new Error('JSZip self-test failed — export disabled');
  }
}

function handleExportFailure(error) {
  const message = error instanceof Error ? error.message : 'Package build failed.';
  const stack = error instanceof Error ? error.stack : '';
  setRuntimeState('Package build failed', 'error');
  setErrorIndicator(message);
  setExportPanelError(message);
  setExportStateLabel('Failed', 'error');
  setExportStepStatus('build', 'error', '✖ ZIP failed');
  setExportStepStatus('complete', 'error', '✖ Failed');
  openExportModal(message, stack);
}

async function runPackageBuild({ autoDownload = true } = {}) {
  if (state.export.disabled) {
    setExportPanelError(state.export.reason || 'Export disabled');
    setExportStateLabel('Export disabled', 'error');
    return;
  }
  setDownloadButtonState(true);
  try {
    await buildPackage({ autoDownload });
  } catch (error) {
    handleExportFailure(error);
  } finally {
    setDownloadButtonState(false);
  }
}

function handleFieldInput(event) {
  const target = event.target;
  const name = target.dataset.field;
  if (!name) return;

  if (name === 'slug' && !state.slugLocked) {
    state.slugLocked = Boolean(target.value);
    if (el.locks.slug) el.locks.slug.checked = state.slugLocked;
  }

  if (name === 'id' && !state.idLocked) {
    state.idLocked = Boolean(target.value);
    if (el.locks.id) el.locks.id.checked = state.idLocked;
  }

  state.draft[name] = target.value;

  if (name === 'title' && !state.slugLocked) {
    const baseSlug = slugify(state.draft.title);
    state.draft.slug = generateUniqueSlug(baseSlug, state.slugSet);
  }

  if (name === 'title' && !state.idLocked) {
    const baseId = slugify(state.draft.title).replace(/-/g, '_');
    state.draft.id = generateUniqueId(baseId, state.idSet);
  }

  normalizeDraft();
  updateFormFromDraft();
  updatePreviewFields();
  state.validation.ran = false;
  updateStatusIndicators();
  evaluateStepStatus();
  markDirty(true);
  scheduleAutoSave();
}

function handleGenreChange(event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  const selected = new Set(state.draft.genres || []);
  if (input.checked) {
    selected.add(input.value);
  } else {
    selected.delete(input.value);
  }
  state.draft.genres = Array.from(selected);
  state.validation.ran = false;
  updateStatusIndicators();
  evaluateStepStatus();
  markDirty(true);
  scheduleAutoSave();
}

function handleRatingRange(event) {
  const value = event.target.value;
  state.draft.ccgRating = value;
  if (el.ratingOutput) el.ratingOutput.textContent = value;
  updateFormFromDraft();
  updatePreviewFields();
  evaluateStepStatus();
  markDirty(true);
  scheduleAutoSave();
}

function toggleOverrideField(targetKey) {
  const field = el.overrideFields[targetKey];
  if (!field) return;
  field.hidden = !field.hidden;
}

function setSlugLock(locked) {
  state.slugLocked = locked;
  if (!locked) {
    const baseSlug = slugify(state.draft.title);
    state.draft.slug = generateUniqueSlug(baseSlug, state.slugSet);
  }
  normalizeDraft();
  updateFormFromDraft();
  updatePreviewFields();
  evaluateStepStatus();
  markDirty(true);
  scheduleAutoSave();
}

function setIdLock(locked) {
  state.idLocked = locked;
  if (!locked) {
    const baseId = slugify(state.draft.title).replace(/-/g, '_');
    state.draft.id = generateUniqueId(baseId, state.idSet);
  }
  normalizeDraft();
  updateFormFromDraft();
  updatePreviewFields();
  evaluateStepStatus();
  markDirty(true);
  scheduleAutoSave();
}

function evaluateStepStatus() {
  const validation = validateWizardDraft(state.draft, getValidationContext());
  const fieldErrors = validation.fieldErrors || {};
  state.validation.fieldErrors = fieldErrors;
  state.validation.missing = validation.missing || [];
  renderFieldErrors(fieldErrors);
  const status = {};
  Object.keys(STEP_FIELDS).forEach((stepKey) => {
    const step = Number(stepKey);
    const fields = STEP_FIELDS[step] || [];
    status[step] = fields.every((field) => !fieldErrors[field]);
  });
  state.stepStatus = status;
  updateProgress();
}

function canNavigateToStep(targetStep) {
  if (targetStep <= 1) return true;
  for (let step = 1; step < targetStep; step += 1) {
    if (!state.stepStatus[step]) {
      return { ok: false, step };
    }
  }
  return { ok: true };
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

  if (el.genreSearch) {
    el.genreSearch.addEventListener('input', (event) => {
      filterGenres(event.target.value);
    });
  }

  if (el.ratingRange) {
    el.ratingRange.addEventListener('input', handleRatingRange);
  }

  if (el.load.form) {
    el.load.form.addEventListener('submit', (event) => {
      event.preventDefault();
      const value = el.load.input?.value || '';
      if (value.includes('-')) {
        loadGameBySlug(value);
      } else if (value.includes('_')) {
        loadGameById(value);
      } else {
        loadGameBySlug(value);
        if (state.mode !== 'edit') loadGameById(value);
      }
    });
  }

  el.stepperButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const target = Number(button.dataset.stepJump || 1);
      const result = canNavigateToStep(target);
      if (!result.ok) {
        setErrorIndicator(`Complete required fields in Step ${result.step} before moving on.`);
        focusFirstInvalidField(result.step);
        return;
      }
      setErrorIndicator('');
      goToStep(target);
    });
  });

  el.locks.slug?.addEventListener('change', (event) => {
    setSlugLock(event.target.checked);
  });

  el.locks.id?.addEventListener('change', (event) => {
    setIdLock(event.target.checked);
  });

  el.actions.saveDraft?.addEventListener('click', () => {
    saveDraft();
  });

  el.actions.clearDraft.forEach((button) => {
    button.addEventListener('click', () => {
      clearDraft();
    });
  });

  el.actions.resetWizard?.addEventListener('click', () => {
    resetWizard();
  });

  el.actions.prevStep?.addEventListener('click', () => {
    goToStep(state.step - 1);
  });

  el.actions.nextStep?.addEventListener('click', () => {
    const next = state.step + 1;
    const result = canNavigateToStep(next);
    if (!result.ok) {
      setErrorIndicator(`Complete required fields in Step ${result.step} before moving on.`);
      focusFirstInvalidField(result.step);
      return;
    }
    setErrorIndicator('');
    goToStep(next);
  });

  el.actions.toggleThumbnailOverride?.addEventListener('click', () => {
    toggleOverrideField('thumbnail');
  });

  el.actions.toggleBox3dOverride?.addEventListener('click', () => {
    toggleOverrideField('box3d');
  });

  el.actions.runValidation?.addEventListener('click', () => {
    validateDraft();
    renderValidation();
  });

  el.actions.generateOutput?.addEventListener('click', () => {
    if (!state.auth.canWrite) return;
    validateDraft();
    renderValidation();
    if (state.validation.errors.length || hasBlockingLibraryErrors()) return;
    state.outputs = buildOutputs();
    renderOutputs();
    if (el.actions.downloadBundle) {
      el.actions.downloadBundle.disabled = state.export.disabled;
    }
    updateStatusIndicators();
  });

  el.actions.downloadBundle?.addEventListener('click', async () => {
    if (!state.auth.canWrite) return;
    validateDraft();
    renderValidation();
    if (state.validation.errors.length || hasBlockingLibraryErrors()) return;
    await runPackageBuild();
  });

  el.actions.buildPackage?.addEventListener('click', async () => {
    if (!state.auth.canWrite) return;
    validateDraft();
    renderValidation();
    if (state.validation.errors.length || hasBlockingLibraryErrors()) {
      goToStep(5);
      return;
    }
    state.outputs = buildOutputs();
    renderOutputs();
    if (el.actions.downloadBundle) {
      el.actions.downloadBundle.disabled = state.export.disabled;
    }
    goToStep(6);
    await runPackageBuild();
  });

  el.exportModalClose.forEach((button) => {
    button.addEventListener('click', () => {
      closeExportModal();
    });
  });

  el.validation.errors?.addEventListener('click', (event) => {
    const target = event.target.closest('button');
    if (!target) return;
    const field = target.dataset.field;
    if (field) {
      focusField(field);
    }
  });
}

function focusFirstInvalidField(step) {
  const fields = STEP_FIELDS[step] || [];
  const fieldErrors = state.validation.fieldErrors || {};
  const field = fields.find((name) => fieldErrors[name]);
  focusField(field || fields[0]);
}

async function loadLibrary() {
  setLibraryIndicator('Library: loading games.json…');
  let lastError;
  for (let attempt = 1; attempt <= MAX_LIBRARY_ATTEMPTS; attempt += 1) {
    try {
      const cache = await loadGamesLibrary({ force: attempt > 1 });
      const data = cache.games || [];
      state.library = data;
      state.schema = buildSchemaMap(data);
      updateUniquenessSets();
      runLibraryValidation();
      const issueCount = state.libraryValidation.errors.length;
      const issueLabel = issueCount ? ` · Issues: ${issueCount}` : '';
      setLibraryIndicator(`Library: Loaded (${data.length})${issueLabel}`);
      renderSystemOptions();
      renderGenres();
      renderLibraryLookupOptions();
      updateStatusIndicators();
      return;
    } catch (error) {
      lastError = error;
      console.error(
        `[CCG-GAME-BUILDER] games.json load failed (attempt ${attempt}/${MAX_LIBRARY_ATTEMPTS})`,
        error
      );
      if (attempt < MAX_LIBRARY_ATTEMPTS) {
        setLibraryIndicator(`Library: retrying (${attempt + 1}/${MAX_LIBRARY_ATTEMPTS})…`);
        await wait(LIBRARY_RETRY_DELAY_MS);
      }
    }
  }

  setLibraryIndicator('Library: failed to load');
  setRuntimeState('Library load failed', 'error');
  setErrorIndicator(lastError instanceof Error ? lastError.message : 'Failed to load games.json');
  updateStatusIndicators();
}

async function initAuth() {
  try {
    await waitForAuthReady();
    let context = await getAuthContext();

    if (
      context?.user?.id &&
      ['unknown', 'member', 'none'].includes(String(context?.role || '').toLowerCase())
    ) {
      try {
        const role = await fetchUserRole({ userId: context.user.id, force: true });
        context = { ...context, role };
      } catch (error) {
        console.warn('[CCG-GAME-BUILDER] Unable to resolve role.', error);
      }
    }

    applyAuthContext(context, context?.error || null);
    return context;
  } catch (error) {
    applyAuthContext(null, error);
    return null;
  }
}

// Compatibility export hook (legacy admin expects this symbol).
// NOTE: games-editor.js is an ES module, so this must exist in-module (not on window) to avoid ReferenceError at boot.
async function downloadFlatPageZip() {
  // If auth has completed and we cannot write, keep behaviour consistent with the UI buttons.
  if (state.auth.ready && !state.auth.canWrite) {
    setErrorIndicator('Read-only mode: export is disabled for your role.');
    return;
  }

  // Build outputs if needed (so a legacy caller can just "downloadFlatPageZip()" and get a full package).
  if (!state.outputs) {
    validateDraft();
    renderValidation();
    if (state.validation.errors.length || hasBlockingLibraryErrors()) {
      goToStep(5);
      return;
    }
    state.outputs = buildOutputs();
    renderOutputs();
    if (el.actions.downloadBundle) {
      el.actions.downloadBundle.disabled = state.export.disabled;
    }
    updateStatusIndicators();
  }

  // Always download (legacy intent).
  await runPackageBuild({ autoDownload: true });
}

async function boot() {
  setRuntimeState('Booting', 'info');
  await initAdminNav({ pageLabel: 'CCG Game Builder', active: 'editor' });

  setExportVersionLabels();
  resetExportSteps();
  renderExportWarnings([]);
  renderMissingAssets([]);
  setExportPanelError('');
  setExportStateLabel('Ready');

  try {
    validateJsZipRuntime();
    testZip();
    setExportDisabled(false);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSZip detected — export disabled';
    setExportDisabled(true, message);
    setRuntimeState('Export disabled', 'error');
    setErrorIndicator(message);
  }

  setReadOnly(true);
  await loadLibrary();

  loadDraft();
  normalizeDraft();
  updateFormFromDraft();
  updatePreviewFields();
  evaluateStepStatus();
  updateProgress();
  showDraftBanner();
  bindEvents();
  window.CCGGameBuilder = { loadGameById, loadGameBySlug, downloadFlatPageZip };
  window.ccgRegenerateGameStubs = downloadFlatPageZip;
  window.downloadFlatPageZip = downloadFlatPageZip;

  const params = new URLSearchParams(window.location.search);
  if (params.has('slug')) {
    loadGameBySlug(params.get('slug'));
  } else if (params.has('id')) {
    loadGameById(params.get('id'));
  } else if (state.mode === 'edit' && state.editing?.slug) {
    loadGameBySlug(state.editing.slug);
  }

  setRuntimeState('Library ready · auth pending', 'info');
  await initAuth();
}

boot().catch((error) => {
  console.error('[CCG-GAME-BUILDER] boot failure', error);
  const message = error instanceof Error ? error.message : 'Unknown error';
  setRuntimeState('Boot failed', 'error');
  setErrorIndicator(`Library: failed to load (${message})`);
});

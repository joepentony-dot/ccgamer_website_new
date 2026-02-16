import { initAdminNav } from './admin-nav.js';
import { getAuthContext, waitForAuthReady } from './auth.js';
import { loadGamesLibrary, updateGamesLibrary } from './games-api.js';
import { fetchUserRole } from './roles.js';
import { validateExportOutputs, validateWizardDraft } from './validator.js';

/* PHASE 0 AUDIT SUMMARY
- Canonical games.json location: "/games/games.json"
- SEO folder page behavior: generates /games/{slug}/index.html with metadata
- Sort strategy: alphabetical title (case-insensitive) then slug (case-insensitive)
*/

const SITE_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';
const STORAGE_KEY = 'omegaGameBuilderDraftV1';
const MAX_STEP = 6;
const MAX_LIBRARY_ATTEMPTS = 2;
const LIBRARY_RETRY_DELAY_MS = 800;
const SITE_OWNER_EMAIL = 'joepentony@hotmail.com';
const ALLOWED_WRITE_ROLES = [
  'authenticated',
  'editor',
  'admin',
  'superadmin'
];
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

  exportChecklist: {
    gamesJson: document.querySelector('[data-checklist-item="gamesJson"]'),
    stub: document.querySelector('[data-checklist-item="stub"]'),
    flat: document.querySelector('[data-checklist-item="flat"]'),
    sitemap: document.querySelector('[data-checklist-item="sitemap"]'),
    assets: document.querySelector('[data-checklist-item="assets"]')
  },
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
    flatHtml: document.querySelector('[data-preview="flat-html"]'),
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
  insertionPreview: document.querySelector('[data-insertion-preview]'),
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
    toggleBox3dOverride: document.querySelector('[data-action="toggle-box3d-override"]'),
    retryDownload: document.querySelector('[data-action="retry-download"]'),
    runChecks: document.querySelector('[data-action="run-checks"]')
  }
};

const isEditableTarget = (target) => (window.ccgIsEditableTarget ? window.ccgIsEditableTarget(target) : false);

// === ADMIN INPUT OVERRIDE (SPACEBAR SAFE) ===
(function enableAdminInputOverride() {
  document.addEventListener(
    'keydown',
    (e) => {
      if (!window.ccgIsEditableTarget || !window.ccgIsEditableTarget(e.target)) return;
      const isIdentityTarget = window.ccgIsGameEditorIdentityTarget
        ? window.ccgIsGameEditorIdentityTarget(e.target)
        : false;
      if (isIdentityTarget) return;
      e.stopPropagation();
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

function setChecklistItemState(item, status = 'blocked') {
  if (!item) return;
  item.dataset.state = status;
  const label = item.textContent.replace(/\s*[✅⚠❌]$/, '');
  const suffix = status === 'ready' ? ' ✅' : status === 'warning' ? ' ⚠' : ' ❌';
  item.textContent = `${label}${suffix}`;
}

function renderExportChecklist(outputs = state.outputs) {
  if (!el.exportChecklist) return;
  const hasOutput = (value) => typeof value === 'string' ? Boolean(value.trim()) : Boolean(value);
  const assetsToBundle = Array.isArray(outputs?.assetsToBundle) ? outputs.assetsToBundle : [];
  const checklist = {
    gamesJson: hasOutput(outputs?.gamesJson),
    stub: hasOutput(outputs?.stubHtml),
    flat: hasOutput(outputs?.flatHtml),
    sitemap: hasOutput(outputs?.sitemapFragment),
    assets: assetsToBundle.length > 0
  };

  setChecklistItemState(el.exportChecklist.gamesJson, checklist.gamesJson ? 'ready' : 'blocked');
  setChecklistItemState(el.exportChecklist.stub, checklist.stub ? 'ready' : 'blocked');
  setChecklistItemState(el.exportChecklist.flat, checklist.flat ? 'ready' : 'blocked');
  setChecklistItemState(el.exportChecklist.sitemap, checklist.sitemap ? 'ready' : 'blocked');
  setChecklistItemState(el.exportChecklist.assets, checklist.assets ? 'ready' : 'blocked');
}

function attemptBlobDownload(blob, filename) {
  if (!(blob instanceof Blob)) {
    throw new Error('Download failed: ZIP blob is missing. Build the package again.');
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return true;
}

function setRetryDownloadVisible(visible) {
  if (!el.actions.retryDownload) return;
  el.actions.retryDownload.hidden = !visible;
}

function setDownloadBundleEnabled(enabled) {
  const downloadBtn = document.querySelector('[data-action="download-bundle"]');
  if (!downloadBtn) return;
  downloadBtn.disabled = !enabled;
  if (enabled) {
    downloadBtn.classList.remove('is-disabled');
  } else {
    downloadBtn.classList.add('is-disabled');
  }
}

function getBlockingValidationIssues() {
  const blocking = [];
  const title = String(state.draft?.title || '').trim();
  const slug = String(state.draft?.slug || '').trim();
  const id = String(state.draft?.id || '').trim();
  const system = String(state.draft?.system || '').trim();
  const year = String(state.draft?.year || '').trim();
  const genres = Array.isArray(state.draft?.genres) ? state.draft.genres : [];
  const rating = Number(state.draft?.ccgRating);

  if (!title) blocking.push('title');
  if (!slug) blocking.push('slug');
  if (!id) blocking.push('id');
  if (!system) blocking.push('system');
  if (!year) blocking.push('year');
  if (!genres.length) blocking.push('genres');
  if (!rating || Number.isNaN(rating)) blocking.push('ccgRating');

  const originalSlug = state.editing?.slug || '';
  const originalId = state.editing?.id || '';
  if (slug && slug !== originalSlug && state.slugSet.has(slug)) blocking.push('duplicateSlug');
  if (id && id !== originalId && state.idSet.has(id)) blocking.push('duplicateId');

  const identityMismatchError = getIdentityMismatchError();
  if (identityMismatchError) blocking.push('identityMismatch');

  return blocking;
}

function hasBlockingValidationIssues() {
  return getBlockingValidationIssues().length > 0 || (state.validation?.errors?.length || 0) > 0;
}

function addWarning(message) {
  if (!message) return;
  if (!Array.isArray(state.validation.warnings)) state.validation.warnings = [];
  if (!state.validation.warnings.includes(message)) {
    state.validation.warnings.push(message);
  }
  if (!Array.isArray(state.export.warnings)) state.export.warnings = [];
  if (!state.export.warnings.includes(message)) {
    state.export.warnings.push(message);
    renderExportWarnings(state.export.warnings);
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

  ['generateOutput', 'buildPackage'].forEach((key) => {
    const node = el.actions[key];
    if (node) node.disabled = disabled || !state.auth.canWrite;
  });
  if (disabled || !state.outputs) {
    setDownloadBundleEnabled(false);
  }
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
  const authState = String(context?.state || '').toLowerCase();
  const isAuthenticated = Boolean(
    context?.user?.id
    || context?.session?.user?.id
    || context?.isAuthenticated
    || authState === 'authenticated'
    || authState === 'authenticated_limited'
    || authState === 'authenticating'
  );

  const email = String(
    context?.profile?.email
    || context?.email
    || context?.user?.email
    || context?.session?.user?.email
    || ''
  ).toLowerCase();

  const isOwner = email === SITE_OWNER_EMAIL;
  const role = (isOwner ? 'admin' : (context?.role || context?.profile?.role || 'none'));
  let canWrite = Boolean(context?.canWrite);

  if (!canWrite && isAuthenticated) {
    canWrite = ALLOWED_WRITE_ROLES.includes(String(role).toLowerCase());
  }
  if (isOwner) {
    canWrite = true;
  }

  state.auth.ready = true;
  state.auth.context = context || null;
  state.auth.canWrite = canWrite;
  state.auth.role = role;

  if (el.email) el.email.textContent = email || 'guest';
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

  if (!state.auth.canWrite) {
    setRuntimeState('Read-only · role limited', 'warning');
    setReadOnly(true);
    updateStatusIndicators();
    return;
  }

  if (isOwner) {
    setModeIndicator('Mode: New');
    setRuntimeState('Admin access enabled', 'ok');
  } else {
    setRuntimeState('Ready');
  }

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

function generateIdentityFromTitle(title) {
  const slug = String(title || '')
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');

  return {
    slug,
    id: slug.replace(/-/g, '_')
  };
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

function normalizeAssetPath(assetPath, slug) {
  if (!assetPath) return { path: '', filename: '', warnings: [] };
  if (/^https?:/i.test(assetPath)) {
    return { path: assetPath, filename: assetPath.split('/').pop() || '', warnings: [], isRemote: true };
  }

  const normalized = assetPath.replace(/^\/+/, '');
  const segments = normalized.split('/');
  const originalFilename = segments.pop() || '';
  if (!originalFilename) return { path: normalized, filename: '', warnings: [] };
  return {
    path: [...segments, originalFilename].join('/'),
    filename: originalFilename,
    warnings: [],
    originalFilename
  };
}

function locateAsset(path) {
  try {
    const url = new URL(path, location.origin);
    if (url.origin !== location.origin) return Promise.resolve(null);
    return fetch(url.href, { method: 'HEAD' })
      .then((res) => (res.ok ? url.href : null))
      .catch(() => null);
  } catch {
    return null;
  }
}

function idMatchesSlug(record = {}) {
  const slug = String(record.slug || '').trim();
  const id = String(record.id || '').trim();
  if (!slug || !id) return false;
  return id === slug.replace(/-/g, '_');
}


function syncIdentityFields({ force = false } = {}) {
  if (!state.draft) return;
  const identity = generateIdentityFromTitle(state.draft.title);

  if (force || !state.slugLocked) {
    state.draft.slug = identity.slug;
    console.info('[CCG-IDENTITY] slug synced', { slug: state.draft.slug, source: 'title' });
  }

  if (force || !state.idLocked) {
    state.draft.id = identity.id;
    console.info('[CCG-IDENTITY] id synced', { id: state.draft.id, source: 'title' });
  }
}

function applyTitleIdentitySync(nextTitle) {
  const title = String(nextTitle || '').trim();
  state.draft.title = title;

  if (!title) {
    updateIdentityDomFromDraft();
    return;
  }

  syncIdentityFields();
  updateIdentityDomFromDraft();
}

function getIdentityMismatchError() {
  const identity = generateIdentityFromTitle(state.draft?.title);
  const slug = String(state.draft?.slug || '').trim();
  const id = String(state.draft?.id || '').trim();
  if (!identity.slug || !slug || !id) return '';
  if (slug !== identity.slug || id !== identity.id) {
    return 'Slug and Game ID must match the game title. Unlock fields or correct title.';
  }
  return '';
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

  syncIdentityFields();

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
    if (field === document.activeElement) return;
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

function findIdentityInput(fieldName) {
  const selectors = {
    title: [
      '[data-field="title"]',
      '#title',
      '#game-title',
      'input[name="title"]',
      '[data-step="1"] .form-grid input[type="text"]'
    ],
    slug: ['[data-field="slug"]', '#slug', 'input[name="slug"]'],
    id: ['[data-field="id"]', '#id', '#game-id', 'input[name="id"]']
  };
  const candidates = selectors[fieldName] || [];
  for (const selector of candidates) {
    const found = document.querySelector(selector);
    if (found instanceof HTMLInputElement) {
      return found;
    }
  }
  return null;
}

function updateIdentityDomFromDraft() {
  const titleInput = findIdentityInput('title');
  const slugInput = findIdentityInput('slug');
  const idInput = findIdentityInput('id');

  if (titleInput && titleInput !== document.activeElement) {
    titleInput.value = state.draft.title ?? '';
  }
  if (slugInput && slugInput !== document.activeElement) {
    slugInput.value = state.draft.slug ?? '';
  }
  if (idInput && idInput !== document.activeElement) {
    idInput.value = state.draft.id ?? '';
  }
  if (el.locks.slug) el.locks.slug.checked = state.slugLocked;
  if (el.locks.id) el.locks.id.checked = state.idLocked;
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

  locateAsset(`/${src}`)
    .then((confirmed) => {
      if (!confirmed) {
        card.classList.add('is-error');
        if (key === 'thumbnail') {
          if (status) status.textContent = 'Thumbnail not found locally.';
          addWarning('Thumbnail warning: local file not found, so it will not be bundled.');
        } else if (status) {
          status.textContent = 'Preview failed. Check filename or path.';
        }
        img.removeAttribute('src');
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
      img.src = confirmed;
    })
    .catch(() => {
      card.classList.add('is-error');
      if (status) status.textContent = 'Preview check failed.';
    });
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
    if (!state.validation.ran) {
      el.validationIndicator.textContent = 'Validation: Pending';
    } else if (state.validation.errors.length) {
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
    // Locks default false unless explicitly saved true in draft payload.
    state.slugLocked = parsed.slugLocked === true;
    state.idLocked = parsed.idLocked === true;
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
  setDownloadBundleEnabled(false);
  if (el.exportNote) el.exportNote.hidden = true;
  resetExportSteps();
  renderExportWarnings([]);
  renderMissingAssets([]);
  renderExportChecklist(state.outputs);
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

function whenDomReady() {
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    document.addEventListener('DOMContentLoaded', resolve, { once: true });
  });
}

function renderSystemOptions() {
  if (!el.systemSelect) return;

  const fromSchema = Array.isArray(state.schema?.systems) ? state.schema.systems : [];
  const fallback = ['C64', 'AMIGA'];
  const systemsRaw = fromSchema.length ? fromSchema : fallback;
  const systems = Array.from(new Set(systemsRaw.map((s) => String(s || '').trim()).filter(Boolean)));

  if (!systems.includes('C64')) systems.unshift('C64');
  if (!systems.includes('AMIGA')) systems.push('AMIGA');

  const current = String(el.systemSelect.value || state.draft?.system || '').trim();

  el.systemSelect.innerHTML = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Select system';
  el.systemSelect.appendChild(placeholder);

  systems.forEach((system) => {
    const option = document.createElement('option');
    option.value = system;
    option.textContent = system;
    el.systemSelect.appendChild(option);
  });

  if (current && systems.includes(current)) {
    el.systemSelect.value = current;
  } else if (state.draft?.system && systems.includes(state.draft.system)) {
    el.systemSelect.value = state.draft.system;
  }
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
  // Edit mode always starts unlocked (explicit-lock only semantics).
  state.slugLocked = false;
  state.idLocked = false;
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
  return false;
}

function renderLibraryValidation() {
  const infos = state.libraryValidation?.infos || [];
  if (el.libraryValidation.status) {
    if (!state.libraryValidation.ran) {
      el.libraryValidation.status.textContent = 'Legacy library scan pending.';
    } else if (infos.length) {
      el.libraryValidation.status.textContent = `ℹ️ Legacy library notice — no action required (${infos.length} item(s)).`;
    } else {
      el.libraryValidation.status.textContent = 'No legacy library notices.';
    }
  }

  if (el.libraryValidation.errors) {
    el.libraryValidation.errors.innerHTML = infos.length
      ? infos.map((message) => `<li class="is-warning">ℹ️ ${escapeHtml(message)}</li>`).join('')
      : '<li>ℹ️ Legacy library notice — no action required.</li>';
  }
}

function runLibraryValidation() {
  const infos = [];
  (Array.isArray(state.library) ? state.library : []).forEach((game) => {
    if (!idMatchesSlug(game)) {
      infos.push(`${game?.title || game?.slug || game?.id || 'Untitled'} uses legacy id`);
    }
  });

  state.libraryValidation = {
    errors: [],
    warnings: infos,
    infos,
    ran: true,
    valid: true
  };
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
  if (el.validation.status) {
    if (!state.validation.ran) {
      el.validation.status.textContent = 'Validation pending.';
    } else {
      el.validation.status.textContent = errors.length
        ? 'Validation: FAIL — fix the following before export:'
        : 'Validation: PASS — ready to build.';
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
    const identityMismatchError = getIdentityMismatchError();
    if (identityMismatchError && !items.some((item) => item.message === identityMismatchError)) {
      items.push({ field: '', message: identityMismatchError });
    }
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

  const exportBlocked = hasBlockingValidationIssues();
  if (el.actions.generateOutput) {
    el.actions.generateOutput.disabled = exportBlocked || !state.auth.canWrite || state.export.disabled;
  }
  if (el.actions.buildPackage) {
    el.actions.buildPackage.disabled = exportBlocked || !state.auth.canWrite || state.export.disabled;
  }

  updateStatusIndicators();
}

function renderOutputs() {
  if (!state.outputs) {
    if (el.previews.gameJson) el.previews.gameJson.textContent = '';
    if (el.previews.stubHtml) el.previews.stubHtml.textContent = '';
    if (el.previews.flatHtml) el.previews.flatHtml.textContent = '';
    if (el.previews.sitemapFragment) el.previews.sitemapFragment.textContent = '';
    if (el.previews.metadataJson) el.previews.metadataJson.textContent = '';
    if (el.previews.manifestJson) el.previews.manifestJson.textContent = '';
    if (el.previews.readme) el.previews.readme.textContent = '';
    renderExportChecklist(null, []);
    return;
  }

  const { entry, stubHtml, flatHtml, sitemapFragment, metadataJson, manifestJson, readme } = state.outputs;
  if (el.previews.gameJson) el.previews.gameJson.textContent = JSON.stringify(entry, null, 2);
  if (el.previews.stubHtml) el.previews.stubHtml.textContent = stubHtml;
  if (el.previews.flatHtml) el.previews.flatHtml.textContent = flatHtml;
  if (el.previews.sitemapFragment) el.previews.sitemapFragment.textContent = sitemapFragment;
  if (el.previews.metadataJson) el.previews.metadataJson.textContent = metadataJson;
  if (el.previews.manifestJson) el.previews.manifestJson.textContent = manifestJson;
  if (el.previews.readme) el.previews.readme.textContent = readme;
  renderExportChecklist(state.outputs, state.export.missingAssets || []);
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

function buildBuildReport(entry, insertionContext = {}, assetSummary = {}) {
  return [
    '# BUILD REPORT',
    '',
    `New entry inserted between:`,
    `- ${insertionContext.before || '(start of file)'}`,
    `- ${insertionContext.after || '(end of file)'}`,
    '',
    'Asset bundle status:',
    `- thumbnail: ${assetSummary.thumbnail || 'not found'}`,
    `- 3D box: ${assetSummary.box3d || 'not found'}`,
    `- manual: ${assetSummary.manual || 'not found'}`,
    '',
    `Slug: ${entry.slug}`,
    `ID: ${entry.id}`,
    '',
    'Included pages:',
    `- /games/${entry.slug}/index.html`,
    `- /games/${entry.slug}.html`
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

    <!-- Flat SEO stub for GitHub Pages: show /games/{slug}/ without server rewrites -->
    <script>
      (function () {
        history.replaceState(null, "", "/games/${escapeAttribute(slug)}/");
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


// Build flat SEO pages for the whole library (used by the package exporter).
// Returns: { pages: [{ slug, html }], warnings: [string] }
function buildFlatGamePages(library = []) {
  const pages = [];
  const warnings = [];

  const currentSlug = state?.outputs?.entry?.slug || state?.draft?.slug || '';

  const safeTitle = (game) => `${String(game?.title || '').trim() || 'Game'} | Cheeky Commodore Gamer`;
  const safeDescription = (game) =>
    String(game?.description || '').trim()
    || `${String(game?.title || 'This game')} on Commodore — screenshots, manual, downloads and video.`;

  const safePublisher = (game) =>
    (Array.isArray(game?.credits?.publisher) && game.credits.publisher[0])
    || game?.developer
    || '';

  const safeThumb = (game) => {
    const t = String(game?.thumbnail || '').trim();
    if (!t) return '';
    return `../${t}`.replace(/(?<!:)\/\/+/g, '/');
  };

  (Array.isArray(library) ? library : []).forEach((game) => {
    const slug = String(game?.slug || '').trim();
    if (!slug) return;

    // Avoid duplicating the "current" slug which is added separately as state.outputs.flatHtml.
    if (currentSlug && slug === currentSlug) return;

    const id = String(game?.id || '').trim();
    if (!id) {
      warnings.push(`Skipped flat page for "${slug}" because id is missing.`);
      return;
    }

    const seoTitle = safeTitle(game);
    const description = safeDescription(game);
    const canonical = `${SITE_ORIGIN}/games/${slug}.html`;
    const image = game.thumbnail ? `${SITE_ORIGIN}/${String(game.thumbnail).replace(/^\/+/, '')}`.replace(/(?<!:)\/\/+/g, '/') : '';
    const publisher = safePublisher(game);
    const heroThumb = safeThumb(game);

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'VideoGame',
      name: String(game?.title || '').trim() || slug,
      description,
      datePublished: String(game?.year || ''),
      gamePlatform: String(game?.system || ''),
      publisher,
      image,
      url: canonical
    };

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />

    <!-- Flat SEO stub for GitHub Pages: show /games/{slug}/ without server rewrites -->
    <script>
      (function () {
        history.replaceState(null, "", "/games/${escapeAttribute(slug)}/");
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
                        alt="${escapeAttribute(String(game?.title || slug))} cover"
                        loading="lazy"
                     width="460" height="215"  srcset="${escapeAttribute(heroThumb)} 460w" sizes="(max-width: 720px) 90vw, 460px" />
                </div>

                <div class="game-hero__content">
                    <h1 class="game-hero__title">${escapeHtml(String(game?.title || slug))}</h1>

                    <div class="game-hero__meta">
                        <span class="game-meta__item">${escapeHtml(String(game?.year || ''))}</span>
                        <span class="game-meta__sep">•</span>
                        <span class="game-meta__item">${escapeHtml(String(game?.system || ''))}</span>
                        <span class="game-meta__sep">•</span>
                        <span class="game-meta__item">${escapeHtml(String(publisher || ''))}</span>
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
                   href="/games/game.html?id=${escapeAttribute(id)}">
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

    pages.push({ slug, html });
  });

  return { pages, warnings };
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

function getSortKey(record = {}) {
  return String(record.title || record.sorttitle || record.slug || '').trim().toLowerCase();
}

function sortLibraryRecords(records = []) {
  return records
    .map((record, index) => ({ record, index }))
    .sort((a, b) => {
      const titleCompare = getSortKey(a.record).localeCompare(getSortKey(b.record), 'en', {
        sensitivity: 'base',
        numeric: true
      });
      if (titleCompare !== 0) return titleCompare;
      return a.index - b.index;
    })
    .map((item) => item.record);
}

function assertNoDuplicateIds(records = []) {
  const seen = new Set();
  records.forEach((record) => {
    const id = String(record?.id || '').trim();
    if (!id) return;
    if (seen.has(id)) {
      throw new Error(`games.json duplicate id detected: "${id}".`);
    }
    seen.add(id);
  });
}

function assertLibrarySorted(records = []) {

  for (let index = 1; index < records.length; index += 1) {
    const prev = getSortKey(records[index - 1]);
    const current = getSortKey(records[index]);
    const compare = prev.localeCompare(current, 'en', { sensitivity: 'base', numeric: true });
    if (compare > 0) {
      throw new Error(`games.json sort check failed at index ${index}: "${prev}" should not come after "${current}".`);
    }
  }
}

function applyEntryToLibrary(entry) {
  const updatedLibrary = [...state.library];

  if (state.mode === 'edit' && state.editing) {
    updatedLibrary[state.editing.index] = entry;
  } else {
    updatedLibrary.push(entry);
  }

  const sortedLibrary = sortLibraryRecords(updatedLibrary);
  assertNoDuplicateIds(sortedLibrary);
  assertLibrarySorted(sortedLibrary);

  updateGamesLibrary(sortedLibrary, 'wizard');
  state.library = sortedLibrary;

  updateUniquenessSets();
  renderLibraryLookupOptions();

  return sortedLibrary;
}


function getInsertionContext(records, slug) {
  const index = records.findIndex((item) => item.slug === slug);
  if (index < 0) return { index: -1, before: null, after: null, window: [] };
  return {
    index,
    before: records[index - 1]?.title || null,
    after: records[index + 1]?.title || null,
    window: records.slice(Math.max(0, index - 2), Math.min(records.length, index + 3)).map((item) => ({ title: item.title, slug: item.slug }))
  };
}

function getPackageFilename(slug) {
  const day = new Date().toISOString().slice(0, 10);
  return `ccg-game-package__${slug}__${day}.zip`;
}

async function buildOutputs() {
  const identityMismatchError = getIdentityMismatchError();
  if (identityMismatchError) {
    throw new Error(identityMismatchError);
  }

  const entry = buildGameRecord();
  const updatedLibrary = applyEntryToLibrary(entry);
  assertLibrarySorted(updatedLibrary);
  const insertionContext = getInsertionContext(updatedLibrary, entry.slug);
  const gamesJson = JSON.stringify(updatedLibrary, null, 2);
  const stubHtml = buildSeoStub(entry);
  const flatHtml = buildFlatSeoPage(entry);
  if (!stubHtml || !flatHtml) {
    throw new Error('Output generation failed: both stub and flat HTML are required.');
  }
  const sitemapFragment = buildSitemapFragment(state.draft);
  const metadataJson = buildMetadataJson(entry);
  const manifestJson = buildManifestJson(entry);
  const assetChecks = await collectBundleableAssets(entry);
  const assetSummary = {
    thumbnail: assetChecks.find((item) => item.key === "thumbnail")?.found ? "found" : "not found",
    box3d: assetChecks.find((item) => item.key === "box3d")?.found ? "found" : "not found",
    manual: assetChecks.find((item) => item.key === "manual")?.found ? "found" : "not found"
  };
  const readme = buildBuildReport(entry, insertionContext, assetSummary);

  return {
    entry,
    gamesJson,
    stubHtml,
    flatHtml,
    sitemapFragment,
    metadataJson,
    manifestJson,
    readme,
    insertionContext,
    assetChecks,
    assetsToBundle: assetChecks.filter((item) => item.found)
  };
}

async function collectBundleableAssets(entry) {
  const checks = [
    { key: 'thumbnail', label: 'Thumbnail', path: entry.thumbnail, targetFolder: 'assets/images' },
    { key: 'box3d', label: '3D box', path: state.draft.box3d, targetFolder: 'assets/images' },
    { key: 'manual', label: 'PDF/manual', path: entry.pdf, targetFolder: 'assets/docs' }
  ];

  (Array.isArray(entry.disk) ? entry.disk : []).forEach((diskPath, index) => {
    checks.push({
      key: `disk-${index + 1}`,
      label: `Disk image ${index + 1}`,
      path: diskPath,
      targetFolder: 'assets/disks'
    });
  });

  const resolved = [];
  for (const check of checks) {
    if (!check.path) {
      resolved.push({ ...check, found: false, reason: 'not-set', normalizedPath: '' });
      continue;
    }
    const normalized = normalizeAssetPath(check.path, entry.slug);
    const confirmed = await locateAsset(`/${normalized.path}`);
    resolved.push({
      ...check,
      found: Boolean(confirmed),
      reason: confirmed ? 'found' : 'not-found',
      normalizedPath: normalized.path,
      filename: normalized.filename,
      confirmedUrl: confirmed || ''
    });
  }

  return resolved;
}

async function addAssetToZip({ zip, descriptor, missingAssets }) {
  if (!descriptor?.found || !descriptor.confirmedUrl) return;
  const blob = await safeFetch(descriptor.confirmedUrl, { cache: 'no-store' });
  if (!blob) {
    missingAssets.push({ path: descriptor.normalizedPath, reason: 'missing-after-head', display: `${descriptor.label}: ${descriptor.normalizedPath}` });
    return;
  }
  getFolder(zip, descriptor.targetFolder).file(descriptor.filename || descriptor.key, blob);
}

async function buildPackage({ autoDownload = true } = {}) {
  if (!state.outputs) {
    state.outputs = await buildOutputs();
    window.__ccgLastZipBlob = null;
    setRetryDownloadVisible(false);
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
  renderExportChecklist(state.outputs);

  const zip = new window.JSZip();
  const entry = state.outputs.entry;
  const missingAssets = [];
  const exportWarnings = [];

  setExportStepStatus('build', 'active', 'Building ZIP…');
  setExportStepStatus('metadata', 'active', 'Metadata · in progress');

  zip.file('UPDATED-games.json', `${state.outputs.gamesJson}\n`);
  zip.file('games.json', `${state.outputs.gamesJson}\n`);
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
  if (state.outputs.sitemapFragment) {
    zip.file('sitemap-fragment.xml', state.outputs.sitemapFragment);
  }
  zip.file(`admin/output/${entry.slug}/manifest.json`, state.outputs.manifestJson);
  zip.file(`admin/output/${entry.slug}/metadata.json`, state.outputs.metadataJson);
  zip.file('BUILD-REPORT.md', state.outputs.readme);
  setExportStepStatus('metadata', 'success', '✓ Metadata');
  setExportStepStatus('images', 'active', 'Images · in progress');
  const assetChecks = Array.isArray(state.outputs.assetChecks) ? state.outputs.assetChecks : [];
  for (const descriptor of assetChecks) {
    if (!descriptor.found && descriptor.path) {
      missingAssets.push({
        path: descriptor.normalizedPath || descriptor.path,
        reason: descriptor.reason,
        display: `${descriptor.label}: ${descriptor.normalizedPath || descriptor.path}`
      });
      continue;
    }
    await addAssetToZip({ zip, descriptor, missingAssets });
  }

  if (missingAssets.length) {
    const report = missingAssets
      .map((asset) => `${asset.path} (${asset.reason})`)
      .join('\n');
    zip.file('missing-assets.txt', `${report}\n`);
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
  renderExportChecklist(state.outputs);

  const blob = await zip.generateAsync({ type: 'blob' });
  window.__ccgLastZipBlob = blob; // cache for manual + browser-safe download
  setRetryDownloadVisible(false);
  setExportStepStatus('complete', 'success', '✓ Complete');
  setExportStepStatus('build', 'success', '✓ ZIP ready');

  if (autoDownload) {
    const downloadName = getPackageFilename(entry.slug);
    try {
      attemptBlobDownload(blob, downloadName);
    } catch (downloadError) {
      setRetryDownloadVisible(true);
      const message = downloadError instanceof Error ? downloadError.message : 'Automatic download failed.';
      setExportStateLabel('ZIP ready · manual download required', 'warning');
      setExportPanelError(message);
      openExportModal(message, downloadError instanceof Error ? downloadError.stack : '');
    }
  }

  if (el.exportNote) el.exportNote.hidden = false;
  const downloadBtn = document.querySelector('[data-action="download-bundle"]');
  if (downloadBtn) {
    downloadBtn.disabled = false;
    downloadBtn.classList.remove('is-disabled');
  }
  if (!el.exportError?.textContent) setExportStateLabel('Complete', 'success');
  return blob;
}


function runConsistencyChecks() {
  validateDraft();
  renderValidation();
  if (!state.draft?.slug || !Array.isArray(state.library) || !state.library.length) return;
  const candidate = buildGameRecord();
  const simulated = sortLibraryRecords([...state.library, candidate]);
  const context = getInsertionContext(simulated, candidate.slug);
  if (el.insertionPreview) {
    el.insertionPreview.textContent = JSON.stringify({
      index: context.index,
      before: context.before,
      after: context.after,
      top5: simulated.slice(0, 5).map((item) => item.title),
      aroundInsertion: context.window,
      bottom5: simulated.slice(-5).map((item) => item.title)
    }, null, 2);
  }
}

function validateJsZipRuntime() {
  if (!window.JSZip || !window.JSZip.prototype?.folder) {
    throw new Error('Invalid JSZip detected — export disabled');
  }
}

function testZip() {
  try {
    const z = new window.JSZip();
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

async function runPackageBuild({ autoDownload = true, forceRebuild = false } = {}) {
  if (state.export.disabled) {
    setExportPanelError(state.export.reason || 'Export disabled');
    setExportStateLabel('Export disabled', 'error');
    return null;
  }

  if (autoDownload && !forceRebuild && window.__ccgLastZipBlob instanceof Blob && state.outputs?.entry?.slug) {
    try {
      setExportPanelError('');
      setRetryDownloadVisible(false);
      attemptBlobDownload(window.__ccgLastZipBlob, getPackageFilename(state.outputs.entry.slug));
      setExportStateLabel('Complete', 'success');
      return window.__ccgLastZipBlob;
    } catch (error) {
      setRetryDownloadVisible(true);
      handleExportFailure(error);
      return null;
    }
  }

  setDownloadButtonState(true);
  try {
    return await buildPackage({ autoDownload });
  } catch (error) {
    handleExportFailure(error);
    return null;
  } finally {
    setDownloadButtonState(false);
  }
}

function handleFieldInput(event) {
  const target = event.target;
  const name = target.dataset.field;
  if (!name) return;

  state.draft[name] = target.value;

  if (name === 'title') {
    applyTitleIdentitySync(target.value);
    updatePreviewFields();
    state.validation.ran = false;
    updateStatusIndicators();
    evaluateStepStatus();
    markDirty(true);
    scheduleAutoSave();
    return;
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

function bindIdentityWiring() {
  const slugInput = findIdentityInput('slug');
  const idInput = findIdentityInput('id');
  const slugLockToggle = el.locks.slug || document.querySelector('[data-lock-toggle="slug"]');
  const idLockToggle = el.locks.id || document.querySelector('[data-lock-toggle="id"]');

  if (slugLockToggle) {
    slugLockToggle.addEventListener('change', (event) => {
      setSlugLock(event.target.checked);
    });
  }

  if (idLockToggle) {
    idLockToggle.addEventListener('change', (event) => {
      setIdLock(event.target.checked);
    });
  }

  if (slugInput) {
    const onSlugInput = () => {
      state.draft.slug = slugInput.value;
      syncIdentityFields();
      normalizeDraft();
      updateIdentityDomFromDraft();
      updatePreviewFields();
      state.validation.ran = false;
      updateStatusIndicators();
      evaluateStepStatus();
      markDirty(true);
      scheduleAutoSave();
    };

    slugInput.addEventListener('input', onSlugInput);
    slugInput.addEventListener('change', onSlugInput);
  }

  if (idInput) {
    const onIdInput = () => {
      state.draft.id = idInput.value;
      syncIdentityFields();
      normalizeDraft();
      updateIdentityDomFromDraft();
      updatePreviewFields();
      state.validation.ran = false;
      updateStatusIndicators();
      evaluateStepStatus();
      markDirty(true);
      scheduleAutoSave();
    };

    idInput.addEventListener('input', onIdInput);
    idInput.addEventListener('change', onIdInput);
  }
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
    syncIdentityFields();
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
    syncIdentityFields();
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
    if (['slug', 'id'].includes(field.dataset.field || '')) return;
    field.addEventListener('input', handleFieldInput);
    field.addEventListener('change', handleFieldInput);
  });

  if (el.systemSelect && !el.systemSelect.dataset.ccgBound) {
    el.systemSelect.dataset.ccgBound = 'true';
    el.systemSelect.addEventListener('focus', () => {
      if (el.systemSelect.options.length <= 1) {
        renderSystemOptions();
      }
    });
  }

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

  el.actions.runChecks?.addEventListener('click', () => {
    runConsistencyChecks();
  });

  el.actions.generateOutput?.addEventListener('click', async () => {
    if (!state.auth.canWrite) return;
    validateDraft();
    renderValidation();
    if (hasBlockingValidationIssues()) return;
    try {
      state.outputs = await buildOutputs();
      window.__ccgLastZipBlob = null;
      setRetryDownloadVisible(false);
      renderOutputs();
      setDownloadBundleEnabled(!state.export.disabled);
      updateStatusIndicators();
    } catch (error) {
      console.error('[CCG-GAME-BUILDER] generateOutput failed', error);
      setErrorIndicator(error.message || 'Output generation failed.');
      setRuntimeState('Output generation failed', 'error');
    }
  });

  el.actions.downloadBundle?.addEventListener('click', async () => {
    if (!state.auth.canWrite) return;
    validateDraft();
    renderValidation();
    if (hasBlockingValidationIssues()) return;
    await runPackageBuild();
  });

  el.actions.retryDownload?.addEventListener('click', () => {
    if (!state.outputs?.entry?.slug || !(window.__ccgLastZipBlob instanceof Blob)) {
      setExportPanelError('No cached ZIP available. Build package first.');
      return;
    }
    try {
      setExportPanelError('');
      attemptBlobDownload(window.__ccgLastZipBlob, getPackageFilename(state.outputs.entry.slug));
      setRetryDownloadVisible(false);
      setExportStateLabel('Complete', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Download retry failed.';
      setExportPanelError(message);
      openExportModal(message, error instanceof Error ? error.stack : '');
      setRetryDownloadVisible(true);
    }
  });

  el.actions.buildPackage?.addEventListener('click', async () => {
    if (!state.auth.canWrite) return;
    validateDraft();
    renderValidation();
    if (hasBlockingValidationIssues()) {
      goToStep(5);
      return;
    }
    state.outputs = await buildOutputs();
    window.__ccgLastZipBlob = null;
    setRetryDownloadVisible(false);
    renderOutputs();
    setDownloadBundleEnabled(!state.export.disabled);
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
      const noticeCount = (state.libraryValidation.infos || []).length;
      const issueLabel = noticeCount ? ` · Legacy notices: ${noticeCount}` : '';
      setLibraryIndicator(`Library: Loaded (${data.length})${issueLabel}`);
      renderSystemOptions();
      console.info(
        '[CCG-GAME-BUILDER] System options:',
        (state.schema?.systems || []).join(', ') || '(fallback)'
      );
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

    return context;
  } catch (error) {
    return { isAuthenticated: false, role: 'none', error };
  }
}

function refreshBootDomRefs() {
  el.email = document.querySelector('[data-editor-email]');
  el.role = document.querySelector('[data-editor-role]');
  el.runtime = document.querySelector('[data-runtime-state]');
  el.draftIndicator = document.querySelector('[data-draft-indicator]');
  el.libraryIndicator = document.querySelector('[data-library-indicator]');
  el.modeIndicator = document.querySelector('[data-mode-indicator]');
  el.validationIndicator = document.querySelector('[data-validation-indicator]');
  el.exportIndicator = document.querySelector('[data-export-indicator]');
  el.errorIndicator = document.querySelector('[data-error-indicator]');
  el.readonlyBadge = document.querySelector('[data-readonly-badge]');
  el.fields = Array.from(document.querySelectorAll('[data-field]'));
  el.steps = Array.from(document.querySelectorAll('[data-step]'));
  el.stepperButtons = Array.from(document.querySelectorAll('[data-step-jump]'));
  el.exportModalClose = Array.from(document.querySelectorAll('[data-export-modal-close]'));
  el.systemSelect = document.querySelector('[data-system-select]');
  el.genreList = document.querySelector('[data-genre-list]');
  el.genreSearch = document.querySelector('[data-genre-search]');
  el.ratingRange = document.querySelector('[data-rating-range]');
  el.ratingOutput = document.querySelector('[data-rating-output]');
  el.load.form = document.querySelector('[data-load-form]');
  el.load.input = document.querySelector('[data-load-input]');
  el.load.button = document.querySelector('[data-action="load-game"]');
  el.load.status = document.querySelector('[data-load-status]');
  el.load.list = document.querySelector('#game-lookup-list');
  el.locks.slug = document.querySelector('[data-lock-toggle="slug"]');
  el.locks.id = document.querySelector('[data-lock-toggle="id"]');

  Object.keys(el.actions).forEach((key) => {
    if (key === 'clearDraft') {
      el.actions.clearDraft = document.querySelectorAll('[data-action="clear-draft"]');
      return;
    }

    const actionName = key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
    el.actions[key] = document.querySelector(`[data-action="${actionName}"]`);
  });
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
    if (hasBlockingValidationIssues()) {
      goToStep(5);
      return;
    }
    state.outputs = await buildOutputs();
    window.__ccgLastZipBlob = null;
    setRetryDownloadVisible(false);
    renderOutputs();
    setDownloadBundleEnabled(!state.export.disabled);
    updateStatusIndicators();
  }

  // Always download (legacy intent).
  await runPackageBuild({ autoDownload: true });
}

async function boot() {
  await whenDomReady();
  refreshBootDomRefs();
  setRuntimeState('Booting', 'info');

  setExportVersionLabels();
  resetExportSteps();
  renderExportWarnings([]);
  renderMissingAssets([]);
  renderExportChecklist(state.outputs);
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

  // PHASE A — immediate wiring (no network/auth awaits)
  state.slugLocked = false;
  state.idLocked = false;
  if (el.locks.slug) el.locks.slug.checked = false;
  if (el.locks.id) el.locks.id.checked = false;

  renderSystemOptions();
  bindEvents();
  bindIdentityWiring();
  loadDraft();
  normalizeDraft();
  updateFormFromDraft();
  updatePreviewFields();
  evaluateStepStatus();
  updateProgress();
  showDraftBanner();
  window.CCGGameBuilder = { loadGameById, loadGameBySlug, downloadFlatPageZip };
  window.ccgRegenerateGameStubs = downloadFlatPageZip;
  window.downloadFlatPageZip = downloadFlatPageZip;

  // PHASE B — async enhancers (non-blocking)
  initAdminNav({ pageLabel: 'CCG Game Builder', active: 'editor' }).catch((error) => {
    console.warn('[CCG-GAME-BUILDER] admin nav init failed', error);
  });

  const libraryPromise = loadLibrary().then(() => {
    renderSystemOptions();
    const params = new URLSearchParams(window.location.search);
    if (params.has('slug')) {
      loadGameBySlug(params.get('slug'));
    } else if (params.has('id')) {
      loadGameById(params.get('id'));
    } else if (state.mode === 'edit' && state.editing?.slug) {
      loadGameBySlug(state.editing.slug);
    }
    return true;
  });

  const authPromise = initAuth().then((context) => {
    applyAuthContext(context, context?.error || null);
    return context;
  });

  setRuntimeState('Library ready · auth pending', 'info');
  libraryPromise.catch(() => {});
  authPromise.catch(() => {});
}

boot().catch((error) => {
  console.error('[CCG-GAME-BUILDER] boot failure', error);
  const message = error instanceof Error ? error.message : 'Unknown error';
  setRuntimeState('Boot failed', 'error');
  setErrorIndicator(`Library: failed to load (${message})`);
});

// Dev verification checklist:
// - [ ] No console errors on load.
// - [ ] Library loads games.json.
// - [ ] System dropdown shows C64/AMIGA.
// - [ ] Title -> slug/id auto-sync works.
// - [ ] Generate Output and Build Package enable when valid.
// - [ ] Owner email gets write access even without user_roles row.
// - [ ] Export ZIP produces UPDATED-games.json, games/{slug}/index.html stub, games/{slug}.html flat page, and sitemap fragment.


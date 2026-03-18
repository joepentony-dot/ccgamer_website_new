const SITE_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';
const FILENAME_ONLY_STORAGE_KEY = 'ccg-games-editor-filename-only-mode';
const THUMBNAIL_BASE_PATH = 'resources/images/thumbnails/all/';
const BOX3D_BASE_PATH = 'resources/images/games/boxes-3d/';
const LANDING_TEMPLATE_PATH = '/admin/templates/game-landing-template.html';
const REDIRECT_TEMPLATE_PATH = '/admin/templates/game-redirect-template.html';

const REQUIRED_GENRE_VALUES = [
  'action adventure',
  'adventure',
  'arcade',
  'casino games',
  'fighting games',
  'horror',
  'miscellaneous',
  'platform',
  'puzzle',
  'racing',
  'role playing',
  'quiz',
  'shooting',
  'sports',
  'strategy'
];

const REQUIRED_COLLECTION_VALUES = ['cartridge', 'licensed', 'banned', 'top picks', 'retro events', 'demo music'];

const EMPTY_DRAFT = {
  title: '',
  system: '',
  year: '',
  slug: '',
  id: '',
  genres: [],
  description: '',
  ccg_rating: 6,
  ccg_rating_reason: '',
  videoId: '',
  collections: [],
  pdf: '',
  disk: '',
  music: '',
  creditsPublisher: '',
  creditsDeveloper: '',
  creditsCoder: '',
  creditsGraphics: '',
  creditsMusic: '',
  creditsReReleaser: '',
  thumbnail: '',
  box3d: '',
  externalLinks: '',
  lemonUrl: '',
  filenameOnlyMode: true,
  jsonExportMode: 'full',
  notifyMembers: false,
  sendTestEmail: false
};

const state = {
  step: 1,
  library: [],
  slugSet: new Set(),
  idSet: new Set(),
  genres: [],
  collections: [],
  packageData: null,
  slugTouched: false,
  idTouched: false,
  draft: { ...EMPTY_DRAFT },
  templates: {
    landing: '',
    redirect: ''
  },
  thumbnailCheck: 'idle',
  musicCheck: 'idle',
  slugManuallyEdited: false,
  siteSettings: {
    facebookAppId: ''
  }
};

const el = {
  topStatus: document.querySelector('[data-top-status]'),
  fetchLibraryButton: document.querySelector('[data-action="fetch-library"]'),
  stepSections: Array.from(document.querySelectorAll('[data-step]')),
  jumpButtons: Array.from(document.querySelectorAll('[data-step-jump]')),
  fields: Array.from(document.querySelectorAll('[data-field]')),
  genreOptions: document.querySelector('[data-genre-options]'),
  collectionOptions: document.querySelector('[data-collection-options]'),
  inlineGenreError: document.querySelector('[data-inline-error="genres"]'),
  inlineCollectionError: document.querySelector('[data-inline-error="collections"]'),
  inlineNewCategoryError: document.querySelector('[data-inline-error="new-category"]'),
  newCategoryInput: document.querySelector('[data-new-category-input]'),
  newCategoryButton: document.querySelector('[data-new-category-button]'),
  step1Errors: document.querySelector('[data-errors-step1]'),
  step2Errors: document.querySelector('[data-errors-step2]'),
  step2Warnings: document.querySelector('[data-warnings-step2]'),
  step3Errors: document.querySelector('[data-errors-step3]'),
  previewEntry: document.querySelector('[data-preview-entry]'),
  previewSitemap: document.querySelector('[data-preview-sitemap]'),
  previewSlug: document.querySelector('[data-preview-slug]'),
  previewThumbnailPath: document.querySelector('[data-preview-thumbnail-path]'),
  previewThumbnailStatus: document.querySelector('[data-preview-thumbnail-status]'),
  previewMusicStatus: document.querySelector('[data-preview-music-status]'),
  previewLandingUrl: document.querySelector('[data-preview-landing-url]'),
  previewRedirectTarget: document.querySelector('[data-preview-redirect-target]'),
  previewRating: document.querySelector('[data-preview-rating]'),
  previewRatingReason: document.querySelector('[data-preview-rating-reason]'),
  previewFileFlat: document.querySelector('[data-preview-file-flat]'),
  previewFileFolder: document.querySelector('[data-preview-file-folder]'),
  previewGamesJsonPath: document.querySelector('[data-preview-games-json-path]'),
  downloadStatus: document.querySelector('[data-download-status]'),
  rebuildAllButton: document.querySelector('[data-action="rebuild-all"]'),
  rebuildStatus: document.querySelector('[data-rebuild-status]'),
  nextButtons: Array.from(document.querySelectorAll('[data-action="next"]')),
  backButtons: Array.from(document.querySelectorAll('[data-action="back"]')),
  downloadButton: document.querySelector('[data-action="download"]'),
  builderButtons: Array.from(document.querySelectorAll('[data-builder-select]')),
  editorSwitchModal: document.querySelector('[data-editor-switch-modal]'),
  editorSwitchCancel: document.querySelector('[data-editor-switch-cancel]'),
  editorSwitchConfirm: document.querySelector('[data-editor-switch-confirm]')
};

init();

async function init() {
  hydrateFilenameOnlyModePreference();
  bindEvents();
  await Promise.all([loadLibrary(), loadTemplates(), loadSiteSettings()]);
  updateDerivedPreviews();
  renderStep();
}

function bindEvents() {
  const handleFieldInput = (event) => {
    const field = event.target.closest('[data-field]');
    if (!field) return;

    const isRadio = field.type === 'radio';
    if (isRadio) {
      if (!field.checked) return;
      state.draft[field.dataset.field] = field.value;
      updateStep1UiState();
      updateDerivedPreviews();
      return;
    }

    if (field.type === 'checkbox') {
      state.draft[field.dataset.field] = field.checked;
      if (field.dataset.field === 'filenameOnlyMode') {
        window.localStorage.setItem(FILENAME_ONLY_STORAGE_KEY, String(field.checked));
        renderWarnings(el.step2Warnings, validateStep2Warnings());
      }
      updateStep1UiState();
      updateDerivedPreviews();
      return;
    }

    const fieldName = field.dataset.field;
    const value = field.value;
    state.draft[fieldName] = value;

    if (fieldName === 'slug') {
      state.slugTouched = Boolean(value.trim());
      state.slugManuallyEdited = true;
      updateStep1UiState();
      updateDerivedPreviews();
      return;
    }

    if (fieldName === 'id') {
      state.idTouched = Boolean(value.trim());
      updateStep1UiState();
      updateDerivedPreviews();
      return;
    }

    if (fieldName === 'title') {
      updateSlugAuto(slugify(value));

      if (!state.idTouched) {
        setFieldValue('id', idify(value));
      }
    }

    if (fieldName === 'ccg_rating') {
      const normalized = normalizeRatingValue(value);
      if (normalized !== value) setFieldValue('ccg_rating', normalized);
    }

    updateStep1UiState();
    updateDerivedPreviews();
  };

  const handleOptionChange = (event) => {
    const option = event.target.closest('[data-option-type]');
    if (!option) return;

    const optionType = option.dataset.optionType;
    const optionValue = option.dataset.optionValue;
    const target = optionType === 'genres' ? 'genres' : 'collections';
    const selected = Array.isArray(state.draft[target]) ? [...state.draft[target]] : [];

    if (option.checked) {
      if (!selected.includes(optionValue)) selected.push(optionValue);
    } else {
      const index = selected.indexOf(optionValue);
      if (index !== -1) selected.splice(index, 1);
    }

    state.draft[target] = selected;
    updateStep1UiState();
    updateDerivedPreviews();
    updateDerivedPreviews();
  };

  document.addEventListener('input', handleFieldInput, true);
  document.addEventListener('change', handleFieldInput, true);
  document.addEventListener('keyup', handleFieldInput, true);
  document.addEventListener('change', handleOptionChange, true);

  el.fields.forEach((field) => {
    field.addEventListener('input', handleFieldInput);
    field.addEventListener('change', handleFieldInput);
    field.addEventListener('keyup', handleFieldInput);
  });

  el.newCategoryButton?.addEventListener('click', () => {
    addNewCategoryEscapeHatch();
  });

  el.newCategoryInput?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addNewCategoryEscapeHatch();
  });

  el.jumpButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const target = Number(button.dataset.stepJump);
      if (target < state.step) {
        state.step = target;
        renderStep();
      }
    });
  });

  el.nextButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (state.step === 1) {
        const errors = validateStep1();
        renderErrors(el.step1Errors, errors);
        if (errors.length) return;
      }
      if (state.step === 2) {
        const errors = validateStep2();
        renderErrors(el.step2Errors, errors);
        if (errors.length) return;
      }
      if (state.step === 3) {
        const errors = validateStep3();
        renderErrors(el.step3Errors, errors);
        if (errors.length) return;
      }
      state.step = Math.min(4, state.step + 1);
      renderStep();
    });
  });

  el.fetchLibraryButton?.addEventListener('click', async () => {
    await loadLibrary(true);
  });

  el.rebuildAllButton?.addEventListener('click', async () => {
    try {
      const response = await fetch('/admin/api/rebuild-games', { method: 'POST' });
      if (response.ok) {
        setRebuildStatus('Rebuild request sent successfully.', false);
        return;
      }
      setRebuildStatus('Could not run rebuild from browser. Run in terminal: node scripts/rebuild-games.js', true);
    } catch (error) {
      setRebuildStatus('Could not run rebuild from browser. Run in terminal: node scripts/rebuild-games.js', true);
    }
  });


  el.backButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.step = Math.max(1, state.step - 1);
      renderStep();
    });
  });

  el.downloadButton?.addEventListener('click', async () => {
    const errors = validateAll();
    if (errors.length) {
      setDownloadStatus('Fix validation errors before download.', true);
      state.step = 1;
      renderErrors(el.step1Errors, validateStep1());
      renderStep();
      return;
    }

    try {
      const requiredFileCheck = await validateRequiredFiles();
      if (!requiredFileCheck.ok) {
        setDownloadStatus(requiredFileCheck.message, true);
        return;
      }

      const packageData = buildPackageData();
      await downloadZip(packageData);
      setDownloadStatus('Download started successfully.', false);

      if (packageData.notifyMembers || packageData.sendTestEmail) {
        setDownloadStatus('Download started. Coming Soon notifications are retired. Send announcements after deploy from /admin/announce.html.', false, true);
      }
    } catch (error) {
      setDownloadStatus(`Download failed: ${error.message}`, true);
    }
  });

  el.builderButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.builderSelect !== 'retro') return;
      setEditorSwitchModal(true);
    });
  });

  el.editorSwitchCancel?.addEventListener('click', () => {
    setEditorSwitchModal(false);
  });

  el.editorSwitchConfirm?.addEventListener('click', () => {
    clearDraft();
    window.location.href = '/admin/retro-events-editor.html';
  });

  updateStep1UiState();
}

function addNewCategoryEscapeHatch() {
  if (el.newCategoryInput) el.newCategoryInput.value = '';
  setNewCategoryError('Custom categories are disabled. Use the supported genre list only.');
}

function clearDraft() {
  state.draft = { ...EMPTY_DRAFT };
  state.slugTouched = false;
  state.idTouched = false;
  state.slugManuallyEdited = false;
  state.step = 1;
  el.fields.forEach((field) => {
    if (field.type === 'radio') {
      field.checked = field.value === 'full';
      return;
    }
    if (field.type === 'checkbox') {
      if (field.dataset.field === 'filenameOnlyMode') {
        field.checked = true;
        state.draft.filenameOnlyMode = true;
        window.localStorage.setItem(FILENAME_ONLY_STORAGE_KEY, 'true');
      } else {
        field.checked = false;
      }
      return;
    }
    field.value = '';
  });
  markOptionChecked('genres', []);
  markOptionChecked('collections', []);
  if (el.newCategoryInput) el.newCategoryInput.value = '';
  setNewCategoryError('');
  renderInlineStep1Errors();
  renderErrors(el.step1Errors, []);
  updateStep1UiState();
  renderErrors(el.step2Errors, []);
  renderWarnings(el.step2Warnings, []);
  renderErrors(el.step3Errors, []);
  setDownloadStatus('');
  renderStep();
}

function setEditorSwitchModal(visible) {
  if (!el.editorSwitchModal) return;
  el.editorSwitchModal.hidden = !visible;
}

async function loadLibrary(triggeredByUser = false) {
  if (el.fetchLibraryButton) {
    el.fetchLibraryButton.disabled = true;
  }
  if (triggeredByUser) {
    el.topStatus.textContent = 'Fetching live games.json…';
    el.topStatus.className = 'status';
  }

  try {
    const response = await fetch('../games/games.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Could not load games.json (${response.status})`);
    }

    const data = await response.json();
    state.library = Array.isArray(data) ? data : [];

    state.slugSet = new Set(state.library.map((game) => String(game.slug || '').toLowerCase()).filter(Boolean));
    state.idSet = new Set(state.library.map((game) => String(game.id || '').toLowerCase()).filter(Boolean));

    state.genres = deriveAllowedValuesFromLibrary(state.library, 'genres', REQUIRED_GENRE_VALUES);
    state.collections = deriveAllowedValuesFromLibrary(state.library, 'collections', REQUIRED_COLLECTION_VALUES);

    renderOptionList(el.genreOptions, 'genres', state.genres);
    renderOptionList(el.collectionOptions, 'collections', state.collections);

    el.topStatus.textContent = `Loaded ${state.library.length} games. Duplicate checks enabled.`;
    el.topStatus.className = 'status ok';
  } catch (error) {
    state.library = [];
    state.slugSet = new Set();
    state.idSet = new Set();
    state.genres = [];
    state.collections = [];
    renderOptionList(el.genreOptions, 'genres', []);
    renderOptionList(el.collectionOptions, 'collections', []);
    el.topStatus.textContent = `Warning: ${error.message}. You can continue, but duplicate checks and category hydration are unavailable.`;
    el.topStatus.className = 'status error';
  }

  if (el.fetchLibraryButton) {
    el.fetchLibraryButton.disabled = false;
  }

  updateStep1UiState();
}

function renderStep() {
  el.stepSections.forEach((section) => {
    section.hidden = Number(section.dataset.step) !== state.step;
  });

  el.jumpButtons.forEach((button) => {
    button.dataset.active = Number(button.dataset.stepJump) === state.step ? 'true' : 'false';
  });

  if (state.step === 2) {
    renderWarnings(el.step2Warnings, validateStep2Warnings());
  }

  if (state.step === 3 || state.step === 4) {
    const errors = validateStep3();
    renderErrors(el.step3Errors, errors);
    if (!errors.length) {
      const packageData = buildPackageData();
      state.packageData = packageData;
      el.previewEntry.textContent = packageData.gamesJsonOutput;
      el.previewSitemap.textContent = packageData.sitemap;
      el.previewFileFlat.textContent = `games/${state.draft.slug}.html`;
      el.previewFileFolder.textContent = `games/${state.draft.slug}/index.html`;
      if (el.previewGamesJsonPath) {
        el.previewGamesJsonPath.textContent = state.draft.jsonExportMode === 'full'
          ? 'games/games.json (full merged file)'
          : 'games/games.json (new entry only array)';
      }
    }
  }
}

function validateAll() {
  return [...validateStep1(), ...validateStep2(), ...validateStep3()];
}

function validateStep1() {
  const errors = [];
  const required = [
    ['title', 'Title is required.'],
    ['system', 'System is required.'],
    ['year', 'Year is required.'],
    ['slug', 'Slug is required.'],
    ['id', 'ID is required.'],
    ['description', 'Description is required.'],
    ['ccg_rating', 'CCG Rating is required.']
  ];

  required.forEach(([key, message]) => {
    if (!String(state.draft[key] || '').trim()) errors.push(message);
  });

  if (state.draft.system && !['C64', 'AMIGA'].includes(state.draft.system)) {
    errors.push('System must be C64 or AMIGA.');
  }

  if (state.draft.year && !/^\d+$/.test(String(state.draft.year).trim())) {
    errors.push('Year must be numeric.');
  }

  const year = Number(state.draft.year);
  if (state.draft.year && (year < 1970 || year > 2100)) {
    errors.push('Year must be between 1970 and 2100.');
  }

  const rating = Number(state.draft.ccg_rating);
  if (!Number.isInteger(rating) || rating < 0 || rating > 10) {
    errors.push('CCG Rating must be an integer between 0 and 10.');
  }


  const slug = String(state.draft.slug || '').trim().toLowerCase();
  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    errors.push('Slug must be lowercase kebab-case.');
  }

  const id = String(state.draft.id || '').trim().toLowerCase();
  if (id && !/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(id)) {
    errors.push('ID must be lowercase snake_case.');
  }

  if (slug && state.slugSet.has(slug)) errors.push('Slug already exists in games.json.');
  if (id && state.idSet.has(id)) errors.push('ID already exists in games.json.');

  if (!String(state.draft.creditsPublisher || '').trim()) {
    errors.push('Publisher is required.');
  }

  if (!Array.isArray(state.draft.genres) || state.draft.genres.length === 0) {
    errors.push('At least one genre is required.');
  }

  const invalidGenres = state.draft.genres.filter((value) => !state.genres.includes(value));
  if (invalidGenres.length) {
    errors.push(`Unknown genre value(s): ${invalidGenres.join(', ')}`);
  }

  const invalidCollections = state.draft.collections.filter((value) => !state.collections.includes(value));
  if (invalidCollections.length) {
    errors.push(`Unknown collection value(s): ${invalidCollections.join(', ')}`);
  }

  if (state.draft.pdf && !isValidUrl(state.draft.pdf)) {
    errors.push('PDF link must be a valid URL.');
  }

  const seoTitle = buildSeoTitleFromDraft();
  const seoDescription = buildSeoDescriptionFromDraft();
  if (seoTitle.length > 68) errors.push('SEO title is too long (target: 68 chars max).');
  if (seoTitle.length < 30) errors.push('SEO title is too short (target: 30+ chars).');
  if (seoDescription.length > 170) errors.push('Meta description is too long (target: 170 chars max).');
  if (seoDescription.length < 70) errors.push('Meta description is too short (target: 70+ chars).');

  renderInlineStep1Errors(errors);
  return errors;
}

function validateStep2() {
  const errors = [];
  if (!String(state.draft.thumbnail || '').trim()) {
    errors.push('Thumbnail is required.');
  }

  parseLines(state.draft.disk).forEach((url) => {
    if (!isValidUrl(url)) errors.push(`Invalid disk URL: ${url}`);
  });

  parseLines(state.draft.externalLinks).forEach((url) => {
    if (!isValidUrl(url)) errors.push(`Invalid external link URL: ${url}`);
  });

  const lemonUrl = String(state.draft.lemonUrl || '').trim();
  if (lemonUrl && !isValidUrl(lemonUrl)) errors.push('Lemon64 URL must be a valid URL.');

  return errors;
}

async function fileExists(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch (error) {
    return false;
  }
}

async function validateRequiredFiles() {
  const slug = String(state.draft.slug || '').trim();
  if (!slug) return { ok: false, message: 'Slug is required before file validation.' };

  const thumbnailUrl = `/resources/images/thumbnails/all/${slug}.jpg`;
  const thumbnailOk = await fileExists(thumbnailUrl);
  if (!thumbnailOk) {
    return { ok: false, message: `Missing required thumbnail: ${thumbnailUrl}` };
  }

  return { ok: true };
}

function validateStep2Warnings() {
  const warnings = [];
  const thumbnailRaw = String(state.draft.thumbnail || '').trim();
  const box3dRaw = String(state.draft.box3d || '').trim();

  if (state.draft.filenameOnlyMode) {
    if (thumbnailRaw && !isLikelyFullPath(thumbnailRaw) && !/\.(?:png|jpe?g)$/i.test(thumbnailRaw)) {
      warnings.push('Thumbnail filename should include .png, .jpg, or .jpeg in filename-only mode.');
    }

    if (box3dRaw && !isLikelyFullPath(box3dRaw) && /\.[a-z0-9]+$/i.test(box3dRaw) && !/\.webp$/i.test(box3dRaw)) {
      warnings.push('3D box filename uses a non-.webp extension; .webp is recommended in filename-only mode.');
    }
  } else {
    if (thumbnailRaw && !/\.(?:png|jpe?g|webp|gif)$/i.test(thumbnailRaw)) {
      warnings.push('Thumbnail path appears to be missing an extension.');
    }

    if (box3dRaw && /\.[a-z0-9]+$/i.test(box3dRaw) && !/\.webp$/i.test(box3dRaw)) {
      warnings.push('3D box path uses a non-.webp extension.');
    }
  }

  return warnings;
}


function buildSeoHooksFromDraft() {
  const hooks = ['Game Info'];
  if (String(state.draft.pdf || '').trim()) hooks.push('Manual');
  if (String(state.draft.videoId || '').trim()) hooks.push('Video');
  if (String(state.draft.ccg_rating_reason || '').trim().length >= 20) hooks.unshift('Review');
  return hooks;
}

function joinSeoHooks(hooks) {
  if (!hooks.length) return 'Game Info';
  if (hooks.length === 1) return hooks[0];
  if (hooks.length === 2) return `${hooks[0]} & ${hooks[1]}`;
  return `${hooks.slice(0, -1).join(', ')} & ${hooks[hooks.length - 1]}`;
}

function normalizeSeoPlatformLabel(system) {
  return String(system || '').trim().toUpperCase() === 'AMIGA' ? 'Amiga' : 'Commodore 64';
}

function buildSeoTitleFromDraft() {
  const title = String(state.draft.title || '').trim();
  const platform = normalizeSeoPlatformLabel(state.draft.system);
  const hooks = joinSeoHooks(buildSeoHooksFromDraft());
  return `${title} (${platform}) – ${hooks}`;
}

function buildSeoDescriptionFromDraft() {
  const title = String(state.draft.title || '').trim();
  const platform = normalizeSeoPlatformLabel(state.draft.system);
  const existing = cleanForHtml(String(state.draft.description || '').trim());
  if (existing) return existing;

  const hooks = buildSeoHooksFromDraft();
  const bits = [];
  if (hooks.includes('Manual')) bits.push('manual access');
  if (hooks.includes('Video')) bits.push('gameplay video');
  const bitsPart = bits.length ? `, including ${bits.join(' and ')}` : '';
  return `${title} on ${platform}${bitsPart}, plus full game information.`;
}
function validateStep3() {
  const errors = [];
  try {
    buildPackageData();
  } catch (error) {
    errors.push(`Preview could not be generated: ${error.message}`);
  }
  return errors;
}

function buildPackageData() {
  const slug = state.draft.slug.trim();
  const id = state.draft.id.trim();
  const title = state.draft.title.trim();
  const gameUrl = `${SITE_ORIGIN}/games/${encodeURIComponent(slug)}/`;
  const seoTitle = buildSeoTitleFromDraft();
  const seoDescription = buildSeoDescriptionFromDraft();
  const system = state.draft.system.trim();
  const year = Number(state.draft.year);

  const credits = buildStructuredCredits();
  const gameEntry = {
    system,
    id,
    slug,
    title,
    sorttitle: title,
    year,
    genres: [...state.draft.genres],
    collections: [...state.draft.collections].filter((value) => value !== 'retro events'),
    videoid: state.draft.videoId.trim(),
    // Filename-only logic: keep full-path storage in output while allowing shorthand input in the editor UI.
    thumbnail: normalizeThumbnailPath(state.draft.thumbnail, slug),
    music: parseCommaList(state.draft.music),
    pdf: state.draft.pdf.trim() || '',
    disk: parseLines(state.draft.disk),
    lemon: buildLemonLinks(state.draft.lemonUrl, state.draft.externalLinks),
    description: state.draft.description.trim(),
    ccg_rating: Number(state.draft.ccg_rating),
    ccg_rating_reason: state.draft.ccg_rating_reason.trim(),
    credits,
    _ccg_enforced: false,
    _ccg_migrated: false
  };

  entryLemonDeduplicate(gameEntry);

  if (!Array.isArray(gameEntry.music) || gameEntry.music.length === 0) {
    delete gameEntry.music;
  }

  const normalizedBox3dPath = normalizeBox3dPath(state.draft.box3d, slug);

  const schemaErrors = validateGameEntrySchema(gameEntry);
  if (schemaErrors.length) {
    throw new Error(schemaErrors.join(' | '));
  }

  const publisherForSeo = credits.publisher?.[0] || 'Cheeky Commodore Gamer';
  const imagePath = gameEntry.thumbnail || 'resources/images/thumbnails/all/default.jpg';
  const imageUrl = imagePath.startsWith('http') ? imagePath : `${SITE_ORIGIN}/${imagePath.replace(/^\/+/, '')}`;

  const templateVars = buildTemplateVars({ slug, title, year, system, publisherForSeo, imagePath, seoDescription });
  const flatSeoStub = renderTemplate(state.templates.redirect, templateVars);
  const folderRedirect = renderTemplate(state.templates.landing, templateVars);

  const mergedGames = mergeGamesJson(gameEntry, state.library);
  const gamesJsonOutput = state.draft.jsonExportMode === 'full'
    ? `${JSON.stringify(mergedGames, null, 2)}\n`
    : `${JSON.stringify([gameEntry], null, 2)}\n`;

  // Sitemap logic replacement: always build a complete sitemap-games.xml from games.json data.
  const sitemap = buildFullGamesSitemap(mergedGames);
  const gamesIndex = buildGamesIndex(mergedGames);
  const gamesSearch = buildGamesSearch(mergedGames);

  const readme = [
    'CCG Game Package',
    '================',
    '',
    'Copy files from this ZIP into the repo:',
    '- games/games.json',
    `- games/${slug}.html`,
    `- games/${slug}/index.html`,
    '- sitemap-games.xml',
    '- games/games-index.json',
    '- games/games-search.json',
    '- music/index.html and /music/*.html (via node scripts/build-games.js)',
    '- sitemap-pages.xml (via node scripts/generate-sitemaps.js)',
    '',
    'games.json instructions:',
    '- If you exported FULL games.json: replace /games/games.json in the repo with this file.',
    '- If you exported ENTRY ONLY: copy the single object into /games/games.json manually in sort order.',
    '',
    'Then run after merging files:',
    '- node scripts/build-games.js',
    '- node scripts/generate-sitemaps.js',
    '',
    'sitemap-games.xml:',
    '- Full upload-ready sitemap generated directly from games.json.',
    '- Upload as-is with no post-processing required.'
  ].join('\n');

  return {
    slug,
    id,
    notifyMembers: Boolean(state.draft.notifyMembers),
    sendTestEmail: Boolean(state.draft.sendTestEmail),
    gameEntry,
    mergedGames,
    gamesJsonOutput,
    flatSeoStub,
    folderRedirect,
    sitemap,
    gamesIndex,
    gamesSearch,
    readme,
    normalizedBox3dPath
  };
}


async function loadTemplates() {
  const [landing, redirect] = await Promise.all([
    fetchTemplate(LANDING_TEMPLATE_PATH),
    fetchTemplate(REDIRECT_TEMPLATE_PATH)
  ]);
  state.templates.landing = landing;
  state.templates.redirect = redirect;
}

async function fetchTemplate(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Could not load template: ${path}`);
  return response.text();
}

function buildTemplateVars({ slug, title, year, system, publisherForSeo, imagePath, seoDescription }) {
  return {
    GAME_NAME: cleanForHtml(title),
    YEAR: String(year),
    PUBLISHER: cleanForHtml(publisherForSeo),
    PLATFORM: cleanForHtml(system),
    SLUG: cleanForHtml(slug),
    THUMBNAIL: cleanForHtml(imagePath).replace(/^\/+/, ''),
    THUMBNAIL_FILENAME: cleanForHtml(extractFilename(imagePath)),
    DESCRIPTION: cleanForHtml(seoDescription),
    FB_APP_ID_META: buildFacebookAppIdMeta(state.siteSettings.facebookAppId)
  };
}


function extractFilename(pathValue) {
  const value = String(pathValue || '').trim().replace(/\?.*$/, '');
  if (!value) return 'default.jpg';
  const segments = value.split('/').filter(Boolean);
  return segments[segments.length - 1] || 'default.jpg';
}

function entryLemonDeduplicate(entry) {
  if (!entry || !Array.isArray(entry.lemon)) return;
  entry.lemon = [...new Set(entry.lemon)];
}

function buildLemonLinks(lemonUrl, externalLinks) {
  const links = [];
  const lemon = String(lemonUrl || '').trim();
  if (lemon) links.push(lemon);
  parseLines(externalLinks).forEach((link) => {
    if (!links.includes(link)) links.push(link);
  });
  return [...new Set(links)];
}

async function fetchLemonData() {
  const url = String(state.draft.lemonUrl || '').trim();

  if (!url.includes('lemon64.com')) {
    window.alert('Please enter a valid Lemon64 URL.');
    return;
  }

  try {
    const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
    const data = await response.json();
    const parser = new DOMParser();
    const doc = parser.parseFromString(data.contents || '', 'text/html');

    const title =
      safeText(doc.querySelector('h1')) ||
      safeText(doc.querySelector('.game-title'));
    const year = safeText(doc.querySelector('.release-year')).replace(/\D/g, '');
    const publisher =
      safeText(doc.querySelector("a[href*='/publisher/']")) ||
      safeText(doc.querySelector('.gamepublisher'));
    const coder =
      safeText(doc.querySelector("a[href*='/person/']")) ||
      safeText(doc.querySelector('.gamecoder'));
    const musician = readLemonText(doc, ["a[href*='/musician/']", "a[href*='/musician']", '.musician a']);
    const graphics = readLemonText(doc, ['.graphics a', "a[href*='/graphics/']"]);
    const genre = readLemonText(doc, ["a[href*='/genre/']", '.genre a']);

    if (title) setFieldValue('title', title);
    if (year) setFieldValue('year', year);
    if (publisher) setFieldValue('creditsPublisher', publisher);
    if (coder) setFieldValue('creditsCoder', coder);
    if (musician) setFieldValue('creditsMusic', musician);
    if (graphics) setFieldValue('creditsGraphics', graphics);

    if (genre) {
      const normalizedGenre = mapLegacyCategoryValue(genre, 'genres');
      if (normalizedGenre && state.genres.includes(normalizedGenre)) {
        state.draft.genres = [normalizedGenre];
        markOptionChecked('genres', state.draft.genres);
      }
    }

    if (title) updateSlugAuto(slugify(title));
    if (!state.idTouched && title) setFieldValue('id', idify(title));

    updateStep1UiState();
    updateDerivedPreviews();
  } catch (error) {
    console.error(error);
    window.alert('Could not fetch Lemon64 data.');
  }
}

function safeText(el) {
  return el ? el.innerText.trim() : '';
}

function readLemonText(doc, selectors) {
  for (const selector of selectors) {
    const node = doc.querySelector(selector);
    if (node && node.textContent) {
      const value = node.textContent.trim();
      if (value) return value;
    }
  }
  return '';
}

window.fetchLemonData = fetchLemonData;

function renderTemplate(template, vars) {
  let output = String(template || '');
  Object.entries(vars).forEach(([key, value]) => {
    output = output.replaceAll(`{{${key}}}`, value);
  });
  return output;
}

function buildGamesIndex(games) {
  const payload = (Array.isArray(games) ? games : []).map((game) => ({
    slug: game.slug || '',
    title: game.title || '',
    sorttitle: game.sorttitle || game.title || '',
    year: Number(game.year) || 0,
    system: game.system || '',
    thumbnail: game.thumbnail || '',
    genres: Array.isArray(game.genres) ? game.genres : [],
    collections: Array.isArray(game.collections) ? game.collections : []
  }));
  return JSON.stringify(payload, null, 2);
}

function buildGamesSearch(games) {
  const toList = (value) => (Array.isArray(value) ? value : (value ? [value] : []));
  const canonicalComposer = (value) => {
    const key = String(value || '').trim().replace(/\s+/g, ' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const map = {
      'rob hubbard': 'Rob Hubbard', 'r hubbard': 'Rob Hubbard', 'martin galway': 'Martin Galway', 'ben daglish': 'Ben Daglish',
      'matt gray': 'Matt Gray', 'matthew del gray': 'Matt Gray', 'david whittaker': 'David Whittaker', 'jeroen tel': 'Jeroen Tel',
      'fred gray': 'Fred Gray', 'chris huelsbeck': 'Chris Hülsbeck', 'chris hulsbeck': 'Chris Hülsbeck', 'chris hülsbeck': 'Chris Hülsbeck', 'christopher hülsbeck': 'Chris Hülsbeck'
    };
    return map[key] || (key ? key.replace(/\b\w/g, (char) => char.toUpperCase()) : '');
  };
  const normalizeComposerList = (game) => {
    const seen = new Set();
    return [...toList(game.composer), ...toList(game?.credits?.musician), ...toList(game.music)]
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .filter((name) => !/\.mp3$/i.test(name))
      .map(canonicalComposer)
      .filter(Boolean)
      .filter((name) => {
        const key = name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  };

  const payload = (Array.isArray(games) ? games : []).map((game) => ({
    slug: game.slug || '',
    title: game.title || '',
    sorttitle: game.sorttitle || game.title || '',
    system: game.system || '',
    year: Number(game.year) || 0,
    publisher: toList(game.publisher || game?.credits?.publisher),
    genre: Array.isArray(game.genres) ? game.genres : [],
    genres: Array.isArray(game.genres) ? game.genres : [],
    composer: normalizeComposerList(game),
    music: Array.isArray(game.music) ? game.music : (game.music ? [game.music] : [])
  }));
  return JSON.stringify(payload, null, 2);
}

function updateDerivedPreviews() {
  const slug = String(state.draft.slug || '').trim();
  const thumbnailPath = normalizeThumbnailPath(state.draft.thumbnail, slug || 'game-slug');
  if (el.previewSlug) el.previewSlug.textContent = slug || '—';
  if (el.previewThumbnailPath) el.previewThumbnailPath.textContent = thumbnailPath;
  if (el.previewLandingUrl) el.previewLandingUrl.textContent = `/games/${slug || '[slug]'}/`;
  if (el.previewRedirectTarget) el.previewRedirectTarget.textContent = `/games/${slug || '[slug]'}/`;
  if (el.previewThumbnailStatus) {
    el.previewThumbnailStatus.textContent = thumbnailPath ? `Will store: ${thumbnailPath}` : 'No thumbnail set.';
  }
  if (el.previewMusicStatus) {
    el.previewMusicStatus.textContent = slug ? `Auto-detect on page: /resources/audio/games/${slug}.mp3` : 'Music auto-detection requires a slug.';
  }
}

function mergeGamesJson(newEntry, library) {
  const existing = Array.isArray(library) ? library.map((item) => ({ ...item })) : [];
  existing.push(newEntry);

  return existing.sort((a, b) => {
    const left = String(a.sorttitle || a.title || a.slug || a.id || '').toLowerCase();
    const right = String(b.sorttitle || b.title || b.slug || b.id || '').toLowerCase();
    return left.localeCompare(right, 'en', { numeric: true, sensitivity: 'base' });
  });
}

async function downloadZip(packageData) {
  if (!window.JSZip) {
    throw new Error('JSZip is not available.');
  }

  const zip = new window.JSZip();
  zip.file('games/games.json', packageData.gamesJsonOutput);
  zip.file(`games/${packageData.slug}.html`, `${packageData.flatSeoStub}\n`);
  zip.file(`games/${packageData.slug}/index.html`, `${packageData.folderRedirect}\n`);
  zip.file('sitemap-games.xml', `${packageData.sitemap}\n`);
  zip.file('games/games-index.json', `${packageData.gamesIndex}\n`);
  zip.file('games/games-search.json', `${packageData.gamesSearch}\n`);
  zip.file('README.txt', `${packageData.readme}\n`);

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${packageData.slug}-game-package.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function maybeSendNewGameNotifications(packageData) {
  if (!packageData?.notifyMembers && !packageData?.sendTestEmail) return;
  setDownloadStatus(
    'Coming Soon notifications are retired. Export completed; after deploy, send announcements from /admin/announce.html.',
    false,
    true
  );
}


function renderErrors(node, errors) {
  if (!node) return;
  if (!errors.length) {
    node.hidden = true;
    node.innerHTML = '';
    return;
  }
  node.hidden = false;
  node.innerHTML = errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('');
}

function renderWarnings(node, warnings) {
  if (!node) return;
  if (!warnings.length) {
    node.hidden = true;
    node.innerHTML = '';
    return;
  }
  node.hidden = false;
  node.innerHTML = warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('');
}

function setDownloadStatus(message, isError = false, isWarning = false) {
  if (!el.downloadStatus) return;
  el.downloadStatus.textContent = message;
  if (isWarning) {
    el.downloadStatus.className = 'status';
    return;
  }
  el.downloadStatus.className = `status ${isError ? 'error' : 'ok'}`;
}

function renderInlineStep1Errors(step1Errors = []) {
  const hasGenres = Array.isArray(state.draft.genres) && state.draft.genres.length > 0;
  if (el.inlineGenreError) {
    el.inlineGenreError.textContent = hasGenres ? '' : 'Select at least one genre.';
  }

  const invalidCollections = state.draft.collections.filter((value) => !state.collections.includes(value));
  if (el.inlineCollectionError) {
    if (invalidCollections.length) {
      el.inlineCollectionError.textContent = 'Collections include an invalid value.';
    } else if (step1Errors.includes('CCG Rating must be an integer between 0 and 10.')) {
      el.inlineCollectionError.textContent = '';
    } else {
      el.inlineCollectionError.textContent = '';
    }
  }
}

function setNewCategoryError(message) {
  if (!el.inlineNewCategoryError) return;
  el.inlineNewCategoryError.textContent = message;
}

function renderOptionList(container, optionType, values, labels = {}) {
  if (!container) return;
  container.innerHTML = values
    .map((value) => {
      const id = `${optionType}-${value.replaceAll(' ', '-')}`;
      const label = labels[value] || toReadableLabel(value);
      return `<label class="chip-item" for="${id}"><input type="checkbox" id="${id}" data-option-type="${optionType}" data-option-value="${escapeHtml(value)}"><span>${escapeHtml(label)}</span></label>`;
    })
    .join('');

  const selected = optionType === 'genres' ? state.draft.genres : state.draft.collections;
  markOptionChecked(optionType, selected);
}

function markOptionChecked(optionType, values) {
  const selected = new Set(Array.isArray(values) ? values : []);
  document.querySelectorAll(`[data-option-type="${optionType}"]`).forEach((input) => {
    input.checked = selected.has(input.dataset.optionValue);
  });
}


function updateSlugAuto(newSlug) {
  if (!state.slugManuallyEdited) {
    setFieldValue('slug', newSlug);
    state.slugTouched = Boolean(String(newSlug || '').trim());
  }
}

function buildFacebookAppIdMeta(appId) {
  const value = String(appId || '').trim();
  if (!value) return '';
  return `<meta property="fb:app_id" content="${cleanForHtml(value)}">`;
}

async function loadSiteSettings() {
  try {
    const response = await fetch('/admin/site-settings.json', { cache: 'no-store' });
    if (!response.ok) return;
    const json = await response.json();
    state.siteSettings.facebookAppId = String(json.facebookAppId || '').trim();
  } catch (error) {
    state.siteSettings.facebookAppId = '';
  }
}

function setFieldValue(fieldName, value) {
  state.draft[fieldName] = value;
  const field = document.querySelector(`[data-field="${fieldName}"]`);
  if (field && field.value !== value) {
    field.value = value;
  }
}

function deriveAllowedValuesFromLibrary(library, key, allowedValues) {
  const normalizedAllowed = new Set(allowedValues);
  const discovered = new Set();

  library.forEach((game) => {
    const values = Array.isArray(game[key]) ? game[key] : [];
    values.forEach((value) => {
      const mapped = mapLegacyCategoryValue(value, key);
      if (mapped && normalizedAllowed.has(mapped)) discovered.add(mapped);
    });
  });

  if (key === 'collections') discovered.add('retro events');

  return allowedValues.filter((value) => discovered.has(value));
}

function mapLegacyCategoryValue(value, key) {
  const token = String(value || '').trim().toLowerCase();
  if (!token) return '';

  if (key === 'genres') {
    const genreMap = {
      'action adventure': 'action adventure',
      'action-adventure': 'action adventure',
      adventure: 'adventure',
      arcade: 'arcade',
      'casino games': 'casino games',
      casino: 'casino games',
      'fighting games': 'fighting games',
      fighting: 'fighting games',
      horror: 'horror',
      miscellaneous: 'miscellaneous',
      platform: 'platform',
      puzzle: 'puzzle',
      racing: 'racing',
      'role playing': 'role playing',
      'role-playing': 'role playing',
      quiz: 'quiz',
      shooting: 'shooting',
      sports: 'sports',
      strategy: 'strategy'
    };
    return genreMap[token] || '';
  }

  const collectionMap = {
    cartridge: 'cartridge',
    licensed: 'licensed',
    banned: 'banned',
    bpjs: 'banned',
    'top picks': 'top picks',
    'top-picks': 'top picks',
    'retro events': 'retro events',
    'retro-events': 'retro events',
    'demo music': 'demo music',
    'demo-music': 'demo music',
    'demo_music': 'demo music'
  };
  return collectionMap[token] || '';
}

function toReadableLabel(value) {
  return String(value || '')
    .split(' ')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function parseLines(value) {
  return String(value || '')
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function setRebuildStatus(message, isError = false) {
  if (!el.rebuildStatus) return;
  el.rebuildStatus.textContent = message;
  el.rebuildStatus.className = `status ${isError ? 'error' : 'ok'}`;
}

function parseCommaList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildStructuredCredits() {
  return {
    publisher: parseCommaList(state.draft.creditsPublisher),
    developer: parseCommaList(state.draft.creditsDeveloper),
    producer: '',
    coder: parseCommaList(state.draft.creditsCoder),
    graphics: parseCommaList(state.draft.creditsGraphics),
    musician: parseCommaList(state.draft.creditsMusic),
    re_releaser: parseCommaList(state.draft.creditsReReleaser)
  };
}

function validateGameEntrySchema(gameEntry) {
  const errors = [];
  const requiredOrder = [
    'system', 'id', 'slug', 'title', 'sorttitle', 'year', 'genres', 'collections',
    'videoid', 'thumbnail', 'music', 'pdf', 'disk', 'lemon', 'description', 'ccg_rating',
    'ccg_rating_reason', 'credits', '_ccg_enforced', '_ccg_migrated'
  ];

  const keys = Object.keys(gameEntry || {});
  const expectedOrder = Array.isArray(gameEntry?.music) ? requiredOrder : requiredOrder.filter((key) => key !== 'music');
  if (keys.length !== expectedOrder.length || expectedOrder.some((key, index) => keys[index] !== key)) {
    errors.push('Game object keys must match the hard-locked schema order exactly.');
  }

  if (typeof gameEntry.system !== 'string' || !gameEntry.system.trim()) errors.push('system must be a non-empty string.');
  if (typeof gameEntry.id !== 'string' || !/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(gameEntry.id)) errors.push('id must be snake_case.');
  if (typeof gameEntry.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(gameEntry.slug)) errors.push('slug must be kebab-case.');
  if (typeof gameEntry.title !== 'string' || !gameEntry.title.trim()) errors.push('title must be a non-empty string.');
  if (typeof gameEntry.sorttitle !== 'string') errors.push('sorttitle must be a string.');
  if (!Number.isInteger(gameEntry.year)) errors.push('year must be an integer.');
  if (!Array.isArray(gameEntry.genres)) errors.push('genres must be an array.');
  if (!Array.isArray(gameEntry.collections)) errors.push('collections must be an array.');
  if (gameEntry.collections.includes('retro events')) errors.push('retro events cannot be written to games.json output.');
  if (typeof gameEntry.videoid !== 'string' || !gameEntry.videoid.trim()) errors.push('videoid must be a non-empty string.');
  if (typeof gameEntry.thumbnail !== 'string' || !/^resources\/images\/thumbnails\/all\/.+\.(?:png|jpg|jpeg|webp|gif)$/i.test(gameEntry.thumbnail)) {
    errors.push('thumbnail must be resources/images/thumbnails/all/<file>.<ext>.');
  }
  if ('music' in gameEntry) {
    if (!Array.isArray(gameEntry.music)) {
      errors.push('music must be an array when provided.');
    } else if (gameEntry.music.some((track) => typeof track !== 'string' || !track.trim())) {
      errors.push('music must contain non-empty filename strings.');
    }
  }
  if (typeof gameEntry.pdf !== 'string') errors.push('pdf must be a string.');
  if (!Array.isArray(gameEntry.disk)) errors.push('disk must be an array.');
  if (!Array.isArray(gameEntry.lemon)) errors.push('lemon must be an array.');
  if (typeof gameEntry.description !== 'string') errors.push('description must be a string.');
  if (!Number.isInteger(gameEntry.ccg_rating) || gameEntry.ccg_rating < 0 || gameEntry.ccg_rating > 10) errors.push('ccg_rating must be an integer from 0 to 10.');
  if (typeof gameEntry.ccg_rating_reason !== 'string') errors.push('ccg_rating_reason must be a string.');

  const creditKeys = ['publisher', 'developer', 'producer', 'coder', 'graphics', 'musician', 're_releaser'];
  if (!gameEntry.credits || typeof gameEntry.credits !== 'object' || Array.isArray(gameEntry.credits)) {
    errors.push('credits must be an object.');
  } else {
    const keysPresent = Object.keys(gameEntry.credits);
    if (keysPresent.length !== creditKeys.length || creditKeys.some((key, index) => keysPresent[index] !== key)) {
      errors.push('credits keys must match the hard-locked schema order exactly.');
    }
  }

  if (typeof gameEntry._ccg_enforced !== 'boolean') errors.push('_ccg_enforced must be boolean.');
  if (typeof gameEntry._ccg_migrated !== 'boolean') errors.push('_ccg_migrated must be boolean.');

  return errors;
}

function normalizeThumbnailPath(rawValue, slug) {
  const value = String(rawValue || '').trim();
  if (!value) return `${THUMBNAIL_BASE_PATH}${slug}.png`;

  if (state.draft.filenameOnlyMode && !isLikelyFullPath(value)) {
    const filename = value.replace(/^\/+/, '');
    return `${THUMBNAIL_BASE_PATH}${filename}`;
  }

  return value.replace(/^\/+/, '');
}

function normalizeBox3dPath(rawValue, slug) {
  const value = String(rawValue || '').trim();
  if (!value) return `${BOX3D_BASE_PATH}${slug}.webp`;

  if (state.draft.filenameOnlyMode && !isLikelyFullPath(value)) {
    const filename = /\.webp$/i.test(value) ? value : `${value}.webp`;
    return `${BOX3D_BASE_PATH}${filename.replace(/^\/+/, '')}`;
  }

  return value.replace(/^\/+/, '');
}

function isLikelyFullPath(value) {
  const token = String(value || '').trim();
  return /^https?:\/\//i.test(token) || token.startsWith('/') || token.includes('/');
}

function hydrateFilenameOnlyModePreference() {
  const saved = window.localStorage.getItem(FILENAME_ONLY_STORAGE_KEY);
  if (saved === 'true' || saved === 'false') {
    state.draft.filenameOnlyMode = saved === 'true';
  }

  const toggle = document.querySelector('[data-field="filenameOnlyMode"]');
  if (toggle) toggle.checked = Boolean(state.draft.filenameOnlyMode);
}

function buildFullGamesSitemap(games) {
  const todayIso = new Date().toISOString().split('T')[0];
  const urlLines = (Array.isArray(games) ? games : []).map((game) => {
    const slug = String(game?.slug || '').trim();
    if (!slug) return '';

    const updated = String(game?.updated || '').trim();
    const parsedUpdated = updated ? new Date(updated) : null;
    const lastmod = parsedUpdated && !Number.isNaN(parsedUpdated.getTime())
      ? parsedUpdated.toISOString().split('T')[0]
      : todayIso;

    return `  <url>
    <loc>${escapeXml(`${SITE_ORIGIN}/games/${slug}/`)}</loc>
    <lastmod>${escapeXml(lastmod)}</lastmod>
  </url>`;
  }).filter(Boolean);

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlLines.join('\n')}
</urlset>`;
}

function updateStep1UiState() {
  const errors = validateStep1();
  setStep1ContinueState(errors.length === 0);
  renderErrors(el.step1Errors, state.step === 1 ? errors : []);
}

function setStep1ContinueState(enabled) {
  const button = el.nextButtons[0];
  if (!button) return;
  button.disabled = !enabled;
  button.setAttribute('aria-disabled', String(!enabled));
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeRatingValue(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return trimmed;
  return String(Math.trunc(parsed));
}

function idify(value) {
  return slugify(value).replace(/-/g, '_');
}

function isValidUrl(value) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (_error) {
    return false;
  }
}

function cleanForHtml(value) {
  return escapeHtml(String(value || '').replace(/\s+/g, ' ').trim());
}

function escapeJs(value) {
  return String(value || '').replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

function escapeXml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

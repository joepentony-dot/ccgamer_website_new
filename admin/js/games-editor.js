const SITE_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';
const FILENAME_ONLY_STORAGE_KEY = 'ccg-games-editor-filename-only-mode';
const THUMBNAIL_BASE_PATH = 'resources/images/thumbnails/all/';
const BOX3D_BASE_PATH = 'resources/images/games/boxes-3d/';

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
  creditsPublisher: '',
  creditsDeveloper: '',
  creditsCoder: '',
  creditsGraphics: '',
  creditsMusic: '',
  creditsReReleaser: '',
  thumbnail: '',
  box3d: '',
  externalLinks: '',
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
  draft: { ...EMPTY_DRAFT }
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
  previewRating: document.querySelector('[data-preview-rating]'),
  previewRatingReason: document.querySelector('[data-preview-rating-reason]'),
  previewFileFlat: document.querySelector('[data-preview-file-flat]'),
  previewFileFolder: document.querySelector('[data-preview-file-folder]'),
  previewGamesJsonPath: document.querySelector('[data-preview-games-json-path]'),
  downloadStatus: document.querySelector('[data-download-status]'),
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
  await loadLibrary();
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
      return;
    }

    if (field.type === 'checkbox') {
      state.draft[field.dataset.field] = field.checked;
      if (field.dataset.field === 'filenameOnlyMode') {
        window.localStorage.setItem(FILENAME_ONLY_STORAGE_KEY, String(field.checked));
        renderWarnings(el.step2Warnings, validateStep2Warnings());
      }
      updateStep1UiState();
      return;
    }

    const fieldName = field.dataset.field;
    const value = field.value;
    state.draft[fieldName] = value;

    if (fieldName === 'slug') {
      state.slugTouched = Boolean(value.trim());
      updateStep1UiState();
      return;
    }

    if (fieldName === 'id') {
      state.idTouched = Boolean(value.trim());
      updateStep1UiState();
      return;
    }

    if (fieldName === 'title') {
      if (!state.slugTouched) {
        setFieldValue('slug', slugify(value));
      }

      if (!state.idTouched) {
        setFieldValue('id', idify(value));
      }
    }

    if (fieldName === 'ccg_rating') {
      const normalized = normalizeRatingValue(value);
      if (normalized !== value) setFieldValue('ccg_rating', normalized);
    }

    updateStep1UiState();
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
    ['ccg_rating', 'CCG Rating is required.'],
    ['videoId', 'Video ID is required.']
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
  parseLines(state.draft.disk).forEach((url) => {
    if (!isValidUrl(url)) errors.push(`Invalid disk URL: ${url}`);
  });

  parseLines(state.draft.externalLinks).forEach((url) => {
    if (!isValidUrl(url)) errors.push(`Invalid external link URL: ${url}`);
  });

  return errors;
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
  const gameUrl = `${SITE_ORIGIN}/games/game.html?id=${encodeURIComponent(id)}`;
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
    pdf: state.draft.pdf.trim() || '',
    disk: parseLines(state.draft.disk),
    lemon: parseLines(state.draft.externalLinks),
    description: state.draft.description.trim(),
    ccg_rating: Number(state.draft.ccg_rating),
    ccg_rating_reason: state.draft.ccg_rating_reason.trim(),
    credits,
    _ccg_enforced: false,
    _ccg_migrated: false
  };

  const normalizedBox3dPath = normalizeBox3dPath(state.draft.box3d, slug);

  const schemaErrors = validateGameEntrySchema(gameEntry);
  if (schemaErrors.length) {
    throw new Error(schemaErrors.join(' | '));
  }

  const publisherForSeo = credits.publisher?.[0] || 'Cheeky Commodore Gamer';
  const imagePath = gameEntry.thumbnail || 'resources/images/thumbnails/all/default.jpg';
  const imageUrl = imagePath.startsWith('http') ? imagePath : `${SITE_ORIGIN}/${imagePath.replace(/^\/+/, '')}`;

  const flatSeoStub = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />

    <!-- Canonical route enforcement: redirect /games/${escapeJs(slug)}.html -> /games/${escapeJs(slug)}/ -->
    <meta http-equiv="refresh" content="0; url=/games/${escapeJs(slug)}/">
    <script>
      (function () {
        var suffix = window.location.search + window.location.hash;
        window.location.replace("/games/${escapeJs(slug)}/" + suffix);
      })();
    </script>

    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <title>${cleanForHtml(seoTitle)}</title>
    <script src="/js/analytics.js"></script>
    <meta name="description" content="${seoDescription}" />

    <link rel="canonical" href="${SITE_ORIGIN}/games/${cleanForHtml(slug)}/" />

    <meta property="og:title" content="${cleanForHtml(seoTitle)}" />
    <meta property="og:description" content="${seoDescription}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${SITE_ORIGIN}/games/${cleanForHtml(slug)}/" />
    <meta property="og:image" content="${cleanForHtml(imageUrl)}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${cleanForHtml(seoTitle)}" />
    <meta name="twitter:description" content="${seoDescription}" />
    <meta name="twitter:image" content="${cleanForHtml(imageUrl)}" />

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
    {
        "@context": "https://schema.org",
        "@type": "VideoGame",
        "name": "${cleanForHtml(title)}",
        "description": "${seoDescription}",
        "datePublished": "${String(year)}",
        "gamePlatform": "${cleanForHtml(system)}",
        "publisher": "${cleanForHtml(publisherForSeo)}",
        "image": "${cleanForHtml(imageUrl)}",
        "url": "${SITE_ORIGIN}/games/${cleanForHtml(slug)}/"
    }
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
                        src="../${cleanForHtml(imagePath).replace(/^\/+/, '')}"
                        alt="${cleanForHtml(title)} cover"
                        loading="lazy"
                     width="460" height="215"  srcset="../${cleanForHtml(imagePath).replace(/^\/+/, '')} 460w" sizes="(max-width: 720px) 90vw, 460px" />
                </div>

                <div class="game-hero__content">
                    <h1 class="game-hero__title">${cleanForHtml(title)}</h1>

                    <div class="game-hero__meta">
                        <span class="game-meta__item">${String(year)}</span>
                        <span class="game-meta__sep">•</span>
                        <span class="game-meta__item">${cleanForHtml(system)}</span>
                        <span class="game-meta__sep">•</span>
                        <span class="game-meta__item">${cleanForHtml(publisherForSeo)}</span>
                    </div>
                </div>

            </div>
        </section>

        <section class="game-section">
            <p class="game-section__kicker">Overview</p>
            <h2 class="game-section__title">Game Summary</h2>

            <div class="game-description">
                ${seoDescription}
            </div>
        </section>

        <section class="game-section">
            <p class="game-section__kicker">Explore</p>
            <h2 class="game-section__title">More Details</h2>

            <div class="game-downloads">
                <a class="ccg-btn ccg-btn--primary"
                   href="/games/game.html?id=${encodeURIComponent(id)}">
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

<!-- GOATCOUNTER — SAFE ANALYTICS -->
<script
  data-goatcounter="https://cheekycommodoregamer.goatcounter.com/count"
  async
  src="https://gc.zgo.at/count.js">
</script>

</body>
</html>`;

  const folderRedirect = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${cleanForHtml(seoTitle)}</title>
    <script src="/js/analytics.js"></script>
    <meta name="description" content="${seoDescription}" />

    <link rel="canonical" href="${SITE_ORIGIN}/games/${cleanForHtml(slug)}/" />

    <meta property="og:title" content="${cleanForHtml(seoTitle)}" />
    <meta property="og:description" content="${seoDescription}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${SITE_ORIGIN}/games/${cleanForHtml(slug)}/" />
    <meta property="og:image" content="${cleanForHtml(imageUrl)}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${cleanForHtml(seoTitle)}" />
    <meta name="twitter:description" content="${seoDescription}" />
    <meta name="twitter:image" content="${cleanForHtml(imageUrl)}" />

    <style>
        html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            background: #000;
            overflow: hidden;
        }
    </style>

    <script>
        (function () {
            if (typeof window !== "undefined") {
                window.location.replace("/games/game.html?id=${escapeJs(id)}");
            }
        })();
    </script>
</head>
<body>
<script
  data-goatcounter="https://cheekycommodoregamer.goatcounter.com/count"
  async
  src="https://gc.zgo.at/count.js">
</script>
</body>
</html>`;

  const mergedGames = mergeGamesJson(gameEntry, state.library);
  const gamesJsonOutput = state.draft.jsonExportMode === 'full'
    ? `${JSON.stringify(mergedGames, null, 2)}\n`
    : `${JSON.stringify([gameEntry], null, 2)}\n`;

  // Sitemap logic replacement: always build a complete sitemap-games.xml from games.json data.
  const sitemap = buildFullGamesSitemap(mergedGames);

  const readme = [
    'CCG Game Package',
    '================',
    '',
    'Copy files from this ZIP into the repo:',
    '- games/games.json',
    `- games/${slug}.html`,
    `- games/${slug}/index.html`,
    '- sitemap-games.xml',
    '',
    'games.json instructions:',
    '- If you exported FULL games.json: replace /games/games.json in the repo with this file.',
    '- If you exported ENTRY ONLY: copy the single object into /games/games.json manually in sort order.',
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
    readme,
    normalizedBox3dPath
  };
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
    'videoid', 'thumbnail', 'pdf', 'disk', 'lemon', 'description', 'ccg_rating',
    'ccg_rating_reason', 'credits', '_ccg_enforced', '_ccg_migrated'
  ];

  const keys = Object.keys(gameEntry || {});
  if (keys.length !== requiredOrder.length || requiredOrder.some((key, index) => keys[index] !== key)) {
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

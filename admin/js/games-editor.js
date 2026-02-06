import { initAdminNav } from './admin-nav.js';
import { getAuthContext, waitForAuthReady } from './auth.js';

const SITE_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';
const LIBRARY_PATH = '/games/games.json';
const STORAGE_KEY = 'omegaGameBuilderDraftV1';
const MAX_STEP = 6;

const GENRES = [
  'action-adventure',
  'adventure',
  'arcade',
  'casino',
  'fighting',
  'horror',
  'miscellaneous',
  'platform',
  'puzzle',
  'quiz',
  'racing',
  'role-playing',
  'shooting',
  'sports',
  'strategy'
];

const state = {
  step: 1,
  library: [],
  slugSet: new Set(),
  idSet: new Set(),
  slugLocked: false,
  draft: null,
  validation: { errors: [], warnings: [], missing: [] },
  outputs: null,
  lastSavedAt: null
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
  previews: {
    canonical: document.querySelector('[data-preview="canonical"]'),
    sitemap: document.querySelector('[data-preview="sitemap"]'),
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
    nextStep: document.querySelector('[data-action="next-step"]')
  }
};

function setRuntimeState(message, kind = 'ready') {
  if (!el.runtime) return;
  el.runtime.textContent = `State: ${message}`;
  el.runtime.dataset.state = kind;
}

function defaultDraft() {
  return {
    title: '',
    slug: '',
    id: '',
    system: '',
    year: '',
    developer: '',
    publisher: '',
    thumbnail: '',
    boxArt: '',
    videoId: '',
    pdf: '',
    externalRefs: '',
    genres: [],
    difficulty: '',
    ccgRating: '',
    ccgRatingReason: '',
    description: '',
    creditPublisher: '',
    creditProducer: '',
    creditCoder: '',
    creditGraphics: '',
    creditMusician: '',
    creditRereleaser: '',
    seoTitle: '',
    metaDescription: ''
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
  const publisherList = listFromText(draft.creditPublisher);
  if (draft.publisher && !publisherList.includes(draft.publisher)) {
    publisherList.unshift(draft.publisher);
  }

  return {
    publisher: publisherList,
    producer: draft.creditProducer || '',
    coder: listFromText(draft.creditCoder),
    graphics: listFromText(draft.creditGraphics),
    musician: listFromText(draft.creditMusician),
    re_releaser: listFromText(draft.creditRereleaser),
    developer: draft.developer || ''
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
  draft.id = generateUniqueId(baseId, state.idSet);

  draft.system = String(draft.system || '').trim();
  draft.year = String(draft.year || '').trim();
  draft.developer = String(draft.developer || '').trim();
  draft.publisher = String(draft.publisher || '').trim();
  draft.thumbnail = String(draft.thumbnail || '').trim();
  draft.boxArt = String(draft.boxArt || '').trim();
  draft.videoId = String(draft.videoId || '').trim();
  draft.pdf = String(draft.pdf || '').trim();
  draft.externalRefs = String(draft.externalRefs || '').trim();
  draft.difficulty = String(draft.difficulty || '').trim();
  draft.ccgRating = String(draft.ccgRating || '').trim();
  draft.ccgRatingReason = String(draft.ccgRatingReason || '').trim();
  draft.description = String(draft.description || '').trim();
  draft.creditPublisher = String(draft.creditPublisher || '').trim();
  draft.creditProducer = String(draft.creditProducer || '').trim();
  draft.creditCoder = String(draft.creditCoder || '').trim();
  draft.creditGraphics = String(draft.creditGraphics || '').trim();
  draft.creditMusician = String(draft.creditMusician || '').trim();
  draft.creditRereleaser = String(draft.creditRereleaser || '').trim();
  draft.seoTitle = String(draft.seoTitle || '').trim();
  draft.metaDescription = String(draft.metaDescription || '').trim();
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

function updatePreviewFields() {
  const slug = state.draft.slug || '';
  const canonical = slug ? `${SITE_ORIGIN}/games/${slug}/` : '';
  const sitemap = slug ? buildSitemapFragment(state.draft, { fragmentOnly: true }) : '';
  if (el.previews.canonical) el.previews.canonical.value = canonical;
  if (el.previews.sitemap) el.previews.sitemap.value = sitemap;
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
  state.draft = defaultDraft();
  state.outputs = null;
  state.validation = { errors: [], warnings: [], missing: [] };
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

function validateDraft() {
  const errors = [];
  const warnings = [];
  const missing = [];

  const slug = state.draft.slug;
  const id = state.draft.id;

  const requiredFields = [
    ['title', 'Title'],
    ['slug', 'Slug'],
    ['system', 'System'],
    ['year', 'Year'],
    ['developer', 'Developer'],
    ['publisher', 'Publisher'],
    ['thumbnail', 'Thumbnail'],
    ['ccgRating', 'CCG Rating']
  ];

  requiredFields.forEach(([key, label]) => {
    if (!state.draft[key]) missing.push(label);
  });

  if ((state.draft.genres || []).length === 0) {
    missing.push('Genres');
  }

  if (missing.length) {
    errors.push(`Missing required fields: ${missing.join(', ')}`);
  }

  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    errors.push('Slug must use lowercase letters, numbers, and hyphens only.');
  }

  if (slug && state.slugSet.has(slug)) {
    errors.push(`Duplicate slug detected: ${slug}`);
  }

  if (id && state.idSet.has(id)) {
    errors.push(`Duplicate ID detected: ${id}`);
  }

  const yearValue = toNumber(state.draft.year);
  if (!yearValue) {
    errors.push('Year must be a valid number.');
  } else if (yearValue < 1977 || yearValue > 2099) {
    warnings.push('Year looks unusual. Confirm the release year.');
  }

  const ratingValue = toNumber(state.draft.ccgRating);
  if (!ratingValue) {
    errors.push('CCG rating must be a valid number.');
  } else if (ratingValue < 1 || ratingValue > 10) {
    errors.push('CCG rating must be between 1 and 10.');
  }

  if (state.draft.thumbnail && !isValidPath(state.draft.thumbnail)) {
    warnings.push('Thumbnail path should start with resources/ or be a full URL.');
  }

  if (state.draft.boxArt && !isValidPath(state.draft.boxArt)) {
    warnings.push('Box art path should start with resources/ or be a full URL.');
  }

  if (state.draft.pdf && !isValidUrl(state.draft.pdf)) {
    warnings.push('Manual/PDF URL looks invalid.');
  }

  const externalRefs = listFromText(state.draft.externalRefs);
  const invalidRefs = externalRefs.filter((ref) => !isValidUrl(ref));
  if (invalidRefs.length) {
    warnings.push(`External refs contain invalid URLs: ${invalidRefs.join(', ')}`);
  }

  if (state.draft.videoId && !/^[a-zA-Z0-9_-]{6,}$/.test(state.draft.videoId)) {
    warnings.push('Video ID looks unusual.');
  }

  if (state.draft.metaDescription && state.draft.metaDescription.length < 70) {
    warnings.push('Meta description is short. Aim for 70+ characters.');
  }

  if (state.draft.metaDescription && state.draft.metaDescription.length > 200) {
    warnings.push('Meta description is long. Aim for under 200 characters.');
  }

  return { errors, warnings, missing };
}

function renderValidation() {
  const { errors, warnings } = state.validation;
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

  if (el.actions.generateOutput) {
    el.actions.generateOutput.disabled = errors.length > 0;
  }
  if (el.actions.buildPackage) {
    el.actions.buildPackage.disabled = errors.length > 0;
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

function buildGameRecord() {
  const ratingValue = toNumber(state.draft.ccgRating) || 0;
  const yearValue = toNumber(state.draft.year) || 0;
  const externalRefs = listFromText(state.draft.externalRefs);

  return {
    system: state.draft.system,
    id: state.draft.id,
    slug: state.draft.slug,
    title: state.draft.title,
    sorttitle: buildSortTitle(state.draft.title),
    year: yearValue,
    genres: state.draft.genres,
    collections: [],
    videoid: state.draft.videoId,
    thumbnail: state.draft.thumbnail,
    pdf: state.draft.pdf,
    disk: [],
    lemon: externalRefs,
    description: state.draft.description || state.draft.metaDescription,
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
    boxArt: state.draft.boxArt,
    difficulty: state.draft.difficulty,
    seo: {
      title: state.draft.seoTitle || `${entry.title} | Cheeky Commodore Gamer`,
      description: state.draft.metaDescription,
      canonical: `${SITE_ORIGIN}/games/${entry.slug}/`
    },
    media: {
      thumbnail: entry.thumbnail,
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
      state.draft.boxArt,
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
  const description = state.draft.metaDescription || entry.description || '';
  const image = entry.thumbnail ? `${SITE_ORIGIN}/${entry.thumbnail}`.replace(/(?<!:)\/\//g, '/') : '';

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: entry.title,
    description,
    datePublished: String(entry.year || ''),
    gamePlatform: entry.system,
    publisher: state.draft.publisher || entry.credits?.publisher?.[0] || '',
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
  const target = event.target;
  const name = target.dataset.field;
  if (!name) return;

  if (name === 'slug') {
    state.slugLocked = Boolean(target.value.trim());
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
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  if (!GENRES.includes(input.value)) return;

  const selected = new Set(state.draft.genres || []);
  if (input.checked) {
    selected.add(input.value);
  } else {
    selected.delete(input.value);
  }
  state.draft.genres = Array.from(selected);
  setDraftIndicator('Draft: unsaved changes');
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
    saveDraft();
  });

  el.actions.resetWizard?.addEventListener('click', resetWizard);

  el.actions.prevStep?.addEventListener('click', () => {
    goToStep(state.step - 1);
  });

  el.actions.nextStep?.addEventListener('click', () => {
    goToStep(state.step + 1);
  });

  el.actions.runValidation?.addEventListener('click', () => {
    state.validation = validateDraft();
    renderValidation();
  });

  el.actions.generateOutput?.addEventListener('click', () => {
    state.validation = validateDraft();
    renderValidation();
    if (state.validation.errors.length) return;
    state.outputs = buildOutputs();
    renderOutputs();
    if (el.actions.downloadBundle) el.actions.downloadBundle.disabled = false;
  });

  el.actions.downloadBundle?.addEventListener('click', () => {
    void downloadBundle();
  });

  el.actions.buildPackage?.addEventListener('click', () => {
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

async function loadLibrary() {
  setLibraryIndicator('Library: loading games.json…');
  const response = await fetch(LIBRARY_PATH, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Unable to load games.json (${response.status})`);
  }
  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('games.json is not an array.');
  }
  state.library = data;
  state.slugSet = new Set(data.map((game) => game.slug));
  state.idSet = new Set(data.map((game) => game.id));
  setLibraryIndicator(`Library: ${data.length} games loaded`);
}

async function initAuth() {
  await waitForAuthReady();
  const context = await getAuthContext();
  if (el.email) el.email.textContent = context?.user?.email || 'unknown';
  if (el.role) el.role.textContent = context?.role || 'none';
}

async function boot() {
  setRuntimeState('Booting', 'info');
  await initAdminNav({ pageLabel: 'Omega Game Builder', active: 'editor' });
  await initAuth();
  await loadLibrary();
  loadDraft();
  normalizeDraft();
  updateFormFromDraft();
  updatePreviewFields();
  updateProgress();
  bindEvents();
  setRuntimeState('Ready');
}

boot().catch((error) => {
  console.error('[OMEGA-GAME-BUILDER] boot failure', error);
  setRuntimeState('Boot failed', 'error');
  setLibraryIndicator('Library: failed to load');
});

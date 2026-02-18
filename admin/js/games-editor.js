const SITE_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';

const state = {
  step: 1,
  library: [],
  slugSet: new Set(),
  idSet: new Set(),
  packageData: null,
  draft: {
    title: '',
    system: '',
    year: '',
    slug: '',
    id: '',
    genres: '',
    description: '',
    videoId: '',
    collections: '',
    pdf: '',
    disk: '',
    credits: '',
    thumbnail: '',
    box3d: '',
    externalLinks: ''
  }
};

const el = {
  topStatus: document.querySelector('[data-top-status]'),
  stepSections: Array.from(document.querySelectorAll('[data-step]')),
  jumpButtons: Array.from(document.querySelectorAll('[data-step-jump]')),
  fields: Array.from(document.querySelectorAll('[data-field]')),
  step1Errors: document.querySelector('[data-errors-step1]'),
  step2Errors: document.querySelector('[data-errors-step2]'),
  step3Errors: document.querySelector('[data-errors-step3]'),
  previewEntry: document.querySelector('[data-preview-entry]'),
  previewSitemap: document.querySelector('[data-preview-sitemap]'),
  previewFileFlat: document.querySelector('[data-preview-file-flat]'),
  previewFileFolder: document.querySelector('[data-preview-file-folder]'),
  downloadStatus: document.querySelector('[data-download-status]'),
  nextButtons: Array.from(document.querySelectorAll('[data-action="next"]')),
  backButtons: Array.from(document.querySelectorAll('[data-action="back"]')),
  downloadButton: document.querySelector('[data-action="download"]')
};

init();

async function init() {
  bindEvents();
  await loadLibrary();
  renderStep();
}

function bindEvents() {
  el.fields.forEach((field) => {
    field.addEventListener('input', () => {
      state.draft[field.dataset.field] = field.value;
      if (field.dataset.field === 'title') {
        if (!state.draft.slug.trim()) {
          state.draft.slug = slugify(field.value);
          setFieldValue('slug', state.draft.slug);
        }
        if (!state.draft.id.trim()) {
          state.draft.id = slugify(field.value).replace(/-/g, '_');
          setFieldValue('id', state.draft.id);
        }
      }
    });
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
    } catch (error) {
      setDownloadStatus(`Download failed: ${error.message}`, true);
    }
  });
}

async function loadLibrary() {
  try {
    const response = await fetch('/games/games.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Could not load games.json (${response.status})`);
    }
    const data = await response.json();
    state.library = Array.isArray(data) ? data : [];
    state.slugSet = new Set(state.library.map((g) => String(g.slug || '').toLowerCase()).filter(Boolean));
    state.idSet = new Set(state.library.map((g) => String(g.id || '').toLowerCase()).filter(Boolean));
    el.topStatus.textContent = `Loaded ${state.library.length} existing games. Duplicate checks enabled.`;
    el.topStatus.className = 'status ok';
  } catch (error) {
    state.library = [];
    state.slugSet = new Set();
    state.idSet = new Set();
    el.topStatus.textContent = `Warning: ${error.message}. You can continue, but duplicate checks are unavailable.`;
    el.topStatus.className = 'status error';
  }
}

function renderStep() {
  el.stepSections.forEach((section) => {
    section.hidden = Number(section.dataset.step) !== state.step;
  });
  el.jumpButtons.forEach((button) => {
    button.dataset.active = Number(button.dataset.stepJump) === state.step ? 'true' : 'false';
  });

  if (state.step === 3) {
    const errors = validateStep3();
    renderErrors(el.step3Errors, errors);
    if (!errors.length) {
      const packageData = buildPackageData();
      state.packageData = packageData;
      el.previewEntry.textContent = JSON.stringify(packageData.gameEntry, null, 2);
      el.previewSitemap.textContent = packageData.sitemap;
      el.previewFileFlat.textContent = `/games/${state.draft.slug}.html`;
      el.previewFileFolder.textContent = `/games/${state.draft.slug}/index.html`;
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
    ['genres', 'At least one genre is required.'],
    ['description', 'Description is required.'],
    ['videoId', 'Video ID is required.']
  ];

  required.forEach(([key, message]) => {
    if (!String(state.draft[key] || '').trim()) {
      errors.push(message);
    }
  });

  if (state.draft.system && !['C64', 'AMIGA'].includes(state.draft.system)) {
    errors.push('System must be C64 or AMIGA.');
  }

  if (state.draft.year && !/^\d{4}$/.test(state.draft.year)) {
    errors.push('Year must be 4 digits.');
  }

  const yearNumber = Number(state.draft.year);
  if (state.draft.year && (yearNumber < 1970 || yearNumber > 2100)) {
    errors.push('Year must be between 1970 and 2100.');
  }

  const slug = String(state.draft.slug || '').trim().toLowerCase();
  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    errors.push('Slug must be lowercase and use hyphens only.');
  }

  const id = String(state.draft.id || '').trim().toLowerCase();
  if (id && state.idSet.has(id)) {
    errors.push('ID already exists in games.json.');
  }

  if (slug && state.slugSet.has(slug)) {
    errors.push('Slug already exists in games.json.');
  }

  if (state.draft.pdf && !isValidUrl(state.draft.pdf)) {
    errors.push('PDF link must be a valid URL.');
  }

  return errors;
}

function validateStep2() {
  const errors = [];
  const links = parseLines(state.draft.externalLinks);
  links.forEach((url) => {
    if (!isValidUrl(url)) {
      errors.push(`Invalid external link URL: ${url}`);
    }
  });
  return errors;
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

  const gameEntry = {
    system: state.draft.system,
    id,
    slug,
    title,
    sorttitle: title,
    year: Number(state.draft.year),
    genres: parseCsv(state.draft.genres),
    collections: parseCsv(state.draft.collections),
    videoid: state.draft.videoId.trim(),
    thumbnail: state.draft.thumbnail.trim() || '',
    pdf: state.draft.pdf.trim() || '',
    disk: parseLines(state.draft.disk),
    lemon: parseLines(state.draft.externalLinks),
    description: state.draft.description.trim(),
    credits: state.draft.credits.trim() || ''
  };

  const seoTitle = `${title} (${state.draft.year}) | CCG`;
  const seoDescription = cleanForHtml(state.draft.description.trim());

  const stubHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${cleanForHtml(seoTitle)}</title>
  <meta name="description" content="${seoDescription}" />
  <link rel="canonical" href="${gameUrl}" />
  <meta http-equiv="refresh" content="0; url=${gameUrl}" />
</head>
<body>
  <p>Redirecting to <a href="${gameUrl}">${cleanForHtml(title)}</a>…</p>
</body>
</html>`;

  const sitemap = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_ORIGIN}/games/${slug}.html</loc></url>
  <url><loc>${SITE_ORIGIN}/games/${slug}/</loc></url>
</urlset>`;

  const readme = [
    'CCG Game Package',
    '================',
    '',
    'This ZIP contains exactly:',
    '- games.json (new entry only)',
    `- games/${slug}.html`,
    `- games/${slug}/index.html`,
    '- sitemap-fragment.xml',
    '',
    'How to use:',
    '1) Copy the new game object from games.json into /games/games.json in the repo.',
    `2) Add both SEO files to /games/${slug}.html and /games/${slug}/index.html.`,
    '3) Merge sitemap-fragment.xml content into your sitemap workflow.',
    '4) Commit and deploy.',
    '',
    'Images are intentionally not included in this ZIP.'
  ].join('\n');

  return { slug, gameEntry, stubHtml, sitemap, readme };
}

async function downloadZip(packageData) {
  if (!window.JSZip) {
    throw new Error('JSZip is not available.');
  }

  const zip = new window.JSZip();
  zip.file('games.json', `${JSON.stringify([packageData.gameEntry], null, 2)}\n`);
  zip.file(`games/${packageData.slug}.html`, `${packageData.stubHtml}\n`);
  zip.file(`games/${packageData.slug}/index.html`, `${packageData.stubHtml}\n`);
  zip.file('sitemap-fragment.xml', `${packageData.sitemap}\n`);
  zip.file('README.txt', `${packageData.readme}\n`);

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${packageData.slug}-game-package.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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

function setDownloadStatus(message, isError) {
  if (!el.downloadStatus) return;
  el.downloadStatus.textContent = message;
  el.downloadStatus.className = `status ${isError ? 'error' : 'ok'}`;
}

function parseCsv(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseLines(value) {
  return String(value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function setFieldValue(fieldName, value) {
  const field = el.fields.find((item) => item.dataset.field === fieldName);
  if (field) field.value = value;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function cleanForHtml(value) {
  return escapeHtml(String(value || '').replace(/\s+/g, ' ').trim());
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

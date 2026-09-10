const VIDEO_METADATA_URL = '/data/video-metadata.json';
const DESCRIPTION_ENRICHMENTS_URL = '/data/game-description-enrichments.json';
const MAGAZINE_REVIEW_BASE_URL = '/data/magazine-game-reviews';
const THUMBNAIL_BASE_PATH = 'resources/images/thumbnails/all/';
const BOX3D_BASE_PATH = 'resources/images/games/boxes-3d/';
const WEBP_QUALITY = 0.86;
const MAX_IMAGE_DIMENSION = 1600;
const MIN_DESCRIPTION_WORDS = 90;
const MAX_DESCRIPTION_WORDS = 165;

const caches = {
  videoMetadata: null,
  descriptionEnrichments: null,
  magazineChunks: new Map()
};

const boxArtState = {
  file: null,
  path: ''
};

let thumbnailReplacementInProgress = false;
let descriptionTimer = null;
let magazineTimer = null;

initAutomation();

function initAutomation() {
  if (document.documentElement.dataset.ccgGamePipelineAutomation === 'ready') return;
  document.documentElement.dataset.ccgGamePipelineAutomation = 'ready';

  injectAutomationStyles();
  const ui = injectAutomationUi();
  if (!ui) return;

  bindDescriptionAutomation(ui);
  bindMagazineAutomation(ui);
  bindThumbnailAutomation(ui);
  bindBoxArtAutomation(ui);
  patchZipForBoxArt();

  scheduleDescriptionAutofill(ui, false);
  scheduleMagazineCheck(ui);
}

function injectAutomationStyles() {
  if (document.querySelector('[data-game-pipeline-automation-styles]')) return;
  const style = document.createElement('style');
  style.dataset.gamePipelineAutomationStyles = 'true';
  style.textContent = `
    .pipeline-automation-panel {
      grid-column: 1 / -1;
      border: 1px solid rgba(59, 163, 255, .55);
      border-radius: 8px;
      padding: .7rem .8rem;
      background: rgba(7, 24, 47, .55);
    }
    .pipeline-automation-panel strong { display: block; margin-bottom: .25rem; }
    .pipeline-automation-panel .actions { justify-content: flex-start; align-items: center; flex-wrap: wrap; margin-top: .45rem; }
    .pipeline-automation-status { margin: .35rem 0 0; color: #93c5fd; font-size: .88rem; }
    .pipeline-automation-status[data-state="ok"] { color: #86efac; }
    .pipeline-automation-status[data-state="warning"] { color: #fde68a; }
    .pipeline-automation-status[data-state="error"] { color: #fda4af; }
    .pipeline-review-list { margin: .35rem 0 0 1.2rem; padding: 0; color: #cde8ff; font-size: .86rem; }
  `;
  document.head.appendChild(style);
}

function injectAutomationUi() {
  const descriptionField = document.querySelector('[data-field="description"]');
  const thumbnailInput = document.querySelector('[data-thumbnail-file]');
  const boxPathField = document.querySelector('[data-field="box3d"]');
  if (!descriptionField || !thumbnailInput || !boxPathField) return null;

  const descriptionLabel = descriptionField.closest('label');
  const descriptionPanel = document.createElement('div');
  descriptionPanel.className = 'pipeline-automation-panel';
  descriptionPanel.innerHTML = `
    <strong>Grounded SEO description automation</strong>
    <span class="hint">When the Video ID matches verified CCG metadata, the description is built automatically from that source copy. Existing text is never silently overwritten.</span>
    <div class="actions">
      <button type="button" class="ccg-btn ccg-btn--ghost" data-pipeline-description-fill>Fill / refresh verified description</button>
    </div>
    <p class="pipeline-automation-status" data-pipeline-description-status>Waiting for a valid 11-character Video ID.</p>
  `;
  descriptionLabel.insertAdjacentElement('afterend', descriptionPanel);

  const magazinePanel = document.createElement('div');
  magazinePanel.className = 'pipeline-automation-panel';
  magazinePanel.innerHTML = `
    <strong>Automatic magazine-rating capture</strong>
    <span class="hint">No magazine score is entered here. The existing review archive is matched automatically by platform + game slug and attached by the normal rebuild.</span>
    <p class="pipeline-automation-status" data-pipeline-magazine-status>Choose a system and game title/slug to check coverage.</p>
    <ul class="pipeline-review-list" data-pipeline-magazine-list hidden></ul>
  `;
  descriptionPanel.insertAdjacentElement('afterend', magazinePanel);

  const thumbnailPanel = thumbnailInput.closest('.thumbnail-option-panel') || thumbnailInput.parentElement;
  const thumbnailStatus = document.createElement('p');
  thumbnailStatus.className = 'pipeline-automation-status';
  thumbnailStatus.dataset.pipelineThumbnailStatus = 'true';
  thumbnailStatus.textContent = 'PNG/JPEG/WebP uploads will be converted to an optimised WebP automatically.';
  thumbnailPanel.appendChild(thumbnailStatus);

  const thumbnailLabel = thumbnailInput.closest('label');
  if (thumbnailLabel?.firstChild?.nodeType === Node.TEXT_NODE) {
    thumbnailLabel.firstChild.textContent = 'Local thumbnail / box-art image (auto WebP) ';
  }

  const boxPanel = document.createElement('div');
  boxPanel.className = 'full thumbnail-option-panel';
  boxPanel.innerHTML = `
    <label>Local 3D box-art image (optional, auto WebP)
      <input type="file" data-pipeline-box-file accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" />
    </label>
    <p class="hint">The selected image is converted in your browser and bundled at <code>${BOX3D_BASE_PATH}&lt;slug&gt;.webp</code>.</p>
    <p class="pipeline-automation-status" data-pipeline-box-status>No local 3D box art selected.</p>
  `;

  const boxPathLabel = boxPathField.closest('label');
  const formGrid = boxPathLabel?.closest('.form-grid');
  if (formGrid) {
    const existingThumbnailPanel = thumbnailInput.closest('.thumbnail-option-panel');
    if (existingThumbnailPanel) existingThumbnailPanel.insertAdjacentElement('afterend', boxPanel);
    else formGrid.appendChild(boxPanel);
  }

  return {
    descriptionField,
    descriptionStatus: descriptionPanel.querySelector('[data-pipeline-description-status]'),
    descriptionButton: descriptionPanel.querySelector('[data-pipeline-description-fill]'),
    magazineStatus: magazinePanel.querySelector('[data-pipeline-magazine-status]'),
    magazineList: magazinePanel.querySelector('[data-pipeline-magazine-list]'),
    thumbnailInput,
    thumbnailStatus,
    boxPathField,
    boxFileInput: boxPanel.querySelector('[data-pipeline-box-file]'),
    boxStatus: boxPanel.querySelector('[data-pipeline-box-status]'),
    videoIdField: document.querySelector('[data-field="videoId"]'),
    systemField: document.querySelector('[data-field="system"]'),
    slugField: document.querySelector('[data-field="slug"]'),
    titleField: document.querySelector('[data-field="title"]'),
    publisherField: document.querySelector('[data-field="creditsPublisher"]'),
    developerField: document.querySelector('[data-field="creditsDeveloper"]')
  };
}

function bindDescriptionAutomation(ui) {
  ui.descriptionButton?.addEventListener('click', () => scheduleDescriptionAutofill(ui, true));

  ui.videoIdField?.addEventListener('input', () => {
    const videoId = ui.videoIdField.value.trim();
    if (videoId.length === 11 && !ui.descriptionField.value.trim()) scheduleDescriptionAutofill(ui, false);
  });

  ui.videoIdField?.addEventListener('change', () => {
    if (!ui.descriptionField.value.trim()) scheduleDescriptionAutofill(ui, false);
  });
}

function scheduleDescriptionAutofill(ui, force) {
  window.clearTimeout(descriptionTimer);
  descriptionTimer = window.setTimeout(() => fillGroundedDescription(ui, force), force ? 0 : 180);
}

async function fillGroundedDescription(ui, force = false) {
  const videoId = String(ui.videoIdField?.value || '').trim();
  const slug = normaliseSlug(String(ui.slugField?.value || ui.titleField?.value || ''));

  if (!force && ui.descriptionField.value.trim()) {
    setStatus(ui.descriptionStatus, 'Existing description retained. Use “Fill / refresh verified description” if you want to replace it.', 'ok');
    return;
  }

  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    setStatus(ui.descriptionStatus, 'A valid 11-character Video ID is needed before verified CCG source copy can be used.', 'warning');
    return;
  }

  setStatus(ui.descriptionStatus, 'Checking verified CCG description sources…');

  try {
    const candidate = await findGroundedDescription({ videoId, slug });
    if (!candidate) {
      setStatus(ui.descriptionStatus, 'No verified description source matched this Video ID yet. The editor has left the description blank rather than inventing game facts.', 'warning');
      return;
    }

    const optimised = optimiseDescriptionForSeo(candidate.description, readGameFacts(ui));
    if (wordCount(optimised) < 40) {
      setStatus(ui.descriptionStatus, 'The matched source copy is too short to use safely. Add or verify source material before publishing.', 'warning');
      return;
    }

    setFieldValue(ui.descriptionField, optimised);
    setStatus(
      ui.descriptionStatus,
      `Description filled from ${candidate.sourceLabel}; ${wordCount(optimised)} words. Review it before export, but no unsupported facts were generated.`,
      'ok'
    );
  } catch (error) {
    console.error('[game-pipeline-automation] description', error);
    setStatus(ui.descriptionStatus, `Description automation could not load its verified source data: ${error.message}`, 'error');
  }
}

async function findGroundedDescription({ videoId, slug }) {
  if (slug) {
    const enrichments = await loadJsonCached('descriptionEnrichments', DESCRIPTION_ENRICHMENTS_URL);
    const archived = enrichments?.games?.[slug]?.description;
    if (archived && wordCount(archived) >= 40) {
      return { description: normaliseText(archived), sourceLabel: 'the existing CCG grounded-description archive' };
    }
  }

  const payload = await loadJsonCached('videoMetadata', VIDEO_METADATA_URL);
  const metadata = payload?.videos?.[videoId];
  if (!metadata?.description) return null;
  const description = extractEditorialDescription(metadata.description);
  if (wordCount(description) < MIN_DESCRIPTION_WORDS) return null;
  return { description, sourceLabel: 'verified CCG YouTube metadata' };
}

function readGameFacts(ui) {
  const checkedGenre = Array.from(document.querySelectorAll('[data-option-type="genres"]:checked'))
    .map((input) => input.dataset.optionValue)
    .filter(Boolean)[0] || '';

  return {
    title: String(ui.titleField?.value || '').trim(),
    system: String(ui.systemField?.value || '').trim(),
    year: String(document.querySelector('[data-field="year"]')?.value || '').trim(),
    publisher: String(ui.publisherField?.value || '').split(',')[0].trim(),
    developer: String(ui.developerField?.value || '').split(',')[0].trim(),
    genre: checkedGenre
  };
}

function optimiseDescriptionForSeo(description, facts) {
  let source = normaliseText(description);
  const title = facts.title;
  const platform = facts.system === 'AMIGA' ? 'Amiga' : facts.system === 'C64' ? 'Commodore 64' : '';
  const year = /^\d{4}$/.test(facts.year) ? facts.year : '';
  const genre = String(facts.genre || '').replace(/-/g, ' ');
  const publisher = facts.publisher;

  const searchWindow = source.slice(0, 320).toLowerCase();
  const essentialsPresent = [title, platform, year, publisher]
    .filter(Boolean)
    .every((value) => searchWindow.includes(String(value).toLowerCase()));

  if (!essentialsPresent && title && platform) {
    const descriptors = [];
    if (year) descriptors.push(year);
    descriptors.push(platform);
    if (genre) descriptors.push(genre);
    const release = `${title} is a ${descriptors.join(' ')} game${publisher ? ` published by ${publisher}` : ''}.`;
    source = `${release} ${source}`;
  }

  return trimToSentenceBoundary(source, MAX_DESCRIPTION_WORDS);
}

function trimToSentenceBoundary(value, maxWords) {
  const sentences = sentenceList(value);
  const selected = [];
  let words = 0;
  for (const sentence of sentences) {
    const count = wordCount(sentence);
    if (!count) continue;
    if (words + count > maxWords) break;
    selected.push(sentence);
    words += count;
  }
  return normaliseText((selected.length ? selected : [value]).join(' '));
}

function bindMagazineAutomation(ui) {
  const schedule = () => scheduleMagazineCheck(ui);
  ui.systemField?.addEventListener('change', schedule);
  ui.slugField?.addEventListener('input', schedule);
  ui.titleField?.addEventListener('input', schedule);
}

function scheduleMagazineCheck(ui) {
  window.clearTimeout(magazineTimer);
  magazineTimer = window.setTimeout(() => checkMagazineCoverage(ui), 220);
}

async function checkMagazineCoverage(ui) {
  const system = normaliseSystem(ui.systemField?.value);
  const slug = normaliseSlug(String(ui.slugField?.value || ui.titleField?.value || ''));
  ui.magazineList.hidden = true;
  ui.magazineList.innerHTML = '';

  if (!system || !slug) {
    setStatus(ui.magazineStatus, 'Choose a system and game title/slug to check automatic magazine coverage.');
    return;
  }

  const key = `${system}:${slug}`;
  const chunk = magazineChunkName(slug);
  if (!chunk) return;

  setStatus(ui.magazineStatus, `Checking the curated magazine archive for ${key}…`);

  try {
    const payload = await loadMagazineChunk(chunk);
    const reviews = Array.isArray(payload?.games?.[key]) ? payload.games[key] : [];
    if (!reviews.length) {
      setStatus(
        ui.magazineStatus,
        `No curated magazine record currently matches ${key}. The normal rebuild will not invent a rating; this can be supplemented separately if verified source data becomes available.`,
        'warning'
      );
      return;
    }

    setStatus(
      ui.magazineStatus,
      `Automatic capture ready: ${reviews.length} curated magazine review${reviews.length === 1 ? '' : 's'} match ${key}. The normal rebuild will attach them without manual entry.`,
      'ok'
    );
    ui.magazineList.innerHTML = reviews.slice(0, 6).map((review) => {
      const issue = review.issue ? `, ${escapeHtml(review.issue)}` : '';
      return `<li>${escapeHtml(review.magazine)}${issue}: ${escapeHtml(review.score)}</li>`;
    }).join('');
    ui.magazineList.hidden = false;
  } catch (error) {
    console.error('[game-pipeline-automation] magazine coverage', error);
    setStatus(ui.magazineStatus, `Magazine coverage check failed to load: ${error.message}`, 'error');
  }
}

function bindThumbnailAutomation(ui) {
  ui.thumbnailInput.addEventListener('change', async () => {
    if (thumbnailReplacementInProgress) return;
    const sourceFile = ui.thumbnailInput.files?.[0];
    if (!sourceFile) return;

    setStatus(ui.thumbnailStatus, 'Optimising thumbnail / box art to WebP…');
    try {
      const slug = normaliseSlug(String(ui.slugField?.value || ui.titleField?.value || sourceFile.name.replace(/\.[^.]+$/, '')));
      const result = await convertImageToWebp(sourceFile, `${slug || 'game-art'}.webp`);
      replaceFileInput(ui.thumbnailInput, result.file, () => {
        thumbnailReplacementInProgress = true;
      }, () => {
        thumbnailReplacementInProgress = false;
      });

      const thumbnailField = document.querySelector('[data-field="thumbnail"]');
      if (thumbnailField) setFieldValue(thumbnailField, `${THUMBNAIL_BASE_PATH}${result.file.name}`);

      setStatus(
        ui.thumbnailStatus,
        `${result.width}×${result.height} WebP ready at ${formatBytes(result.file.size)} (${formatDelta(sourceFile.size, result.file.size)}). It will be bundled automatically.`,
        'ok'
      );
    } catch (error) {
      console.error('[game-pipeline-automation] thumbnail', error);
      setStatus(ui.thumbnailStatus, `Could not optimise this image: ${error.message}`, 'error');
    }
  });
}

function bindBoxArtAutomation(ui) {
  ui.boxFileInput?.addEventListener('change', async () => {
    const sourceFile = ui.boxFileInput.files?.[0];
    if (!sourceFile) {
      boxArtState.file = null;
      boxArtState.path = '';
      setStatus(ui.boxStatus, 'No local 3D box art selected.');
      return;
    }

    setStatus(ui.boxStatus, 'Optimising 3D box art to WebP…');
    try {
      const slug = normaliseSlug(String(ui.slugField?.value || ui.titleField?.value || sourceFile.name.replace(/\.[^.]+$/, '')));
      const result = await convertImageToWebp(sourceFile, `${slug || 'game-box'}.webp`);
      boxArtState.file = result.file;
      boxArtState.path = `${BOX3D_BASE_PATH}${result.file.name}`;
      setFieldValue(ui.boxPathField, boxArtState.path);
      setStatus(
        ui.boxStatus,
        `${result.width}×${result.height} WebP ready at ${formatBytes(result.file.size)} (${formatDelta(sourceFile.size, result.file.size)}). It will be added to the deployment ZIP automatically.`,
        'ok'
      );
    } catch (error) {
      boxArtState.file = null;
      boxArtState.path = '';
      console.error('[game-pipeline-automation] box art', error);
      setStatus(ui.boxStatus, `Could not optimise this box-art image: ${error.message}`, 'error');
    }
  });
}

function patchZipForBoxArt() {
  const Zip = window.JSZip;
  if (!Zip?.prototype?.generateAsync || Zip.prototype.generateAsync.__ccgBoxArtPatched) return;

  const originalGenerateAsync = Zip.prototype.generateAsync;
  async function generateWithBoxArt(...args) {
    if (boxArtState.file && boxArtState.path && !this.files[boxArtState.path]) {
      this.file(boxArtState.path, boxArtState.file);
    }
    return originalGenerateAsync.apply(this, args);
  }
  generateWithBoxArt.__ccgBoxArtPatched = true;
  Zip.prototype.generateAsync = generateWithBoxArt;
}

async function convertImageToWebp(sourceFile, targetName) {
  if (!sourceFile || !/^image\/(?:png|jpeg|webp)$/i.test(sourceFile.type)) {
    throw new Error('Select a PNG, JPEG, or WebP image.');
  }

  const image = await decodeImage(sourceFile);
  const naturalWidth = image.width || image.naturalWidth;
  const naturalHeight = image.height || image.naturalHeight;
  if (!naturalWidth || !naturalHeight) throw new Error('The image dimensions could not be read.');

  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) throw new Error('Your browser could not create an image conversion canvas.');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, width, height);
  if (typeof image.close === 'function') image.close();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY));
  if (!blob || blob.type !== 'image/webp') throw new Error('This browser did not produce a WebP image.');

  return {
    file: new File([blob], targetName.toLowerCase(), { type: 'image/webp', lastModified: Date.now() }),
    width,
    height
  };
}

async function decodeImage(file) {
  if ('createImageBitmap' in window) return createImageBitmap(file);

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('The selected image could not be decoded.'));
      image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function replaceFileInput(input, file, beforeDispatch, afterDispatch) {
  if (typeof DataTransfer !== 'function') throw new Error('This browser cannot replace the selected file after conversion.');
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
  beforeDispatch?.();
  try {
    input.dispatchEvent(new Event('change', { bubbles: true }));
  } finally {
    afterDispatch?.();
  }
}

async function loadJsonCached(cacheKey, url) {
  if (!caches[cacheKey]) {
    caches[cacheKey] = fetch(url, { cache: 'no-store' }).then((response) => {
      if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
      return response.json();
    }).catch((error) => {
      caches[cacheKey] = null;
      throw error;
    });
  }
  return caches[cacheKey];
}

async function loadMagazineChunk(chunk) {
  if (!caches.magazineChunks.has(chunk)) {
    const promise = fetch(`${MAGAZINE_REVIEW_BASE_URL}/${chunk}.json`, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`${chunk}.json returned HTTP ${response.status}`);
        return response.json();
      })
      .catch((error) => {
        caches.magazineChunks.delete(chunk);
        throw error;
      });
    caches.magazineChunks.set(chunk, promise);
  }
  return caches.magazineChunks.get(chunk);
}

function magazineChunkName(slug) {
  const first = String(slug || '').charAt(0).toLowerCase();
  if (!first) return '';
  if (/\d/.test(first) || first < 'e') return '0-d';
  if (first < 'i') return 'e-h';
  if (first < 'm') return 'i-l';
  if (first < 'q') return 'm-p';
  if (first < 'u') return 'q-t';
  return 'u-z';
}

function normaliseSystem(value) {
  const token = String(value || '').trim().toLowerCase();
  if (token === 'c64' || token.includes('commodore 64')) return 'c64';
  if (token === 'amiga' || token.includes('amiga')) return 'amiga';
  return '';
}

function normaliseSlug(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function extractEditorialDescription(rawDescription) {
  const paragraphs = String(rawDescription || '')
    .split(/\n\s*\n+/)
    .map(normaliseText)
    .filter(isEditorialParagraph);
  const sentences = paragraphs.flatMap(sentenceList);
  const chosen = [];
  let words = 0;

  for (const sentence of sentences) {
    const count = wordCount(sentence);
    if (!count) continue;
    if (words >= 135) break;
    if (words + count > MAX_DESCRIPTION_WORDS && words >= MIN_DESCRIPTION_WORDS) break;
    if (words + count > MAX_DESCRIPTION_WORDS) continue;
    chosen.push(sentence);
    words += count;
  }

  return normaliseText(chosen.join(' '));
}

function isEditorialParagraph(paragraph) {
  const text = String(paragraph || '').toLowerCase();
  if (!text || /https?:\/\/|www\./i.test(text)) return false;
  if (/^(playlists?|support|support & connect|connect|website|patreon|join|twitter|facebook|discord|full game info|subscribe|related videos?)\b/i.test(text)) return false;
  if (/^#/.test(text) || /#[a-z0-9_]+/i.test(text)) return false;
  if (/\b(let me know|comment below|did you play|what do you think|have you played|do you remember)\b/i.test(text)) return false;
  if (wordCount(text) < 7) return false;
  return /[.!?][”"']?$/.test(text);
}

function sentenceList(value) {
  const matches = String(value || '').match(/[^.!?]+[.!?]+[”"']?/g);
  return (matches || [value]).map(normaliseText).filter(Boolean);
}

function normaliseText(value) {
  return String(value || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\s+/g, ' ')
    .replace(/(\d)\.\s+(?=\d)/g, '$1.')
    .trim()
    .replace(/^[-–—•|>\s]+/, '')
    .replace(/\bproper\b/gi, 'strong')
    .replace(/\bheavy lifting\b/gi, 'main work')
    .replace(/\bchaos\b/gi, 'mayhem')
    .replace(/\bclearly\b/gi, 'plainly')
    .replace(/\bclean and readable\b/gi, 'easy to follow')
    .replace(/\bhow immediate it feels\b/gi, 'its direct response')
    .replace(/\bone of those games\b/gi, 'a game')
    .replace(/\bwhat makes it work\b/gi, 'its appeal')
    .replace(/\bthe setup\b/gi, 'the premise')
    .replace(/\bfever dream\b/gi, 'surreal spectacle');
}

function wordCount(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

function setFieldValue(field, value) {
  if (!field) return;
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
}

function setStatus(node, message, state = '') {
  if (!node) return;
  node.textContent = message;
  node.dataset.state = state;
}

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDelta(before, after) {
  if (!before) return 'optimised';
  const percent = Math.round((1 - (after / before)) * 100);
  if (percent > 0) return `${percent}% smaller than source`;
  if (percent < 0) return `${Math.abs(percent)}% larger after WebP conversion`;
  return 'same file size as source';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export {
  extractEditorialDescription,
  magazineChunkName,
  normaliseSlug,
  normaliseSystem,
  optimiseDescriptionForSeo,
  trimToSentenceBoundary,
  wordCount
};

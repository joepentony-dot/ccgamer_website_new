const VIDEO_METADATA_URL = '/data/video-metadata.json';
const DESCRIPTION_ENRICHMENTS_URL = '/data/game-description-enrichments.json';
const MAGAZINE_REVIEW_BASE_URL = '/data/magazine-game-reviews';
const THUMBNAIL_BASE_PATH = 'resources/images/thumbnails/all/';
const BOX3D_BASE_PATH = 'resources/images/games/boxes-3d/';
const WEBP_QUALITY = 0.86;
const MAX_IMAGE_DIMENSION = 1600;
const MIN_VERIFIED_SOURCE_WORDS = 90;
const META_MIN_CHARS = 70;
const META_MAX_CHARS = 165;

const cache = {
  videoMetadata: null,
  descriptionEnrichments: null,
  magazineChunks: new Map()
};

const extraZipFiles = new Map();
let thumbnailConversionActive = false;
let descriptionTimer = null;
let magazineTimer = null;

init();

function init() {
  if (document.documentElement.dataset.ccgGamePipelineAutomation === 'ready') return;
  document.documentElement.dataset.ccgGamePipelineAutomation = 'ready';

  addStyles();
  const ui = addUi();
  if (!ui) return;

  bindDescription(ui);
  bindMagazine(ui);
  bindThumbnail(ui);
  bindBoxArt(ui);
  patchZipGeneration();

  queueMagazineCheck(ui);
}

function addStyles() {
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

function addUi() {
  const description = document.querySelector('[data-field="description"]');
  const videoId = document.querySelector('[data-field="videoId"]');
  const thumbnailInput = document.querySelector('[data-thumbnail-file]');
  const thumbnailPath = document.querySelector('[data-field="thumbnail"]');
  const boxPath = document.querySelector('[data-field="box3d"]');
  if (!description || !videoId || !thumbnailInput || !thumbnailPath || !boxPath) return null;

  const descriptionPanel = document.createElement('div');
  descriptionPanel.className = 'pipeline-automation-panel';
  descriptionPanel.innerHTML = `
    <strong>Verified SEO description</strong>
    <span class="hint">Builds the admin SEO summary from verified CCG source text. The normal rebuild keeps the fuller grounded game overview; unsupported facts are never invented.</span>
    <div class="actions">
      <button type="button" class="ccg-btn ccg-btn--ghost" data-pipeline-description-fill>Generate / refresh SEO description</button>
    </div>
    <p class="pipeline-automation-status" data-pipeline-description-status>Enter a valid YouTube Video ID to check the verified source archive.</p>
  `;
  description.closest('label')?.insertAdjacentElement('afterend', descriptionPanel);

  const magazinePanel = document.createElement('div');
  magazinePanel.className = 'pipeline-automation-panel';
  magazinePanel.innerHTML = `
    <strong>Automatic magazine-rating capture</strong>
    <span class="hint">No magazine score is entered manually. The existing review archive is matched by platform + slug and attached by the normal rebuild.</span>
    <p class="pipeline-automation-status" data-pipeline-magazine-status>Choose a system and title/slug to check automatic coverage.</p>
    <ul class="pipeline-review-list" data-pipeline-magazine-list hidden></ul>
  `;
  descriptionPanel.insertAdjacentElement('afterend', magazinePanel);

  const thumbnailPanel = thumbnailInput.closest('.thumbnail-option-panel') || thumbnailInput.parentElement;
  const thumbnailStatus = document.createElement('p');
  thumbnailStatus.className = 'pipeline-automation-status';
  thumbnailStatus.textContent = 'PNG/JPEG/WebP uploads are converted to an optimised WebP automatically.';
  thumbnailPanel?.appendChild(thumbnailStatus);

  const boxPanel = document.createElement('div');
  boxPanel.className = 'full thumbnail-option-panel';
  boxPanel.innerHTML = `
    <label>Local 3D box-art image (optional, auto WebP)
      <input type="file" data-pipeline-box-file accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" />
    </label>
    <p class="hint">Converted in-browser and bundled at <code>${BOX3D_BASE_PATH}&lt;slug&gt;.webp</code>, matching the live game renderer.</p>
    <p class="pipeline-automation-status" data-pipeline-box-status>No local 3D box art selected.</p>
  `;
  thumbnailPanel?.insertAdjacentElement('afterend', boxPanel);

  return {
    description,
    videoId,
    title: document.querySelector('[data-field="title"]'),
    system: document.querySelector('[data-field="system"]'),
    year: document.querySelector('[data-field="year"]'),
    slug: document.querySelector('[data-field="slug"]'),
    publisher: document.querySelector('[data-field="creditsPublisher"]'),
    descriptionButton: descriptionPanel.querySelector('[data-pipeline-description-fill]'),
    descriptionStatus: descriptionPanel.querySelector('[data-pipeline-description-status]'),
    magazineStatus: magazinePanel.querySelector('[data-pipeline-magazine-status]'),
    magazineList: magazinePanel.querySelector('[data-pipeline-magazine-list]'),
    thumbnailInput,
    thumbnailPath,
    thumbnailStatus,
    boxPath,
    boxInput: boxPanel.querySelector('[data-pipeline-box-file]'),
    boxStatus: boxPanel.querySelector('[data-pipeline-box-status]')
  };
}

function bindDescription(ui) {
  ui.descriptionButton?.addEventListener('click', () => queueDescription(ui, true));
  ui.videoId.addEventListener('input', () => {
    if (/^[A-Za-z0-9_-]{11}$/.test(ui.videoId.value.trim()) && !ui.description.value.trim()) {
      queueDescription(ui, false);
    }
  });
}

function queueDescription(ui, force) {
  window.clearTimeout(descriptionTimer);
  descriptionTimer = window.setTimeout(() => generateDescription(ui, force), force ? 0 : 180);
}

async function generateDescription(ui, force) {
  const videoId = ui.videoId.value.trim();
  const slug = normaliseSlug(ui.slug.value || ui.title.value);

  if (!force && ui.description.value.trim()) {
    setStatus(ui.descriptionStatus, 'Existing description retained. Use Generate / refresh if you want to replace it.', 'ok');
    return;
  }
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    setStatus(ui.descriptionStatus, 'A valid 11-character YouTube Video ID is required for verified automatic copy.', 'warning');
    return;
  }

  setStatus(ui.descriptionStatus, 'Checking verified CCG description sources…');
  try {
    const source = await findVerifiedSource(videoId, slug);
    if (!source || wordCount(source.text) < MIN_VERIFIED_SOURCE_WORDS) {
      setStatus(ui.descriptionStatus, 'No sufficiently detailed verified source matched this Video ID. Nothing was invented or inserted.', 'warning');
      return;
    }

    const summary = buildSeoSummary(source.text, readFacts(ui));
    if (summary.length < META_MIN_CHARS || summary.length > 170) {
      setStatus(ui.descriptionStatus, 'Verified source found, but a safe 70–170 character SEO summary could not be produced automatically.', 'warning');
      return;
    }

    setField(ui.description, summary);
    setStatus(
      ui.descriptionStatus,
      `SEO description added from ${source.label} (${summary.length} characters). The rebuild can use the same verified source for the fuller game overview.`,
      'ok'
    );
  } catch (error) {
    console.error('[game-pipeline-automation] description', error);
    setStatus(ui.descriptionStatus, `Description source check failed: ${error.message}`, 'error');
  }
}

async function findVerifiedSource(videoId, slug) {
  const metadataPayload = await loadJson('videoMetadata', VIDEO_METADATA_URL);
  const rawVideoDescription = metadataPayload?.videos?.[videoId]?.description;
  if (rawVideoDescription) {
    const editorial = extractEditorialText(rawVideoDescription);
    if (wordCount(editorial) >= MIN_VERIFIED_SOURCE_WORDS) {
      return { text: editorial, label: 'verified CCG YouTube metadata' };
    }
  }

  if (slug) {
    try {
      const enrichments = await loadJson('descriptionEnrichments', DESCRIPTION_ENRICHMENTS_URL);
      const archived = normaliseText(enrichments?.games?.[slug]?.description || '');
      if (wordCount(archived) >= MIN_VERIFIED_SOURCE_WORDS) {
        return { text: archived, label: 'the grounded CCG description archive' };
      }
    } catch (error) {
      console.warn('[game-pipeline-automation] description archive unavailable', error);
    }
  }

  return null;
}

function readFacts(ui) {
  const genre = Array.from(document.querySelectorAll('[data-option-type="genres"]:checked'))
    .map((node) => String(node.dataset.optionValue || '').replace(/-/g, ' '))
    .find(Boolean) || '';
  return {
    title: ui.title.value.trim(),
    platform: ui.system.value === 'AMIGA' ? 'Amiga' : ui.system.value === 'C64' ? 'Commodore 64' : '',
    year: /^\d{4}$/.test(ui.year.value.trim()) ? ui.year.value.trim() : '',
    publisher: ui.publisher.value.split(',')[0].trim(),
    genre
  };
}

function buildSeoSummary(sourceText, facts) {
  const source = normaliseText(sourceText);
  const factualPrefix = buildFactualPrefix(facts);
  const sourceSentences = sentenceList(source);
  const candidates = [];

  if (factualPrefix) candidates.push(factualPrefix);
  for (const sentence of sourceSentences) {
    const normalized = normaliseText(sentence);
    if (!normalized) continue;
    if (factualPrefix && normalized.toLowerCase().startsWith(String(facts.title || '').toLowerCase())) continue;
    candidates.push(normalized);
    if (candidates.join(' ').length >= META_MIN_CHARS) break;
  }

  let summary = normaliseText(candidates.join(' '));
  if (!summary) summary = source;
  summary = truncateAtWord(summary, META_MAX_CHARS);

  if (summary.length < META_MIN_CHARS) {
    summary = truncateAtWord(`${summary} ${source}`, META_MAX_CHARS);
  }
  return summary.replace(/[,:;\-–—\s]+$/, '').replace(/[^.!?]$/, '$&.');
}

function buildFactualPrefix(facts) {
  if (!facts.title || !facts.platform) return '';
  const descriptors = [];
  if (facts.year) descriptors.push(facts.year);
  descriptors.push(facts.platform);
  if (facts.genre) descriptors.push(facts.genre);
  return `${facts.title} is a ${descriptors.join(' ')} game${facts.publisher ? ` published by ${facts.publisher}` : ''}.`;
}

function truncateAtWord(value, limit) {
  const text = normaliseText(value);
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit + 1);
  const boundary = cut.lastIndexOf(' ');
  return (boundary >= Math.max(40, limit - 35) ? cut.slice(0, boundary) : text.slice(0, limit)).trim();
}

function extractEditorialText(raw) {
  const paragraphs = String(raw || '')
    .split(/\n\s*\n+/)
    .map(normaliseText)
    .filter((paragraph) => {
      const lower = paragraph.toLowerCase();
      if (!paragraph || /https?:\/\/|www\./i.test(paragraph)) return false;
      if (/^(playlists?|support|connect|website|patreon|join|twitter|facebook|discord|subscribe|full game info|related videos?)\b/i.test(lower)) return false;
      if (/^#/.test(paragraph) || /#[a-z0-9_]+/i.test(paragraph)) return false;
      if (/\b(comment below|did you play|what do you think|have you played|do you remember)\b/i.test(lower)) return false;
      return wordCount(paragraph) >= 7;
    });
  return normaliseText(paragraphs.join(' '));
}

function bindMagazine(ui) {
  const schedule = () => queueMagazineCheck(ui);
  ui.system.addEventListener('change', schedule);
  ui.slug.addEventListener('input', schedule);
  ui.title.addEventListener('input', schedule);
}

function queueMagazineCheck(ui) {
  window.clearTimeout(magazineTimer);
  magazineTimer = window.setTimeout(() => checkMagazine(ui), 220);
}

async function checkMagazine(ui) {
  const system = normaliseSystem(ui.system.value);
  const slug = normaliseSlug(ui.slug.value || ui.title.value);
  ui.magazineList.hidden = true;
  ui.magazineList.innerHTML = '';
  if (!system || !slug) {
    setStatus(ui.magazineStatus, 'Choose a system and title/slug to check automatic coverage.');
    return;
  }

  const key = `${system}:${slug}`;
  setStatus(ui.magazineStatus, `Checking curated magazine records for ${key}…`);
  try {
    const payload = await loadMagazineChunk(magazineChunkName(slug));
    const rows = Array.isArray(payload?.games?.[key]) ? payload.games[key] : [];
    if (!rows.length) {
      setStatus(ui.magazineStatus, `No curated magazine record currently matches ${key}. The rebuild will not invent a score.`, 'warning');
      return;
    }
    setStatus(ui.magazineStatus, `Automatic capture ready: ${rows.length} matching magazine review${rows.length === 1 ? '' : 's'} will be attached by the normal rebuild.`, 'ok');
    ui.magazineList.innerHTML = rows.slice(0, 6).map((row) => `<li>${escapeHtml(row.magazine)}${row.issue ? `, ${escapeHtml(row.issue)}` : ''}: ${escapeHtml(row.score)}</li>`).join('');
    ui.magazineList.hidden = false;
  } catch (error) {
    setStatus(ui.magazineStatus, `Magazine coverage check failed: ${error.message}`, 'error');
  }
}

function bindThumbnail(ui) {
  ui.thumbnailInput.addEventListener('change', async () => {
    if (thumbnailConversionActive) return;
    const source = ui.thumbnailInput.files?.[0];
    if (!source) return;

    setStatus(ui.thumbnailStatus, 'Converting image to WebP…');
    try {
      const slug = normaliseSlug(ui.slug.value || ui.title.value || source.name.replace(/\.[^.]+$/, '')) || 'game-art';
      const result = await convertToWebp(source, `${slug}.webp`);
      replaceSelectedFile(ui.thumbnailInput, result.file);
      setField(ui.thumbnailPath, `${THUMBNAIL_BASE_PATH}${result.file.name}`);
      setStatus(ui.thumbnailStatus, `${result.width}×${result.height} WebP ready at ${formatBytes(result.file.size)} (${sizeDelta(source.size, result.file.size)}). It will be bundled automatically.`, 'ok');
    } catch (error) {
      setStatus(ui.thumbnailStatus, `Image conversion failed: ${error.message}`, 'error');
    }
  });
}

function bindBoxArt(ui) {
  ui.boxInput?.addEventListener('change', async () => {
    const source = ui.boxInput.files?.[0];
    if (!source) return;
    setStatus(ui.boxStatus, 'Converting 3D box art to WebP…');
    try {
      const slug = normaliseSlug(ui.slug.value || ui.title.value || source.name.replace(/\.[^.]+$/, '')) || 'game-box';
      const result = await convertToWebp(source, `${slug}.webp`);
      const path = `${BOX3D_BASE_PATH}${result.file.name}`;
      extraZipFiles.clear();
      extraZipFiles.set(path, result.file);
      setField(ui.boxPath, path);
      setStatus(ui.boxStatus, `${result.width}×${result.height} WebP ready at ${formatBytes(result.file.size)} (${sizeDelta(source.size, result.file.size)}). It will be bundled automatically.`, 'ok');
    } catch (error) {
      extraZipFiles.clear();
      setStatus(ui.boxStatus, `Box-art conversion failed: ${error.message}`, 'error');
    }
  });
}

function patchZipGeneration() {
  const Zip = window.JSZip;
  if (!Zip?.prototype?.generateAsync || Zip.prototype.generateAsync.__ccgPipelinePatched) return;
  const original = Zip.prototype.generateAsync;
  async function generateWithExtras(...args) {
    for (const [path, file] of extraZipFiles.entries()) {
      if (!this.files[path]) this.file(path, file);
    }
    return original.apply(this, args);
  }
  generateWithExtras.__ccgPipelinePatched = true;
  Zip.prototype.generateAsync = generateWithExtras;
}

async function convertToWebp(source, filename) {
  if (!/^image\/(?:png|jpeg|webp)$/i.test(source.type)) throw new Error('Select a PNG, JPEG or WebP image.');
  const image = await decodeImage(source);
  const sourceWidth = image.width || image.naturalWidth;
  const sourceHeight = image.height || image.naturalHeight;
  if (!sourceWidth || !sourceHeight) throw new Error('Image dimensions could not be read.');

  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) throw new Error('Browser image conversion is unavailable.');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, width, height);
  if (typeof image.close === 'function') image.close();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY));
  if (!blob || blob.type !== 'image/webp') throw new Error('The browser did not produce a WebP file.');
  return { file: new File([blob], filename.toLowerCase(), { type: 'image/webp', lastModified: Date.now() }), width, height };
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

function replaceSelectedFile(input, file) {
  if (typeof DataTransfer !== 'function') throw new Error('This browser cannot replace the selected file after conversion.');
  const transfer = new DataTransfer();
  transfer.items.add(file);
  thumbnailConversionActive = true;
  try {
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  } finally {
    thumbnailConversionActive = false;
  }
}

async function loadJson(cacheKey, url) {
  if (!cache[cacheKey]) {
    cache[cacheKey] = fetch(url, { cache: 'no-store' }).then((response) => {
      if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
      return response.json();
    }).catch((error) => {
      cache[cacheKey] = null;
      throw error;
    });
  }
  return cache[cacheKey];
}

async function loadMagazineChunk(chunk) {
  if (!cache.magazineChunks.has(chunk)) {
    const promise = fetch(`${MAGAZINE_REVIEW_BASE_URL}/${chunk}.json`, { cache: 'no-store' }).then((response) => {
      if (!response.ok) throw new Error(`${chunk}.json returned HTTP ${response.status}`);
      return response.json();
    }).catch((error) => {
      cache.magazineChunks.delete(chunk);
      throw error;
    });
    cache.magazineChunks.set(chunk, promise);
  }
  return cache.magazineChunks.get(chunk);
}

function magazineChunkName(slug) {
  const first = String(slug || '').charAt(0).toLowerCase();
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

function sentenceList(value) {
  const matches = String(value || '').match(/[^.!?]+[.!?]+[”"']?/g);
  return (matches || [value]).map(normaliseText).filter(Boolean);
}

function normaliseText(value) {
  return String(value || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[-–—•|>\s]+/, '');
}

function wordCount(value) {
  return normaliseText(value).split(/\s+/).filter(Boolean).length;
}

function setField(field, value) {
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

function sizeDelta(before, after) {
  if (!before) return 'optimised';
  const percent = Math.round((1 - (after / before)) * 100);
  if (percent > 0) return `${percent}% smaller than source`;
  if (percent < 0) return `${Math.abs(percent)}% larger after conversion`;
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

window.CCGGamePipelineAutomation = Object.freeze({
  buildSeoSummary,
  extractEditorialText,
  magazineChunkName,
  normaliseSlug,
  normaliseSystem,
  truncateAtWord,
  wordCount
});

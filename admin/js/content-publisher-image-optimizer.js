import './content-publisher-status-reconciler.js';

const MAX_WIDTH = 1280;
const MAX_HEIGHT = 960;
const TARGET_BYTES = 650 * 1024;
const HARD_BYTES = 900 * 1024;
const PRIMARY_QUALITY = 0.9;
const SECONDARY_QUALITY = 0.84;
const FINAL_QUALITY = 0.8;
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const THUMBNAIL_PREFIX = 'resources/images/thumbnails/all/';

const fileInput = document.querySelector('[data-game-thumbnail-file]');
const pathInput = document.querySelector('[data-game-field="thumbnail"]');
const slugInput = document.querySelector('[data-game-field="slug"]');
const publishButton = document.querySelector('[data-publish-game]');
const gameForm = document.querySelector('[data-game-form]');

if (fileInput && pathInput && publishButton) {
  const status = document.createElement('small');
  status.dataset.thumbnailOptimizationStatus = 'true';
  status.setAttribute('aria-live', 'polite');
  status.textContent = 'PNG, JPEG and WebP uploads can be optimised locally. An explicit .jpg, .jpeg or .png thumbnail path is preserved exactly.';
  fileInput.insertAdjacentElement('afterend', status);

  fileInput.addEventListener('change', () => {
    void optimiseSelectedImage();
  });

  gameForm?.addEventListener('submit', () => {
    const selected = fileInput.files?.[0] || null;
    const current = String(pathInput.value || '').trim();
    if (selected?.type === 'image/webp' && (!current || /\.webp$/i.test(current))) {
      updateThumbnailPathToWebp(selected.name);
    }
  }, { capture: true });
}

async function optimiseSelectedImage() {
  const original = fileInput.files?.[0] || null;
  if (!original) {
    setStatus('No local thumbnail selected. Existing repository image will be used if the path is valid.', 'idle');
    return;
  }

  if (!ALLOWED_TYPES.has(original.type)) {
    setStatus('Automatic optimisation supports PNG, JPEG and WebP only. Choose a supported image.', 'error');
    clearSelectedFile();
    return;
  }

  const requestedExtension = imageExtension(pathInput.value);
  const selectedExtension = imageExtensionFromMime(original.type);
  if (requestedExtension && requestedExtension !== 'webp') {
    if (!extensionsMatch(requestedExtension, selectedExtension)) {
      setStatus(`Thumbnail path ends in .${requestedExtension}, but the selected file is ${selectedExtension ? `.${selectedExtension}` : original.type}. Keep the path and file format the same.`, 'error');
      clearSelectedFile();
      return;
    }

    const state = original.size <= HARD_BYTES ? 'ok' : 'warning';
    setStatus(
      `Using ${original.name} unchanged at the exact ${pathInput.value.trim()} path (${formatBytes(original.size)}). No WebP rename or conversion will be applied.`,
      state
    );
    return;
  }

  if (typeof DataTransfer !== 'function') {
    setStatus('This browser cannot safely replace the selected file after optimisation. The original selection has been left unchanged.', 'warning');
    return;
  }

  setBusy(true);
  setStatus(`Optimising ${formatBytes(original.size)} locally…`, 'working');

  let source = null;
  try {
    source = await decodeImage(original);
    const sourceWidth = Number(source.width || source.naturalWidth || 0);
    const sourceHeight = Number(source.height || source.naturalHeight || 0);
    if (!sourceWidth || !sourceHeight) throw new Error('Image dimensions could not be read.');

    const firstScale = Math.min(1, MAX_WIDTH / sourceWidth, MAX_HEIGHT / sourceHeight);
    const firstWidth = Math.max(1, Math.round(sourceWidth * firstScale));
    const firstHeight = Math.max(1, Math.round(sourceHeight * firstScale));
    let output = await encodeWebp(source, firstWidth, firstHeight, PRIMARY_QUALITY);
    let outputWidth = firstWidth;
    let outputHeight = firstHeight;

    if (output.size > TARGET_BYTES) {
      output = await encodeWebp(source, firstWidth, firstHeight, SECONDARY_QUALITY);
    }

    if (output.size > HARD_BYTES) {
      const extraScale = Math.min(1, 1024 / sourceWidth, 768 / sourceHeight);
      outputWidth = Math.max(1, Math.round(sourceWidth * extraScale));
      outputHeight = Math.max(1, Math.round(sourceHeight * extraScale));
      output = await encodeWebp(source, outputWidth, outputHeight, FINAL_QUALITY);
    }

    const alreadyWebp = original.type === 'image/webp';
    const noResize = outputWidth === sourceWidth && outputHeight === sourceHeight;
    const keepOriginalWebp = alreadyWebp && noResize && original.size <= output.size && original.size <= HARD_BYTES;
    const finalBlob = keepOriginalWebp ? original : output;
    const finalName = replaceExtension(original.name || 'thumbnail', 'webp');
    const finalFile = keepOriginalWebp
      ? original
      : new File([finalBlob], finalName, { type: 'image/webp', lastModified: original.lastModified || Date.now() });

    replaceFileSelection(finalFile);
    updateThumbnailPathToWebp(finalFile.name);

    const saving = original.size > finalFile.size ? original.size - finalFile.size : 0;
    const savingPercent = original.size > 0 ? Math.round((saving / original.size) * 100) : 0;
    const dimensions = `${sourceWidth}×${sourceHeight}${sourceWidth !== outputWidth || sourceHeight !== outputHeight ? ` → ${outputWidth}×${outputHeight}` : ''}`;
    const message = keepOriginalWebp
      ? `Thumbnail already efficient: ${formatBytes(finalFile.size)} · ${dimensions}. Original WebP retained.`
      : `Optimised: ${formatBytes(original.size)} → ${formatBytes(finalFile.size)}${saving > 0 ? ` (${savingPercent}% smaller)` : ''} · ${dimensions} · WebP.`;
    setStatus(message, finalFile.size <= HARD_BYTES ? 'ok' : 'warning');
  } catch (error) {
    setStatus(`Automatic thumbnail optimisation stopped safely: ${error.message || error}. The original file remains on your computer; choose another image before publishing.`, 'error');
    clearSelectedFile();
  } finally {
    closeDecodedImage(source);
    setBusy(false);
  }
}

async function decodeImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // Fall back to a normal browser Image below for engines with partial createImageBitmap support.
    }
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('The selected image could not be decoded.'));
    };
    image.src = objectUrl;
  });
}

function closeDecodedImage(source) {
  if (source && typeof source.close === 'function') source.close();
}

async function encodeWebp(source, width, height, quality) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) throw new Error('Canvas image processing is unavailable.');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, width, height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
  if (!blob || blob.type !== 'image/webp') throw new Error('This browser could not create a WebP thumbnail.');
  return blob;
}

function replaceFileSelection(file) {
  const transfer = new DataTransfer();
  transfer.items.add(file);
  fileInput.files = transfer.files;
}

function clearSelectedFile() {
  try {
    const transfer = new DataTransfer();
    fileInput.files = transfer.files;
  } catch {
    fileInput.value = '';
  }
}

function updateThumbnailPathToWebp(fileName = '') {
  const current = String(pathInput.value || '').trim();
  if (current && !/\.webp$/i.test(current)) return;

  if (current) {
    pathInput.value = replaceExtension(current, 'webp');
  } else {
    const slug = String(slugInput?.value || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    const fallback = replaceExtension(String(fileName || 'thumbnail').split(/[\\/]/).pop(), 'webp')
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-');
    pathInput.value = `${THUMBNAIL_PREFIX}${slug ? `${slug}.webp` : fallback}`;
  }
  pathInput.dispatchEvent(new Event('input', { bubbles: true }));
  pathInput.dispatchEvent(new Event('change', { bubbles: true }));
}

function imageExtension(value) {
  const match = String(value || '').trim().toLowerCase().match(/\.(png|jpe?g|webp)$/i);
  if (!match) return '';
  return match[1] === 'jpeg' ? 'jpg' : match[1];
}

function imageExtensionFromMime(value) {
  const mime = String(value || '').toLowerCase();
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return '';
}

function extensionsMatch(left, right) {
  return String(left || '').toLowerCase() === String(right || '').toLowerCase();
}

function replaceExtension(value, extension) {
  const text = String(value || '').trim();
  if (!text) return `thumbnail.${extension}`;
  if (/\.[a-z0-9]+$/i.test(text)) return text.replace(/\.[a-z0-9]+$/i, `.${extension}`);
  return `${text}.${extension}`;
}

function setBusy(busy) {
  publishButton.disabled = busy;
  fileInput.disabled = busy;
  pathInput.readOnly = busy;
  document.body.dataset.thumbnailOptimising = busy ? 'true' : 'false';
}

function setStatus(message, state) {
  const node = document.querySelector('[data-thumbnail-optimization-status]');
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

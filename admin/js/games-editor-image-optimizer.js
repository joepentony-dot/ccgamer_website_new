const thumbnailInput = document.querySelector('[data-thumbnail-file]');
const optimiserStatus = document.querySelector('[data-thumbnail-optimiser-status]');

const MAX_DIMENSION = 1200;
const WEBP_QUALITY = 0.84;
const processedFiles = new WeakSet();
let optimisationRun = 0;

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function setStatus(message, isError = false) {
  if (!optimiserStatus) return;
  optimiserStatus.textContent = message;
  optimiserStatus.classList.toggle('thumbnail-warning', isError);
}

function fileStem(filename) {
  return String(filename || 'thumbnail')
    .replace(/\.[^.]+$/, '')
    .trim() || 'thumbnail';
}

async function decodeImage(file) {
  if ('createImageBitmap' in window) {
    let bitmap;
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch (_error) {
      bitmap = await createImageBitmap(file);
    }
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close?.(),
    };
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('The selected image could not be decoded.'));
      img.src = objectUrl;
    });

    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function canvasToWebp(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('This browser could not create a WebP image.'));
        return;
      }
      resolve(blob);
    }, 'image/webp', WEBP_QUALITY);
  });
}

async function optimiseImage(file) {
  if (!file || !String(file.type || '').startsWith('image/')) {
    throw new Error('Please select a PNG, JPEG or WebP image.');
  }

  const decoded = await decodeImage(file);
  try {
    if (!decoded.width || !decoded.height) {
      throw new Error('The selected image has invalid dimensions.');
    }

    const longestEdge = Math.max(decoded.width, decoded.height);
    const scale = Math.min(1, MAX_DIMENSION / longestEdge);
    const targetWidth = Math.max(1, Math.round(decoded.width * scale));
    const targetHeight = Math.max(1, Math.round(decoded.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('The browser could not prepare the image optimiser.');

    context.drawImage(decoded.source, 0, 0, targetWidth, targetHeight);
    const blob = await canvasToWebp(canvas);

    if (file.type === 'image/webp' && scale === 1 && blob.size >= file.size) {
      return {
        file,
        sourceWidth: decoded.width,
        sourceHeight: decoded.height,
        targetWidth,
        targetHeight,
        sourceSize: file.size,
        targetSize: file.size,
        alreadyOptimised: true,
      };
    }

    const optimisedFile = new File(
      [blob],
      `${fileStem(file.name)}.webp`,
      { type: 'image/webp', lastModified: Date.now() },
    );

    return {
      file: optimisedFile,
      sourceWidth: decoded.width,
      sourceHeight: decoded.height,
      targetWidth,
      targetHeight,
      sourceSize: file.size,
      targetSize: optimisedFile.size,
      alreadyOptimised: false,
    };
  } finally {
    decoded.close();
  }
}

function replaceSelectedFile(file) {
  const transfer = new DataTransfer();
  transfer.items.add(file);
  thumbnailInput.files = transfer.files;
}

async function handleThumbnailChange(event) {
  const sourceFile = thumbnailInput?.files?.[0];
  if (!sourceFile || processedFiles.has(sourceFile)) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  const run = ++optimisationRun;
  setStatus(`Optimising ${sourceFile.name} to WebP…`);

  try {
    const result = await optimiseImage(sourceFile);
    if (run !== optimisationRun) return;

    processedFiles.add(result.file);
    replaceSelectedFile(result.file);

    if (result.alreadyOptimised) {
      setStatus(
        `Already optimised: WebP ${result.targetWidth}×${result.targetHeight}, ${formatBytes(result.targetSize)}.`,
      );
    } else {
      const resized = result.sourceWidth !== result.targetWidth || result.sourceHeight !== result.targetHeight;
      const dimensions = resized
        ? `${result.sourceWidth}×${result.sourceHeight} → ${result.targetWidth}×${result.targetHeight}`
        : `${result.targetWidth}×${result.targetHeight}`;
      setStatus(
        `WebP ready: ${dimensions}; ${formatBytes(result.sourceSize)} → ${formatBytes(result.targetSize)}.`,
      );
    }

    thumbnailInput.dispatchEvent(new Event('change', { bubbles: true }));
  } catch (error) {
    if (run !== optimisationRun) return;

    console.error('Thumbnail WebP optimisation failed:', error);
    processedFiles.add(sourceFile);
    setStatus(
      `WebP optimisation failed (${error?.message || 'unknown error'}). The original image will be used.`,
      true,
    );
    thumbnailInput.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

if (thumbnailInput) {
  thumbnailInput.addEventListener('change', handleThumbnailChange, true);
}

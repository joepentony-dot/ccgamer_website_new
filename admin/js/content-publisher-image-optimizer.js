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
  status.textContent = 'PNG, JPEG and WebP uploads are optimised locally before publishing. Your original file is never changed.';
  fileInput.insertAdjacentElement('afterend', status);

  fileInput.addEventListener('change', () => {
    void optimiseSelectedImage();
  });

  gameForm?.addEventListener('submit', () => {
    const selected = fileInput.files?.[0] || null;
    if (selected?.type === 'image/webp') updateThumbnailPathToWebp(selected.name);
  }, { capture: true });
}

installPublishingStatusReconciler();

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

function installPublishingStatusReconciler() {
  const log = document.querySelector('[data-publisher-log]');
  if (!log || typeof MutationObserver !== 'function') return;

  let inFlight = false;
  let lastReconciledSha = '';

  const reconcile = async () => {
    if (inFlight) return;
    const text = String(log.textContent || '');
    const failureIndex = text.lastIndexOf('Automated publishing check failed: Reliable Games Publishing finished with failure.');
    if (failureIndex < 0) return;

    const sourceMatches = [...text.matchAll(/Source commit created:\s*([0-9a-f]{40})/gi)];
    const sourceSha = sourceMatches.at(-1)?.[1] || '';
    const latestStartIndex = Math.max(
      text.lastIndexOf('Preparing new game:'),
      text.lastIndexOf('Preparing new feature:'),
      text.lastIndexOf('Preparing Zzap!64 awards year:')
    );

    if (!sourceSha || failureIndex < latestStartIndex || sourceSha === lastReconciledSha) return;
    lastReconciledSha = sourceSha;
    inFlight = true;

    try {
      await reconcileReliableGamesWorkflow(sourceSha);
    } catch (_error) {
      setPublisherPipelineStep('metadata', 'running', 'See workflow');
      setPublisherPipelineStep('pages', 'error', 'Workflow failed');
      ['library', 'sitemaps', 'validation'].forEach((step) => {
        setPublisherPipelineStep(step, 'running', 'Not confirmed');
      });
    } finally {
      inFlight = false;
    }
  };

  const observer = new MutationObserver(() => { void reconcile(); });
  observer.observe(log, { childList: true, subtree: true, characterData: true });
  void reconcile();
}

async function reconcileReliableGamesWorkflow(sourceSha) {
  const owner = String(document.querySelector('[data-github-owner]')?.value || '').trim();
  const repo = String(document.querySelector('[data-github-repo]')?.value || '').trim();
  const branch = String(document.querySelector('[data-github-branch]')?.value || 'main').trim();
  const token = String(document.querySelector('[data-github-token]')?.value || '').trim();
  if (!owner || !repo || !branch || !token) throw new Error('GitHub publishing connection is unavailable.');

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  const runsUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/workflows/games-publishing.yml/runs?branch=${encodeURIComponent(branch)}&per_page=20`;
  const runsResponse = await fetch(runsUrl, { headers, cache: 'no-store' });
  if (!runsResponse.ok) throw new Error(`Workflow lookup returned HTTP ${runsResponse.status}.`);
  const runsPayload = await runsResponse.json();
  const run = (Array.isArray(runsPayload?.workflow_runs) ? runsPayload.workflow_runs : [])
    .find((item) => item?.head_sha === sourceSha);
  if (!run?.id) throw new Error('Matching Reliable Games Publishing run was not found.');

  const jobsResponse = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs/${run.id}/jobs`, {
    headers,
    cache: 'no-store'
  });
  if (!jobsResponse.ok) throw new Error(`Workflow jobs lookup returned HTTP ${jobsResponse.status}.`);
  const jobsPayload = await jobsResponse.json();
  const jobs = Array.isArray(jobsPayload?.jobs) ? jobsPayload.jobs : [];
  const steps = jobs.flatMap((job) => Array.isArray(job?.steps) ? job.steps : []);
  const metadataStep = steps.find((step) => step?.name === 'Sync verified YouTube metadata');
  const publishStep = steps.find((step) => step?.name === 'Run authoritative publishing command');

  applyWorkflowStepResult('metadata', metadataStep, 'Synced', 'Sync failed');

  if (publishStep?.conclusion === 'failure') {
    setPublisherPipelineStep('pages', 'error', 'Build failed');
    ['library', 'sitemaps', 'validation'].forEach((step) => {
      setPublisherPipelineStep(step, 'running', 'Not confirmed');
    });
    return;
  }

  if (publishStep?.conclusion === 'success') {
    setPublisherPipelineStep('pages', 'ok', 'Generated');
    setPublisherPipelineStep('library', 'ok', 'Updated');
    setPublisherPipelineStep('sitemaps', 'ok', 'Updated');
    setPublisherPipelineStep('validation', 'ok', 'Passed');
    return;
  }

  setPublisherPipelineStep('pages', 'running', 'Not confirmed');
  ['library', 'sitemaps', 'validation'].forEach((step) => {
    setPublisherPipelineStep(step, 'running', 'Not confirmed');
  });
}

function applyWorkflowStepResult(stepName, workflowStep, successText, failureText) {
  if (workflowStep?.conclusion === 'success') {
    setPublisherPipelineStep(stepName, 'ok', successText);
    return;
  }
  if (workflowStep?.conclusion === 'failure') {
    setPublisherPipelineStep(stepName, 'error', failureText);
    return;
  }
  setPublisherPipelineStep(stepName, 'running', 'Not confirmed');
}

function setPublisherPipelineStep(step, state, text) {
  const node = document.querySelector(`[data-pipeline-step="${step}"]`);
  if (!node) return;
  node.classList.remove('is-running', 'is-ok', 'is-error');
  if (state === 'running') node.classList.add('is-running');
  if (state === 'ok') node.classList.add('is-ok');
  if (state === 'error') node.classList.add('is-error');
  const status = node.querySelector('b');
  if (status) status.textContent = text;
}

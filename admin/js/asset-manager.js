import { logout } from './auth.js';
import { ensureRole, startAccessMonitor } from './guard.js';
import { createSnapshot, getHealthReport, scanAssets, uploadAssets } from './asset-manager-api.js';

const MAX_TARGET_BYTES = 500 * 1024;
const allowedRoles = ['editor', 'admin', 'superadmin'];

const state = {
  role: null,
  assets: [],
  queuedFiles: [],
  selectedAssetPath: ''
};

const els = {
  email: document.querySelector('[data-admin-email]'),
  role: document.querySelector('[data-admin-role]'),
  rolePolicy: document.querySelector('[data-role-policy]'),
  assetCount: document.querySelector('[data-asset-count]'),
  refreshIndex: document.querySelector('[data-refresh-index]'),
  runHealth: document.querySelector('[data-run-health]'),
  search: document.querySelector('[data-asset-search]'),
  assetList: document.querySelector('[data-asset-list]'),
  dropzone: document.querySelector('[data-dropzone]'),
  fileInput: document.querySelector('[data-file-input]'),
  uploadFolder: document.querySelector('[data-upload-folder]'),
  uploadBatch: document.querySelector('[data-upload-batch]'),
  uploadQueue: document.querySelector('[data-upload-queue]'),
  filenameInput: document.querySelector('[data-filename-input]'),
  suggestName: document.querySelector('[data-suggest-name]'),
  normaliserOutput: document.querySelector('[data-normaliser-output]'),
  previewStage: document.querySelector('[data-box-preview-stage]'),
  previewBox: document.querySelector('[data-box-preview]'),
  previewImage: document.querySelector('[data-box-preview-image]'),
  gameIdInput: document.querySelector('[data-game-id]'),
  assetPathInput: document.querySelector('[data-asset-path]'),
  validateLink: document.querySelector('[data-validate-link]'),
  linkingResult: document.querySelector('[data-linking-result]'),
  backupSnapshot: document.querySelector('[data-backup-snapshot]'),
  restoreHint: document.querySelector('[data-restore-hint]'),
  healthReport: document.querySelector('[data-health-report]'),
  logoutButton: document.querySelector('[data-logout-button]')
};

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[^\w\s.-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

function ensureExtension(path, fallback = 'webp') {
  if (/\.[a-z0-9]+$/i.test(path)) {
    return path.toLowerCase();
  }
  return `${path}.${fallback}`;
}

function prettyBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function setRolePolicy(role) {
  if (role === 'editor') {
    els.rolePolicy.textContent = 'Editor: upload + preview only (no delete/purge).';
    return;
  }
  if (role === 'admin') {
    els.rolePolicy.textContent = 'Admin: upload, index, link, and health management.';
    return;
  }
  els.rolePolicy.textContent = 'Superadmin: full controls including delete + purge endpoints.';
}

function renderAssetList(filter = '') {
  const term = filter.trim().toLowerCase();
  const list = term
    ? state.assets.filter((asset) => asset.path.toLowerCase().includes(term))
    : state.assets;

  els.assetList.innerHTML = '';

  for (const asset of list.slice(0, 500)) {
    const li = document.createElement('li');
    const pathButton = document.createElement('button');
    pathButton.type = 'button';
    pathButton.className = 'ccg-btn ccg-btn--ghost';
    pathButton.textContent = asset.path;
    pathButton.addEventListener('click', () => {
      state.selectedAssetPath = asset.path;
      els.assetPathInput.value = asset.path;
      if (/games\/boxes-3d\//.test(asset.path)) {
        els.previewImage.src = `/${asset.path}`;
      }
    });

    const size = document.createElement('span');
    size.textContent = prettyBytes(asset.size || 0);
    li.append(pathButton, size);
    els.assetList.append(li);
  }

  els.assetCount.textContent = `${state.assets.length} indexed`;
}

function renderQueue() {
  els.uploadQueue.innerHTML = '';
  for (const item of state.queuedFiles) {
    const li = document.createElement('li');
    li.innerHTML = `<span>${item.file.name}</span><span>${item.status}</span>`;
    els.uploadQueue.append(li);
  }
}

async function optimizeToWebp(file, maxBytes = MAX_TARGET_BYTES) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');

  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));

  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  let quality = 0.9;
  let blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));

  while (blob && blob.size > maxBytes && quality > 0.45) {
    quality -= 0.1;
    blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
  }

  if (!blob) {
    throw new Error(`Failed to optimize ${file.name}`);
  }

  const buffer = await blob.arrayBuffer();
  const webpName = ensureExtension(slugify(file.name.replace(/\.[^.]+$/, '')), 'webp');

  return {
    name: webpName,
    bytes: Array.from(new Uint8Array(buffer)),
    size: blob.size,
    mime: 'image/webp'
  };
}

function base64FromBytes(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunk));
  }
  return btoa(binary);
}

async function indexAssets() {
  const payload = await scanAssets();
  state.assets = payload.assets || [];
  renderAssetList(els.search.value || '');
}

async function runHealthReport() {
  const payload = await getHealthReport();
  els.healthReport.textContent = JSON.stringify(payload, null, 2);
}

function collectDroppedFiles(files) {
  for (const file of files) {
    state.queuedFiles.push({ file, status: 'Queued' });
  }
  renderQueue();
}

async function uploadBatch() {
  if (state.queuedFiles.length === 0) {
    return;
  }

  const destination = els.uploadFolder.value;

  for (const queueItem of state.queuedFiles) {
    queueItem.status = 'Optimising…';
    renderQueue();

    const optimized = await optimizeToWebp(queueItem.file);
    const originalBuffer = await queueItem.file.arrayBuffer();
    const originalBytes = Array.from(new Uint8Array(originalBuffer));

    const slugBase = slugify(queueItem.file.name.replace(/\.[^.]+$/, ''));
    const originalName = ensureExtension(slugBase, queueItem.file.name.split('.').pop() || 'png');

    queueItem.status = 'Uploading…';
    renderQueue();

    await uploadAssets({
      destination,
      files: [
        {
          name: originalName,
          mime: queueItem.file.type || 'application/octet-stream',
          size: queueItem.file.size,
          contentBase64: base64FromBytes(originalBytes),
          kind: 'original'
        },
        {
          name: optimized.name,
          mime: optimized.mime,
          size: optimized.size,
          contentBase64: base64FromBytes(optimized.bytes),
          kind: 'optimized'
        }
      ]
    });

    queueItem.status = `Done (${prettyBytes(optimized.size)})`;
    renderQueue();
  }

  await indexAssets();
}

function wireDropzone() {
  const stop = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
    els.dropzone.addEventListener(eventName, stop);
  });

  ['dragenter', 'dragover'].forEach((eventName) => {
    els.dropzone.addEventListener(eventName, () => {
      els.dropzone.classList.add('is-dragover');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    els.dropzone.addEventListener(eventName, () => {
      els.dropzone.classList.remove('is-dragover');
    });
  });

  els.dropzone.addEventListener('drop', (event) => {
    collectDroppedFiles(event.dataTransfer?.files || []);
  });

  els.fileInput.addEventListener('change', () => collectDroppedFiles(els.fileInput.files || []));
}

function wireNormalizer() {
  els.suggestName.addEventListener('click', () => {
    const raw = els.filenameInput.value;
    const withoutPath = raw.split('/').pop() || raw;
    const extension = (withoutPath.match(/\.([a-z0-9]+)$/i)?.[1] || 'webp').toLowerCase();
    const base = withoutPath.replace(/\.[^.]+$/, '');
    const suggested = `${slugify(base)}.${extension === 'jpeg' ? 'jpg' : extension}`;

    els.normaliserOutput.textContent = [
      `Input: ${raw || '(empty)'}`,
      `Suggestion: ${suggested}`,
      'Rules: lowercase, hyphen-separated, no spaces, slug-safe characters.'
    ].join('\n');
  });
}

function wire3DPreview() {
  els.previewStage.addEventListener('pointermove', (event) => {
    const rect = els.previewStage.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const rotateY = (x - 0.5) * 24;
    const rotateX = (0.5 - y) * 18;
    els.previewBox.style.transform = `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
  });

  els.previewStage.addEventListener('pointerleave', () => {
    els.previewBox.style.transform = 'rotateX(0deg) rotateY(0deg)';
  });
}

async function wireGameLinking() {
  els.validateLink.addEventListener('click', async () => {
    const gameSlug = slugify(els.gameIdInput.value);
    const assetPath = els.assetPathInput.value.trim();

    if (!gameSlug || !assetPath) {
      els.linkingResult.textContent = 'Provide both game slug and asset path.';
      return;
    }

    const exists = state.assets.some((asset) => asset.path === assetPath);
    const gamesResponse = await fetch('/games/games.json');
    const gamesData = await gamesResponse.json();

    const game = (gamesData.games || []).find((entry) => slugify(entry.slug || entry.title) === gameSlug);
    const patch = {
      gameSlug,
      exists,
      patch: game
        ? {
            title: game.title,
            set: {
              box3d: assetPath
            }
          }
        : null,
      note: exists
        ? 'Validated path. Apply patch in Games Editor to persist.'
        : 'Path missing from indexed assets. Upload or correct before linking.'
    };

    els.linkingResult.textContent = JSON.stringify(patch, null, 2);
  });
}

function wireButtons() {
  els.refreshIndex.addEventListener('click', () => {
    indexAssets().catch((error) => {
      els.healthReport.textContent = error.message;
    });
  });

  els.runHealth.addEventListener('click', () => {
    runHealthReport().catch((error) => {
      els.healthReport.textContent = error.message;
    });
  });

  els.search.addEventListener('input', () => renderAssetList(els.search.value));
  els.uploadBatch.addEventListener('click', () => {
    uploadBatch().catch((error) => {
      els.healthReport.textContent = error.message;
    });
  });

  els.backupSnapshot.addEventListener('click', async () => {
    const result = await createSnapshot();
    els.healthReport.textContent = JSON.stringify(result, null, 2);
  });

  els.restoreHint.addEventListener('click', () => {
    els.healthReport.textContent = [
      'Restore workflow:',
      '1) Open GitHub commit history for resources/images.',
      '2) Select snapshot commit id from audit log.',
      '3) Revert commit or restore target files.',
      '4) Re-run health check to validate integrity.'
    ].join('\n');
  });

  els.logoutButton?.addEventListener('click', async () => {
    await logout();
    window.location.replace('/admin/login.html?reason=signed_out');
  });
}

async function init() {
  const access = await ensureRole(allowedRoles);
  if (!access) return;

  state.role = access.role;
  els.email.textContent = access.session.user?.email || 'unknown';
  els.role.textContent = access.role;
  setRolePolicy(access.role);

  startAccessMonitor();
  wireDropzone();
  wireNormalizer();
  wire3DPreview();
  wireButtons();
  await wireGameLinking();
  await indexAssets();
}

init().catch((error) => {
  els.healthReport.textContent = `Initialization error: ${error.message}`;
});
